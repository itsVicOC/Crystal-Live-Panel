const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("crystalPanel", {
  selectRom: () => ipcRenderer.invoke("select-rom"),
  copyText: (value) => ipcRenderer.invoke("copy-text", value),
  openOverlay: () => ipcRenderer.invoke("open-overlay"),
  getConnectionSettings: () => ipcRenderer.invoke("get-connection-settings"),
  testConnection: (settings) => ipcRenderer.invoke("test-connection", settings)
});
