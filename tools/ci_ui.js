// Hỗ trợ phát hành nhẹ (chạy trong GitHub Actions, cũng chạy được trên máy bạn).
//
//   node tools/ci_ui.js detect            → so sánh "phần lõi" với bản đã phát hành gần nhất; ghi changed=true/false vào $GITHUB_OUTPUT
//   node tools/ci_ui.js bundle <thư mục>  → tạo ui.json + index-<phiên bản>.html trong <thư mục> để đăng lên nhánh "ui"
//
// "Phần lõi" = những thứ nằm trong bộ cài và KHÔNG đổi được bằng cập nhật giao diện: main.js, preload.js, backup.js, uiupdate.js,
// biểu tượng, thư mục assets, và mục dependencies/devDependencies/build của package.json. Đổi các thứ này thì phải tăng "version"
// và phát hành bộ cài mới. Chỉ đổi index.html (giao diện) thì chỉ đăng bản giao diện nhẹ.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const REL_REPO = process.env.REL_REPO || "Alesnguyen/bg-sales-management-releases";
const UI_RAW = `https://raw.githubusercontent.com/${REL_REPO}/ui/`;
const CORE_FILES = ["main.js", "preload.js", "backup.js", "uiupdate.js", "build/icon.png"];

const walk = (dir, base = dir) => fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name), base) : [path.relative(base, path.join(dir, d.name)).split(path.sep).join("/")])
  : [];
// Thống nhất xuống dòng (Windows/Linux) để mã băm không đổi chỉ vì khác hệ điều hành.
const norm = (f, buf) => /\.(js|json|md|html|yml)$/i.test(f) ? Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n"), "utf8") : buf;

function coreHash(root = ROOT) {
  const h = crypto.createHash("sha256");
  const files = [...CORE_FILES, ...walk(path.join(root, "assets")).map((f) => "assets/" + f)].sort();
  for (const f of files) {
    h.update(f + "\0");
    h.update(norm(f, fs.readFileSync(path.join(root, f))));
    h.update("\0");
  }
  const p = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  h.update(JSON.stringify({ main: p.main, productName: p.productName, dependencies: p.dependencies, devDependencies: p.devDependencies, build: p.build }));
  return h.digest("hex");
}

// Ghi chú phát hành = mục "## <phiên bản>" trong CHANGELOG.md, rút gọn thành văn bản thường.
function notesFor(version, root = ROOT) {
  let t = "";
  try { t = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8").replace(/\r\n/g, "\n"); } catch (_) { /* bỏ qua */ }
  const lines = t.split("\n");
  const i = lines.findIndex((l) => l.trim() === "## " + version);
  if (i < 0) return "Phiên bản " + version;
  const out = [];
  for (let k = i + 1; k < lines.length && !/^## /.test(lines[k]); k++) out.push(lines[k]);
  return out.join(" ").replace(/[*_`#>-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 400) || "Phiên bản " + version;
}

function bundle(outDir, { root = ROOT, shell, shellHash } = {}) {
  const pk = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const version = pk.version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("version trong package.json phải dạng x.y.z, hiện là " + version);
  const html = norm("index.html", fs.readFileSync(path.join(root, "index.html")));
  if (!html.includes(`const VER="${version}"`)) throw new Error(`index.html chưa được dựng lại cho phiên bản ${version}. Chạy "python3 tools/build_app.py" rồi commit lại index.html.`);
  const file = `index-${version}.html`;
  const manifest = {
    version, shell: shell || version, shellHash: shellHash || coreHash(root),
    file, size: html.length, sha512: crypto.createHash("sha512").update(html).digest("base64"),
    notes: notesFor(version, root), published: new Date().toISOString()
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, file), html);
  fs.writeFileSync(path.join(outDir, "ui.json"), JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "README.md"), "Nhánh này chỉ chứa bản giao diện mới nhất của BG Sales Management (ui.json và index-*.html). Được tạo tự động, không sửa tay.\n");
  return manifest;
}

// null = chưa từng phát hành (404). Lỗi mạng/lỗi khác thì dừng, để không build bộ cài nặng chỉ vì GitHub trục trặc.
async function previousManifest(base = UI_RAW) {
  let r;
  try { r = await fetch(base + "ui.json", { cache: "no-store" }); }
  catch (e) { throw new Error("Không đọc được thông tin phát hành trước đó: " + e.message + ". Hãy chạy lại."); }
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Không đọc được thông tin phát hành trước đó (HTTP " + r.status + "). Hãy chạy lại.");
  const m = await r.json().catch(() => null);
  return m && m.shellHash ? m : null;
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "detect") {
    const hash = coreHash(), prev = await previousManifest();
    const pk = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    const changed = !prev || prev.shellHash !== hash;
    const shell = changed ? pk.version : prev.shell;
    console.log(changed
      ? `Phần lõi ${prev ? "đã thay đổi" : "chưa từng phát hành"}: sẽ build và đăng BỘ CÀI mới (${pk.version}).`
      : `Phần lõi không đổi (bộ cài hiện hành ${prev.shell}): chỉ đăng bản GIAO DIỆN nhẹ ${pk.version}.`);
    const out = `changed=${changed}\nshell=${shell}\nhash=${hash}\n`;
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, out); else console.log(out);
  } else if (cmd === "bundle") {
    const m = bundle(process.argv[3] || "dist-ui", { shell: process.env.CORE_VERSION, shellHash: process.env.CORE_HASH });
    console.log(`Đã tạo ${m.file} (${m.size} byte), lõi yêu cầu ${m.shell}.`);
  } else {
    console.error("Cách dùng: node tools/ci_ui.js detect | bundle <thư mục>");
    process.exit(2);
  }
}

if (require.main === module) main().catch((e) => { console.error("::error::" + e.message); process.exit(1); });
module.exports = { coreHash, notesFor, bundle, previousManifest, CORE_FILES };
