import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { RomProfile } from "../shared/types.js";

export interface RomIdentity {
  title: string;
  crc32: string;
  sha256: string;
  revision: number;
  size: number;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(buffer: Buffer): string {
  let value = 0xffffffff;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return ((value ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function identifyRom(buffer: Buffer): RomIdentity {
  if (buffer.length < 0x150) throw new Error("文件太小，不是有效的 Game Boy ROM");
  const title = buffer.subarray(0x134, 0x143).toString("ascii").replace(/\0.*$/, "").trim();
  return {
    title,
    crc32: crc32(buffer),
    sha256: createHash("sha256").update(buffer).digest("hex").toUpperCase(),
    revision: buffer[0x14c],
    size: buffer.length
  };
}

export async function inspectRom(path: string): Promise<{ buffer: Buffer; identity: RomIdentity }> {
  const buffer = await readFile(path);
  return { buffer, identity: identifyRom(buffer) };
}

function reverseBits(value: number): number {
  let output = 0;
  for (let bit = 0; bit < 8; bit += 1) output = (output << 1) | ((value >> bit) & 1);
  return output;
}

export function decompressLz3(source: Buffer, start: number): Buffer {
  const output: number[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor < source.length && guard < 1_000_000) {
    guard += 1;
    const control = source[cursor++];
    if (control === 0xff) return Buffer.from(output);
    let command: number;
    let length: number;
    if ((control & 0xe0) === 0xe0) {
      command = (control >> 2) & 0x07;
      length = (((control & 0x03) << 8) | source[cursor++]) + 1;
    } else {
      command = control >> 5;
      length = (control & 0x1f) + 1;
    }
    if (command === 0) {
      for (let index = 0; index < length; index += 1) output.push(source[cursor++]);
    } else if (command === 1) {
      const value = source[cursor++];
      for (let index = 0; index < length; index += 1) output.push(value);
    } else if (command === 2) {
      const first = source[cursor++];
      const second = source[cursor++];
      for (let index = 0; index < length; index += 1) output.push(index % 2 === 0 ? first : second);
    } else if (command === 3) {
      for (let index = 0; index < length; index += 1) output.push(0);
    } else if (command >= 4 && command <= 6) {
      const offset = source[cursor++];
      let sourceIndex: number;
      if (offset & 0x80) sourceIndex = output.length - ((offset & 0x7f) + 1);
      else sourceIndex = (offset << 8) | source[cursor++];
      for (let index = 0; index < length; index += 1) {
        const readIndex = command === 6 ? sourceIndex - index : sourceIndex + index;
        if (readIndex < 0 || readIndex >= output.length) throw new Error("LZ3 引用了无效输出偏移");
        const value = output[readIndex];
        output.push(command === 5 ? reverseBits(value) : value);
      }
    } else {
      throw new Error(`不支持的 LZ3 命令：${command}`);
    }
    if (output.length > 64 * 1024) throw new Error("LZ3 输出异常过大");
  }
  throw new Error("LZ3 数据没有结束标记");
}

function gbcColor(low: number, high: number): [number, number, number, number] {
  const color = low | (high << 8);
  const red = color & 0x1f;
  const green = (color >> 5) & 0x1f;
  const blue = (color >> 10) & 0x1f;
  return [Math.round((red / 31) * 255), Math.round((green / 31) * 255), Math.round((blue / 31) * 255), 255];
}

function renderSprite(tiles: Buffer, dimension: number, paletteBytes: Buffer): PNG {
  const scale = 2;
  const side = dimension * 8;
  const png = new PNG({ width: side * scale, height: side * scale });
  const palette: Array<[number, number, number, number]> = [
    [255, 255, 255, 0],
    gbcColor(paletteBytes[0], paletteBytes[1]),
    gbcColor(paletteBytes[2], paletteBytes[3]),
    [35, 28, 47, 255]
  ];
  const required = dimension * dimension * 16;
  if (tiles.length < required) throw new Error(`精灵解压长度不足：${tiles.length}/${required}`);
  for (let tileY = 0; tileY < dimension; tileY += 1) {
    for (let tileX = 0; tileX < dimension; tileX += 1) {
      // GSC front pictures store their tiles column-first. The game copies one
      // column at a time into the padded 7x7 battle-picture buffer.
      const tileOffset = (tileX * dimension + tileY) * 16;
      for (let row = 0; row < 8; row += 1) {
        const low = tiles[tileOffset + row * 2];
        const high = tiles[tileOffset + row * 2 + 1];
        for (let column = 0; column < 8; column += 1) {
          const shift = 7 - column;
          const color = palette[((high >> shift) & 1) * 2 + ((low >> shift) & 1)];
          for (let dy = 0; dy < scale; dy += 1) {
            for (let dx = 0; dx < scale; dx += 1) {
              const x = (tileX * 8 + column) * scale + dx;
              const y = (tileY * 8 + row) * scale + dy;
              const target = (y * png.width + x) * 4;
              png.data[target] = color[0];
              png.data[target + 1] = color[1];
              png.data[target + 2] = color[2];
              png.data[target + 3] = color[3];
            }
          }
        }
      }
    }
  }
  return png;
}

export async function extractPokemonSprites(rom: Buffer, profile: RomProfile, destination: string): Promise<number> {
  await mkdir(destination, { recursive: true });
  let extracted = 0;
  for (let species = 1; species <= profile.sprites.speciesCount; species += 1) {
    try {
      // Unown has 26 form pointers in a separate bank. Use form A as the
      // stable party icon; form choice depends on DVs and is not in our live DTO.
      const pointerOffset = species === 201
        ? profile.sprites.unownPointerTableOffset
        : profile.sprites.pointerTableOffset + (species - 1) * 6;
      const rawBank = rom[pointerOffset];
      const address = rom[pointerOffset + 1] | (rom[pointerOffset + 2] << 8);
      const bank = rawBank + profile.sprites.bankFix;
      const physicalOffset = bank * 0x4000 + (address - 0x4000);
      if (address < 0x4000 || address > 0x7fff || physicalOffset >= rom.length) throw new Error("无效精灵指针");
      const decompressed = decompressLz3(rom, physicalOffset);
      const dimensionByte = rom[
        profile.sprites.baseDataOffset + (species - 1) * profile.sprites.baseDataEntrySize + profile.sprites.dimensionOffset
      ];
      const dimension = dimensionByte & 0x0f;
      if (dimension < 5 || dimension > 7) throw new Error(`无效精灵尺寸：${dimension}`);
      const paletteOffset = profile.sprites.paletteTableOffset + species * 8;
      const palette = rom.subarray(paletteOffset, paletteOffset + 4);
      const png = renderSprite(decompressed, dimension, palette);
      const file = join(destination, `${String(species).padStart(3, "0")}.png`);
      await writeFile(file, PNG.sync.write(png));
      extracted += 1;
    } catch {
      // A single malformed sprite should not make the live reader unusable.
    }
  }
  return extracted;
}
