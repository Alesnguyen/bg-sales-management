// Ghi/đọc bản sao lưu tự động trên đĩa (chạy trong tiến trình chính của Electron, không dùng trong giao diện).
const fs = require("fs");
const path = require("path");

const RX = /^bgsm-\d{4}-\d{2}-\d{2}_\d{4}(?:-\d+)?\.json$/;
const pad = (n) => String(n).padStart(2, "0");
const stamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;

function list(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => RX.test(f)).map((f) => {
    const s = fs.statSync(path.join(dir, f));
    return { name: f, mtime: s.mtimeMs, size: s.size };
  }).sort((a, b) => b.mtime - a.mtime || b.name.localeCompare(a.name));
}

function prune(dir, keep) {
  list(dir).slice(keep).forEach((x) => { try { fs.unlinkSync(path.join(dir, x.name)); } catch (_) { /* bỏ qua */ } });
}

// Ghi nguyên tử (ghi tệp tạm rồi đổi tên) để không bao giờ để lại tệp sao lưu dở dang.
function save(dir, text, keep = 30, now = new Date()) {
  JSON.parse(text);
  fs.mkdirSync(dir, { recursive: true });
  let name = `bgsm-${stamp(now)}.json`;
  for (let i = 1; fs.existsSync(path.join(dir, name)); i++) name = `bgsm-${stamp(now)}-${i}.json`;
  const tmp = path.join(dir, name + ".tmp");
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, path.join(dir, name));
  prune(dir, keep);
  return name;
}

function read(dir, name) {
  if (!RX.test(name)) throw new Error("Tên tệp sao lưu không hợp lệ.");
  return fs.readFileSync(path.join(dir, name), "utf8");
}

module.exports = { save, list, read, prune, stamp, RX };
