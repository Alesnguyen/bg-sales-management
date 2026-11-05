/* BG Sales Management — Lõi nghiệp vụ tích hợp AMIS CRM (v0.17.0)
   Module thuần (không truy cập mạng, không truy cập IndexedDB): dùng chung cho giao diện (index.html) và tiến trình chính Electron,
   đồng thời chạy được bằng Node để kiểm thử.

   Nguyên tắc (theo "Đặc tả tích hợp AMIS CRM → BG Sales Management v1.0"):
   - Một chiều AMIS → BG; chỉ đọc tổng giá trị đơn hàng trước thuế.
   - Mỗi đơn hàng AMIS là MỘT bản ghi trong sổ đơn (khóa = ID đơn AMIS). Đơn gửi lại / sửa thì cập nhật bản ghi cũ, không cộng thêm.
   - Doanh số của khách hàng BG luôn được TÍNH LẠI từ sổ đơn rồi chỉ cộng phần chênh lệch so với phần đã cộng (c.amisAdd),
     nên cùng một dữ liệu xử lý bao nhiêu lần cũng cho cùng một kết quả (idempotent), sửa/hủy đơn tự đảo đúng phần đã ghi.
   - Khách hàng chưa có trong BG: vào danh sách chờ; chưa duyệt thì chưa cộng doanh số.
   - Không đoán tên trường JSON của MISA: mọi trường lấy qua bảng ánh xạ do người dùng cấu hình.
   - (v0.17.0) Chỉ ghi nhận đơn của đúng nhân viên kinh doanh đã được người dùng xác nhận tên (khóa API dùng chung cho cả nhóm nên phải lọc),
     và đơn đánh dấu Ký gửi trên AMIS thì CHƯA ghi nhận doanh số (bỏ đánh dấu Ký gửi trên AMIS thì lần đồng bộ sau tự cộng). */
(function (root) {
"use strict";

const key = s => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ").trim();
/* Tên đã bỏ dấu câu: dùng để tự động ghép (khớp chính xác, không phân biệt hoa thường/dấu/dấu câu) */
const nameKey = s => key(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const LEGAL = new Set(["cong", "ty", "cty", "tnhh", "tm", "dv", "cp", "co", "phan", "mtv", "mot", "thanh", "vien", "tap", "doan", "jsc", "ltd", "company", "limited", "corp", "inc", "trach", "nhiem", "huu", "han", "chi", "nhanh", "tong", "dai", "ly"]);
const nameCore = s => nameKey(s).split(" ").filter(t => t && !LEGAL.has(t)).join(" ");

/* ===== Đọc dữ liệu thô ===== */
function getPath(o, p) {
  if (o == null || p == null || p === "") return undefined;
  let cur = o;
  for (const part of String(p).split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[part];
  }
  return cur;
}
/* Giá trị văn bản của một trường AMIS: chữ/số/true-false lấy nguyên; danh sách chọn dạng đối tượng {name|label|value…} lấy tên hiển thị */
function plainText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(plainText).filter(Boolean).join(", ");
  if (typeof v === "object") for (const k of ["name", "label", "text", "title", "value", "display_name", "displayName"]) if (isPlain(v[k]) && v[k] !== "") return plainText(v[k]);
  return "";
}
const isPlain = v => v != null && (typeof v === "string" || typeof v === "number" || typeof v === "boolean");

function parseAmount(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.replace(/[\s\u00a0₫đdvndVND]/g, "");
  if (!s || !/^[-+]?[\d.,]+$/.test(s)) return null;
  const dot = s.lastIndexOf("."), com = s.lastIndexOf(",");
  if (dot >= 0 && com >= 0) {
    const dec = dot > com ? "." : ",";
    s = dec === "." ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
  } else if (com >= 0) {
    s = /^[-+]?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (dot >= 0 && /^[-+]?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return isFinite(n) ? n : null;
}

const pad2 = n => String(n).padStart(2, "0");
const validYMD = (y, m, d) => y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
/* → "YYYY-MM-DD" hoặc null. Chuỗi ISO lấy đúng phần ngày ghi trong dữ liệu (không đổi múi giờ để khỏi lệch ngày). */
function parseDate(v) {
  if (v instanceof Date && isFinite(v)) return v.getFullYear() + "-" + pad2(v.getMonth() + 1) + "-" + pad2(v.getDate());
  if (typeof v === "number" && isFinite(v)) {
    const ms = v > 1e12 ? v : v > 1e9 ? v * 1000 : null;
    return ms == null ? null : parseDate(new Date(ms));
  }
  if (typeof v !== "string") return null;
  const s = v.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?![\d])/.exec(s);
  if (m && validYMD(+m[1], +m[2], +m[3])) return m[1] + "-" + pad2(+m[2]) + "-" + pad2(+m[3]);
  m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?![\d])/.exec(s);
  if (m && validYMD(+m[3], +m[2], +m[1])) return m[3] + "-" + pad2(+m[2]) + "-" + pad2(+m[1]);
  if (/^\d{10,13}$/.test(s)) return parseDate(Number(s));
  return null;
}
/* → số mili-giây hoặc null (dùng cho mốc “ngày sửa đổi”) */
function parseTime(v) {
  if (v instanceof Date) return isFinite(v) ? v.getTime() : null;
  if (typeof v === "number") return isFinite(v) ? (v > 1e12 ? v : v > 1e9 ? v * 1000 : null) : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  let m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) { const t = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime(); return isFinite(t) ? t : null; }
  if (/^\d{10,13}$/.test(s)) return parseTime(Number(s));
  const t = Date.parse(s.replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, "$1T$2"));
  return isFinite(t) ? t : null;
}

