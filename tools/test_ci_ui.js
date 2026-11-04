// Kiểm thử script phát hành nhẹ: node tools/test_ci_ui.js
"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const ci = require("./ci_ui");
const uiu = require("../uiupdate");

const SRC = path.join(__dirname, "..");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "bgsm-ci-"));
for (const f of ["main.js", "preload.js", "backup.js", "uiupdate.js", "package.json", "index.html", "CHANGELOG.md", "build/icon.png"]) {
  fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
  fs.copyFileSync(path.join(SRC, f), path.join(root, f));
}
fs.cpSync(path.join(SRC, "assets"), path.join(root, "assets"), { recursive: true });
const w = (f, t) => fs.writeFileSync(path.join(root, f), t);
const r = (f) => fs.readFileSync(path.join(root, f), "utf8");
let n = 0; const ok = (m) => { n++; console.log("OK  " + m); };

(async () => {
  const h0 = ci.coreHash(root);
  assert.strictEqual(h0, ci.coreHash(root)); ok("mã băm lõi ổn định");

  const pk = JSON.parse(r("package.json"));
  w("index.html", r("index.html") + "\n<!-- đổi giao diện -->");
  assert.strictEqual(ci.coreHash(root), h0); ok("đổi giao diện (index.html) KHÔNG làm đổi lõi");
  w("package.json", JSON.stringify({ ...pk, version: "9.9.9", description: "khác" }, null, 2));
  assert.strictEqual(ci.coreHash(root), h0); ok("đổi số phiên bản/mô tả KHÔNG làm đổi lõi");
  w("CHANGELOG.md", "# x\n"); assert.strictEqual(ci.coreHash(root), h0); ok("đổi CHANGELOG KHÔNG làm đổi lõi");
  w("main.js", r("main.js").replace(/\n/g, "\r\n")); assert.strictEqual(ci.coreHash(root), h0); ok("khác kiểu xuống dòng (CRLF/LF) KHÔNG làm đổi lõi");

  w("package.json", JSON.stringify(pk, null, 2)); fs.copyFileSync(path.join(SRC, "main.js"), path.join(root, "main.js"));
  w("main.js", r("main.js") + "\n// sửa"); assert.notStrictEqual(ci.coreHash(root), h0); ok("sửa main.js làm đổi lõi");
  fs.copyFileSync(path.join(SRC, "main.js"), path.join(root, "main.js"));
  w("preload.js", r("preload.js") + "\n// sửa"); assert.notStrictEqual(ci.coreHash(root), h0); ok("sửa preload.js làm đổi lõi");
  fs.copyFileSync(path.join(SRC, "preload.js"), path.join(root, "preload.js"));
  w("uiupdate.js", r("uiupdate.js") + "\n// sửa"); assert.notStrictEqual(ci.coreHash(root), h0); ok("sửa uiupdate.js làm đổi lõi");
  fs.copyFileSync(path.join(SRC, "uiupdate.js"), path.join(root, "uiupdate.js"));
  fs.writeFileSync(path.join(root, "assets", "moi.png"), "x"); assert.notStrictEqual(ci.coreHash(root), h0); ok("thêm tệp trong assets làm đổi lõi");
  fs.rmSync(path.join(root, "assets", "moi.png"));
  const b = JSON.parse(JSON.stringify(pk)); b.devDependencies.electron = "^40.0.0"; w("package.json", JSON.stringify(b, null, 2));
  assert.notStrictEqual(ci.coreHash(root), h0); ok("nâng phiên bản Electron làm đổi lõi");
  const c = JSON.parse(JSON.stringify(pk)); c.build.nsis.oneClick = true; w("package.json", JSON.stringify(c, null, 2));
  assert.notStrictEqual(ci.coreHash(root), h0); ok("đổi cấu hình bộ cài làm đổi lõi");
  fs.copyFileSync(path.join(SRC, "package.json"), path.join(root, "package.json"));
  assert.strictEqual(ci.coreHash(root), h0); ok("khôi phục lại thì mã băm trở về như cũ");

  // ---- bundle khớp với phía ứng dụng ----
  fs.copyFileSync(path.join(SRC, "index.html"), path.join(root, "index.html"));
  const ver = JSON.parse(r("package.json")).version, out = path.join(root, "out");
  w("CHANGELOG.md", `# Lịch sử\n\n## ${ver}\n- Thêm **tính năng** A.\n- Sửa lỗi B.\n\n## 0.0.1\n- cũ\n`);
  const m = ci.bundle(out, { root, shell: "0.15.0", shellHash: h0 });
  assert.strictEqual(m.version, ver); assert.strictEqual(m.shell, "0.15.0"); assert.ok(uiu.validManifest(m)); ok("manifest tạo ra hợp lệ theo bộ kiểm tra của ứng dụng");
  const ui = uiu.pick ? (() => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "bgsm-cache-")); fs.copyFileSync(path.join(out, "ui.json"), path.join(d, "ui.json")); fs.copyFileSync(path.join(out, m.file), path.join(d, m.file)); return { d }; })() : null;
  assert.strictEqual(uiu.pick(ui.d, "0.15.9").version, ver); assert.strictEqual(uiu.pick(ui.d, ver), null); ok("ứng dụng nhận bản giao diện vừa tạo (bộ cài cũ hơn nhận, bộ cài bằng phiên bản này thì dùng bản đi kèm)");
  assert.strictEqual(m.notes, "Thêm tính năng A. Sửa lỗi B."); assert.ok(!m.notes.includes("cũ")); ok("ghi chú phát hành lấy đúng mục của phiên bản trong CHANGELOG");
  w("CHANGELOG.md", "# Lịch sử\n"); assert.strictEqual(ci.notesFor(ver, root), "Phiên bản " + ver); ok("thiếu mục CHANGELOG: dùng ghi chú mặc định, không chặn phát hành");
  assert.ok(!fs.readFileSync(path.join(out, m.file), "utf8").includes("\r\n")); ok("tệp giao diện đăng lên dùng xuống dòng LF");
  w("index.html", r("index.html").replace(`const VER="${ver}"`, 'const VER="0.0.1"'));
  assert.throws(() => ci.bundle(path.join(root, "out2"), { root }), /chưa được dựng lại/); ok("index.html chưa dựng lại cho phiên bản hiện tại: từ chối đăng");

  // ---- đọc manifest trước đó ----
  let status = 200, body = JSON.stringify({ version: "1.0.0", shell: "1.0.0", shellHash: "abc" });
  const srv = http.createServer((q, s) => { s.statusCode = status; s.end(body); }); await new Promise((res) => srv.listen(0, "127.0.0.1", res));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  assert.strictEqual((await ci.previousManifest(base)).shellHash, "abc");
  status = 404; assert.strictEqual(await ci.previousManifest(base), null);
  status = 500; await assert.rejects(() => ci.previousManifest(base), /HTTP 500/);
  srv.close(); await assert.rejects(() => ci.previousManifest(base), /chạy lại/);
  ok("đọc thông tin phát hành trước: 404 = chưa từng phát hành; lỗi khác = dừng để chạy lại");
  console.log(`\nTất cả ${n} nhóm kiểm thử đạt.`);
})().catch((e) => { console.error("THẤT BẠI:", e); process.exit(1); });
