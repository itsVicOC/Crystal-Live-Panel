import { describe, expect, it } from "vitest";
import { ROAD_MAPS, type MapEdge, type Point } from "./route-data.js";
import { roadPosition, regionRoads } from "./route-paths.js";
import { resolveLocation } from "./world-map.js";

const opposite: Record<MapEdge, MapEdge> = { north: "south", south: "north", east: "west", west: "east" };

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const squared = dx * dx + dy * dy;
  const t = squared === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / squared));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

describe("road tracking", () => {
  it("moves forward and backward between the two towns on Route 29", () => {
    expect(roadPosition(24, 3, 0, 8)).toEqual([100, 100]);
    expect(roadPosition(24, 3, 59, 8)).toEqual([140, 100]);
    const outbound = [0, 10, 20, 30, 40, 50, 59].map((x) => roadPosition(24, 3, x, 8)![0]);
    expect(outbound.every((x, i) => i === 0 || x > outbound[i - 1])).toBe(true);
    const inbound = [59, 50, 40, 30, 20, 10, 0].map((x) => roadPosition(24, 3, x, 8)![0]);
    expect(inbound).toEqual([...outbound].reverse());
  });

  it("moves north and south on a Kanto road", () => {
    expect(roadPosition(13, 1, 9, 0)).toEqual([52, 76]);
    expect(roadPosition(13, 1, 9, 35)).toEqual([52, 108]);
    expect(roadPosition(13, 1, 9, 10)![1]).toBeLessThan(roadPosition(13, 1, 9, 25)![1]);
  });

  it("follows the bend of Route 34 instead of cutting diagonally", () => {
    const northLeg = roadPosition(11, 1, 9, 20)!;
    const eastLeg = roadPosition(11, 1, 15, 45)!;
    expect(northLeg[0]).toBe(52);
    expect(northLeg[1]).toBeGreaterThan(92);
    expect(northLeg[1]).toBeLessThan(124);
    expect(eastLeg[1]).toBe(124);
    expect(eastLeg[0]).toBeGreaterThan(52);
    expect(eastLeg[0]).toBeLessThan(68);
  });

  it("keeps the two parts of Route 10 in separate position ranges", () => {
    expect(roadPosition(7, 14, 9, 0)).toEqual([132, 52]);
    expect(roadPosition(7, 14, 9, 17)).toEqual([132, 60]);
    expect(roadPosition(18, 3, 9, 0)).toEqual([132, 60]);
    expect(roadPosition(18, 3, 9, 17)).toEqual([132, 68]);
  });

  it("joins adjacent roads at their actual connection tiles", () => {
    for (const [id, map] of Object.entries(ROAD_MAPS)) {
      const region = Number(map.key.match(/\d+/)![0]) <= 28 ? "KANTO" : "JOHTO";
      for (const [edge, exit] of Object.entries(map.exits)) {
        const entry = Object.entries(ROAD_MAPS).find(([, candidate]) => candidate.key === exit.target);
        if (!entry) continue;
        const [targetId, target] = entry;
        const targetRegion = Number(target.key.match(/\d+/)![0]) <= 28 ? "KANTO" : "JOHTO";
        if (targetRegion !== region) continue;
        const reverse = target.exits[opposite[edge as MapEdge]];
        expect(reverse?.target).toBe(map.key);
        const a = roadPosition(...id.split(":").map(Number) as [number, number], Math.round(exit.local[0]), Math.round(exit.local[1]))!;
        const b = roadPosition(...targetId.split(":").map(Number) as [number, number], Math.round(reverse!.local[0]), Math.round(reverse!.local[1]))!;
        // Odd-width connection overlaps can have half-step centers. The nearest
        // real player tile must still agree within less than one screen pixel.
        expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `${map.key} → ${target.key}`).toBeLessThan(.25);
      }
    }
  });

  it("covers every outdoor road and keeps the marker on the rendered centerline", () => {
    expect(Object.values(ROAD_MAPS)).toHaveLength(47);
    for (const [id, map] of Object.entries(ROAD_MAPS)) {
      const [group, number] = id.split(":").map(Number);
      for (const x of [0, Math.floor(map.width / 2), map.width - 1]) {
        for (const y of [0, Math.floor(map.height / 2), map.height - 1]) {
          const location = resolveLocation(group, number, x, y);
          expect(location.markerMode, map.key).toBe("route");
          expect(location.markerX).toBeGreaterThanOrEqual(0);
          expect(location.markerX).toBeLessThanOrEqual(100);
          expect(location.markerY).toBeGreaterThanOrEqual(0);
          expect(location.markerY).toBeLessThanOrEqual(100);
          const point: Point = [location.markerX! * 1.6, location.markerY! * 1.44];
          expect(regionRoads(location.region as "JOHTO" | "KANTO")
            .some(([a, b]) => distanceToSegment(point, a, b) < 1e-6), map.key).toBe(true);
        }
      }
    }
  });

  it("keeps route buildings pinned and rejects coordinates outside road bounds", () => {
    expect(resolveLocation(24, 13, 2, 3)).toMatchObject({ landmark: "ROUTE 29", markerMode: "landmark" });
    for (const [x, y] of [[-1, 0], [60, 8], [10, 18], [255, 255], [NaN, 8]]) {
      expect(roadPosition(24, 3, x, y)).toBeNull();
      expect(resolveLocation(24, 3, x, y)).toMatchObject({ markerMode: "landmark", markerX: 80 });
    }
  });
});