/* ===== Phản hồi API: tìm danh sách, token, trường ===== */
const LIST_KEYS = ["data", "Data", "items", "Items", "records", "Records", "result", "Result", "results", "rows", "list"];
function findList(resp) {
  if (Array.isArray(resp)) return { path: "", list: resp };
  const seen = new Set(), q = [["", resp]];
  while (q.length) {
    const [p, o] = q.shift();
    if (!o || typeof o !== "object" || seen.has(o)) continue;
    seen.add(o);
    if (Array.isArray(o)) return { path: p, list: o };
    const keys = Object.keys(o), ord = [...LIST_KEYS.filter(k => keys.includes(k)), ...keys.filter(k => !LIST_KEYS.includes(k))];
    for (const k of ord) if (Array.isArray(o[k])) return { path: p ? p + "." + k : k, list: o[k] };
    for (const k of ord) if (o[k] && typeof o[k] === "object" && (p.split(".").length < 3)) q.push([p ? p + "." + k : k, o[k]]);
  }
  return null;
}
function findTotal(resp) {
  const names = ["total", "totalcount", "total_count", "totalrecords", "total_records", "count"];
  const q = [resp], seen = new Set();
  while (q.length) {
    const o = q.shift();
    if (!o || typeof o !== "object" || Array.isArray(o) || seen.has(o)) continue;
    seen.add(o);
    for (const k of Object.keys(o)) if (names.includes(k.toLowerCase()) && typeof o[k] === "number") return o[k];
    for (const k of Object.keys(o)) if (o[k] && typeof o[k] === "object") q.push(o[k]);
  }
  return null;
}
function findToken(resp) {
  const names = ["access_token", "accesstoken", "token"];
  const q = [resp], seen = new Set();
  let ttl = null, tok = null;
  while (q.length) {
    const o = q.shift();
    if (!o || typeof o !== "object" || seen.has(o)) continue;
    seen.add(o);
    for (const k of Object.keys(o)) {
      const lk = k.toLowerCase();
      if (!tok && names.includes(lk) && typeof o[k] === "string" && o[k].length >= 10) tok = o[k];
      if (ttl == null && (lk === "expires_in" || lk === "expiresin") && typeof o[k] === "number" && o[k] > 0) ttl = o[k];
    }
    for (const k of Object.keys(o)) if (o[k] && typeof o[k] === "object") q.push(o[k]);
  }
  return tok ? { token: tok, ttl } : null;
}
/* Làm phẳng một bản ghi thành danh sách đường dẫn trường + giá trị mẫu (để người dùng chọn ánh xạ) */
function flatten(o, maxDepth = 4) {
  const out = [];
  (function walk(v, p, d) {
    if (v !== null && typeof v === "object" && d < maxDepth) {
      if (Array.isArray(v)) { out.push({ path: p, type: "array", sample: "[" + v.length + " phần tử]" }); return; }
      const ks = Object.keys(v);
      if (!ks.length) { out.push({ path: p, type: "object", sample: "{}" }); return; }
      ks.forEach(k => walk(v[k], p ? p + "." + k : k, d + 1));
      return;
    }
    if (p) out.push({ path: p, type: v === null ? "null" : Array.isArray(v) ? "array" : typeof v, sample: v === null ? "null" : typeof v === "object" ? "{…}" : String(v).slice(0, 80) });
  })(o, "", 0);
  return out;
}

