// Cập nhật RIÊNG phần giao diện (index.html), nhẹ hơn nhiều so với tải lại cả bộ cài (~90 MB).
// Chạy trong tiến trình chính của Electron. Không phụ thuộc Electron để kiểm thử được bằng Node thuần (tools/test_uiupdate.js).
//
// Cách hoạt động:
//  - Nơi phát hành có tệp ui.json (thông tin) và index-<phiên bản>.html (giao diện).
//  - Ứng dụng tải về, kiểm tra kích thước và mã băm SHA-512, rồi mới ghi vào thư mục dữ liệu người dùng (ghi tạm rồi đổi tên).
//  - Lần mở sau (hoặc khi bấm “Khởi động lại”) ứng dụng nạp giao diện đã tải thay cho giao diện đi kèm bộ cài.
//  - Bản giao diện đòi hỏi lõi (bộ cài) mới hơn bản đang chạy thì KHÔNG dùng, chờ cập nhật bộ cài.
//  - Bất kỳ lỗi nào cũng quay về giao diện đi kèm bộ cài, không làm hỏng ứng dụng.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE_RX = /^index-\d+\.\d+\.\d+\.html$/;
const SHA_RX = /^[A-Za-z0-9+/]{86}==$/;
const MAX_SIZE = 12 * 1024 * 1024;

const parse = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v == null ? "" : v).trim());
  return m ? [+m[1], +m[2], +m[3]] : null;
};
// So sánh phiên bản dạng x.y.z: 1, 0, -1; NaN nếu sai định dạng.
function cmp(a, b) {
  const x = parse(a), y = parse(b);
  if (!x || !y) return NaN;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}
const sha512 = (buf) => crypto.createHash("sha512").update(buf).digest("base64");

function validManifest(m) {
  return !!m && typeof m === "object" &&
    !!parse(m.version) && !!parse(m.shell) &&
    typeof m.file === "string" && FILE_RX.test(m.file) && m.file === "index-" + m.version + ".html" &&
    typeof m.sha512 === "string" && SHA_RX.test(m.sha512) &&
    Number.isInteger(m.size) && m.size > 0 && m.size <= MAX_SIZE;
}

function atomicWrite(file, data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

function readBad(dir) {
  try {
    const a = JSON.parse(fs.readFileSync(path.join(dir, "bad.json"), "utf8"));
    return Array.isArray(a) ? a.map(String) : [];
  } catch (_) { return []; }
}
// Ghi nhớ một phiên bản giao diện không chạy được để không dùng lại và không tải lại.
function markBad(dir, version) {
  fs.mkdirSync(dir, { recursive: true });
  const a = readBad(dir);
  if (!a.includes(String(version))) a.push(String(version));
  atomicWrite(path.join(dir, "bad.json"), JSON.stringify(a.slice(-20)));
}

// Giao diện đã tải sẵn trên đĩa, nếu hợp lệ, mới hơn bản đi kèm bộ cài và tương thích với lõi đang chạy. Ngược lại trả null.
function pick(dir, shellVersion) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(dir, "ui.json"), "utf8"));
    if (!validManifest(m)) return null;
    if (!(cmp(m.version, shellVersion) > 0)) return null;       // không mới hơn bản đi kèm
    if (!(cmp(m.shell, shellVersion) <= 0)) return null;        // cần lõi mới hơn
    if (readBad(dir).includes(m.version)) return null;
    const p = path.join(dir, m.file);
    const buf = fs.readFileSync(p);
    if (buf.length !== m.size || sha512(buf) !== m.sha512) return null;  // hỏng hoặc bị sửa
    return { version: m.version, path: p, notes: typeof m.notes === "string" ? m.notes : "" };
  } catch (_) { return null; }
}

function prune(dir, keep) {
  try {
    for (const f of fs.readdirSync(dir)) {
      if ((FILE_RX.test(f) && !keep.includes(f)) || /\.tmp$/.test(f)) {
        try { fs.unlinkSync(path.join(dir, f)); } catch (_) { /* bỏ qua */ }
      }
    }
  } catch (_) { /* bỏ qua */ }
}

// Kiểm tra và tải bản giao diện mới.
// Trả về: {s:"none"} | {s:"shell", version} (cần cập nhật bộ cài) | {s:"ready", version, notes, path} (đã có sẵn trên đĩa)
// Ném lỗi nếu không kết nối được hoặc dữ liệu tải về không hợp lệ (tệp đang dùng không bị ảnh hưởng).
async function check({ base, dir, shellVersion, keep = [], fetchImpl, timeoutMs = 20000 }) {
  if (typeof fetchImpl !== "function") throw new Error("Thiếu hàm tải dữ liệu.");
  const get = async (name, asBuffer) => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetchImpl(base + name, { signal: ac.signal, cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return asBuffer ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } finally { clearTimeout(t); }
  };

  const text = await get("ui.json", false);
  let m;
  try { m = JSON.parse(text); } catch (_) { throw new Error("Thông tin cập nhật giao diện không đọc được."); }
  if (!validManifest(m)) throw new Error("Thông tin cập nhật giao diện không hợp lệ.");

  if (readBad(dir).includes(m.version)) return { s: "none" };
  if (!(cmp(m.shell, shellVersion) <= 0)) return { s: "shell", version: m.shell };

  const onDisk = pick(dir, shellVersion);
  const have = onDisk ? onDisk.version : shellVersion;
  if (!(cmp(m.version, have) > 0)) return onDisk ? { s: "ready", version: onDisk.version, notes: onDisk.notes, path: onDisk.path } : { s: "none" };

  const buf = await get(m.file, true);
  if (buf.length !== m.size) throw new Error("Kích thước giao diện tải về không khớp.");
  if (sha512(buf) !== m.sha512) throw new Error("Mã kiểm tra giao diện tải về không khớp.");
  if (!/^\s*<!doctype html/i.test(buf.subarray(0, 64).toString("utf8"))) throw new Error("Tệp giao diện tải về không đúng định dạng.");

  fs.mkdirSync(dir, { recursive: true });
  atomicWrite(path.join(dir, m.file), buf);          // tệp giao diện trước
  atomicWrite(path.join(dir, "ui.json"), text);      // thông tin sau cùng: có ui.json nghĩa là tệp đã đủ và đúng
  prune(dir, [m.file, ...keep]);
  const now = pick(dir, shellVersion);
  if (!now) throw new Error("Ghi giao diện mới không thành công.");
  return { s: "ready", version: now.version, notes: now.notes, path: now.path };
}

module.exports = { check, pick, markBad, readBad, cmp, parse, sha512, validManifest, prune, FILE_RX, MAX_SIZE };
