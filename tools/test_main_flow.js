// Kiểm thử luồng cập nhật trong main.js bằng Electron giả lập: node tools/test_main_flow.js
// (Không thay thế việc thử trên bản cài thật, nhưng chạy nguyên văn main.js qua các tình huống chính.)
"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const Module = require("module");
const uiu = require("../uiupdate");

const MAIN = path.join(__dirname, "..", "main.js");
const BUNDLED = path.join(__dirname, "..", "index.html");
const REAL_BASE = "https://raw.githubusercontent.com/Alesnguyen/bg-sales-management-releases/ui/";
const realSetTimeout = setTimeout, realSetInterval = setInterval, realClearTimeout = clearTimeout;
const tick = (ms = 20) => new Promise((r) => realSetTimeout(r, ms));

const mkHtml = (v) => Buffer.from(`<!DOCTYPE html><html><body>giao diện ${v}</body></html>`);
let files = {};
const server = http.createServer((q, s) => { const k = q.url.split("?")[0].slice(1); if (k in files) s.end(files[k]); else { s.statusCode = 404; s.end("no"); } });
const publish = (v, shell = "0.16.0") => {
  const h = mkHtml(v);
  files = { "ui.json": JSON.stringify({ version: v, shell, shellHash: "x", file: `index-${v}.html`, size: h.length, sha512: crypto.createHash("sha512").update(h).digest("base64"), notes: "Ghi chú " + v }), [`index-${v}.html`]: h };
};