/* ===== Ánh xạ trường ===== */
const MAP_KEYS = ["orderId", "orderNo", "accountId", "accountCode", "accountName", "owner", "consign", "orderDate", "modified", "status", "amount"];
const MAP_LABELS = {
  orderId: "ID đơn hàng (bất biến)", orderNo: "Số/mã đơn hàng", accountId: "ID khách hàng AMIS", accountCode: "Mã khách hàng AMIS",
  accountName: "Tên khách hàng/công ty", orderDate: "Ngày đơn hàng", modified: "Ngày sửa đổi", status: "Trạng thái đơn",
  owner: "Nhân viên kinh doanh (người phụ trách đơn)", consign: "Ký gửi (cờ/loại đơn do kinh doanh chọn trên AMIS)", amount: "Tổng giá trị trước thuế"
};
/* Chỉ điền sẵn những trường đã THẤY trong tài liệu MISA (sale_order_no, account_name). Các trường còn lại để trống, không đoán. */
const DEFAULT_MAP = { orderId: "", orderNo: "sale_order_no", accountId: "", accountCode: "", accountName: "account_name", owner: "", consign: "", orderDate: "", modified: "", status: "", amount: "" };
const DEFAULT_CFG = { map: { ...DEFAULT_MAP }, eligible: [], owners: [], consignValues: [], cutover: "2026-01-01", interval: 5, autoLink: true, enabled: true, orderBy: "modified_date" };

function cfgOf(c) {
  const o = c || {};
  return { ...DEFAULT_CFG, ...o, map: { ...DEFAULT_MAP, ...(o.map || {}) }, eligible: Array.isArray(o.eligible) ? o.eligible : [], owners: Array.isArray(o.owners) ? o.owners : [], consignValues: Array.isArray(o.consignValues) ? o.consignValues : [] };
}
/* Danh sách điều kiện còn thiếu trước khi đồng bộ được (rỗng = đủ) */
function cfgProblems(c) {
  const f = cfgOf(c), m = f.map, p = [];
  if (!m.orderId && !m.orderNo) p.push("Chưa chọn trường ID/số đơn hàng.");
  if (!m.accountId && !m.accountCode) p.push("Chưa chọn trường ID (hoặc mã) khách hàng AMIS.");
  if (!m.accountName) p.push("Chưa chọn trường tên khách hàng.");
  if (!m.orderDate) p.push("Chưa chọn trường ngày đơn hàng.");
  if (!m.amount) p.push("Chưa chọn trường tổng giá trị trước thuế.");
  if (!m.owner) p.push("Chưa chọn trường nhân viên kinh doanh (người phụ trách đơn).");
  else if (!f.owners.length) p.push("Chưa xác nhận tên kinh doanh của bạn: hãy bấm “Quét” rồi tích đúng tên.");
  if (!m.consign) p.push("Chưa chọn trường Ký gửi.");
  if (!parseDate(f.cutover)) p.push("Chưa đặt ngày bắt đầu ghi nhận doanh số.");
  return p;
}

/* Cảnh báo (không chặn đồng bộ) */
function cfgWarnings(c) {
  const f = cfgOf(c), w = [];
  if (f.map.consign && !f.consignValues.length) w.push("Chưa chọn giá trị nào nghĩa là Ký gửi: hiện mọi đơn đều được tính doanh số.");
  if (f.map.status && !f.eligible.length) w.push("Chưa chọn trạng thái đơn được tính doanh số: hiện chưa đơn nào được cộng.");
  return w;
}

