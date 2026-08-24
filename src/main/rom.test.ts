import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { crc32, identifyRom } from "./rom.js";

describe("ROM utilities", () => {
  it("matches a standard CRC32 vector", () => expect(crc32(Buffer.from("123456789"))).toBe("CBF43926"));

  const romPath = process.env.CRYSTAL_TEST_ROM;
  it.runIf(Boolean(romPath))("identifies the provided ROM without copying it", async () => {
    const rom = await readFile(romPath!);
    expect(identifyRom(rom)).toMatchObject({
      title: "PM_CRYSTAL",
      crc32: "9AB996C9",
      sha256: "65701F63CFB8BCF88A56A6930236E659FC01FEC22BFAD0BE8BB49C739ADA406C",
      revision: 1,
      size: 2_097_152
    });
  });
});
