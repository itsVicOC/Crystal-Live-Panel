import type { RomProfile } from "./types.js";

// Rev 1 symbol source: pret/pokecrystal pokecrystal11.sym. tgbdual exposes
// C000-CFFF at offset 0000 and WRAM bank 1 (D000-DFFF) at offset 1000.
export const CRYSTAL_PATCHED_PROFILE: RomProfile = {
  id: "crystal-usa-rev1-cn-patched-9ab996c9",
  title: "PM_CRYSTAL",
  crc32: "9AB996C9",
  sha256: "65701F63CFB8BCF88A56A6930236E659FC01FEC22BFAD0BE8BB49C739ADA406C",
  expectedCore: "tgbdual-libretro",
  ram: {
    readStart: 0x147b,
    readLength: 0x0974,
    readRanges: [
      { address: 0x147b, length: 0x004e },
      { address: 0x184e, length: 0x000a },
      { address: 0x1cb5, length: 0x0004 },
      { address: 0x1cd7, length: 0x0118 }
    ],
    playerId: 0x147b,
    playerName: 0x147d,
    playerNameLength: 11,
    gameTimeHours: 0x14c4,
    gameTimeMinutes: 0x14c6,
    gameTimeSeconds: 0x14c7,
    money: 0x184e,
    johtoBadges: 0x1857,
    mapGroup: 0x1cb5,
    mapNumber: 0x1cb6,
    yCoord: 0x1cb7,
    xCoord: 0x1cb8,
    partyCount: 0x1cd7,
    partySpecies: 0x1cd8,
    partyLevels: [0x1cfe, 0x1d2e, 0x1d5e, 0x1d8e, 0x1dbe, 0x1dee]
  },
  sprites: {
    pointerTableOffset: 0x120000,
    unownPointerTableOffset: 0x124000,
    // The Chinese patch relocates this table by +0x53 from clean Rev 1.
    paletteTableOffset: 0x00a921,
    baseDataOffset: 0x0514aa,
    baseDataEntrySize: 32,
    dimensionOffset: 17,
    bankFix: 0x36,
    speciesCount: 251
  }
};

export const SUPPORTED_PROFILES = [CRYSTAL_PATCHED_PROFILE];