/* Chuẩn hóa một đơn hàng thô của MISA theo bảng ánh xạ → {ok, order | errors} */
function normalizeOrder(raw, map) {
  const m = { ...DEFAULT_MAP, ...(map || {}) }, g = k => (m[k] ? getPath(raw, m[k]) : undefined);
  const errors = [], idv = g("orderId") ?? g("orderNo"), acc = g("accountId") ?? g("accountCode");
  const amount = parseAmount(g("amount")), date = parseDate(g("orderDate"));
  if (!isPlain(idv) || idv === "") errors.push("thiếu ID/số đơn hàng");
  if (!isPlain(acc) || acc === "") errors.push("thiếu ID/mã khách hàng");
  if (amount == null) errors.push("tổng trước thuế không đọc được");
  if (!date) errors.push("ngày đơn hàng không đọc được");
  if (errors.length) return { ok: false, errors, ref: isPlain(idv) ? String(idv) : "" };
  const nm = g("accountName"), cd = g("accountCode"), st = g("status"), no = g("orderNo"), md = g("modified");
  return {
    ok: true,
    order: {
      id: String(idv), orderNo: isPlain(no) ? String(no) : "", accountId: String(acc), accountCode: isPlain(cd) ? String(cd) : "",
      accountName: isPlain(nm) ? String(nm).trim() : "", orderDate: date, modified: parseTime(md), status: plainText(st),
      owner: plainText(g("owner")), consign: plainText(g("consign")),
      amount
    }
  };
}

/* ===== Điều kiện ghi nhận ===== */
/* Ký gửi: giá trị trường Ký gửi nằm trong danh sách “giá trị nghĩa là Ký gửi” (vd true, “Ký gửi”). Trường trống = không ký gửi. */
const consignOf = (o, cfg) => !!cfg.map.consign && o.consign != null && o.consign !== "" && new Set((cfg.consignValues || []).map(key)).has(key(o.consign));
/* Đơn của đúng kinh doanh đã xác nhận. Đơn cũ chưa có thông tin người phụ trách (owner = undefined, từ bản trước) tạm coi là của bạn đến lần đồng bộ lại. */
const mineOf = (o, cfg) => !cfg.map.owner || o.owner === undefined || new Set((cfg.owners || []).map(key)).has(key(o.owner));
const eligibleOf = (o, cfg) => o.amount != null && !consignOf(o, cfg) && (!cfg.map.status || new Set((cfg.eligible || []).map(key)).has(key(o.status)));
const inRangeOf = (o, cfg) => { const y = +String(o.orderDate).slice(0, 4); return (y === 2025 || y === 2026) && o.orderDate >= (parseDate(cfg.cutover) || "2026-01-01"); };
const ymOf = o => String(o.orderDate).slice(0, 7);

/* ===== Đối chiếu khách hàng ===== */
function indexCustomers(customers) {
  const exact = new Map(), cores = [];
  for (const c of customers) {
    const k = nameKey(c.name);
    if (k) (exact.get(k) || exact.set(k, []).get(k)).push(c.id);
    cores.push({ id: c.id, name: c.name, core: nameCore(c.name), tok: new Set(nameCore(c.name).split(" ").filter(Boolean)) });
  }
  return { exact, cores };
}
/* → {type:"exact", id} khi có ĐÚNG MỘT khách trùng tên chính xác; ngược lại type none/ambiguous kèm gợi ý gần giống */
function matchCustomer(name, idx) {
  const k = nameKey(name), ex = idx.exact.get(k) || [];
  if (ex.length === 1) return { type: "exact", id: ex[0], candidates: [] };
  const core = nameCore(name), tk = new Set(core.split(" ").filter(Boolean)), cand = [];
  for (const c of idx.cores) {
    let s = 0;
    if (ex.includes(c.id)) s = 1;
    else if (core && c.core && core === c.core) s = .95;
    else if (core.length >= 4 && c.core.length >= 4 && (c.core.includes(core) || core.includes(c.core))) s = .8;
    else if (tk.size && c.tok.size) { let i = 0; tk.forEach(t => { if (c.tok.has(t)) i++; }); const j = i / (tk.size + c.tok.size - i); if (j >= .5) s = j * .75; }
    if (s >= .5) cand.push({ id: c.id, name: c.name, score: Math.round(s * 100) / 100 });
  }
  cand.sort((a, b) => b.score - a.score);
  return { type: ex.length > 1 ? "ambiguous" : "none", id: null, candidates: cand.slice(0, 3) };
}

