import { describe, expect, it } from "vitest";
import { CRYSTAL_PATCHED_PROFILE as profile } from "../shared/profile.js";
import { coreRamAddress, readValidatedRam } from "./ram-reader.js";
import { RetroArchRamError } from "./retroarch-client.js";

function validRam(): Buffer {
  const ram = Buffer.alloc(profile.ram.readLength);
  const set = (address: number, ...values: number[]) => {
    Buffer.from(values).copy(ram, address - profile.ram.readStart);
  };
  set(profile.ram.playerId, 0x30, 0x39);
  set(profile.ram.playerName, 0x91, 0x84, 0x83, 0x50);
  set(profile.ram.gameTimeHours, 0x00, 0x64);
  set(profile.ram.gameTimeMinutes, 42);
  set(profile.ram.gameTimeSeconds, 10);
  set(profile.ram.money, 0x01, 0xe2, 0x40);
  set(profile.ram.mapGroup, 24);
  set(profile.ram.mapNumber, 1);
  set(profile.ram.partyCount, 1);
  set(profile.ram.partySpecies, 152);
  set(profile.ram.partyLevels[0], 12);
  return ram;
}

describe("RAM address modes", () => {
  it("translates the WRAM offset to the native Game Boy CPU address", () => {
    expect(coreRamAddress(0x147b, "GAME_BOY_CPU")).toBe(0xd47b);
    expect(coreRamAddress(0x147b, "RETROACHIEVEMENTS_OFFSET")).toBe(0x147b);
  });

  it("uses the normal RetroAchievements offset when it contains valid data", async () => {
    const ram = validRam();
    const result = await readValidatedRam(
      {
        readCoreRam: async (address, length) =>
          ram.subarray(address - profile.ram.readStart, address - profile.ram.readStart + length)
      },
      profile
    );
    expect(result.mode).toBe("RETROACHIEVEMENTS_OFFSET");
    expect(result.decoded.trainer.name).toBe("RED");
  });

  it("falls back to native CPU addresses when low offsets are all zero", async () => {
    const ram = validRam();
    const result = await readValidatedRam(
      {
        readCoreRam: async (address, length) => {
          if (address < 0xc000) return Buffer.alloc(length);
          const logical = address - 0xc000;
          return ram.subarray(
            logical - profile.ram.readStart,
            logical - profile.ram.readStart + length
          );
        }
      },
      profile
    );
    expect(result.mode).toBe("GAME_BOY_CPU");
    expect(result.decoded.trainer).toMatchObject({ name: "RED", id: 12345, gameTimeHours: 100 });
  });

  it("reports a distinct all-zero memory diagnostic", async () => {
    const result = await readValidatedRam(
      {
        readCoreRam: async (address, length) => {
          if (address >= 0xc000) {
            throw new RetroArchRamError("unmapped", `READ_CORE_RAM ${address.toString(16)} -1`);
          }
          return Buffer.alloc(length);
        }
      },
      profile
    );
    expect(result.decoded.valid).toBe(false);
    expect(result.decoded.diagnostics[0].code).toBe("RAM_ALL_ZERO");
  });
});
