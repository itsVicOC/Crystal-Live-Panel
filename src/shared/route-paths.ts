import { ROAD_MAPS, type MapEdge, type Point, type RoadMap } from "./route-data.js";
import type { Region } from "./types.js";

type Exit = readonly [MapEdge, Point];
interface RouteSpec {
  ends: readonly [Exit, Exit];
  branches?: readonly Exit[];
  bend?: { local: Point; world: Point };
}
interface Vertex { local: Point; world: Point }
type Segment = readonly [Vertex, Vertex];

// Town-map centerlines. Exit tiles and map sizes come from the game, while
// these shared schematic anchors also draw the roads shown by the renderer.
const ROUTES: Record<string, RouteSpec> = {
  ROUTE_1: { ends: [["north", [52, 76]], ["south", [52, 108]]] },
  ROUTE_2: { ends: [["north", [52, 52]], ["south", [52, 76]]] },
  ROUTE_3: { ends: [["west", [52, 52]], ["east", [76, 52]]] },
  ROUTE_4: { ends: [["west", [76, 52]], ["east", [100, 52]]] },
  ROUTE_5: { ends: [["north", [100, 52]], ["south", [100, 68]]] },
  ROUTE_6: { ends: [["north", [100, 68]], ["south", [100, 84]]] },
  ROUTE_7: { ends: [["west", [76, 68]], ["east", [100, 68]]] },
  ROUTE_8: { ends: [["west", [100, 68]], ["east", [132, 68]]] },
  ROUTE_9: { ends: [["west", [100, 52]], ["south", [132, 52]]] },
  ROUTE_10_NORTH: { ends: [["north", [132, 52]], ["south", [132, 60]]] },
  ROUTE_10_SOUTH: { ends: [["north", [132, 60]], ["south", [132, 68]]] },
  ROUTE_11: { ends: [["west", [100, 84]], ["east", [132, 84]]] },
  ROUTE_12: { ends: [["north", [132, 68]], ["south", [132, 100]]], branches: [["west", [132, 84]]] },
  ROUTE_13: { ends: [["north", [132, 100]], ["south", [116, 100]]] },
  ROUTE_14: { ends: [["north", [116, 100]], ["west", [116, 116]]] },
  ROUTE_15: { ends: [["west", [92, 116]], ["east", [116, 116]]] },
  ROUTE_16: { ends: [["east", [76, 68]], ["south", [68, 68]]] },
  ROUTE_17: { ends: [["north", [68, 68]], ["south", [68, 120]]], branches: [["east", [68, 116]]] },
  ROUTE_18: { ends: [["west", [68, 116]], ["east", [92, 116]]] },
  ROUTE_19: { ends: [["north", [92, 116]], ["west", [92, 132]]] },
  ROUTE_20: { ends: [["west", [52, 132]], ["east", [92, 132]]] },
  ROUTE_21: { ends: [["north", [52, 108]], ["south", [52, 132]]] },
  ROUTE_22: { ends: [["west", [28, 68]], ["east", [52, 76]]], bend: { local: [.75, .5], world: [52, 68] } },
  ROUTE_23: { ends: [["north", [28, 36]], ["south", [28, 52]]] },
  ROUTE_24: { ends: [["north", [100, 36]], ["south", [100, 52]]] },
  ROUTE_25: { ends: [["south", [100, 36]], ["east", [116, 36]]] },
  ROUTE_26: { ends: [["north", [28, 52]], ["south", [28, 104]]], branches: [["west", [28, 100]]] },
  ROUTE_27: { ends: [["west", [4, 100]], ["east", [28, 100]]] },
  ROUTE_28: { ends: [["west", [8, 68]], ["east", [28, 68]]] },
  ROUTE_29: { ends: [["west", [100, 100]], ["east", [140, 100]]], branches: [["north", [120, 100]]] },
  ROUTE_30: { ends: [["north", [100, 68]], ["south", [100, 100]]] },
  ROUTE_31: { ends: [["south", [100, 68]], ["west", [84, 60]]] },
  ROUTE_32: { ends: [["north", [84, 60]], ["south", [84, 124]]] },
  ROUTE_33: { ends: [["north", [84, 124]], ["west", [68, 124]]] },
  ROUTE_34: { ends: [["north", [52, 92]], ["east", [68, 124]]] },
  ROUTE_35: { ends: [["north", [52, 60]], ["south", [52, 92]]] },
  ROUTE_36: { ends: [["south", [52, 60]], ["east", [84, 60]]], branches: [["north", [68, 60]]] },
  ROUTE_37: { ends: [["north", [68, 44]], ["south", [68, 60]]] },
  ROUTE_38: { ends: [["west", [36, 44]], ["east", [68, 44]]] },
  ROUTE_39: { ends: [["east", [36, 44]], ["south", [36, 60]]] },
  ROUTE_40: { ends: [["east", [36, 60]], ["south", [28, 76]]] },
  ROUTE_41: { ends: [["north", [28, 76]], ["west", [20, 100]]] },
  ROUTE_42: { ends: [["west", [68, 44]], ["east", [108, 44]]] },
  ROUTE_43: { ends: [["north", [108, 28]], ["south", [108, 44]]] },
  ROUTE_44: { ends: [["west", [108, 44]], ["east", [132, 44]]] },
  ROUTE_45: { ends: [["north", [132, 44]], ["south", [132, 92]]], branches: [["west", [132, 88]]] },
  ROUTE_46: { ends: [["south", [120, 100]], ["east", [132, 88]]] }
};

