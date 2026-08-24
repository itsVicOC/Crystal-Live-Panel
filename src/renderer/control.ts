import type {
  ConnectionProbeResult,
  ConnectionSettings,
  OverlayState
} from "../shared/types";
import "./control.css";

const OBS_URL = "http://127.0.0.1:17654/overlay";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand"><div class="brand-gem"></div><div><h1>Crystal Live Panel</h1><div class="subtitle">RetroArch → OBS 实时直播状态面板</div></div></div>
      <div id="status" class="status-pill waiting"><span class="status-dot"></span><span>等待 RetroArch</span></div>
    </header>
    <div id="bridgeAlert" class="bridge-alert" hidden></div>
    <section class="grid">
      <article class="card preview-card">
        <div class="card-head"><h2>直播预览 · 1536 × 1024</h2><button id="openOverlay" class="btn">在浏览器打开</button></div>
        <div id="preview" class="preview-stage"><iframe src="/overlay" title="OBS overlay preview"></iframe></div>
        <div class="preview-note">透明区域由 OBS 下层的 RetroArch 捕获源填充；请保持游戏画面原比例居中。</div>
      </article>
      <article class="card">
        <div class="card-head"><h2>OBS 浏览器源</h2></div>
        <div class="card-body">
          <div>在 OBS 添加“浏览器”源，宽度设为 <b>1536</b>，高度设为 <b>1024</b>。</div>
          <div class="obs-url"><code>${OBS_URL}</code><button id="copyUrl" class="btn">复制</button></div>
        </div>
      </article>
      <article class="card">
        <div class="card-head"><h2>ROM 与连接诊断</h2></div>
        <div class="card-body">
          <div id="romBox" class="rom-box"></div>
          <div class="actions"><button id="selectRom" class="btn primary">选择 / 重新选择 ROM</button></div>
          <div class="connection-form">
            <label>RetroArch 地址<input id="retroArchHost" value="127.0.0.1" spellcheck="false"></label>
            <label>端口<input id="retroArchPort" type="number" min="1" max="65535" value="55355"></label>
            <button id="testConnection" class="btn">保存并测试连接</button>
          </div>
          <div id="probeResult" class="diag-list"></div>
          <div class="help"><b>RetroArch 设置：</b>Settings → Network → Network Commands 开启并重启 RetroArch。应用只会发送 VERSION、GET_STATUS 和 READ_CORE_RAM。</div>
          <div id="diagnostics" class="diag-list" style="margin-top:14px"></div>
        </div>
      </article>
    </section>
  </main>`;

const statusElement = document.querySelector<HTMLDivElement>("#status")!;
const romBox = document.querySelector<HTMLDivElement>("#romBox")!;
const diagnostics = document.querySelector<HTMLDivElement>("#diagnostics")!;
const preview = document.querySelector<HTMLDivElement>("#preview")!;
const iframe = preview.querySelector("iframe")!;
const bridgeAlert = document.querySelector<HTMLDivElement>("#bridgeAlert")!;
const hostInput = document.querySelector<HTMLInputElement>("#retroArchHost")!;
const portInput = document.querySelector<HTMLInputElement>("#retroArchPort")!;
const probeResult = document.querySelector<HTMLDivElement>("#probeResult")!;
const selectRomButton = document.querySelector<HTMLButtonElement>("#selectRom")!;
const testConnectionButton = document.querySelector<HTMLButtonElement>("#testConnection")!;

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function requireBridge() {
  if (window.crystalPanel) return window.crystalPanel;
  const message = "Electron 页面桥接加载失败。请使用 1.0.1 或更新版本，并完整解压后运行；当前 ROM/复制按钮无法调用主进程。";
  bridgeAlert.hidden = false;
  bridgeAlert.textContent = message;
  throw new Error(message);
}

function showActionError(error: unknown): void {
  bridgeAlert.hidden = false;
  bridgeAlert.textContent = error instanceof Error ? error.message : String(error);
}

function renderProbe(result: ConnectionProbeResult): void {
  probeResult.innerHTML = result.diagnostics
    .map((item) => `<div class="diag ${item.level}"><b>${escapeHtml(item.code)}</b><br>${escapeHtml(item.message)}</div>`)
    .join("");
  if (result.statusRaw) {
    probeResult.innerHTML += `<div class="diag raw"><b>GET_STATUS 原始回包</b><br><code>${escapeHtml(result.statusRaw)}</code></div>`;
  }
}

function render(state: OverlayState): void {
  const labels = { online: "RetroArch 已连接", paused: "RetroArch 已暂停", offline: "RetroArch 离线", waiting: "等待游戏内容" };
  statusElement.className = `status-pill ${state.connection.status}`;
  statusElement.lastElementChild!.textContent = labels[state.connection.status];
  romBox.innerHTML = state.rom.configured
    ? `<div class="rom-title">${state.rom.supported ? "✓" : "✕"} ${escapeHtml(state.rom.title ?? "未知 ROM")}</div><div class="rom-meta">CRC32 ${escapeHtml(state.rom.crc32 ?? "—")}<br>Sprites ${state.rom.spritesReady ? "ready" : "not ready"}</div>`
    : `<div class="rom-title">尚未选择 ROM</div><div class="rom-meta">请选择 CRC32 9AB996C9 的附件 ROM</div>`;
  diagnostics.innerHTML = state.diagnostics.length
    ? state.diagnostics.map((item) => `<div class="diag ${item.level}"><b>${escapeHtml(item.code)}</b><br>${escapeHtml(item.message)}</div>`).join("")
    : `<div class="diag">连接后将在这里显示字段一致性检查。</div>`;
}

function scalePreview(): void {
  iframe.style.transform = `scale(${preview.clientWidth / 1536})`;
}
new ResizeObserver(scalePreview).observe(preview);
scalePreview();

async function loadState(): Promise<void> {
  const response = await fetch("/api/state", { cache: "no-store" });
  render((await response.json()) as OverlayState);
}
void loadState();
const socket = new WebSocket(`ws://${location.host}/ws`);
socket.addEventListener("message", (event) => render(JSON.parse(String(event.data)) as OverlayState));

