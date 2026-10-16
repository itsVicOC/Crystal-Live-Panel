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
  set(profile.ram.kantoBadges, 0b1000_0001);
  set(profile.ram.mapGroup, 24);
  set(profile.ram.mapNumber, 4);
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
    expect(result.trainer).toMatchObject({ name: "RED", id: 12345, money: 123456, badgeCount: 4, kantoBadges: 129, kantoBadgeCount: 2 });
    expect(result.party).toEqual([
      { slot: 1, species: 152, level: 12, spriteKey: "152" },
      { slot: 2, species: 155, level: 14, spriteKey: "155" }
    ]);
    expect(result.location).toMatchObject({ region: "JOHTO", landmark: "NEW BARK TOWN" });
  });

  it("rejects invalid party counts", () => {
    const ram = fixture();
    ram[profile.ram.partyCount - profile.ram.readStart] = 7;
    expect(decodeRam(ram, profile).valid).toBe(false);
  });

  it("uses the live player coordinates to move the marker while remaining on one road", () => {
    const ram = fixture();
    ram[profile.ram.mapNumber - profile.ram.readStart] = 3;
    ram[profile.ram.yCoord - profile.ram.readStart] = 8;
    ram[profile.ram.xCoord - profile.ram.readStart] = 0;
    const start = decodeRam(ram, profile);
    ram[profile.ram.xCoord - profile.ram.readStart] = 59;
    const end = decodeRam(ram, profile);
    expect(start.valid && end.valid).toBe(true);
    expect(start.location).toMatchObject({ landmark: "ROUTE 29", displayLabel: "29号道路", markerMode: "route" });
    expect(end.location.markerX).toBeGreaterThan(start.location.markerX!);
    expect(end.location.markerY).toBe(start.location.markerY);
    expect(end.trainer).toEqual(start.trainer);
    expect(end.party).toEqual(start.party);
  });

  it.each([
    [0x00, 0x00, 0, 0],
    [0xff, 0x00, 8, 0],
    [0x00, 0xff, 0, 8],
    [0x10, 0x20, 1, 1],
    [0xff, 0xff, 8, 8]
  ])("keeps Johto %i and Kanto %i badge flags independent", (johto, kanto, johtoCount, kantoCount) => {
    const ram = fixture();
    ram[profile.ram.johtoBadges - profile.ram.readStart] = johto;
    ram[profile.ram.kantoBadges - profile.ram.readStart] = kanto;
    const decoded = decodeRam(ram, profile);
    expect(decoded.valid).toBe(true);
    expect(decoded.trainer).toMatchObject({ badges: johto, badgeCount: johtoCount, kantoBadges: kanto, kantoBadgeCount: kantoCount });
    const published = mergeDecoded(createDefaultState(), decoded);
    expect(published.trainer!.badgeCount + published.trainer!.kantoBadgeCount).toBe(johtoCount + kantoCount);
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
    expect(published.location.landmark).toBe("NEW BARK TOWN");
  });

  it.each([
    [24, 1, "KANTO", "ROUTE 26"],
    [24, 3, "JOHTO", "ROUTE 29"],
    [1, 12, "JOHTO", "ROUTE 38"],
    [3, 4, "JOHTO", "TIN TOWER"],
    [3, 83, "KANTO", "TOHJO FALLS"],
    [15, 2, "KANTO", "VERMILION CITY"]
  ])("resolves map %i:%i using its own landmark", (group, number, region, landmark) => {
    const ram = fixture();
    ram[profile.ram.mapGroup - profile.ram.readStart] = Number(group);
    ram[profile.ram.mapNumber - profile.ram.readStart] = Number(number);
    const result = decodeRam(ram, profile);
    expect(result.valid).toBe(true);
    expect(result.location).toMatchObject({ region, landmark });
    expect(result.location.markerX).not.toBeNull();
    expect(result.location.markerY).not.toBeNull();
  });

  it("rejects a map number outside its group", () => {
    const ram = fixture();
    ram[profile.ram.mapNumber - profile.ram.readStart] = 255;
    const result = decodeRam(ram, profile);
    expect(result.valid).toBe(false);
    expect(result.location.markerX).toBeNull();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "MAP", level: "error" }));
  });

  it("keeps the ship unpinned without discarding the trainer state", () => {
    const ram = fixture();
    ram[profile.ram.mapGroup - profile.ram.readStart] = 15;
    ram[profile.ram.mapNumber - profile.ram.readStart] = 3;
    const result = decodeRam(ram, profile);
    expect(result.valid).toBe(true);
    expect(result.location).toMatchObject({ region: "UNKNOWN", landmark: "FAST SHIP", markerX: null, markerY: null });
  });
});