/* ===== Cập nhật doanh số khách hàng (chỉ phần chênh lệch) ===== */
const emptyM = () => Array.from({ length: 12 }, () => [null, null]);
const emptyQ = () => [0, 1, 2, 3].map(() => [null, null]);
/* Doanh số AMIS cần có của từng khách: Map<cid, {"YYYY-MM": số tiền}> */
function desiredMap(orders) {
  const w = new Map();
  for (const o of orders) if (o.counted && o.cid) {
    const m = w.get(o.cid) || w.set(o.cid, {}).get(o.cid), k = ymOf(o);
    m[k] = (m[k] || 0) + o.amount;
  }
  w.forEach(m => { for (const k in m) m[k] = Math.round(m[k]); });
  return w;
}
/* Trả về bản ghi khách hàng mới nếu có thay đổi, ngược lại null */
function reconcileCustomer(c, want) {
  const have = c.amisAdd || {}, keys = new Set([...Object.keys(have), ...Object.keys(want || {})]);
  const diff = [];
  keys.forEach(k => { const d = ((want || {})[k] || 0) - (have[k] || 0); if (Math.abs(d) >= .5) diff.push([k, Math.round(d)]); });
  const nextAdd = {};
  Object.keys(want || {}).forEach(k => { if (Math.abs(want[k]) >= .5) nextAdd[k] = want[k]; });
  if (!diff.length && JSON.stringify(nextAdd) === JSON.stringify(c.amisAdd || {})) return null;
  const n = { ...c, m: (c.m && c.m.length === 12 ? c.m : emptyM()).map(r => [r?.[0] ?? null, r?.[1] ?? null]), q: (c.q && c.q.length === 4 ? c.q : emptyQ()).map(r => [r?.[0] ?? null, r?.[1] ?? null]) };
  for (const [k, d] of diff) {
    const y = +k.slice(0, 4), mo = +k.slice(5, 7) - 1, yi = y - 2025;
    if (yi < 0 || yi > 1 || mo < 0 || mo > 11) continue;
    n.m[mo][yi] = (n.m[mo][yi] || 0) + d;
    if (yi === 1) { n.a26 = (n.a26 || 0) + d; const qk = Math.floor(mo / 3); n.q[qk][0] = (n.q[qk][0] || 0) + d; }
    else n.a25 = (n.a25 || 0) + d;
  }
  if (Object.keys(nextAdd).length) n.amisAdd = nextAdd; else delete n.amisAdd;
  n.updated = Date.now();
  return n;
}
/* Doanh số thực tế 2026 của một quý. Khách chỉ có số quý nhập tay (không có số tháng) mà phát sinh đơn AMIS trong quý thì
   vẫn giữ số quý nhập tay + phần AMIS, thay vì chỉ lấy phần AMIS ở các tháng. */
function quarterVal(c, k) {
  const ms = [0, 1, 2].map(j => c.m?.[3 * k + j]?.[1]), qv = c.q?.[k]?.[0] || 0;
  if (!ms.some(v => v != null)) return qv;
  const add = c.amisAdd;
  if (add) {
    const am = [0, 1, 2].reduce((s, j) => s + (add["2026-" + pad2(3 * k + j + 1)] || 0), 0), sum = ms.reduce((t, v) => t + (v || 0), 0);
    if (am && Math.abs(sum - am) < 1 && qv > am) return qv;
  }
  return ms.reduce((t, v) => t + (v || 0), 0);
}

