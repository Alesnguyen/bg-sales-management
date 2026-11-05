const { app, BrowserWindow, Menu, shell, ipcMain, dialog, net, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
const backup = require("./backup");
const uiu = require("./uiupdate");
const amisLib = require("./amis");

app.commandLine.appendSwitch("lang", "vi");
const autoUpdater = app.isPackaged ? require("electron-updater").autoUpdater : null;
// Thư mục sao lưu tự động: Tài liệu\BG Sales Management\Sao lưu (nếu Tài liệu được OneDrive đồng bộ thì bản sao lưu cũng được đồng bộ)
const bdir = () => path.join(app.getPath("documents"), "BG Sales Management", "Sao lưu");
// Cập nhật nhẹ: chỉ tải phần giao diện (vài trăm KB) thay vì cả bộ cài (~90 MB). Xem uiupdate.js và PHAT-HANH-RIENG-TU.md.
const UI_BASE = "https://raw.githubusercontent.com/Alesnguyen/bg-sales-management-releases/ui/";
const uidir = () => path.join(app.getPath("userData"), "ui");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win;
  let closing = false;
  let forced = false;
  let timer = null;
  let lastUpd = null;
  let uiNow = null;      // giao diện tải về đang chạy (null = giao diện đi kèm bộ cài)
  let uiPending = null;  // bản giao diện mới đã tải xong, chờ áp dụng
  let uiOk = false;      // giao diện đã báo khởi động xong
  let okTimer = null;
  let reloadTo = null;   // đang chờ sao lưu xong để nạp giao diện mới
  const plain = (n) => {
    if (!n) return "";
    if (Array.isArray(n)) n = n.map((x) => x.note || "").join("\n");
    return String(n).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().slice(0, 400);
  };
  const send = (s) => {
    // Đã có bản giao diện mới sẵn sàng thì không để kết quả "không có bản mới/đang kiểm tra" của bộ cài che mất.
    if (uiPending && ["checking", "none", "error"].includes(s.s)) return;
    if (["available", "progress", "ready"].includes(s.s)) lastUpd = s;
    if (win && !win.isDestroyed()) win.webContents.send("upd:state", s);
  };

  if (autoUpdater) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;   // đóng ứng dụng là tự cài ngầm, không phải chờ thêm lần khởi động lại
    autoUpdater.autoRunAppAfterInstall = true;
    autoUpdater
      .on("checking-for-update", () => send({ s: "checking" }))
      .on("update-available", (i) => send({ s: "available", v: i.version, notes: plain(i.releaseNotes) }))
      .on("update-not-available", () => send({ s: "none" }))
      .on("download-progress", (p) => send({ s: "progress", p: Math.round(p.percent) }))
      .on("update-downloaded", (i) => send({ s: "ready", v: i.version, notes: plain(i.releaseNotes) }))
      .on("error", (e) => send({ s: "error", m: e.message }));
  }
  // Kiểm tra bản giao diện nhẹ trước. Chỉ khi không có (hoặc cần lõi mới) mới kiểm tra bản cài đầy đủ.
  const uiCheck = async () => {
    const running = uiNow ? uiNow.version : app.getVersion();
    const r = await uiu.check({
      base: UI_BASE, dir: uidir(), shellVersion: app.getVersion(),
      keep: uiNow ? [path.basename(uiNow.path)] : [], fetchImpl: (u, o) => net.fetch(u, o)
    });
    if (r.s === "ready" && uiu.cmp(r.version, running) > 0) {
      uiPending = r;
      send({ s: "ready", v: r.version, notes: plain(r.notes), ui: true });
    }
    return r;
  };
  const checkAll = async (manual) => {
    if (!autoUpdater) return;
    let ui = null;
    try { ui = await uiCheck(); } catch (_) { /* lỗi mạng khi kiểm tra giao diện: để kiểm tra bản cài báo lỗi nếu có */ }
    if (uiPending || (ui && ui.s === "ready")) return;
    try { await autoUpdater.checkForUpdates(); } catch (e) { if (manual) send({ s: "error", m: e.message }); }
  };
  ipcMain.handle("upd:check", async () => {
    if (!autoUpdater) return { s: "dev" };
    send({ s: "checking" });
    await checkAll(true);
  });
  ipcMain.handle("upd:last", () => lastUpd);

  // ---- AMIS CRM (v0.16.5): khóa bí mật và token chỉ nằm ở tiến trình chính ----
  let amisClient = null;
  const amis = () => amisClient || (amisClient = amisLib.create({ safeStorage, dir: app.getPath("userData") }));
  const amisWrap = (fn) => async (_e, a) => { try { return await fn(a); } catch (e) { return { ok: false, code: "ERROR", message: String(e && e.message || e).slice(0, 300) }; } };
  const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
  ipcMain.handle("amis:status", amisWrap(() => amis().statusSafe()));
  ipcMain.handle("amis:saveSecrets", amisWrap((o) => amis().saveSecrets({ apiKey: str(o && o.apiKey, 500), clientId: str(o && o.clientId, 500), clientSecret: str(o && o.clientSecret, 500) })));
  ipcMain.handle("amis:clearSecrets", amisWrap(() => amis().clearSecrets()));
  ipcMain.handle("amis:test", amisWrap(() => amis().test()));
  ipcMain.handle("amis:probe", amisWrap((o) => amis().probe(str(o && o.endpoint, 30), str(o && o.orderBy, 60))));
  ipcMain.handle("amis:fetchOrders", amisWrap((o) => {
    const map = {}; for (const k of require("./amis-core").MAP_KEYS) map[k] = str(o && o.map && o.map[k], 120);
    return amis().fetchOrders({ map, orderBy: str(o && o.orderBy, 60), stopBefore: Number.isFinite(o && o.stopBefore) ? o.stopBefore : null, pageSize: +(o && o.pageSize) || 100, maxPages: +(o && o.maxPages) || 500 });
  }));

  // Áp dụng giao diện mới: sao lưu như khi đóng ứng dụng (có hỏi nếu còn thay đổi chưa lưu) rồi nạp lại trang. Không cần cài đặt.
  const doReload = () => {
    clearTimeout(timer);
    const to = reloadTo; reloadTo = null; closing = false;
    if (!to || !win || win.isDestroyed()) return;
    uiNow = { version: uiPending ? uiPending.version : "", path: to };
    uiPending = null; lastUpd = null;
    armOk();
    win.loadFile(to);
  };
  const applyUi = () => {
    if (!uiPending || !win || win.isDestroyed() || reloadTo) return;
    reloadTo = uiPending.path; closing = true;
    win.webContents.send("bk:flush");
    timer = setTimeout(doReload, 5000);
  };
  ipcMain.handle("upd:install", () => {
    if (uiPending) { applyUi(); return; }
    if (autoUpdater) autoUpdater.quitAndInstall(true, true);   // cài ngầm (không hiện cửa sổ), tự mở lại ứng dụng sau khi cài
  });

  // Giao diện tải về phải báo "đã khởi động xong" trong 30 giây; nếu không (hoặc tải lỗi) thì quay về giao diện đi kèm bộ cài.
  const bundled = () => path.join(__dirname, "index.html");
  const armOk = () => {
    clearTimeout(okTimer); uiOk = false;
    if (uiNow) okTimer = setTimeout(() => { if (!uiOk) fallback(); }, 30000);
  };
  const fallback = () => {
    if (!uiNow) return;
    try { uiu.markBad(uidir(), uiNow.version); } catch (_) { /* bỏ qua */ }
    uiNow = null; uiPending = null; clearTimeout(okTimer);
    if (win && !win.isDestroyed()) win.loadFile(bundled());
  };
  ipcMain.on("ui:ok", () => { uiOk = true; clearTimeout(okTimer); });

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
    if (leave) {
      if (reloadTo) doReload();
      else { forced = true; if (win && !win.isDestroyed()) win.destroy(); }
    } else { closing = false; reloadTo = null; }
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
    win.webContents.on("did-fail-load", (_e, code, _d, _u, isMain) => { if (isMain && uiNow && code !== -3) fallback(); });
    win.webContents.on("render-process-gone", () => { if (uiNow && !uiOk) fallback(); });
    uiNow = app.isPackaged ? uiu.pick(uidir(), app.getVersion()) : null;
    armOk();
    win.loadFile(uiNow ? uiNow.path : bundled());
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
    if (autoUpdater) {
      setTimeout(() => checkAll(false), 4000);
      setInterval(() => checkAll(false), 6 * 60 * 60 * 1000);
    }
  });
  app.on("window-all-closed", () => app.quit());
}
