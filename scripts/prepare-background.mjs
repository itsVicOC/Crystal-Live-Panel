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
const layout = JSON.parse(await readFile(resolve(projectRoot, "src/shared/overlay-layout.json"), "utf8"));
const png = PNG.sync.read(await readFile(source));
if (png.width !== layout.width || png.height !== layout.height) {
  throw new Error(`Expected a ${layout.width}x${layout.height} background, received ${png.width}x${png.height}`);
}

// The renderer's mask and this PNG aperture share one source of geometry.
const gameHole = layout.game;
if (gameHole.width * 9 !== gameHole.height * 10
  || gameHole.x < 0 || gameHole.y < 0
  || gameHole.x + gameHole.width > png.width || gameHole.y + gameHole.height > png.height) {
  throw new Error("The game aperture must be a bounded 10:9 rectangle");
}
for (let y = gameHole.y; y < gameHole.y + gameHole.height; y += 1) {
  for (let x = gameHole.x; x < gameHole.x + gameHole.width; x += 1) {
    png.data.fill(0, (y * png.width + x) * 4, (y * png.width + x) * 4 + 4);
  }
}
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, PNG.sync.write(png));
console.log(`Prepared ${destination}: transparent ${gameHole.width}x${gameHole.height} at ${gameHole.x},${gameHole.y}`);
