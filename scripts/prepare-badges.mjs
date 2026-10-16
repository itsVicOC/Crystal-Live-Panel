import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";

// Preserve the original 16x16 pixel grid. The white background becomes
// transparent, and the other three shades can switch palettes in the renderer.
const sets = [
  {
    region: "johto", height: 176,
    source: "pret/pokecrystal @ 3bc8daa4173e96a7f4011dad3922eb6fa5dad5c6, gfx/trainer_card/badges.png"
  },
  {
    region: "kanto", height: 256,
    source: "pret/pokered @ af519899719f0754965776faac0e836a3b906e6d, gfx/trainer_card/badges.png"
  }
];
const shades = [
  { value: 170, fill: "var(--badge-light, #8b8b8b)" },
  { value: 85, fill: "var(--badge-shade, #5c5c5c)" },
  { value: 0, fill: "var(--badge-outline, #363636)" }
];
await mkdir(new URL("../public/badges/", import.meta.url), { recursive: true });
for (const { region, height, source } of sets) {
  const badges = JSON.parse(await readFile(new URL(`../src/shared/${region}-badges.json`, import.meta.url), "utf8"));
  const png = PNG.sync.read(await readFile(new URL(`../assets/${region}-badges-source.png`, import.meta.url)));
  if (png.width !== 16 || png.height !== height) throw new Error(`Expected the original 16x${height} ${region} badge sheet`);
  for (let offset = 0; offset < png.data.length; offset += 4) {
    const [red, green, blue, alpha] = png.data.subarray(offset, offset + 4);
    if (![0, 85, 170, 255].includes(red) || red !== green || red !== blue || alpha !== 255) {
      throw new Error(`Unexpected ${region} source badge palette`);
    }
  }
  const symbols = badges.map(({ key, frame }) => {
    if (!Number.isInteger(frame) || frame < 0 || frame * 16 + 16 > height) throw new Error(`Invalid ${region} badge frame: ${frame}`);
    const paths = shades.map(({ value, fill }) => {
      let path = "";
      for (let y = 0; y < 16; y += 1) {
        for (let x = 0; x < 16;) {
          if (png.data[((frame * 16 + y) * png.width + x) * 4] !== value) { x += 1; continue; }
          const start = x;
          while (x < 16 && png.data[((frame * 16 + y) * png.width + x) * 4] === value) x += 1;
          const width = x - start;
          path += `M${start} ${y}h${width}v1h-${width}z`;
        }
      }
      return `<path fill="${fill}" d="${path}"/>`;
    }).join("");
    return `<symbol id="${key}" viewBox="0 0 16 16">${paths}</symbol>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<!-- Original pixels: ${source}. Not covered by this project's MIT License. -->
${symbols.join("\n")}
</svg>\n`;
  await writeFile(new URL(`../public/badges/${region}.svg`, import.meta.url), svg);
  console.log(`Prepared ${region}: eight original badge shapes with a transparent background and a CSS-controlled palette`);
}
