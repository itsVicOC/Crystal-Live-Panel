import { LANDMARKS, MAP_LANDMARKS } from "./map-data.js";
import type { LocationState } from "./types.js";
import { landmarkLabel } from "./zh-cn.js";
import { roadPosition } from "./route-paths.js";

export const MAP_SIZE = { width: 160, height: 144 };

export function isKnownMap(mapGroup: number, mapNumber: number): boolean {
  return Number.isInteger(mapGroup) && Number.isInteger(mapNumber)
    && mapNumber > 0 && mapNumber <= (MAP_LANDMARKS[mapGroup]?.length ?? 0);
}

export function resolveLocation(mapGroup: number, mapNumber: number, x: number, y: number): LocationState {
  const landmark = isKnownMap(mapGroup, mapNumber)
    ? LANDMARKS[MAP_LANDMARKS[mapGroup][mapNumber - 1]] : undefined;
  const hasMarker = landmark && landmark.region !== "UNKNOWN";
  const road = hasMarker ? roadPosition(mapGroup, mapNumber, x, y) : null;
  const point = road ?? (hasMarker ? [landmark.x, landmark.y] : null);
  return {
    region: landmark?.region ?? "UNKNOWN",
    mapGroup, mapNumber, x, y,
    landmark: landmark?.name ?? "UNKNOWN",
    displayLabel: landmark ? landmarkLabel(landmark.key) : "未知地点",
    markerX: point ? point[0] / MAP_SIZE.width * 100 : null,
    markerY: point ? point[1] / MAP_SIZE.height * 100 : null,
    markerMode: road ? "route" : hasMarker ? "landmark" : "unknown"
  };
}
