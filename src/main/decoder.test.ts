import { describe, expect, it } from "vitest";
import { CRYSTAL_PATCHED_PROFILE as profile } from "../shared/profile.js";
import { decodeBigEndian, decodeRam, mergeDecoded } from "./decoder.js";
import { createDefaultState } from "../shared/default-state.js";

function fixture(): Buffer {
  const ram = Buffer.alloc(profile.ram.readLength);
  const set = (address: number, ...values: number[]) => {
    Buffer.from(values).copy(ram, address - profile.ram.readStart);
  };
  set(profile.ram.playerId, 0x30, 0x39);
  set(profile.ram.playerName, 0x91, 0x84, 0x83, 0x50); // RED
  set(profile.ram.gameTimeHours, 0x00, 0x64);
  set(profile.ram.gameTimeMinutes, 42);
  set(profile.ram.gameTimeSeconds, 10);
  set(profile.ram.money, 0x01, 0xe2, 0x40); // 123456, binary big-endian
  set(profile.ram.johtoBadges, 0b0010_1101);
  set(profile.ram.mapGroup, 24);
  set(profile.ram.mapNumber, 1);
  set(profile.ram.yCoord, 10);
  set(profile.ram.xCoord, 12);
  set(profile.ram.partyCount, 2);
  set(profile.ram.partySpecies, 152, 155, 0xff, 0xff, 0xff, 0xff);
  set(profile.ram.partyLevels[0], 12);
  set(profile.ram.partyLevels[1], 14);
  return ram;
}

describe("decodeBigEndian", () => {
  it("decodes three-byte binary money", () => expect(decodeBigEndian([0x01, 0xe2, 0x40])).toBe(123456));
  it("decodes the maximum in-game amount", () => expect(decodeBigEndian([0x0f, 0x42, 0x3f])).toBe(999999));
});

describe("decodeRam", () => {
  it("decodes a valid live state", () => {
    const result = decodeRam(fixture(), profile);
    expect(result.valid).toBe(true);
    expect(result.trainer).toMatchObject({ name: "RED", id: 12345, money: 123456, badgeCount: 4 });
    expect(result.party).toEqual([
      { slot: 1, species: 152, level: 12, spriteKey: "152" },
      { slot: 2, species: 155, level: 14, spriteKey: "155" }
    ]);
    expect(result.location).toMatchObject({ region: "JOHTO", landmark: "NEW BARK" });
  });

  it("rejects invalid party counts", () => {
    const ram = fixture();
    ram[profile.ram.partyCount - profile.ram.readStart] = 7;
    expect(decodeRam(ram, profile).valid).toBe(false);
  });

  it("rejects invalid levels without publishing the member", () => {
    const ram = fixture();
    ram[profile.ram.partyLevels[0] - profile.ram.readStart] = 0;
    const result = decodeRam(ram, profile);
    expect(result.valid).toBe(false);
    expect(result.party).toHaveLength(1);
  });

  it("inherits a dungeon's Johto landmark", () => {
    const ram = fixture();
    ram[profile.ram.mapGroup - profile.ram.readStart] = 3;
    ram[profile.ram.mapNumber - profile.ram.readStart] = 40;
    expect(decodeRam(ram, profile).location).toMatchObject({ region: "JOHTO", landmark: "SLOWPOKE WELL" });
  });

  it("publishes trainer, party and location when binary money is valid", () => {
    const decoded = decodeRam(fixture(), profile);
    const published = mergeDecoded(createDefaultState(), decoded);
    expect(decoded.valid).toBe(true);
    expect(published.trainer).toMatchObject({ name: "RED", money: 123456 });
    expect(published.party).toHaveLength(2);
    expect(published.location.landmark).toBe("NEW BARK");
  });
});
