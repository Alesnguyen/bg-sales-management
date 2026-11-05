const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bgsm", {
  check: () => ipcRenderer.invoke("upd:check"),
  install: () => ipcRenderer.invoke("upd:install"),
  last: () => ipcRenderer.invoke("upd:last"),
  uiOk: () => ipcRenderer.send("ui:ok"),
  onUpdate: (cb) => ipcRenderer.on("upd:state", (_e, s) => cb(s)),
  amis: {
    status: () => ipcRenderer.invoke("amis:status"),
    saveSecrets: (o) => ipcRenderer.invoke("amis:saveSecrets", o),
    clearSecrets: () => ipcRenderer.invoke("amis:clearSecrets"),
    test: () => ipcRenderer.invoke("amis:test"),
    probe: (o) => ipcRenderer.invoke("amis:probe", o),
    fetchOrders: (o) => ipcRenderer.invoke("amis:fetchOrders", o)
  },
  backup: {
    save: (text) => ipcRenderer.invoke("bk:save", text),
    list: () => ipcRenderer.invoke("bk:list"),
    read: (name) => ipcRenderer.invoke("bk:read", name),
    open: () => ipcRenderer.invoke("bk:open"),
    onFlush: (cb) => ipcRenderer.on("bk:flush", () => cb()),
    ready: (dirty) => ipcRenderer.send("bk:ready", !!dirty)
  }
});
