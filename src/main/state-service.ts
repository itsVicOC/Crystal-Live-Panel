import { join } from "node:path";
import { createDefaultState } from "../shared/default-state.js";
import { SUPPORTED_PROFILES } from "../shared/profile.js";
import type {
  ConnectionProbeResult,
  ConnectionSettings,
  Diagnostic,
  OverlayState,
  RomProfile
} from "../shared/types.js";
import { mergeDecoded } from "./decoder.js";
import { extractPokemonSprites, inspectRom } from "./rom.js";
import { readValidatedRam, type RamAddressMode } from "./ram-reader.js";
import {
  parseStatus,
  RetroArchClient,
  RetroArchRamError,
  RetroArchTimeoutError
} from "./retroarch-client.js";

export type StateListener = (state: OverlayState) => void;
type RetroArchReader = Pick<RetroArchClient, "command" | "readCoreRam">;

export class StateService {
  private state = createDefaultState();
  private client: RetroArchReader;
  private connectionSettings: ConnectionSettings;
  private readonly userDataPath: string;
  private profile: RomProfile | null = null;
  private listeners = new Set<StateListener>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private retroArchVersion: string | null = null;
  private ramAddressMode: RamAddressMode | null = null;

  constructor(
    userDataPath: string,
    client: RetroArchReader = new RetroArchClient(),
    connectionSettings: ConnectionSettings = { host: "127.0.0.1", port: 55355 }
  ) {
    this.userDataPath = userDataPath;
    this.client = client;
    this.connectionSettings = connectionSettings;
  }

  getState(): OverlayState {
    return structuredClone(this.state);
  }

