import type { Diagnostic, RomProfile } from "../shared/types.js";
import { decodeRam, type DecodedRam } from "./decoder.js";
import { RetroArchRamError } from "./retroarch-client.js";

export type RamAddressMode = "RETROACHIEVEMENTS_OFFSET" | "GAME_BOY_CPU";

export interface CoreRamReader {
  readCoreRam(address: number, length: number): Promise<Buffer>;
}

export interface RamReadResult {
  decoded: DecodedRam;
  mode: RamAddressMode;
  diagnostic: Diagnostic;
}

const ADDRESS_MODES: RamAddressMode[] = ["RETROACHIEVEMENTS_OFFSET", "GAME_BOY_CPU"];

/**
 * RetroArch READ_CORE_RAM normally uses the RetroAchievements logical address
 * space. Some builds/cores expose the native Game Boy CPU address space
 * instead. The profile stores offsets into tgbdual's contiguous WRAM buffer.
 */
export function coreRamAddress(address: number, mode: RamAddressMode): number {
  return mode === "GAME_BOY_CPU" ? address + 0xc000 : address;
}

function looksUninitialized(buffer: Buffer): boolean {
  let nonZero = 0;
  let nonFf = 0;
  for (const byte of buffer) {
    if (byte !== 0) nonZero += 1;
    if (byte !== 0xff) nonFf += 1;
  }
  return nonZero === 0 || nonFf === 0;
}

async function readMode(
  client: CoreRamReader,
  profile: RomProfile,
  mode: RamAddressMode
): Promise<{ buffer: Buffer; decoded: DecodedRam }> {
  const buffer = Buffer.alloc(profile.ram.readLength);
  for (const range of profile.ram.readRanges) {
    const bytes = await client.readCoreRam(coreRamAddress(range.address, mode), range.length);
    bytes.copy(buffer, range.address - profile.ram.readStart);
  }
  return { buffer, decoded: decodeRam(buffer, profile) };
}

export async function readValidatedRam(
  client: CoreRamReader,
  profile: RomProfile,
  preferredMode?: RamAddressMode | null
): Promise<RamReadResult> {
  const modes = preferredMode
    ? [preferredMode, ...ADDRESS_MODES.filter((mode) => mode !== preferredMode)]
    : ADDRESS_MODES;
  const failures: Array<{ mode: RamAddressMode; decoded?: DecodedRam; uninitialized?: boolean; error?: unknown }> = [];

  for (const mode of modes) {
    try {
      const result = await readMode(client, profile, mode);
      if (result.decoded.valid) {
        return {
          decoded: result.decoded,
          mode,
          diagnostic: {
            code: "RAM_ADDRESS_MODE",
            level: "ok",
            message:
              mode === "RETROACHIEVEMENTS_OFFSET"
                ? "RAM 地址模式：RetroAchievements 连续偏移"
                : "RAM 地址模式：Game Boy CPU 地址"
          }
        };
      }
      failures.push({
        mode,
        decoded: result.decoded,
        uninitialized: looksUninitialized(result.buffer)
      });
    } catch (error) {
      failures.push({ mode, error });
    }
  }

  const best = failures.find((failure) => failure.decoded && !failure.uninitialized) ??
    failures.find((failure) => failure.decoded);
  if (best?.decoded) {
    if (failures.every((failure) => failure.uninitialized || failure.error instanceof RetroArchRamError)) {
      best.decoded.diagnostics.unshift({
        code: "RAM_ALL_ZERO",
        level: "error",
        message: "两种常见 RAM 地址模式均未读到已初始化的游戏数据；请确认使用单游戏模式 tgbdual-libretro，并已进入存档后的游戏画面"
      });
    }
    return {
      decoded: best.decoded,
      mode: best.mode,
      diagnostic: {
        code: "RAM_ADDRESS_MODE_UNRESOLVED",
        level: "error",
        message: "已尝试 RetroAchievements 偏移与 Game Boy CPU 地址，但字段校验均未通过"
      }
    };
  }

  const firstError = failures.find((failure) => failure.error)?.error;
  throw firstError ?? new Error("无法读取任何候选 RAM 地址模式");
}