/* ===== Vùng làm việc (không sửa dữ liệu đầu vào; theo dõi bản ghi thay đổi để ghi một lần) ===== */
function mkWork(S) {
  const by = a => new Map((a || []).map(x => [x.id, x]));
  return {
    customers: by(S.customers), orders: by(S.orders), links: by(S.links), pending: by(S.pending),
    dirty: { customers: new Set(), orders: new Set(), links: new Set(), pending: new Set() },
    del: { links: new Set(), pending: new Set() }, logs: [],
    stats: { added: 0, updated: 0, unchanged: 0, skippedOld: 0, skippedOwner: 0, invalid: 0, linked: 0, pending: 0, ignored: 0, foreign: 0, consigned: 0, counted: 0 }
  };
}
const setRec = (w, st, r) => { w[st].set(r.id, r); w.dirty[st].add(r.id); if (w.del[st]) w.del[st].delete(r.id); };
const delRec = (w, st, id) => { if (w[st].has(id)) { w[st].delete(id); w.dirty[st].delete(id); w.del[st].add(id); } };
const log = (w, now, level, action, objectId, result, message) => w.logs.push({ time: now, level, action, objectId: objectId || "", result: result || "", message: message || "" });

/* Đối chiếu lại toàn bộ sổ đơn và cập nhật doanh số khách hàng */
function settle(w, cfg, now, touched) {
  const custList = [...w.customers.values()];
  const idx = indexCustomers(custList);
  const latest = new Map();               // accountId → đơn mới nhất (để lấy tên/mã hiện hành)
  for (const o of w.orders.values()) { if (!mineOf(o, cfg)) continue; const p = latest.get(o.accountId); if (!p || (o.updated || 0) >= (p.updated || 0)) latest.set(o.accountId, o); }
  const verdict = new Map();              // accountId → {kind, cid}
  for (const [acc, lo] of latest) {
    let link = w.links.get(acc);
    if (link && !w.customers.has(link.cid)) { delRec(w, "links", acc); log(w, now, "warn", "link", acc, "gỡ", "Khách hàng BG đã liên kết không còn tồn tại: " + link.cid); link = null; }
    if (link) { verdict.set(acc, { kind: "linked", cid: link.cid }); continue; }
    const p = w.pending.get(acc);
    if (p && p.state === "ignored") { verdict.set(acc, { kind: "ignored" }); continue; }
    if (cfg.autoLink) {
      const m = matchCustomer(lo.accountName, idx);
      if (m.type === "exact") {
        setRec(w, "links", { id: acc, cid: m.id, code: lo.accountCode || "", name: lo.accountName, source: "auto-name", at: now });
        if (p) delRec(w, "pending", acc);
        log(w, now, "info", "link", acc, "tự động ghép", lo.accountName + " → " + m.id);
        verdict.set(acc, { kind: "linked", cid: m.id }); continue;
      }
    }
    const m2 = matchCustomer(lo.accountName, idx);
    const np = { id: acc, name: lo.accountName, code: lo.accountCode || "", state: "pending", firstSeen: p?.firstSeen || now, lastSeen: p?.lastSeen || now, candidates: m2.candidates };
    if (touched && touched.has(acc)) np.lastSeen = now;
    if (!p || p.name !== np.name || p.code !== np.code || p.lastSeen !== np.lastSeen || JSON.stringify(p.candidates || []) !== JSON.stringify(np.candidates)) setRec(w, "pending", np);
    verdict.set(acc, { kind: "pending" });
  }
  const st = w.stats; st.linked = st.pending = st.ignored = st.foreign = st.consigned = st.counted = 0;
  for (const o of w.orders.values()) {
    const mine = mineOf(o, cfg), v = !mine ? { kind: "foreign" } : (verdict.get(o.accountId) || { kind: "pending" });
    const cs = consignOf(o, cfg), el = eligibleOf(o, cfg), ir = inRangeOf(o, cfg);
    const counted = v.kind === "linked" && el && ir, cid = v.kind === "linked" ? v.cid : null;
    if (o.state !== v.kind || o.cid !== cid || o.eligible !== el || o.inRange !== ir || o.counted !== counted || o.consigned !== cs) setRec(w, "orders", { ...o, state: v.kind, cid, eligible: el, inRange: ir, counted, consigned: cs });
    if (v.kind === "linked") st.linked++; else if (v.kind === "pending") st.pending++; else if (v.kind === "foreign") st.foreign++; else st.ignored++;
    if (cs && mine) st.consigned++;
    if (counted) st.counted++;
  }
  /* Khách hàng đã bị xóa khỏi pending nhưng không còn đơn nào → dọn bản ghi chờ mồ côi */
  for (const p of [...w.pending.values()]) if (!latest.has(p.id) && p.state === "pending") delRec(w, "pending", p.id);
  const want = desiredMap(w.orders.values());
  for (const c of w.customers.values()) {
    const nc = reconcileCustomer(c, want.get(c.id));
    if (nc) { setRec(w, "customers", nc); log(w, now, "info", "doanh số", c.id, "cập nhật", "Doanh số AMIS của “" + c.name + "” đã được tính lại"); }
  }
  return w;
}
const collect = w => ({
  customers: [...w.dirty.customers].map(i => w.customers.get(i)), orders: [...w.dirty.orders].map(i => w.orders.get(i)),
  links: [...w.dirty.links].map(i => w.links.get(i)), pending: [...w.dirty.pending].map(i => w.pending.get(i)),
  delLinks: [...w.del.links], delPending: [...w.del.pending], logs: w.logs, stats: w.stats
});