  getSpriteDirectory(): string | null {
    return this.profile ? join(this.userDataPath, "sprites", this.profile.crc32) : null;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.timer) return;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), 250);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  configureConnection(settings: ConnectionSettings): void {
    this.connectionSettings = { ...settings };
    this.client = new RetroArchClient({ ...settings, timeoutMs: 700 });
    this.retroArchVersion = null;
    this.state = {
      ...this.state,
      connection: {
        ...this.state.connection,
        status: "waiting",
        diagnosticCode: "CONNECTION_SETTINGS_CHANGED"
      },
      diagnostics: this.state.diagnostics.filter(
        (item) => !CONNECTION_DIAGNOSTIC_CODES.has(item.code)
      )
    };
    this.emit();
  }

  getConnectionSettings(): ConnectionSettings {
    return { ...this.connectionSettings };
  }

  async probeConnection(): Promise<ConnectionProbeResult> {
    const diagnostics: Diagnostic[] = [];
    let version: string | null = null;
    let statusRaw: string | null = null;

    try {
      version = (await this.client.command("VERSION")).trim();
      diagnostics.push({
        code: "UDP_VERSION_OK",
        level: "ok",
        message: `UDP 已连接：${version || "RetroArch 已响应 VERSION"}`
      });
    } catch (error) {
      diagnostics.push(this.connectionDiagnostic(error, "VERSION"));
    }

    try {
      statusRaw = (await this.client.command("GET_STATUS")).trim();
      const status = parseStatus(statusRaw);
      diagnostics.push({
        code: "GET_STATUS_OK",
        level: "ok",
        message:
          status.mode === "CONTENTLESS"
            ? "RetroArch 已响应，但当前没有加载游戏"
            : `游戏状态：${status.mode}；CRC32 ${status.crc32 ?? "未提供"}`
      });

      if (status.mode !== "CONTENTLESS") {
        const address = this.profile?.ram.readRanges[0].address ?? 0;
        try {
          await this.client.readCoreRam(address, 1);
          diagnostics.push({
            code: "READ_CORE_RAM_OK",
            level: "ok",
            message: "当前 RetroArch/core 支持只读 READ_CORE_RAM"
          });
        } catch (error) {
          diagnostics.push(this.connectionDiagnostic(error, "READ_CORE_RAM"));
        }
      }
    } catch (error) {
      diagnostics.push(this.connectionDiagnostic(error, "GET_STATUS"));
    }

    return {
      ok: diagnostics.some((item) => item.code === "GET_STATUS_OK") &&
        !diagnostics.some((item) => item.level === "error"),
      settings: this.getConnectionSettings(),
      version,
      statusRaw,
      diagnostics
    };
  }

  async configureRom(path: string): Promise<OverlayState> {
    try {
      const { buffer, identity } = await inspectRom(path);
      const profile = SUPPORTED_PROFILES.find(
        (candidate) => candidate.crc32 === identity.crc32 && candidate.sha256 === identity.sha256
      );
      if (!profile) {
        this.profile = null;
        this.state = {
          ...this.state,
          rom: {
            configured: true,
            supported: false,
            title: identity.title,
            crc32: identity.crc32,
            sha256: identity.sha256,
            spritesReady: false
          },
          diagnostics: [
            {
              code: "UNSUPPORTED_ROM",
              level: "error",
              message: `不支持此 ROM（CRC32 ${identity.crc32}）`
            }
          ]
        };
        this.emit();
        return this.getState();
      }
      this.profile = profile;
      this.ramAddressMode = null;
      const spriteDirectory = join(this.userDataPath, "sprites", profile.crc32);
      const extracted = await extractPokemonSprites(buffer, profile, spriteDirectory);
      this.state = {
        ...this.state,
        rom: {
          configured: true,
          supported: true,
          title: identity.title,
          crc32: identity.crc32,
          sha256: identity.sha256,
          spritesReady: extracted >= 240
        },
        diagnostics: [
          {
            code: "ROM_OK",
            level: "ok",
            message: `ROM 已识别；已提取 ${extracted}/${profile.sprites.speciesCount} 个本地图像`
          },
          ...(extracted < 240
            ? [{ code: "SPRITE_EXTRACTION", level: "warning" as const, message: "部分精灵图无法提取，将显示编号占位" }]
            : [])
        ]
      };
      this.emit();
      return this.getState();
    } catch (error) {
      this.state = {
        ...this.state,
        diagnostics: [
          {
            code: "ROM_READ_ERROR",
            level: "error",
            message: error instanceof Error ? error.message : "无法读取 ROM"
          }
        ]
      };
      this.emit();
      return this.getState();
    }
  }

  private async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      if (!this.retroArchVersion) {
        try {
          this.retroArchVersion = (await this.client.command("VERSION")).trim();
        } catch {
          // GET_STATUS below owns the visible offline state.
        }
      }
      const status = parseStatus(await this.client.command("GET_STATUS"));
      if (status.mode === "CONTENTLESS") {
        this.state = {
          ...this.state,
          connection: {
            ...this.state.connection,
            status: "waiting",
            retroArchVersion: this.retroArchVersion,
            game: null,
            crc32: null,
            diagnosticCode: "NO_CONTENT"
          },
          diagnostics: this.state.diagnostics.filter(
            (item) => !CONNECTION_DIAGNOSTIC_CODES.has(item.code)
          )
        };
        this.emit();
        return;
      }
      const now = new Date().toISOString();
      const connection = {
        status: status.mode === "PAUSED" ? ("paused" as const) : ("online" as const),
        updatedAt: now,
        retroArchVersion: this.retroArchVersion,
        game: status.game,
        crc32: status.crc32,
        diagnosticCode: null
      };
      if (!this.profile) {
        this.state = {
          ...this.state,
          connection,
          diagnostics: this.state.diagnostics.filter(
            (item) => !CONNECTION_DIAGNOSTIC_CODES.has(item.code)
          )
        };
        this.emit();
        return;
      }
      if (status.crc32 && status.crc32 !== this.profile.crc32) {
        this.state = {
          ...this.state,
          connection: { ...connection, diagnosticCode: "ROM_CRC_MISMATCH" },
          diagnostics: [
            {
              code: "ROM_CRC_MISMATCH",
              level: "error",
              message: `RetroArch 正在运行 CRC32 ${status.crc32}，预期 ${this.profile.crc32}`
            }
          ]
        };
        this.emit();
        return;
      }
      const ramResult = await readValidatedRam(this.client, this.profile, this.ramAddressMode);
      const decoded = ramResult.decoded;
      if (!decoded.valid) {
        this.ramAddressMode = null;
        this.state = {
          ...this.state,
          connection: { ...connection, diagnosticCode: "RAM_VALIDATION_FAILED" },
          diagnostics: [ramResult.diagnostic, ...decoded.diagnostics]
        };
      } else {
        this.ramAddressMode = ramResult.mode;
        this.state = mergeDecoded(
          { ...this.state, connection },
          { ...decoded, diagnostics: [ramResult.diagnostic, ...decoded.diagnostics] }
        );
      }
      this.emit();
    } catch (error) {
      const diagnostic = this.connectionDiagnostic(error);
      this.state = {
        ...this.state,
        connection: {
          ...this.state.connection,
          status: "offline",
          retroArchVersion: this.retroArchVersion,
          diagnosticCode: diagnostic.code
        },
        diagnostics: [
          ...this.state.diagnostics.filter((item) => !CONNECTION_DIAGNOSTIC_CODES.has(item.code)),
          diagnostic
        ]
      };
      this.emit();
    } finally {
      this.running = false;
    }
  }

  private emit(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) listener(snapshot);
  }

  private connectionDiagnostic(error: unknown, commandHint?: string): Diagnostic {
    const endpoint = `${this.connectionSettings.host}:${this.connectionSettings.port}`;
    if (error instanceof RetroArchTimeoutError) {
      const command = commandHint ?? error.command.split(" ")[0];
      if (command === "READ_CORE_RAM") {
        return {
          code: "RAM_READ_TIMEOUT",
          level: "error",
          message: `${endpoint} 已响应过状态命令，但 READ_CORE_RAM 超时；请检查 RetroArch 版本和核心的 CHEEVOS 内存支持`
        };
      }
      return {
        code: "UDP_NO_RESPONSE",
        level: command === "VERSION" ? "warning" : "error",
        message: `${endpoint} 未响应 ${command}；请启用 Network Commands、确认端口，并重启 RetroArch`
      };
    }
    if (error instanceof RetroArchRamError) {
      return {
        code: "READ_CORE_RAM_UNSUPPORTED",
        level: "error",
        message: `${error.message}（回包：${error.response || "空"}）`
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("无法识别 GET_STATUS")) {
      return { code: "STATUS_FORMAT_UNSUPPORTED", level: "error", message };
    }
    return {
      code: "RETROARCH_COMMAND_ERROR",
      level: "error",
      message: `${endpoint} 通信失败：${message}`
    };
  }
}

const CONNECTION_DIAGNOSTIC_CODES = new Set([
  "UDP_NO_RESPONSE",
  "RAM_READ_TIMEOUT",
  "READ_CORE_RAM_UNSUPPORTED",
  "STATUS_FORMAT_UNSUPPORTED",
  "RETROARCH_COMMAND_ERROR"
]);