async function loadConnectionSettings(): Promise<void> {
  try {
    const settings = await requireBridge().getConnectionSettings();
    hostInput.value = settings.host;
    portInput.value = String(settings.port);
  } catch (error) {
    showActionError(error);
  }
}
void loadConnectionSettings();

selectRomButton.addEventListener("click", async () => {
  try {
    selectRomButton.disabled = true;
    const state = await requireBridge().selectRom();
    if (state) render(state);
  } catch (error) {
    showActionError(error);
  } finally {
    selectRomButton.disabled = false;
  }
});
document.querySelector("#copyUrl")!.addEventListener("click", async () => {
  try {
    await requireBridge().copyText(OBS_URL);
    const button = document.querySelector<HTMLButtonElement>("#copyUrl")!;
    button.textContent = "已复制";
    setTimeout(() => (button.textContent = "复制"), 1200);
  } catch (error) {
    showActionError(error);
  }
});
document.querySelector("#openOverlay")!.addEventListener("click", async () => {
  try {
    await requireBridge().openOverlay();
  } catch (error) {
    showActionError(error);
  }
});
testConnectionButton.addEventListener("click", async () => {
  try {
    testConnectionButton.disabled = true;
    testConnectionButton.textContent = "正在测试…";
    probeResult.innerHTML = `<div class="diag">正在依次测试 VERSION、GET_STATUS 和 READ_CORE_RAM…</div>`;
    const settings: ConnectionSettings = {
      host: hostInput.value.trim(),
      port: Number(portInput.value)
    };
    renderProbe(await requireBridge().testConnection(settings));
  } catch (error) {
    showActionError(error);
    probeResult.innerHTML = `<div class="diag error"><b>TEST_FAILED</b><br>${escapeHtml(error instanceof Error ? error.message : error)}</div>`;
  } finally {
    testConnectionButton.disabled = false;
    testConnectionButton.textContent = "保存并测试连接";
  }
});
