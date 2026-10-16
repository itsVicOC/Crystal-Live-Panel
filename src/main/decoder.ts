import type {
  Diagnostic,
  LocationState,
  OverlayState,
  PartyMember,
  RomProfile,
  TrainerState
} from "../shared/types.js";

import { isKnownMap, resolveLocation } from "../shared/world-map.js";

function byteAt(buffer: Buffer, absoluteAddress: number, profile: RomProfile): number {
  const index = absoluteAddress - profile.ram.readStart;
  if (index < 0 || index >= buffer.length) throw new RangeError(`RAM address ${absoluteAddress.toString(16)}`);
  return buffer[index];
}

function decodeName(bytes: Buffer): string {
  let value = "";
  for (const byte of bytes) {
    if (byte === 0x50 || byte === 0x00) break;
    if (byte >= 0x80 && byte <= 0x99) value += String.fromCharCode(65 + byte - 0x80);
    else if (byte >= 0xa0 && byte <= 0xb9) value += String.fromCharCode(97 + byte - 0xa0);
    else if (byte >= 0xf6 && byte <= 0xff) value += String(byte - 0xf6);
    else if (byte === 0x7f) value += " ";
    else if (byte === 0xe3) value += "-";
    else if (byte === 0xe8) value += ".";
    else value += "?";
  }
  return value.trim();
}

export function decodeBigEndian(bytes: readonly number[]): number {
  let value = 0;
  for (const byte of bytes) {
    value = value * 0x100 + byte;
  }
  return value;
}

function popcount(value: number): number {
  let result = 0;
  for (let bit = 0; bit < 8; bit += 1) result += (value >> bit) & 1;
  return result;
}

export interface DecodedRam {
  trainer: TrainerState;
  party: PartyMember[];
  location: LocationState;
  diagnostics: Diagnostic[];
  valid: boolean;
}

export function decodeRam(buffer: Buffer, profile: RomProfile): DecodedRam {
  const diagnostics: Diagnostic[] = [];
  const read = (address: number) => byteAt(buffer, address, profile);
  const readSlice = (address: number, length: number) => {
    const start = address - profile.ram.readStart;
    return buffer.subarray(start, start + length);
  };
  const name = decodeName(readSlice(profile.ram.playerName, profile.ram.playerNameLength));
  // Game Boy multi-byte values used by PrintNum are stored most-significant byte first.
  const id = (read(profile.ram.playerId) << 8) | read(profile.ram.playerId + 1);
  const hours = (read(profile.ram.gameTimeHours) << 8) | read(profile.ram.gameTimeHours + 1);
  const minutes = read(profile.ram.gameTimeMinutes);
  const seconds = read(profile.ram.gameTimeSeconds);
  // Pokémon Crystal stores funds as a 3-byte, most-significant-byte-first
  // binary integer (see GiveMoney/AddFunds), not packed BCD.
  const money = decodeBigEndian([
    read(profile.ram.money),
    read(profile.ram.money + 1),
    read(profile.ram.money + 2)
  ]);
  const badges = read(profile.ram.johtoBadges);
  const kantoBadges = read(profile.ram.kantoBadges);
  const partyCount = read(profile.ram.partyCount);

  if (!name || name.includes("?")) {
    diagnostics.push({ code: "PLAYER_NAME", level: name ? "warning" : "error", message: "玩家名尚未初始化或包含不支持字符" });
  } else diagnostics.push({ code: "PLAYER_NAME", level: "ok", message: `玩家名：${name}` });
  if (hours > 999 || minutes > 59 || seconds > 59) {
    diagnostics.push({ code: "GAME_TIME", level: "error", message: "游戏时间字段超出合理范围" });
  } else diagnostics.push({ code: "GAME_TIME", level: "ok", message: `游戏时间：${hours}:${String(minutes).padStart(2, "0")}` });
  if (money > 999_999) {
    diagnostics.push({ code: "MONEY", level: "error", message: `金钱超出游戏上限：${money.toLocaleString("en-US")}` });
  } else diagnostics.push({ code: "MONEY", level: "ok", message: `金钱：${money.toLocaleString("en-US")}` });
  if (partyCount > 6) diagnostics.push({ code: "PARTY_COUNT", level: "error", message: `队伍数量无效：${partyCount}` });
  else diagnostics.push({ code: "PARTY_COUNT", level: "ok", message: `队伍数量：${partyCount}` });

  const party: PartyMember[] = [];
  for (let index = 0; index < Math.min(partyCount, 6); index += 1) {
    const species = read(profile.ram.partySpecies + index);
    const level = read(profile.ram.partyLevels[index]);
    if (species < 1 || species > 251 || level < 1 || level > 100) {
      diagnostics.push({ code: `PARTY_${index + 1}`, level: "error", message: `队伍槽 ${index + 1} 数据无效（编号 ${species}，${level} 级）` });
      continue;
    }
    party.push({ slot: index + 1, species, level, spriteKey: String(species).padStart(3, "0") });
  }

  const mapGroup = read(profile.ram.mapGroup);
  const mapNumber = read(profile.ram.mapNumber);
  const location = resolveLocation(mapGroup, mapNumber, read(profile.ram.xCoord), read(profile.ram.yCoord));
  if (!isKnownMap(mapGroup, mapNumber)) {
    diagnostics.push({ code: "MAP", level: "error", message: `地图编号无效：${mapGroup}:${mapNumber}` });
  } else if (location.region === "UNKNOWN") {
    diagnostics.push({ code: "MAP", level: "warning", message: `地图 ${mapGroup}:${mapNumber} 没有固定区域地标：${location.displayLabel}` });
  } else {
    diagnostics.push({ code: "MAP", level: "ok", message: `位置：${location.displayLabel}（${mapGroup}:${mapNumber}）` });
  }
  const invalid = diagnostics.some((diagnostic) => diagnostic.level === "error");
  return {
    trainer: {
      name: name || "-----",
      id,
      money,
      gameTimeHours: hours,
      gameTimeMinutes: minutes,
      badges,
      badgeCount: popcount(badges),
      kantoBadges,
      kantoBadgeCount: popcount(kantoBadges)
    },
    party,
    location,
    diagnostics,
    valid: !invalid
  };
}

export function mergeDecoded(state: OverlayState, decoded: DecodedRam): OverlayState {
  return {
    ...state,
    trainer: decoded.trainer,
    party: decoded.party,
    location: decoded.location,
    diagnostics: decoded.diagnostics
  };
}
