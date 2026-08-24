import type {
  Diagnostic,
  LocationState,
  OverlayState,
  PartyMember,
  RomProfile,
  TrainerState
} from "../shared/types.js";

const GROUPS: Record<number, { name: string; region: "JOHTO" | "KANTO"; x: number; y: number }> = {
  1: { name: "OLIVINE", region: "JOHTO", x: 24, y: 67 },
  2: { name: "MAHOGANY", region: "JOHTO", x: 68, y: 48 },
  4: { name: "ECRUTEAK", region: "JOHTO", x: 45, y: 42 },
  5: { name: "BLACKTHORN", region: "JOHTO", x: 83, y: 49 },
  6: { name: "CINNABAR", region: "KANTO", x: 50, y: 50 },
  7: { name: "CERULEAN", region: "KANTO", x: 50, y: 50 },
  8: { name: "AZALEA", region: "JOHTO", x: 37, y: 77 },
  9: { name: "LAKE OF RAGE", region: "JOHTO", x: 67, y: 25 },
  10: { name: "VIOLET", region: "JOHTO", x: 52, y: 68 },
  11: { name: "GOLDENROD", region: "JOHTO", x: 38, y: 61 },
  12: { name: "VERMILION", region: "KANTO", x: 50, y: 50 },
  13: { name: "PALLET", region: "KANTO", x: 50, y: 50 },
  14: { name: "PEWTER", region: "KANTO", x: 50, y: 50 },
  16: { name: "INDIGO", region: "KANTO", x: 50, y: 50 },
  17: { name: "FUCHSIA", region: "KANTO", x: 50, y: 50 },
  18: { name: "LAVENDER", region: "KANTO", x: 50, y: 50 },
  19: { name: "SILVER CAVE", region: "JOHTO", x: 94, y: 67 },
  21: { name: "CELADON", region: "KANTO", x: 50, y: 50 },
  22: { name: "CIANWOOD", region: "JOHTO", x: 10, y: 70 },
  23: { name: "VIRIDIAN", region: "KANTO", x: 50, y: 50 },
  24: { name: "NEW BARK", region: "JOHTO", x: 91, y: 76 },
  25: { name: "SAFFRON", region: "KANTO", x: 50, y: 50 },
  26: { name: "CHERRYGROVE", region: "JOHTO", x: 78, y: 77 }
};

function dungeonLocation(mapNumber: number): { name: string; region: "JOHTO" | "KANTO"; x: number; y: number } | null {
  if (mapNumber >= 1 && mapNumber <= 3) return { name: "SPROUT TOWER", region: "JOHTO", x: 52, y: 68 };
  if (mapNumber >= 4 && mapNumber <= 14) return { name: "ECRUTEAK", region: "JOHTO", x: 45, y: 42 };
  if (mapNumber >= 15 && mapNumber <= 16) return { name: "NATIONAL PARK", region: "JOHTO", x: 42, y: 53 };
  if (mapNumber >= 17 && mapNumber <= 21) return { name: "GOLDENROD", region: "JOHTO", x: 38, y: 61 };
  if (mapNumber >= 22 && mapNumber <= 36) return { name: "RUINS OF ALPH", region: "JOHTO", x: 56, y: 77 };
  if (mapNumber >= 37 && mapNumber <= 39) return { name: "UNION CAVE", region: "JOHTO", x: 50, y: 84 };
  if (mapNumber >= 40 && mapNumber <= 41) return { name: "SLOWPOKE WELL", region: "JOHTO", x: 37, y: 77 };
  if (mapNumber >= 42 && mapNumber <= 47) return { name: "OLIVINE", region: "JOHTO", x: 24, y: 67 };
  if (mapNumber >= 48 && mapNumber <= 51) return { name: "MAHOGANY", region: "JOHTO", x: 68, y: 48 };
  if (mapNumber === 52) return { name: "ILEX FOREST", region: "JOHTO", x: 36, y: 75 };
  if (mapNumber >= 53 && mapNumber <= 56) return { name: "GOLDENROD", region: "JOHTO", x: 38, y: 61 };
  if (mapNumber >= 57 && mapNumber <= 60) return { name: "MT. MORTAR", region: "JOHTO", x: 58, y: 45 };
  if (mapNumber >= 61 && mapNumber <= 65) return { name: "ICE PATH", region: "JOHTO", x: 78, y: 49 };
  if (mapNumber >= 66 && mapNumber <= 73) return { name: "WHIRL ISLANDS", region: "JOHTO", x: 17, y: 73 };
  if (mapNumber >= 74 && mapNumber <= 77) return { name: "SILVER CAVE", region: "JOHTO", x: 94, y: 67 };
  if (mapNumber >= 78 && mapNumber <= 79) return { name: "DARK CAVE", region: "JOHTO", x: 67, y: 65 };
  if (mapNumber >= 80 && mapNumber <= 82) return { name: "DRAGON'S DEN", region: "JOHTO", x: 83, y: 49 };
  if (mapNumber === 83) return { name: "TOHJO FALLS", region: "JOHTO", x: 96, y: 77 };
  if (mapNumber >= 84 && mapNumber <= 91) return { name: "KANTO", region: "KANTO", x: 50, y: 50 };
  return null;
}

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
      diagnostics.push({ code: `PARTY_${index + 1}`, level: "error", message: `队伍槽 ${index + 1} 数据无效（#${species}, Lv.${level}）` });
      continue;
    }
    party.push({ slot: index + 1, species, level, spriteKey: String(species).padStart(3, "0") });
  }

  const mapGroup = read(profile.ram.mapGroup);
  const mapNumber = read(profile.ram.mapNumber);
  const group = mapGroup === 3 ? dungeonLocation(mapNumber) : GROUPS[mapGroup];
  const location: LocationState = group
    ? {
        region: group.region,
        mapGroup,
        mapNumber,
        x: read(profile.ram.xCoord),
        y: read(profile.ram.yCoord),
        landmark: group.name,
        displayLabel: group.name,
        markerX: group.region === "JOHTO" ? group.x : null,
        markerY: group.region === "JOHTO" ? group.y : null
      }
    : {
        region: "UNKNOWN",
        mapGroup,
        mapNumber,
        x: read(profile.ram.xCoord),
        y: read(profile.ram.yCoord),
        landmark: "UNKNOWN",
        displayLabel: "UNKNOWN",
        markerX: null,
        markerY: null
      };
  if (mapGroup < 1 || mapGroup > 26 || mapNumber < 1) {
    diagnostics.push({ code: "MAP", level: "error", message: `地图编号无效：${mapGroup}:${mapNumber}` });
  } else if (!group) {
    diagnostics.push({ code: "MAP", level: "warning", message: `地图 ${mapGroup}:${mapNumber} 暂无地标映射` });
  } else {
    diagnostics.push({ code: "MAP", level: "ok", message: `位置：${group.name}` });
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
      badgeCount: popcount(badges)
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
