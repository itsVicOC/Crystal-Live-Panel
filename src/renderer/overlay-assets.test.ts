import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import layout from "../shared/overlay-layout.json";

describe("OBS game aperture", () => {
  it("has the exact native GBC aspect ratio and stays clear of the sidebar", () => {
    const { game, sidebar } = layout;
    expect(game.width * 144).toBe(game.height * 160);
    expect(game.x + game.width).toBeLessThan(sidebar.x);
    expect(game.y + game.height).toBeLessThanOrEqual(layout.height);
  });

  it("contains no opaque pixels anywhere in the gameplay rectangle", () => {
    const png = PNG.sync.read(readFileSync(new URL("../../public/overlay-background.png", import.meta.url)));
    expect([png.width, png.height]).toEqual([layout.width, layout.height]);
    const { game } = layout;
    let nonTransparent = 0;
    for (let y = game.y; y < game.y + game.height; y += 1) {
      for (let x = game.x; x < game.x + game.width; x += 1) {
        if (png.data[(y * png.width + x) * 4 + 3] !== 0) nonTransparent += 1;
      }
    }
    expect(nonTransparent).toBe(0);
    // The background surrounding the window must still be visible.
    expect(png.data[((game.y - 1) * png.width + game.x) * 4 + 3]).toBe(255);
    expect(png.data[(game.y * png.width + game.x - 1) * 4 + 3]).toBe(255);
  });
});
