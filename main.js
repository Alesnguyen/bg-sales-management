const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require("electron");
const path = require("path");
app.commandLine.appendSwitch("lang", "vi");
const autoUpdater = app.isPackaged ? require("electron-updater").autoUpdater : null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win;
  const send = (s) => { if (win && !win.isDestroyed()) win.webContents.send("upd:state", s); };
  if (autoUpdater) {
    autoUpdater.autoDownload = true;
    autoUpdater
      .on("checking-for-update", () => send({ s: "checking" }))
      .on("update-available", (i) => send({ s: "available", v: i.version }))
      .on("update-not-available", () => send({ s: "none" }))
      .on("download-progress", (p) => send({ s: "progress", p: Math.round(p.percent) }))
      .on("update-downloaded", (i) => send({ s: "ready", v: i.version }))
      .on("error", (e) => send({ s: "error", m: e.message }));
  }
  ipcMain.handle("upd:check", async () => {
    if (!autoUpdater) return { s: "dev" };
    try { await autoUpdater.checkForUpdates(); } catch (e) { send({ s: "error", m: e.message }); }
  });
  ipcMain.handle("upd:install", () => { if (autoUpdater) autoUpdater.quitAndInstall(); });
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      width: 1360, height: 860, minWidth: 900, minHeight: 600,
      title: "BG Sales Management", backgroundColor: "#101010",
      icon: path.join(__dirname, "build", "icon.png"),
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, "preload.js") }
    });
    win.webContents.on("will-prevent-unload", (e) => {
      const c = dialog.showMessageBoxSync(win, { type: "question", buttons: ["Ở lại", "Thoát, bỏ thay đổi"], defaultId: 0, cancelId: 0, title: "Thay đổi chưa lưu", message: "Bạn có thay đổi chưa lưu.", detail: "Thoát bây giờ sẽ mất các thay đổi chưa lưu." });
      if (c === 1) e.preventDefault();
    });
    win.loadFile(path.join(__dirname, "index.html"));
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
    if (autoUpdater) setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000);
  });
  app.on("window-all-closed", () => app.quit());
}
