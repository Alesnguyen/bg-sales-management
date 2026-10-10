const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bgsm", {
  check: () => ipcRenderer.invoke("upd:check"),
  install: () => ipcRenderer.invoke("upd:install"),
  onUpdate: (cb) => ipcRenderer.on("upd:state", (_e, s) => cb(s))
});
