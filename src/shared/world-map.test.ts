import { describe, expect, it } from "vitest";
import { resolveLocation, isKnownMap, MAP_SIZE } from "./world-map.js";
import { LANDMARKS, MAP_LANDMARKS } from "./map-data.js";

describe("town-map coordinates", () => {
  it.each([
    [24, 4, 140, 100], // New Bark Town
    [11, 2, 52, 92],   // Goldenrod City
    [13, 2, 52, 108],  // Pallet Town, on the Kanto map
    [24, 1, 28, 52]    // Route 26's north end belongs to Kanto
  ])("places %i:%i on the game's town-map grid", (group, number, x, y) => {
    const location = resolveLocation(group, number, 0, 0);
    expect(location.markerX! * MAP_SIZE.width / 100).toBeCloseTo(x);
    expect(location.markerY! * MAP_SIZE.height / 100).toBeCloseTo(y);
  });

  it("keeps the landmark marker stable when local room coordinates change", () => {
    const first = resolveLocation(24, 4, 2, 3);
    const moved = resolveLocation(24, 5, 15, 12);
    expect(moved).toMatchObject({ markerX: first.markerX, markerY: first.markerY, landmark: first.landmark });
  });

  it("has complete map tables and bounded coordinates for both regions", () => {
    expect(Object.keys(MAP_LANDMARKS)).toHaveLength(26);
    expect(Object.values(MAP_LANDMARKS).flat()).toHaveLength(388);
    for (const id of Object.values(MAP_LANDMARKS).flat()) {
      if (id === 0) continue; // Cable club rooms have no regional landmark.
      const landmark = LANDMARKS[id];
      expect(landmark).toBeDefined();
      expect(landmark.x).toBeGreaterThanOrEqual(0);
      expect(landmark.x).toBeLessThan(MAP_SIZE.width);
      expect(landmark.y).toBeGreaterThanOrEqual(0);
      expect(landmark.y).toBeLessThan(MAP_SIZE.height);
    }
  });

  it("does not pin invalid or special maps onto a town", () => {
    for (const [group, number] of [[0, 1], [27, 1], [24, 0], [24, 14], [20, 1], [15, 3]]) {
      expect(resolveLocation(group, number, 1, 1)).toMatchObject({ region: "UNKNOWN", markerX: null, markerY: null });
    }
    expect(isKnownMap(24, 14)).toBe(false);
    expect(isKnownMap(20, 1)).toBe(true);
  });
});
