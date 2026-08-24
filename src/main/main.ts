import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OverlayServer } from "./overlay-server.js";
import { StateService } from "./state-service.js";
import type { ConnectionSettings } from "../shared/types.js";

interface AppConfig {
  romPath?: string;
  retroArchHost?: string;
  retroArchPort?: number;
}

const DEFAULT_CONNECTION: ConnectionSettings = { host: "127.0.0.1", port: 55355 };

const currentDirectory = dirname(fileURLToPath(import.meta.url));
let stateService: StateService;
let overlayServer: OverlayServer;
let mainWindow: BrowserWindow | null = null;

async function readConfig(path: string): Promise<AppConfig> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as AppConfig;
  } catch {
    return {};
  }
}

async function saveConfig(path: string, config: AppConfig): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2), "utf8");
}

function validateConnectionSettings(value: unknown): ConnectionSettings {
  if (!value || typeof value !== "object") throw new Error("连接设置无效");
  const candidate = value as Partial<ConnectionSettings>;
  const host = candidate.host?.trim();
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("首版仅允许连接本机地址 127.0.0.1 或 localhost");
  }
  if (!Number.isInteger(candidate.port) || candidate.port! < 1 || candidate.port! > 65535) {
    throw new Error("端口必须是 1–65535 的整数");
  }
  return { host, port: candidate.port! };
}

async function bootstrap(): Promise<void> {
  const userData = app.getPath("userData");
  const configPath = join(userData, "config.json");
  let config = await readConfig(configPath);
  stateService = new StateService(userData);
  const initialConnection = validateConnectionSettings({
    host: config.retroArchHost ?? DEFAULT_CONNECTION.host,
    port: config.retroArchPort ?? DEFAULT_CONNECTION.port
  });
  stateService.configureConnection(initialConnection);
  const rendererRoot = join(currentDirectory, "..", "..", "dist-renderer");
  overlayServer = new OverlayServer(rendererRoot, stateService);
  await overlayServer.listen();

  ipcMain.handle("select-rom", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择已支持的 Pokémon Crystal ROM",
      properties: ["openFile"],
      filters: [{ name: "Game Boy Color ROM", extensions: ["gbc"] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const romPath = result.filePaths[0];
    const state = await stateService.configureRom(romPath);
    if (state.rom.supported) {
      config = { ...config, romPath };
      await saveConfig(configPath, config);
    }
    return state;
  });
  ipcMain.handle("copy-text", (_event, value: string) => clipboard.writeText(value));
  ipcMain.handle("open-overlay", () => shell.openExternal("http://127.0.0.1:17654/overlay"));
  ipcMain.handle("get-connection-settings", () => stateService.getConnectionSettings());
  ipcMain.handle("test-connection", async (_event, value: unknown) => {
    const settings = validateConnectionSettings(value);
    stateService.configureConnection(settings);
    config = {
      ...config,
      retroArchHost: settings.host,
      retroArchPort: settings.port
    };
    await saveConfig(configPath, config);
    return stateService.probeConnection();
  });

  if (config.romPath) await stateService.configureRom(config.romPath);
  stateService.start();

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 940,
    minHeight: 650,
    backgroundColor: "#111429",
    title: "Crystal Live Panel",
    webPreferences: {
      preload: join(currentDirectory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  await mainWindow.loadURL("http://127.0.0.1:17654/control");
  mainWindow.on("closed", () => (mainWindow = null));
}

app.whenReady().then(() => void bootstrap());
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  stateService?.stop();
  void overlayServer?.close();
});
