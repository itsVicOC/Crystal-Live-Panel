import dgram from "node:dgram";

export class RetroArchTimeoutError extends Error {
  readonly command: string;

  constructor(command: string) {
    super(`RetroArch did not answer: ${command}`);
    this.name = "RetroArchTimeoutError";
    this.command = command;
  }
}

export class RetroArchRamError extends Error {
  readonly response: string;

  constructor(message: string, response: string) {
    super(message);
    this.name = "RetroArchRamError";
    this.response = response;
  }
}

export interface RetroArchClientOptions {
  host?: string;
  port?: number;
  timeoutMs?: number;
}

export class RetroArchClient {
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options: RetroArchClientOptions = {}) {
    this.host = options.host ?? "127.0.0.1";
    this.port = options.port ?? 55355;
    this.timeoutMs = options.timeoutMs ?? 180;
  }

  command(command: string): Promise<string> {
    if (!/^(GET_STATUS|VERSION|READ_CORE_RAM [0-9A-Fa-f]+ [0-9]+)$/.test(command)) {
      return Promise.reject(new Error(`Blocked non-read-only command: ${command}`));
    }
    const task = this.queue.then(() => this.send(command));
    this.queue = task.catch(() => undefined);
    return task;
  }

  async readCoreRam(address: number, length: number): Promise<Buffer> {
    const response = await this.command(
      `READ_CORE_RAM ${address.toString(16).toUpperCase()} ${length}`
    );
    const tokens = response.trim().split(/\s+/);
    if (tokens[0] !== "READ_CORE_RAM" || tokens[2] === "-1") {
      throw new RetroArchRamError(
        tokens[2] === "-1"
          ? "RetroArch/core 不支持 READ_CORE_RAM，或当前核心未暴露 CHEEVOS 内存"
          : `READ_CORE_RAM 返回格式无法识别：${response.trim()}`,
        response.trim()
      );
    }
    const bytes = tokens.slice(2).map((token) => Number.parseInt(token, 16));
    if (bytes.length !== length || bytes.some((byte) => !Number.isFinite(byte))) {
      throw new RetroArchRamError(
        `READ_CORE_RAM 只返回 ${bytes.length}/${length} 字节`,
        response.trim()
      );
    }
    return Buffer.from(bytes);
  }

  private send(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket("udp4");
      let settled = false;
      const finish = (error?: Error, value?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.close();
        if (error) reject(error);
        else resolve(value ?? "");
      };
      const timer = setTimeout(() => finish(new RetroArchTimeoutError(command)), this.timeoutMs);
      socket.once("error", (error) => finish(error));
      socket.once("message", (message) => finish(undefined, message.toString("utf8")));
      socket.send(Buffer.from(command, "utf8"), this.port, this.host, (error) => {
        if (error) finish(error);
      });
    });
  }
}

export interface RetroArchStatus {
  mode: "PLAYING" | "PAUSED" | "CONTENTLESS";
  systemId: string | null;
  game: string | null;
  crc32: string | null;
}

export function parseStatus(response: string): RetroArchStatus {
  const trimmed = response.trim();
  if (/^GET_STATUS\s+CONTENTLESS(?:\s.*)?$/i.test(trimmed)) {
    return { mode: "CONTENTLESS", systemId: null, game: null, crc32: null };
  }
  const header = /^GET_STATUS\s+(PLAYING|PAUSED)\s+(.+)$/i.exec(trimmed);
  if (!header) throw new Error(`无法识别 GET_STATUS 回包：${trimmed || "<空回包>"}`);
  const fields = header[2].split(",").map((field) => field.trim());
  const crcField = fields.find((field) => /^crc32\s*=/i.test(field));
  const crcMatch = crcField ? /crc32\s*=\s*([0-9A-Fa-f]{8})/i.exec(crcField) : null;
  return {
    mode: header[1].toUpperCase() as "PLAYING" | "PAUSED",
    systemId: fields[0] || null,
    game: fields[1] || null,
    crc32: crcMatch?.[1].toUpperCase() ?? null
  };
}