/* ===== Các thao tác ===== */
/* Xử lý một lô đơn hàng đã chuẩn hóa (từ API) */
function processOrders(S, incoming, cfgIn, now) {
  const cfg = cfgOf(cfgIn), w = mkWork(S), touched = new Set(), st = w.stats;
  for (const o of incoming) {
    const ex = w.orders.get(o.id);
    if (!ex && o.orderDate < (parseDate(cfg.cutover) || "2026-01-01")) { st.skippedOld++; continue; }
    if (!ex && !mineOf(o, cfg)) { st.skippedOwner++; continue; }   // đơn của kinh doanh khác: không lưu vào BG
    const same = ex && ex.owner === o.owner && ex.consign === o.consign && ex.amount === o.amount && ex.status === o.status && ex.orderDate === o.orderDate && ex.accountId === o.accountId && ex.accountName === o.accountName && ex.accountCode === o.accountCode && ex.orderNo === o.orderNo && ex.modified === o.modified;
    if (same) { st.unchanged++; continue; }
    if (ex) {
      st.updated++;
      const ocs = ex.consign !== o.consign && consignOf(ex, cfg) !== consignOf(o, cfg), oow = ex.owner !== undefined && ex.owner !== o.owner && mineOf(ex, cfg) !== mineOf(o, cfg);
      if (ex.amount !== o.amount || ex.status !== o.status || ex.orderDate !== o.orderDate || ocs || oow)
        log(w, now, "info", "đơn hàng", o.id, "cập nhật", (o.orderNo || o.id) + ": " + [ex.amount !== o.amount ? "tiền " + ex.amount + " → " + o.amount : "", ex.status !== o.status ? "trạng thái “" + ex.status + "” → “" + o.status + "”" : "", ex.orderDate !== o.orderDate ? "ngày " + ex.orderDate + " → " + o.orderDate : "", ocs ? (consignOf(o, cfg) ? "chuyển sang Ký gửi (tạm chưa tính doanh số)" : "bỏ Ký gửi (bắt đầu tính doanh số)") : "", oow ? "người phụ trách " + (ex.owner || "—") + " → " + (o.owner || "—") + (mineOf(o, cfg) ? "" : " (không phải của bạn, gỡ doanh số)") : ""].filter(Boolean).join("; "));
    } else st.added++;
    setRec(w, "orders", { ...(ex || {}), ...o, firstSeen: ex?.firstSeen || now, updated: now });
    touched.add(o.accountId);
  }
  settle(w, cfg, now, touched);
  return collect(w);
}
/* Đối chiếu lại sổ đơn sau khi đổi cấu hình (rule trạng thái, ngày bắt đầu…) hoặc sau khi nhập Excel/khôi phục sao lưu */
function resettle(S, cfgIn, now) { const w = mkWork(S); settle(w, cfgOf(cfgIn), now); return collect(w); }