// Khởi động một "ứng dụng" mới chạy main.js thật với Electron giả.
async function boot({ packaged = true, version = "0.16.0", lock = true, userData, dialogAnswer = 1, base }) {
  const env = { sent: [], loaded: [], handlers: {}, on: {}, wcOn: {}, winOn: {}, timers: [], intervals: [], upd: { calls: [], quit: null, ev: {} }, quit: 0, destroyed: false };
  global.setTimeout = (fn, ms) => { const t = { fn, ms, on: true, unref() { return this; }, ref() { return this; }, hasRef() { return false; }, refresh() { return this; } }; env.timers.push(t); return t; };
  global.clearTimeout = (t) => { if (t && typeof t === "object") t.on = false; };
  global.setInterval = (fn, ms) => { env.intervals.push({ fn, ms }); return {}; };
  const docs = fs.mkdtempSync(path.join(os.tmpdir(), "bgsm-docs-"));
  class Win {
    constructor() {
      env.win = this; this.destroyed = false;
      this.webContents = { send: (...a) => env.sent.push(a), on: (e, f) => { env.wcOn[e] = f; }, setWindowOpenHandler() {} };
    }
    on(e, f) { env.winOn[e] = f; }
    loadFile(p) { env.loaded.push(p); }
    isDestroyed() { return this.destroyed; } destroy() { this.destroyed = true; env.destroyed = true; }
    isMinimized() { return false; } restore() {} focus() {}
  }
  const updater = {
    on(e, f) { env.upd.ev[e] = f; return this; },
    checkForUpdates: async () => { env.upd.calls.push("check"); },
    quitAndInstall: (...a) => { env.upd.quit = a; }
  };
  const electron = {
    app: {
      isPackaged: packaged, getVersion: () => version, getPath: (n) => (n === "userData" ? userData : docs),
      requestSingleInstanceLock: () => lock, quit: () => { env.quit++; }, on: (e, f) => { env.on[e] = f; },
      whenReady: () => Promise.resolve(), commandLine: { appendSwitch() {} }
    },
    BrowserWindow: Win, Menu: { setApplicationMenu() {} }, shell: { openExternal() {}, openPath() {} },
    ipcMain: { handle: (c, f) => { env.handlers[c] = f; }, on: (c, f) => { env.on[c] = f; } },
    dialog: { showMessageBoxSync: () => dialogAnswer },
    safeStorage: { isEncryptionAvailable: () => false },
    net: { fetch: (u, o) => fetch(u.replace(REAL_BASE, base), o) }
  };
  const orig = Module._load;
  Module._load = function (req, ...rest) { if (req === "electron") return electron; if (req === "electron-updater") return { autoUpdater: updater }; return orig.call(this, req, ...rest); };
  delete require.cache[MAIN];
  try { require(MAIN); await tick(); } finally { Module._load = orig; }
  env.fire = (ms) => { const t = env.timers.filter((x) => x.on && x.ms === ms).pop(); assert.ok(t, "không có bộ hẹn giờ " + ms); t.on = false; return t.fn(); };
  env.states = () => env.sent.filter((s) => s[0] === "upd:state").map((s) => s[1]);
  return env;
}
const newDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "bgsm-ud-"));
let n = 0; const ok = (m) => { n++; console.log("OK  " + m); };

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/`;

  // ===== A. Mở lần đầu, chưa có giao diện tải về =====
  let ud = newDir(), e = await boot({ userData: ud, base });
  assert.deepStrictEqual(e.loaded, [BUNDLED]);
  assert.ok(e.timers.some((t) => t.ms === 4000) && e.intervals.some((t) => t.ms === 6 * 3600 * 1000));
  ok("A. chưa có bản tải về: nạp giao diện đi kèm bộ cài; hẹn kiểm tra sau 4 giây và mỗi 6 giờ");

  // ===== A2. Các lệnh AMIS vẫn có đủ cùng với cơ chế cập nhật mới =====
  for (const c of ["status", "saveSecrets", "clearSecrets", "test", "probe", "fetchOrders"]) assert.strictEqual(typeof e.handlers["amis:" + c], "function", "thiếu amis:" + c);
  const st0 = await e.handlers["amis:status"]({}, {}); assert.ok(st0 && typeof st0 === "object");
  const bad0 = await e.handlers["amis:saveSecrets"]({}, { apiKey: "x" }); assert.ok(bad0 && typeof bad0 === "object" && bad0.ok !== true, "máy không mã hóa được thì không lưu khóa");
  ok("A2. đủ 6 lệnh AMIS; máy không mã hóa được thì từ chối lưu khóa (không lưu dạng thô)");

  // ===== B. Kiểm tra: có bản giao diện mới =====
  publish("0.16.1");
  await e.handlers["upd:check"]();
  let st = e.states().filter((s) => s.s === "ready");
  assert.strictEqual(st.length, 1); assert.strictEqual(st[0].v, "0.16.1"); assert.strictEqual(st[0].ui, true); assert.strictEqual(st[0].notes, "Ghi chú 0.16.1");
  assert.deepStrictEqual(e.upd.calls, [], "không cần kiểm tra bộ cài khi đã có bản giao diện");
  assert.strictEqual((await e.handlers["upd:last"]()).v, "0.16.1");
  ok("B. có bản giao diện mới: tải ngầm, báo 'ready' (ui=true), không đụng tới bộ cài");

  // ===== C. Sự kiện của trình cập nhật bộ cài không được che trạng thái 'ready' =====
  const before = e.states().length;
  e.upd.ev["update-not-available"](); e.upd.ev["checking-for-update"](); e.upd.ev["error"](new Error("x"));
  assert.strictEqual(e.states().length, before); assert.strictEqual((await e.handlers["upd:last"]()).s, "ready");
  ok("C. 'không có bản mới/đang kiểm tra/lỗi' từ bộ cài không che mất bản giao diện đã sẵn sàng");

  // ===== D. Áp dụng: sao lưu rồi nạp lại, không cài đặt =====
  await e.handlers["upd:install"]();
  assert.ok(e.sent.some((s) => s[0] === "bk:flush")); assert.strictEqual(e.loaded.length, 1); assert.strictEqual(e.upd.quit, null);
  e.on["bk:ready"]({}, false);
  assert.strictEqual(e.loaded.length, 2); assert.strictEqual(e.loaded[1], path.join(ud, "ui", "index-0.16.1.html")); assert.ok(!e.destroyed);
  assert.strictEqual(await e.handlers["upd:last"](), null); assert.ok(e.timers.some((t) => t.ms === 30000 && t.on));
  ok("D. bấm khởi động lại: sao lưu → nạp giao diện mới (không đóng cửa sổ, không chạy bộ cài), trạng thái chờ được xóa, bật bộ đếm an toàn 30 giây");
  e.on["ui:ok"]({}); assert.ok(!e.timers.filter((t) => t.ms === 30000).pop().on); ok("D2. giao diện báo khởi động xong: tắt bộ đếm an toàn");

  // ===== E. Còn thay đổi chưa lưu: hỏi, chọn ở lại thì không nạp lại =====
  publish("0.16.2"); await e.handlers["upd:check"]();      // bản 0.16.2 được tải về đĩa khi đang chạy 0.16.1
  let e2 = await boot({ userData: ud, base, dialogAnswer: 0 });
  assert.strictEqual(e2.loaded[0], path.join(ud, "ui", "index-0.16.2.html"), "mở lần sau dùng bản mới nhất đã tải");
  ok("E0. mở lại ứng dụng: tự dùng bản giao diện mới nhất đã tải (không cần bấm gì)");
  publish("0.16.3"); await e2.handlers["upd:check"](); await e2.handlers["upd:install"](); e2.on["bk:ready"]({}, true);
  assert.strictEqual(e2.loaded.length, 1, "chọn Ở lại: không nạp lại");
  e2.on["bk:ready"]({}, true); assert.strictEqual(e2.loaded.length, 1);   // chưa bấm cài thì không được tự nạp
  ok("E. còn thay đổi chưa lưu và chọn 'Ở lại': không nạp lại, không mất dữ liệu");
  publish("0.16.4"); let e3 = await boot({ userData: ud, base, dialogAnswer: 1 });
  await e3.handlers["upd:check"](); await e3.handlers["upd:install"](); e3.on["bk:ready"]({}, true);
  assert.strictEqual(e3.loaded.length, 2); assert.ok(e3.loaded[1].endsWith("index-0.16.4.html"));
  ok("E2. còn thay đổi chưa lưu và chọn 'Thoát, bỏ thay đổi': nạp bản mới");

  // ===== F. Giao diện không phản hồi sao lưu: chờ tối đa 5 giây rồi vẫn nạp =====
  publish("0.16.3"); let ud2 = newDir(); const f = await boot({ userData: ud2, base });
  await f.handlers["upd:check"](); await f.handlers["upd:install"](); assert.strictEqual(f.loaded.length, 1); f.fire(5000);
  assert.strictEqual(f.loaded.length, 2); ok("F. giao diện không trả lời sao lưu: sau 5 giây vẫn nạp bản mới");
  await f.handlers["upd:install"](); assert.strictEqual(f.loaded.length, 2); assert.strictEqual(f.upd.quit && f.upd.quit.join(), "true,true");
  ok("F2. bấm cài khi không còn bản giao diện chờ: chuyển sang cài bộ cài, chế độ ngầm (quitAndInstall(true,true))");

  // ===== G. Cần bộ cài mới =====
  publish("0.17.0", "0.17.0"); const g = await boot({ userData: newDir(), base });
  await g.handlers["upd:check"]();
  assert.deepStrictEqual(g.upd.calls, ["check"]); assert.ok(!g.states().some((s) => s.ui));
  await g.handlers["upd:install"](); assert.strictEqual(g.upd.quit.join(), "true,true");
  ok("G. giao diện mới đòi lõi mới hơn: không tải giao diện, chuyển sang kiểm tra bộ cài; cài đặt chạy ngầm");

  // ===== H. Lỗi mạng khi kiểm tra giao diện: vẫn kiểm tra bộ cài bình thường =====
  const h = await boot({ userData: newDir(), base: "http://127.0.0.1:1/" });
  await h.handlers["upd:check"](); assert.deepStrictEqual(h.upd.calls, ["check"]); ok("H. không tải được thông tin giao diện: tiếp tục kiểm tra bộ cài, không báo lỗi thừa");
  const h2 = await boot({ userData: newDir(), base }); files = {}; await h2.handlers["upd:check"](); assert.deepStrictEqual(h2.upd.calls, ["check"]); ok("H2. nơi phát hành chưa có thông tin giao diện (404): vẫn kiểm tra bộ cài");

  // ===== I. Giao diện tải về không khởi động được → quay về giao diện gốc =====
  publish("0.16.4"); const udI = newDir(); const pre = await boot({ userData: udI, base }); await pre.handlers["upd:check"]();
  assert.ok(uiu.pick(path.join(udI, "ui"), "0.16.0"));
  const i1 = await boot({ userData: udI, base: "http://127.0.0.1:1/" });
  assert.ok(i1.loaded[0].endsWith("index-0.16.4.html")); i1.fire(30000);
  assert.deepStrictEqual(i1.loaded, [i1.loaded[0], BUNDLED]); assert.strictEqual(uiu.pick(path.join(udI, "ui"), "0.16.0"), null);
  ok("I. giao diện tải về không báo khởi động xong trong 30 giây: tự quay về giao diện đi kèm và ghi nhớ bản lỗi");
  const i2 = await boot({ userData: udI, base: "http://127.0.0.1:1/" }); assert.deepStrictEqual(i2.loaded, [BUNDLED]); ok("I2. các lần mở sau không dùng lại bản lỗi");
  await i2.handlers["upd:check"](); assert.ok(!i2.states().some((s) => s.ui), "không tải lại bản đã bị đánh dấu lỗi"); ok("I3. không tải lại đúng bản đã bị đánh dấu lỗi");
  publish("0.16.5"); const i4 = await boot({ userData: udI, base }); await i4.handlers["upd:check"](); assert.ok(i4.states().some((s) => s.s === "ready" && s.v === "0.16.5")); ok("I4. bản sửa lỗi 0.16.5 sau đó tải bình thường (tự chữa lành mà không cần cài lại)");

  // ===== J. Tải trang thất bại / tiến trình hiển thị bị crash =====
  publish("0.16.6"); const udJ = newDir(); const jp = await boot({ userData: udJ, base }); await jp.handlers["upd:check"]();
  const j1 = await boot({ userData: udJ, base }); j1.wcOn["did-fail-load"]({}, -3, "", "", true); assert.strictEqual(j1.loaded.length, 1, "ERR_ABORTED bị bỏ qua");
  j1.wcOn["did-fail-load"]({}, -6, "", "", false); assert.strictEqual(j1.loaded.length, 1, "lỗi khung con bị bỏ qua");
  j1.wcOn["did-fail-load"]({}, -6, "", "", true); assert.deepStrictEqual(j1.loaded.slice(1), [BUNDLED]);
  ok("J. tải trang chính thất bại: quay về giao diện gốc (bỏ qua ERR_ABORTED và lỗi khung con)");
  fs.rmSync(path.join(udJ, "ui", "bad.json"));
  const j2 = await boot({ userData: udJ, base }); j2.wcOn["render-process-gone"](); assert.deepStrictEqual(j2.loaded.slice(1), [BUNDLED]); ok("J2. tiến trình hiển thị bị sập trước khi khởi động xong: quay về giao diện gốc");
  fs.rmSync(path.join(udJ, "ui", "bad.json"));
  const j3 = await boot({ userData: udJ, base }); j3.on["ui:ok"]({}); j3.wcOn["render-process-gone"](); assert.strictEqual(j3.loaded.length, 1); ok("J3. đã khởi động xong rồi mới sập: không đổi giao diện (để người dùng mở lại)");

  // ===== K. Chạy từ mã nguồn (không đóng gói) =====
  const k = await boot({ packaged: false, userData: newDir(), base });
  assert.deepStrictEqual(k.loaded, [BUNDLED]); assert.deepStrictEqual(await k.handlers["upd:check"](), { s: "dev" }); assert.ok(!k.timers.some((t) => t.ms === 4000));
  ok("K. chạy từ mã nguồn: chỉ dùng giao diện đi kèm, không kiểm tra cập nhật");

  // ===== L. Mở bản thứ hai =====
  const l = await boot({ userData: newDir(), base, lock: false }); assert.strictEqual(l.quit, 1); assert.ok(!l.handlers["upd:check"]); ok("L. đã có một cửa sổ đang chạy: thoát ngay, không đăng ký gì thêm");

  // ===== M. Bộ cài mới hơn giao diện đã tải =====
  publish("0.16.7"); const udM = newDir(); const mp = await boot({ userData: udM, base }); await mp.handlers["upd:check"]();
  const m1 = await boot({ userData: udM, base, version: "0.17.0" }); assert.deepStrictEqual(m1.loaded, [BUNDLED]); ok("M. vừa cài bộ cài mới hơn giao diện đã tải: dùng giao diện đi kèm bộ cài mới");

  global.setTimeout = realSetTimeout; global.setInterval = realSetInterval; global.clearTimeout = realClearTimeout;
  server.close();
  console.log(`\nTất cả ${n} nhóm kiểm thử đạt.`);
  process.exit(0);
})().catch((e) => { global.setTimeout = realSetTimeout; console.error("THẤT BẠI:", e); process.exit(1); });
