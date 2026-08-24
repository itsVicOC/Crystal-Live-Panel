import type { OverlayState } from "../shared/types";
import "./overlay.css";

const root = document.querySelector<HTMLDivElement>("#overlay")!;
root.innerHTML = `
  <img class="background" src="/overlay-background.png" alt="" />
  <div id="connection" class="connection-banner waiting">WAITING FOR RETROARCH</div>
  <div id="badges" class="badges"></div>
  <div id="trainer" class="trainer"></div>
  <div id="team" class="team"></div>
  <div id="map"></div>`;

const badgeColors = ["#d9a7ff", "#63d8ff", "#f8b65b", "#a1e46a", "#75b8ff", "#ff7a9f", "#d98aff", "#eceef8"];
const badgeTop = [2, 65, 128, 191, 254, 317, 380, 443];
const badges = document.querySelector<HTMLDivElement>("#badges")!;
badges.innerHTML = badgeColors.map((color, index) => `<div class="badge" data-badge="${index}" style="--badge:${color};top:${badgeTop[index]}px"></div>`).join("");
const trainer = document.querySelector<HTMLDivElement>("#trainer")!;
const team = document.querySelector<HTMLDivElement>("#team")!;
const connection = document.querySelector<HTMLDivElement>("#connection")!;
const map = document.querySelector<HTMLDivElement>("#map")!;

function render(state: OverlayState): void {
  const labels = {
    online: "ONLINE",
    paused: "PAUSED",
    offline: "RETROARCH OFFLINE",
    waiting: "WAITING FOR GAME"
  };
  connection.className = `connection-banner ${state.connection.status}`;
  connection.textContent = labels[state.connection.status];
  const current = state.trainer;
  trainer.innerHTML = `
    <div class="trainer-value">${current?.name ?? "----------"}</div>
    <div class="trainer-value">${String(current?.id ?? 0).padStart(5, "0")}</div>
    <div class="trainer-value">${(current?.money ?? 0).toLocaleString("en-US")}</div>
    <div class="trainer-value">${String(current?.gameTimeHours ?? 0).padStart(2, "0")}:${String(current?.gameTimeMinutes ?? 0).padStart(2, "0")}</div>
    <div class="trainer-value">${current?.badgeCount ?? 0} / 8</div>`;
  document.querySelectorAll<HTMLDivElement>(".badge").forEach((element, index) => {
    element.classList.toggle("active", Boolean(current && ((current.badges >> index) & 1)));
  });
  const members = new Map(state.party.map((member) => [member.slot, member]));
  team.innerHTML = Array.from({ length: 6 }, (_, index) => {
    const member = members.get(index + 1);
    if (!member) return `<div class="member empty"></div>`;
    return `<div class="member" data-species="#${String(member.species).padStart(3, "0")}"><img src="/sprites/${member.spriteKey}.png" alt="#${member.species}" onerror="this.remove();this.parentElement.classList.add('fallback')"><span class="level">Lv.${member.level}</span></div>`;
  }).join("");
  if (state.location.region === "JOHTO") {
    const marker = state.location.markerX === null ? "" : `<div class="map-marker" style="left:${1197 + (state.location.markerX / 100) * 302}px;top:${302 + (state.location.markerY! / 100) * 180}px"></div>`;
    map.innerHTML = `${marker}<div class="map-label">${state.location.displayLabel}</div>`;
  } else if (state.location.region === "KANTO") {
    map.innerHTML = `<div class="map-label kanto">KANTO</div>`;
  } else {
    map.innerHTML = `<div class="map-label">UNKNOWN</div>`;
  }
}

async function initial(): Promise<void> {
  const response = await fetch("/api/state", { cache: "no-store" });
  render((await response.json()) as OverlayState);
}
void initial();
let retry = 1000;
function connect(): void {
  const socket = new WebSocket(`ws://${location.host}/ws`);
  socket.addEventListener("open", () => (retry = 1000));
  socket.addEventListener("message", (event) => render(JSON.parse(String(event.data)) as OverlayState));
  socket.addEventListener("close", () => {
    setTimeout(connect, retry);
    retry = Math.min(retry * 2, 10_000);
  });
}
connect();
