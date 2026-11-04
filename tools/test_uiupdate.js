// Kiểm thử cập nhật giao diện: node tools/test_uiupdate.js
"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const uiu = require("../uiupdate");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "bgsm-ui-"));
const mkHtml = (v) => Buffer.from(`<!DOCTYPE html><html><head><title>BG</title></head><body>giao diện ${v}</body></html>`, "utf8");
const mkManifest = (v, shell, html, over = {}) => ({
  version: v, shell, shellHash: "x", file: `index-${v}.html`, size: html.length,
  sha512: crypto.createHash("sha512").update(html).digest("base64"), notes: "Ghi chú " + v, ...over
});

// Máy chủ giả lập "nơi phát hành": serve ui.json và các tệp từ một đối tượng có thể thay đổi giữa các bước.
let files = {};
let hits = [];
const server = http.createServer((req, res) => {
  const name = req.url.split("?")[0].replace(/^\//, "");
  hits.push(name);
  if (!(name in files)) { res.statusCode = 404; return res.end("no"); }
  res.end(files[name]);
});
const fetchImpl = (u, o) => fetch(u, o);

let n = 0;
const ok = (m) => { n++; console.log("OK  " + m); };

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const run = (dir, shell, extra = {}) => uiu.check({ base, dir, shellVersion: shell, fetchImpl, timeoutMs: 3000, ...extra });
  const publish = (v, shell, over = {}) => {
    const html = mkHtml(v);
    files = { "ui.json": JSON.stringify(mkManifest(v, shell, html, over)), [`index-${v}.html`]: html };
    return html;
  };

  // --- so sánh phiên bản ---
  assert.strictEqual(uiu.cmp("0.16.1", "0.16.0"), 1);
  assert.strictEqual(uiu.cmp("0.9.0", "0.16.0"), -1);   // so theo số, không theo chữ
  assert.strictEqual(uiu.cmp("1.0.0", "1.0.0"), 0);
  assert.ok(Number.isNaN(uiu.cmp("abc", "1.0.0")));
  assert.ok(Number.isNaN(uiu.cmp("1.0.0-beta", "1.0.0")));
  ok("so sánh phiên bản x.y.z");

  // --- chưa có gì: tải và ghi ---
  let dir = tmp();
  publish("0.16.1", "0.16.0");
  assert.strictEqual(uiu.pick(dir, "0.16.0"), null);
  let r = await run(dir, "0.16.0");
  assert.strictEqual(r.s, "ready"); assert.strictEqual(r.version, "0.16.1"); assert.strictEqual(r.notes, "Ghi chú 0.16.1");
  assert.ok(fs.existsSync(path.join(dir, "index-0.16.1.html")));
  const p = uiu.pick(dir, "0.16.0"); assert.strictEqual(p.version, "0.16.1"); assert.strictEqual(p.path, path.join(dir, "index-0.16.1.html"));
  ok("tải bản giao diện mới, kiểm tra hợp lệ rồi ghi vào đĩa");

  // --- lần kiểm tra lại: không tải lại tệp ---
  hits = []; r = await run(dir, "0.16.0");
  assert.strictEqual(r.s, "ready"); assert.ok(!hits.includes("index-0.16.1.html"), "không được tải lại");
  ok("kiểm tra lại không tải lại tệp đã có");

  // --- bản mới hơn: thay và dọn bản cũ ---
  publish("0.16.2", "0.16.0");
  r = await run(dir, "0.16.0"); assert.strictEqual(r.version, "0.16.2");
  assert.deepStrictEqual(fs.readdirSync(dir).filter((f) => f.startsWith("index-")), ["index-0.16.2.html"]);
  ok("bản mới thay bản cũ, tệp cũ được dọn");

  // --- giữ lại tệp đang chạy (keep) ---
  publish("0.16.3", "0.16.0");
  r = await run(dir, "0.16.0", { keep: ["index-0.16.2.html"] });
  assert.deepStrictEqual(fs.readdirSync(dir).filter((f) => f.startsWith("index-")).sort(), ["index-0.16.2.html", "index-0.16.3.html"]);
  ok("không xóa tệp giao diện đang chạy");

  // --- đã là bản mới nhất ---
  const same = tmp(); publish("0.16.0", "0.16.0");
  r = await run(same, "0.16.0"); assert.strictEqual(r.s, "none"); assert.deepStrictEqual(fs.readdirSync(same), []);
  ok("manifest bằng bản đi kèm bộ cài: không tải gì");
  publish("0.15.9", "0.15.0"); r = await run(same, "0.16.0"); assert.strictEqual(r.s, "none");
  ok("manifest cũ hơn bản đi kèm bộ cài: bỏ qua");

  // --- cần lõi mới hơn ---
  const need = tmp(); publish("0.17.0", "0.17.0"); hits = [];
  r = await run(need, "0.16.0"); assert.strictEqual(r.s, "shell"); assert.strictEqual(r.version, "0.17.0");
  assert.ok(!hits.includes("index-0.17.0.html"), "không tải giao diện khi lõi chưa đủ mới");
  ok("giao diện đòi lõi mới hơn: không tải, báo cần cập nhật bộ cài");
  // tệp đã tải từ trước nhưng lõi đang chạy cũ hơn yêu cầu: pick từ chối
  fs.writeFileSync(path.join(need, "ui.json"), files["ui.json"]); fs.writeFileSync(path.join(need, "index-0.17.0.html"), files["index-0.17.0.html"]);
  assert.strictEqual(uiu.pick(need, "0.16.0"), null); assert.ok(uiu.pick(need, "0.17.0") === null /* bằng bản đi kèm */);
  ok("pick từ chối giao diện cần lõi mới hơn");

  // --- giao diện đã tải nhưng bộ cài sau đó được nâng lên cao hơn ---
  dir = tmp(); publish("0.16.4", "0.16.0"); await run(dir, "0.16.0");
  assert.ok(uiu.pick(dir, "0.16.0")); assert.strictEqual(uiu.pick(dir, "0.16.4"), null); assert.strictEqual(uiu.pick(dir, "0.17.0"), null);
  ok("bộ cài mới hơn hoặc bằng giao diện đã tải: dùng giao diện đi kèm bộ cài");

  // --- tệp tải về hỏng/bị sửa ---
  dir = tmp(); publish("0.16.5", "0.16.0"); await run(dir, "0.16.0");
  const bad = tmp(); const h6 = mkHtml("0.16.6");
  files = { "ui.json": JSON.stringify(mkManifest("0.16.6", "0.16.0", h6)), "index-0.16.6.html": Buffer.from(h6.toString().replace("giao diện", "giao điện")) };
  await assert.rejects(() => run(dir, "0.16.0"), /không khớp/);
  assert.strictEqual(uiu.pick(dir, "0.16.0").version, "0.16.5", "bản đang có phải còn nguyên");
  assert.ok(!fs.existsSync(path.join(dir, "index-0.16.6.html")));
  ok("tệp tải về sai mã băm bị từ chối, bản đang có không bị ảnh hưởng");
  files = { "ui.json": JSON.stringify(mkManifest("0.16.6", "0.16.0", h6)), "index-0.16.6.html": h6.subarray(0, 10) };
  await assert.rejects(() => run(dir, "0.16.0"), /Kích thước/);
  ok("tệp tải về thiếu byte bị từ chối");
  const notHtml = Buffer.from("MZ....không phải html".padEnd(80, "x"));
  files = { "ui.json": JSON.stringify(mkManifest("0.16.6", "0.16.0", notHtml)), "index-0.16.6.html": notHtml };
  await assert.rejects(() => run(dir, "0.16.0"), /định dạng/);
  ok("tệp không phải HTML bị từ chối");

  // --- sửa tệp trên đĩa sau khi tải: pick phát hiện ---
  fs.appendFileSync(path.join(dir, "index-0.16.5.html"), "<script>evil()</script>");
  assert.strictEqual(uiu.pick(dir, "0.16.0"), null);
  ok("tệp trên đĩa bị sửa sau khi tải: không được nạp");

  // --- manifest xấu ---
  const mdir = tmp();
  for (const [label, text, re] of [
    ["không phải JSON", "<html>404</html>", /không đọc được/],
    ["thiếu trường", JSON.stringify({ version: "0.16.9" }), /không hợp lệ/],
    ["tên tệp lạ (thoát thư mục)", JSON.stringify({ ...mkManifest("0.16.9", "0.16.0", mkHtml("0.16.9")), file: "../evil.html" }), /không hợp lệ/],
    ["tên tệp không khớp phiên bản", JSON.stringify({ ...mkManifest("0.16.9", "0.16.0", mkHtml("0.16.9")), file: "index-0.1.0.html" }), /không hợp lệ/],
    ["kích thước quá lớn", JSON.stringify({ ...mkManifest("0.16.9", "0.16.0", mkHtml("0.16.9")), size: uiu.MAX_SIZE + 1 }), /không hợp lệ/],
    ["mã băm sai định dạng", JSON.stringify({ ...mkManifest("0.16.9", "0.16.0", mkHtml("0.16.9")), sha512: "abc" }), /không hợp lệ/]
  ]) {
    files = { "ui.json": text }; await assert.rejects(() => run(mdir, "0.16.0"), re, label);
  }
  assert.deepStrictEqual(fs.readdirSync(mdir), []);
  ok("manifest hỏng/độc hại bị từ chối (6 trường hợp), không ghi gì ra đĩa");

  // --- lỗi mạng / 404 ---
  files = {}; await assert.rejects(() => run(tmp(), "0.16.0"), /HTTP 404/);
  await assert.rejects(() => uiu.check({ base: "http://127.0.0.1:1/", dir: tmp(), shellVersion: "0.16.0", fetchImpl, timeoutMs: 1500 }));
  ok("không có tệp (404) hoặc không kết nối được: báo lỗi, không ghi gì");

  // --- timeout ---
  const slow = http.createServer(() => { /* không trả lời */ }); await new Promise((r) => slow.listen(0, "127.0.0.1", r));
  const t0 = Date.now();
  await assert.rejects(() => uiu.check({ base: `http://127.0.0.1:${slow.address().port}/`, dir: tmp(), shellVersion: "0.16.0", fetchImpl, timeoutMs: 400 }));
  assert.ok(Date.now() - t0 < 3000); slow.closeAllConnections(); slow.close();
  ok("máy chủ không trả lời: hết hạn đúng thời gian chờ");

  // --- đánh dấu bản lỗi ---
  dir = tmp(); publish("0.16.7", "0.16.0"); await run(dir, "0.16.0");
  uiu.markBad(dir, "0.16.7");
  assert.strictEqual(uiu.pick(dir, "0.16.0"), null); hits = [];
  r = await run(dir, "0.16.0"); assert.strictEqual(r.s, "none"); assert.ok(!hits.includes("index-0.16.7.html"));
  publish("0.16.8", "0.16.0"); r = await run(dir, "0.16.0"); assert.strictEqual(r.version, "0.16.8");
  ok("bản giao diện không chạy được bị bỏ qua, bản sửa lỗi sau đó vẫn tải bình thường");

  // --- dọn tệp tạm còn sót ---
  fs.writeFileSync(path.join(dir, "index-0.16.8.html.tmp"), "dở dang"); publish("0.16.9", "0.16.0"); await run(dir, "0.16.0");
  assert.ok(!fs.readdirSync(dir).some((f) => f.endsWith(".tmp")));
  ok("tệp tạm dở dang được dọn");

  server.close();
  console.log(`\nTất cả ${n} nhóm kiểm thử đạt.`);
})().catch((e) => { console.error("THẤT BẠI:", e); process.exit(1); });