/* Đồng ý thêm: tạo hồ sơ tối thiểu (CHỈ Tên công ty + Mã khách hàng AMIS) rồi cộng toàn bộ đơn hợp lệ đang chờ */
function approveNew(S, accId, cfgIn, now) {
  const cfg = cfgOf(cfgIn), w = mkWork(S), p = w.pending.get(accId);
  if (!p || p.state !== "pending") throw new Error("Khách hàng này không còn trong danh sách chờ.");
  const name = String(p.name || "").trim(), id = key(name);
  if (!name) throw new Error("Khách hàng AMIS chưa có tên công ty.");
  if (w.customers.has(id) || [...w.customers.values()].some(c => key(c.name) === id)) { const e = new Error("Đã có khách hàng trùng tên “" + name + "” trong BG. Hãy chọn “Ghép với khách hàng có sẵn”."); e.code = "DUP"; throw e; }
  setRec(w, "customers", { id, name, code: p.code || "", archived: false, src: "amis", a25: null, t26: null, a26: null, q: emptyQ(), m: emptyM(), tags: [], note: "", amisId: accId, updated: now });
  setRec(w, "links", { id: accId, cid: id, code: p.code || "", name, source: "approve-new", at: now });
  delRec(w, "pending", accId);
  log(w, now, "info", "duyệt", accId, "thêm khách hàng", "Tạo hồ sơ “" + name + "” (mã AMIS " + (p.code || "—") + ")");
  settle(w, cfg, now);
  return collect(w);
}
function approveLink(S, accId, cid, cfgIn, now) {
  const cfg = cfgOf(cfgIn), w = mkWork(S), p = w.pending.get(accId), c = w.customers.get(cid);
  if (!p) throw new Error("Khách hàng này không còn trong danh sách chờ.");
  if (!c) throw new Error("Không tìm thấy khách hàng BG đã chọn.");
  setRec(w, "links", { id: accId, cid, code: p.code || "", name: p.name, source: "approve-link", at: now });
  delRec(w, "pending", accId);
  log(w, now, "info", "duyệt", accId, "ghép khách hàng", "“" + p.name + "” → “" + c.name + "”");
  settle(w, cfg, now);
  return collect(w);
}
function ignoreAccount(S, accId, cfgIn, now) {
  const w = mkWork(S), p = w.pending.get(accId);
  if (!p) throw new Error("Khách hàng này không còn trong danh sách chờ.");
  setRec(w, "pending", { ...p, state: "ignored", ignoredAt: now });
  log(w, now, "info", "duyệt", accId, "bỏ qua", "Bỏ qua “" + p.name + "”");
  settle(w, cfgOf(cfgIn), now);
  return collect(w);
}
function restoreAccount(S, accId, cfgIn, now) {
  const w = mkWork(S), p = w.pending.get(accId);
  if (!p) throw new Error("Không tìm thấy khách hàng đã bỏ qua.");
  setRec(w, "pending", { ...p, state: "pending", ignoredAt: null });
  log(w, now, "info", "duyệt", accId, "khôi phục", "Đưa “" + p.name + "” trở lại danh sách chờ");
  settle(w, cfgOf(cfgIn), now);
  return collect(w);
}
/* Tổng hợp danh sách chờ để hiển thị: mỗi khách AMIS một dòng */
function pendingView(S) {
  const by = new Map();
  for (const o of S.orders) if (o.state === "pending" || o.state === "ignored") {
    const e = by.get(o.accountId) || by.set(o.accountId, { n: 0, valid: 0, sum: 0, last: 0 }).get(o.accountId);
    e.n++; if (o.eligible && o.inRange) { e.valid++; e.sum += o.amount; } e.last = Math.max(e.last, o.updated || 0);
  }
  return S.pending.map(p => ({ ...p, ...(by.get(p.id) || { n: 0, valid: 0, sum: 0, last: p.lastSeen || 0 }) })).sort((a, b) => b.sum - a.sum || (b.lastSeen || 0) - (a.lastSeen || 0));
}

const api = {
  key, nameKey, nameCore, getPath, parseAmount, parseDate, parseTime, findList, findTotal, findToken, flatten,
  MAP_KEYS, MAP_LABELS, DEFAULT_MAP, DEFAULT_CFG, cfgOf, cfgProblems, cfgWarnings, normalizeOrder, plainText, eligibleOf, consignOf, mineOf, inRangeOf, ymOf,
  indexCustomers, matchCustomer, desiredMap, reconcileCustomer, quarterVal,
  processOrders, resettle, approveNew, approveLink, ignoreAccount, restoreAccount, pendingView
};
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.AmisCore = api;
})(typeof window !== "undefined" ? window : globalThis);
