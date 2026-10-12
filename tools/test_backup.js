// Kiểm thử mô-đun sao lưu tự động: node tools/test_backup.js
const assert = require("assert"), fs = require("fs"), os = require("os"), path = require("path");
const b = require("../backup.js");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bgsm-bk-"));
let t = new Date(2026, 9, 12, 8, 0);
const mk = (n) => JSON.stringify({ app: "bgsm", customers: Array(n).fill({}), work: [] });
for (let i = 0; i < 35; i++) { b.save(dir, mk(i), 30, new Date(t.getTime() + i * 60000)); }
let l = b.list(dir);
assert.strictEqual(l.length, 30, "chỉ giữ 30 bản gần nhất");
assert.ok(l.every((x) => b.RX.test(x.name)), "tên tệp hợp lệ");
assert.ok(!fs.readdirSync(dir).some((f) => f.endsWith(".tmp")), "không để lại tệp tạm");
const n1 = b.save(dir, mk(1), 30, new Date(2026, 9, 12, 9, 0)), n2 = b.save(dir, mk(2), 30, new Date(2026, 9, 12, 9, 0));
assert.notStrictEqual(n1, n2, "cùng phút vẫn không ghi đè");
assert.strictEqual(JSON.parse(b.read(dir, n2)).customers.length, 2, "đọc lại đúng nội dung");
assert.throws(() => b.read(dir, "../../etc/passwd"), /không hợp lệ/, "chặn đường dẫn lạ");
assert.throws(() => b.read(dir, "bgsm-x.json"), /không hợp lệ/, "chặn tên sai định dạng");
assert.throws(() => b.save(dir, "không phải json"), "từ chối nội dung không phải JSON");
assert.deepStrictEqual(b.list(path.join(dir, "khong-co")), [], "thư mục chưa có thì trả về rỗng");
fs.rmSync(dir, { recursive: true, force: true });
console.log("PASS: mô-đun sao lưu (giữ 30 bản, ghi nguyên tử, chặn đường dẫn lạ, không ghi đè)");