const vertical = (edge: MapEdge) => edge === "north" || edge === "south";
const interpolate = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function exitVertex(map: RoadMap, [edge, world]: Exit): Vertex {
  const local = map.exits[edge]?.local ?? (vertical(edge)
    ? [(map.width - 1) / 2, edge === "north" ? 0 : map.height - 1]
    : [edge === "west" ? 0 : map.width - 1, (map.height - 1) / 2]);
  return { local, world };
}

function project(point: Point, start: Point, end: Point): { t: number; distance: number; point: Point } {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared));
  const nearest = interpolate(start, end, t);
  return { t, point: nearest, distance: (point[0] - nearest[0]) ** 2 + (point[1] - nearest[1]) ** 2 };
}

function buildSegments(map: RoadMap, spec: RouteSpec): Segment[] {
  const start = exitVertex(map, spec.ends[0]);
  const end = exitVertex(map, spec.ends[1]);
  const vertices: Vertex[] = [start];
  if (spec.bend) {
    vertices.push({ local: [spec.bend.local[0] * (map.width - 1), spec.bend.local[1] * (map.height - 1)], world: spec.bend.world });
  } else if (vertical(spec.ends[0][0]) !== vertical(spec.ends[1][0])) {
    const v = vertical(spec.ends[0][0]) ? start : end;
    const h = vertical(spec.ends[0][0]) ? end : start;
    vertices.push({ local: [v.local[0], h.local[1]], world: [v.world[0], h.world[1]] });
  } else if (vertical(spec.ends[0][0]) && start.local[0] !== end.local[0]) {
    const localY = (start.local[1] + end.local[1]) / 2;
    const worldY = (start.world[1] + end.world[1]) / 2;
    vertices.push({ local: [start.local[0], localY], world: [start.world[0], worldY] },
      { local: [end.local[0], localY], world: [end.world[0], worldY] });
  }
  vertices.push(end);
  const branches: Segment[] = [];
  for (const branch of spec.branches ?? []) {
    const exit = exitVertex(map, branch);
    let best = { distance: Infinity, index: 0, point: start.local };
    for (let index = 0; index < vertices.length - 1; index += 1) {
      const candidate = project(exit.local, vertices[index].local, vertices[index + 1].local);
      if (candidate.distance < best.distance) best = { distance: candidate.distance, index, point: candidate.point };
    }
    // Anchor a junction once for both its main road and its side exit.
    const junction: Vertex = { local: best.point, world: exit.world };
    vertices.splice(best.index + 1, 0, junction);
    branches.push([exit, junction]);
  }
  return [...vertices.slice(1).map((vertex, index): Segment => [vertices[index], vertex]), ...branches];
}

const geometry = Object.fromEntries(Object.entries(ROAD_MAPS).map(([id, map]) => {
  const spec = ROUTES[map.key];
  if (!spec) throw new Error(`Missing road centerline: ${map.key}`);
  return [id, { map, segments: buildSegments(map, spec), region: Number(map.key.match(/^ROUTE_(\d+)/)![1]) <= 28 ? "KANTO" : "JOHTO" }];
}));

export function roadPosition(mapGroup: number, mapNumber: number, x: number, y: number): Point | null {
  const road = geometry[`${mapGroup}:${mapNumber}`];
  if (!road || !Number.isInteger(x) || !Number.isInteger(y)
    || x < 0 || x >= road.map.width || y < 0 || y >= road.map.height) return null;
  let bestDistance = Infinity;
  let result: Point | null = null;
  for (const [start, end] of road.segments) {
    const candidate = project([x, y], start.local, end.local);
    if (candidate.distance < bestDistance) {
      bestDistance = candidate.distance;
      result = interpolate(start.world, end.world, candidate.t);
    }
  }
  return result;
}

export function regionRoads(region: Exclude<Region, "UNKNOWN">): readonly (readonly [Point, Point])[] {
  return Object.values(geometry).filter((road) => road.region === region).flatMap((road) =>
    road.segments.filter(([a, b]) => a.world[0] !== b.world[0] || a.world[1] !== b.world[1])
      .map(([a, b]): readonly [Point, Point] => [a.world, b.world]));
}
