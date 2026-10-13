const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const backup = require("./backup");

app.commandLine.appendSwitch("lang", "vi");
const autoUpdater = app.isPackaged ? require("electron-updater").autoUpdater : null;
// Thư mục sao lưu tự động: Tài liệu\BG Sales Management\Sao lưu (nếu Tài liệu được OneDrive đồng bộ thì bản sao lưu cũng được đồng bộ)
const bdir = () => path.join(app.getPath("documents"), "BG Sales Management", "Sao lưu");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win;
  let closing = false;
  let forced = false;
  let timer = null;
  let lastUpd = null;
  const plain = (n) => {
    if (!n) return "";
    if (Array.isArray(n)) n = n.map((x) => x.note || "").join("\n");
    return String(n).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().slice(0, 400);
  };
  const send = (s) => {
    if (["available", "progress", "ready"].includes(s.s)) lastUpd = s;
    if (win && !win.isDestroyed()) win.webContents.send("upd:state", s);
  };

  if (autoUpdater) {
    autoUpdater.autoDownload = true;
    autoUpdater
      .on("checking-for-update", () => send({ s: "checking" }))
      .on("update-available", (i) => send({ s: "available", v: i.version, notes: plain(i.releaseNotes) }))
      .on("update-not-available", () => send({ s: "none" }))
      .on("download-progress", (p) => send({ s: "progress", p: Math.round(p.percent) }))
      .on("update-downloaded", (i) => send({ s: "ready", v: i.version, notes: plain(i.releaseNotes) }))
      .on("error", (e) => send({ s: "error", m: e.message }));
  }
  ipcMain.handle("upd:check", async () => {
    if (!autoUpdater) return { s: "dev" };
    try { await autoUpdater.checkForUpdates(); } catch (e) { send({ s: "error", m: e.message }); }
  });
  ipcMain.handle("upd:last", () => lastUpd);
  ipcMain.handle("upd:install", () => { if (autoUpdater) autoUpdater.quitAndInstall(); });

  ipcMain.handle("bk:save", (_e, text) => ({ name: backup.save(bdir(), String(text)), dir: bdir() }));
  ipcMain.handle("bk:list", () => ({ dir: bdir(), items: backup.list(bdir()) }));
  ipcMain.handle("bk:read", (_e, name) => backup.read(bdir(), String(name)));
  ipcMain.handle("bk:open", () => { fs.mkdirSync(bdir(), { recursive: true }); return shell.openPath(bdir()); });
  // Giao diện báo đã sao lưu xong khi đóng ứng dụng; nếu còn thay đổi chưa lưu thì hỏi lại.
  ipcMain.on("bk:ready", (_e, dirty) => {
    clearTimeout(timer);
    let leave = true;
    if (dirty && win && !win.isDestroyed()) {
      leave = dialog.showMessageBoxSync(win, {
        type: "question", buttons: ["Ở lại", "Thoát, bỏ thay đổi"], defaultId: 0, cancelId: 0,
        title: "Thay đổi chưa lưu", message: "Bạn có thay đổi chưa lưu.", detail: "Thoát bây giờ sẽ mất các thay đổi chưa lưu."
      }) === 1;
    }
    if (leave) { forced = true; if (win && !win.isDestroyed()) win.destroy(); } else { closing = false; }
  });

  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      width: 1360, height: 860, minWidth: 900, minHeight: 600,
      title: "BG Sales Management", backgroundColor: "#101010",
      icon: path.join(__dirname, "build", "icon.png"),
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, "preload.js") }
    });
    // Đóng cửa sổ: yêu cầu giao diện sao lưu trước, tối đa chờ 5 giây.
    win.on("close", (e) => {
      if (forced) return;
      e.preventDefault();
      if (closing) return;
      closing = true;
      win.webContents.send("bk:flush");
      timer = setTimeout(() => { forced = true; if (!win.isDestroyed()) win.destroy(); }, 5000);
    });
    win.webContents.on("will-prevent-unload", (e) => e.preventDefault());
    win.loadFile(path.join(__dirname, "index.html"));
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
    if (autoUpdater) {
      setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000);
      setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
    }
  });
  app.on("window-all-closed", () => app.quit());
}
