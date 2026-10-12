const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bgsm", {
  check: () => ipcRenderer.invoke("upd:check"),
  install: () => ipcRenderer.invoke("upd:install"),
  onUpdate: (cb) => ipcRenderer.on("upd:state", (_e, s) => cb(s)),
  backup: {
    save: (text) => ipcRenderer.invoke("bk:save", text),
    list: () => ipcRenderer.invoke("bk:list"),
    read: (name) => ipcRenderer.invoke("bk:read", name),
    open: () => ipcRenderer.invoke("bk:open"),
    onFlush: (cb) => ipcRenderer.on("bk:flush", () => cb()),
    ready: (dirty) => ipcRenderer.send("bk:ready", !!dirty)
  }
});
