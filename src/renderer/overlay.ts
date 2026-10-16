import type { OverlayState, Region } from "../shared/types";
import layout from "../shared/overlay-layout.json";
import johtoBadges from "../shared/johto-badges.json";
import kantoBadges from "../shared/kanto-badges.json";
import { MAP_SIZE } from "../shared/world-map";
import { BADGE_LABELS, KANTO_BADGE_LABELS, REGION_LABELS } from "../shared/zh-cn";
import { regionMapSvg } from "./region-map";
import "./overlay.css";

const root = document.querySelector<HTMLDivElement>("#overlay")!;
const { game, sidebar } = layout;
const variables = {
  "canvas-width": layout.width, "canvas-height": layout.height,
  "game-x": game.x, "game-y": game.y, "game-width": game.width, "game-height": game.height,
  "sidebar-x": sidebar.x, "sidebar-y": sidebar.y, "sidebar-width": sidebar.width, "sidebar-height": sidebar.height
};
for (const [name, value] of Object.entries(variables)) root.style.setProperty(`--${name}`, `${value}px`);

root.innerHTML = `
  <svg class="background" viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true">
    <defs><mask id="game-aperture" maskUnits="userSpaceOnUse" x="0" y="0" width="${layout.width}" height="${layout.height}">
      <rect width="${layout.width}" height="${layout.height}" fill="white"/>
      <rect x="${game.x}" y="${game.y}" width="${game.width}" height="${game.height}" fill="black"/>
    </mask></defs>
    <image href="/overlay-background.png" width="${layout.width}" height="${layout.height}" preserveAspectRatio="none" mask="url(#game-aperture)"/>
  </svg>
  <header class="overlay-header">
    <div class="brand"><span class="brand-crystal" aria-hidden="true">◇</span><div><h1>宝可梦 水晶 <span>直播</span></h1><p>冒险手记 · 同行相伴</p></div></div>
    <div id="connection" class="connection-banner waiting">等待游戏</div>
  </header>
  <div class="game-frame" aria-label="透明游戏窗口，${game.width} × ${game.height}"></div>
  <aside class="sidebar">
    <section class="panel map-panel">
      <div class="panel-heading"><h2>冒险足迹</h2><span id="region" class="region-tag">—</span></div>
      <div id="map" class="map-canvas"></div>
      <div class="map-caption"><span class="location-dot"></span><span id="map-label">等待游戏位置</span><span id="map-position-mode" class="map-caption-note">等待定位</span></div>
    </section>
    <section class="panel trainer-panel">
      <div class="panel-heading"><h2>训练师档案</h2><span class="panel-index">旅途记录</span></div>
      <dl id="trainer" class="trainer"></dl>
    </section>
    <section class="panel team-panel">
      <div class="panel-heading"><h2>同行伙伴</h2><span id="party-count" class="panel-index">0 / 6</span></div>
      <div id="team" class="team"></div>
    </section>
    <section class="panel badge-panel">
      <div class="badge-heading"><span id="badge-region-label">城都徽章</span><span id="badge-count">0 / 8 · 合计 0 / 16</span></div>
      <div id="badges" class="badges"></div>
    </section>
  </aside>`;

