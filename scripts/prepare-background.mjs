import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const source = process.argv[2];
if (!source) {
  throw new Error("Usage: npm run prepare:background -- /absolute/path/to/background.png");
}
const destination = resolve(projectRoot, "public", "overlay-background.png");
const png = PNG.sync.read(await readFile(source));
if (png.width !== 1536 || png.height !== 1024) {
  throw new Error(`Expected a 1536x1024 background, received ${png.width}x${png.height}`);
}

// The artwork's white play area is about 1064x768. A centered 10:9 hole keeps
// the native GBC ratio and leaves the artwork's white side mats visible.
const gameHole = { x: 194, y: 108, width: 854, height: 768 };
for (let y = gameHole.y; y < gameHole.y + gameHole.height; y += 1) {
  for (let x = gameHole.x; x < gameHole.x + gameHole.width; x += 1) {
    png.data[(y * png.width + x) * 4 + 3] = 0;
  }
}
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, PNG.sync.write(png));
console.log(`Prepared ${destination}`);
