import { LANDMARKS } from "../shared/map-data";
import { MAP_SIZE } from "../shared/world-map";
import type { Region } from "../shared/types";
import { landmarkLabel, REGION_LABELS } from "../shared/zh-cn";
import { regionRoads } from "../shared/route-paths";

// Schematic routes and landmarks use the original 160 × 144 town-map grid.
const landmarkLinks = { JOHTO: ["132,44 132,36", "84,76 76,76", "28,60 28,56", "148,68 159,68"], KANTO: [] };
const coast = {
  JOHTO: "M12 86L18 74 22 52 30 40 55 31 78 34 94 20 119 18 144 30 154 51 153 80 144 90 150 109 137 118 110 112 94 134 61 136 44 121 46 103 34 81 28 111 14 110Z",
  KANTO: "M19 27L45 27 57 40 82 38 100 29 119 33 143 45 148 72 139 91 127 106 126 125 106 135 83 124 72 127 62 112 45 112 40 91 29 84 13 77Z"
};

export function regionMapSvg(region: Exclude<Region, "UNKNOWN">): string {
  const points = Object.values(LANDMARKS).filter((landmark) => landmark.region === region);
  const cities = points.filter((landmark) => /_(CITY|TOWN)$/.test(landmark.key));
  const sites = points.filter((landmark) => !/^ROUTE_/.test(landmark.key) && !cities.includes(landmark));
  return `<svg class="region-map" viewBox="0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}" role="img" aria-label="${REGION_LABELS[region]}区域示意图">
    <defs><pattern id="map-grid" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="#c7ccff" stroke-opacity=".07" stroke-width=".4"/></pattern></defs>
    <rect width="160" height="144" fill="#131e38"/>
    <path d="${coast[region]}" fill="#273957" stroke="#45637c" stroke-width=".7"/>
    <rect width="160" height="144" fill="url(#map-grid)"/>
    <g class="map-routes">${regionRoads(region).map(([start, end]) => `<line x1="${start[0]}" y1="${start[1]}" x2="${end[0]}" y2="${end[1]}"/>`).join("")}${landmarkLinks[region].map((points) => `<polyline points="${points}"/>`).join("")}</g>
    <g class="map-sites">${sites.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="1.25"><title>${landmarkLabel(point.key)}</title></circle>`).join("")}</g>
    <g class="map-cities">${cities.map((point) => `<rect x="${point.x - 2}" y="${point.y - 2}" width="4" height="4" rx=".6"><title>${landmarkLabel(point.key)}</title></rect>`).join("")}</g>
    <text x="8" y="15" class="map-north">北 ↑</text>
    <g id="map-marker" class="map-marker" hidden><circle class="marker-ring" r="6"/><circle class="marker-core" r="2.7"/></g>
  </svg>`;
}