const badges = document.querySelector<HTMLDivElement>("#badges")!;
type BadgeRegion = Exclude<Region, "UNKNOWN">;
const badgeSets = {
  JOHTO: { definitions: johtoBadges, labels: BADGE_LABELS, asset: "johto" },
  KANTO: { definitions: kantoBadges, labels: KANTO_BADGE_LABELS, asset: "kanto" }
};
let badgeRegion: BadgeRegion = "JOHTO";
function renderBadgeShapes(): void {
  const set = badgeSets[badgeRegion];
  document.querySelector("#badge-region-label")!.textContent = `${REGION_LABELS[badgeRegion]}徽章`;
  badges.innerHTML = set.definitions.map((badge, index) => `<div class="badge" data-badge="${badge.key}" title="${set.labels[index]}" aria-label="${set.labels[index]}：未获得"><svg class="badge-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/badges/${set.asset}.svg#${badge.key}"/></svg></div>`).join("");
}
renderBadgeShapes();
const trainer = document.querySelector<HTMLDListElement>("#trainer")!;
const team = document.querySelector<HTMLDivElement>("#team")!;
const connection = document.querySelector<HTMLDivElement>("#connection")!;
const map = document.querySelector<HTMLDivElement>("#map")!;
const regionLabel = document.querySelector<HTMLSpanElement>("#region")!;
const mapLabel = document.querySelector<HTMLSpanElement>("#map-label")!;
let displayedRegion: Region | null = null;
let partyKey = "";
let previousMarker: { key: string; x: number; y: number } | null = null;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function render(state: OverlayState): void {
  const labels = { online: "游戏已连接", paused: "游戏已暂停", offline: "连接已中断", waiting: "等待游戏" };
  connection.className = `connection-banner ${state.connection.status}`;
  connection.textContent = labels[state.connection.status];
  const current = state.trainer;
  trainer.innerHTML = [
    ["姓名", current?.name ?? "—"],
    ["训练师编号", current ? String(current.id).padStart(5, "0") : "—"],
    ["持有金钱", current ? `${current.money.toLocaleString("zh-CN")} 元` : "—"],
    ["游戏时长", current ? `${String(current.gameTimeHours).padStart(2, "0")}:${String(current.gameTimeMinutes).padStart(2, "0")}` : "—"]
  ].map(([label, value]) => `<div class="trainer-row"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  // Keep the last regional badge set on ships and in other unpinned locations.
  if (state.location.region !== "UNKNOWN" && badgeRegion !== state.location.region) {
    badgeRegion = state.location.region;
    renderBadgeShapes();
  }
  const set = badgeSets[badgeRegion];
  const flags = badgeRegion === "KANTO" ? current?.kantoBadges ?? 0 : current?.badges ?? 0;
  const count = badgeRegion === "KANTO" ? current?.kantoBadgeCount ?? 0 : current?.badgeCount ?? 0;
  const total = (current?.badgeCount ?? 0) + (current?.kantoBadgeCount ?? 0);
  document.querySelector("#badge-count")!.textContent = `${count} / 8 · 合计 ${total} / 16`;
  document.querySelectorAll<HTMLDivElement>(".badge").forEach((element, index) => {
    const active = Boolean(flags & set.definitions[index].flag);
    element.classList.toggle("active", active);
    element.setAttribute("aria-label", `${set.labels[index]}：${active ? "已获得" : "未获得"}`);
  });
  document.querySelector("#party-count")!.textContent = `${state.party.length} / 6`;
  const nextPartyKey = JSON.stringify(state.party);
  if (partyKey !== nextPartyKey) {
    partyKey = nextPartyKey;
    const members = new Map(state.party.map((member) => [member.slot, member]));
    team.innerHTML = Array.from({ length: 6 }, (_, index) => {
      const member = members.get(index + 1);
      if (!member) return `<div class="member empty"><span class="slot-number">0${index + 1}</span><span class="empty-ball">◉</span><span class="empty-label">空位</span></div>`;
      const species = String(member.species).padStart(3, "0");
      return `<div class="member"><span class="slot-number">0${index + 1}</span><img src="/sprites/${species}.png" alt="宝可梦 #${species}" onerror="this.hidden=true;this.parentElement.classList.add('fallback')"><span class="species">#${species}</span><span class="level">${member.level} 级</span></div>`;
    }).join("");
  }
  const location = state.location;
  if (displayedRegion !== location.region) {
    displayedRegion = location.region;
    regionLabel.textContent = location.region === "UNKNOWN" ? "—" : REGION_LABELS[location.region];
    map.innerHTML = location.region === "UNKNOWN"
      ? '<div class="map-unknown"><span>◇</span><p>等待区域地标</p></div>'
      : regionMapSvg(location.region);
  }
  mapLabel.textContent = location.landmark === "UNKNOWN" ? "等待游戏位置" : location.displayLabel;
  document.querySelector("#map-position-mode")!.textContent = { route: "道路定位", landmark: "地标定位", unknown: "暂无定位" }[location.markerMode];
  const marker = map.querySelector<SVGGElement>("#map-marker");
  if (marker) {
    const hasMarker = Number.isFinite(location.markerX) && Number.isFinite(location.markerY)
      && location.markerX! >= 0 && location.markerX! <= 100 && location.markerY! >= 0 && location.markerY! <= 100;
    marker.toggleAttribute("hidden", !hasMarker);
    if (hasMarker) {
      const x = location.markerX! * MAP_SIZE.width / 100;
      const y = location.markerY! * MAP_SIZE.height / 100;
      const key = `${location.region}:${location.mapGroup}:${location.mapNumber}`;
      const smooth = location.markerMode === "route" && previousMarker?.key === key
        && Math.hypot(x - previousMarker.x, y - previousMarker.y) <= 12;
      marker.style.transition = smooth ? "transform 180ms linear" : "none";
      marker.setAttribute("transform", `translate(${x} ${y})`);
      previousMarker = { key, x, y };
    } else previousMarker = null;
  } else previousMarker = null;
}

async function initial(): Promise<void> {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (response.ok) render((await response.json()) as OverlayState);
  } catch {
    // The socket will populate the panel when the local server is available.
  }
}
void initial();
let retry = 1000;
function connect(): void {
  const socket = new WebSocket(`ws://${location.host}/ws`);
  socket.addEventListener("open", () => (retry = 1000));
  socket.addEventListener("message", (event) => render(JSON.parse(String(event.data)) as OverlayState));
  socket.addEventListener("close", () => {
    connection.className = "connection-banner offline";
    connection.textContent = "连接已中断";
    setTimeout(connect, retry);
    retry = Math.min(retry * 2, 10_000);
  });
}
connect();
