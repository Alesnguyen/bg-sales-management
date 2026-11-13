/* BG Sales Management — Bộ phân tích & chuyển đổi file Excel của người khác về mẫu gốc (v0.18.0)
   Module thuần (không DOM, không IndexedDB): chạy được trong giao diện (được build_app.py chèn vào index.html) và bằng Node để kiểm thử.

   Mẫu gốc mà ứng dụng đọc (hàm parse trong app.js): sheet “DOANH SỐ KH 2026”, dòng có “PTKD” ở cột A là tiêu đề, dòng kế tiếp là người phụ trách
   (cột A) + mục tiêu từng quý (cột J, L, N, P), dữ liệu bắt đầu sau dòng tiêu đề thứ hai; cột A tên khách, B DS thực 2025, C Target 2026, F DS thực 2026,
   I/K/M/O doanh số quý 1-4 năm 2026, cột Q… từng tháng (2025 ở cột chẵn Q, S, U…, 2026 ở cột lẻ R, T, V…).
   File của người khác có bố cục khác (tên cột tự đặt, tháng/quý xen kẽ, khu vực ở sheet khác, ô gộp, dòng trùng tên…). Module này:
     1. analyze(): tìm sheet dữ liệu, dòng tiêu đề, nhận diện cột theo TÊN CỘT (không theo vị trí), tìm khu vực ở sheet tham chiếu, mục tiêu quý, đối chiếu tổng;
     2. convert(): chuyển thành đúng cấu trúc mà parse() trả về (có thể chỉnh cột, cách xử lý dòng trùng…);
     3. buildXlsx(): dựng lại một file .xlsx đúng mẫu gốc để người dùng lưu/dùng lại. */
(function (root) {
"use strict";

const key = s => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ").trim();
const txt = v => v == null ? "" : String(v).replace(/\s+/g, " ").trim();
const colL = i => { let s = "", n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const r2 = v => v == null ? null : Math.round(v * 100) / 100;

/* Số trong ô: số thật, hoặc chữ số (“1.234.567”, “1,234”, “2 800 000”, “12 tr” không hỗ trợ) */
function cellNum(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.replace(/[\s\u00a0₫]|vnd|vnđ|đ/gi, "");
  if (!s || !/^[-+(]?[\d.,]+\)?$/.test(s)) return null;
  const neg = /^\(.*\)$/.test(s) || s[0] === "-"; s = s.replace(/[()+-]/g, "");
  const d = s.lastIndexOf("."), c = s.lastIndexOf(",");
  if (d >= 0 && c >= 0) s = d > c ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
  else if (c >= 0) s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  else if (d >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s); return isFinite(n) ? (neg ? -n : n) : null;
}

/* ===== Nhận diện tiêu đề cột ===== */
const RE = {
  name: /(^|\s)(ten\s*)?(khach\s*hang|dai\s*ly|doi\s*tac|nha\s*phan\s*phoi|customer)(\s|$)|^ten\s*kh$|^kh$/,
  total: /^(tong( cong)?|total|grand total|tong ket)$/,
  region: /^(khu\s*vuc|vung|mien|tinh|thanh\s*pho|dia\s*ban|dia\s*phuong|area|region)(\s*(kinh\s*doanh|phu\s*trach))?$/,
  avg: /(^|\s)(tb|trung\s*binh|binh\s*quan|average|avg)(\s|$)/,
  pct: /%|(^|\s)(dat|tien\s*do|ty\s*le|tang\s*truong)(\s|$)/,
  target: /target|muc\s*tieu|ke\s*hoach|chi\s*tieu|kpi/,
  actual: /(^|\s)(ds|doanh\s*so|doanh\s*thu|thuc\s*te|thuc\s*hien|thuc|actual|luy\s*ke)(\s|$)/
};
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4 };
function monthOf(s) {
  let m = /^(?:thang|th|t)\s*0?(\d{1,2})(?:\s*[\/\-.]\s*(?:(20)?(\d{2})))?$/.exec(s) || /^0?(\d{1,2})\s*[\/\-.]\s*(20\d{2})$/.exec(s);
  if (!m) return null;
  if (m.length === 3) return { mo: +m[1], y: +m[2] };     // “1/2026”
  const mo = +m[1], y = m[3] ? +((m[2] || "20") + m[3]) : null;
  return mo >= 1 && mo <= 12 ? { mo, y } : null;
}
function quarterOf(s) {
  const m = /^(?:quy|q)\s*([1-4]|iv|iii|ii|i)(?:\s*[\/\-.]?\s*(20\d{2}))?$/.exec(s);
  return m ? { q: ROMAN[m[1]] || +m[1], y: m[2] ? +m[2] : null } : null;
}
const yearOf = s => { const m = /(20\d{2})/.exec(s); return m ? +m[1] : null; };

/* Phân loại một nhãn tiêu đề → {k, ...} hoặc null. k: name | tot | region | a25 | t26 | a26 | m | q  (rank 2 = có ghi năm, 1 = suy đoán) */
function classify(label, isNameRow) {
  const s = key(label); if (!s) return null;
  const mo = monthOf(s); if (mo && !RE.target.test(s)) return { k: "m", ...mo, rank: 2 };
  const q = quarterOf(s); if (q && !RE.target.test(s)) return { k: "q", ...q, rank: 2 };
  if (RE.total.test(s)) return { k: "tot", rank: 2 };
  if (RE.region.test(s)) return { k: "region", rank: 2 };
  if (isNameRow && RE.name.test(s) && !/\d{4}/.test(s)) return { k: "name", rank: 2 };
  if (RE.avg.test(s) || RE.pct.test(s)) return null;
  const y = yearOf(s);
  if (RE.target.test(s)) return (y == null || y === 2026) ? { k: "t26", rank: y ? 2 : 1 } : null;
  if (RE.actual.test(s)) { if (y === 2025) return { k: "a25", rank: 2 }; if (y === 2026) return { k: "a26", rank: 2 }; if (y == null) return { k: "a26", rank: 1 }; }
  return null;
}

/* Lấy giá trị ô, có xét ô gộp (giá trị nằm ở ô góc trên trái của vùng gộp) */
function mergeIndex(sh) {
  if (sh._mi) return sh._mi;
  const idx = new Map();
  for (const [r1, c1, r2, c2] of sh.merges || []) for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (r !== r1 || c !== c1) idx.set(r + "," + c, [r1, c1]);
  return (sh._mi = idx);
}
const rawAt = (sh, r, c) => (sh.rows[r] || [])[c];
function valAt(sh, r, c) {
  const v = rawAt(sh, r, c); if (v != null && v !== "") return v;
  const t = mergeIndex(sh).get(r + "," + c); return t ? rawAt(sh, t[0], t[1]) : undefined;
}
const widthOf = sh => sh.rows.reduce((w, r) => Math.max(w, r ? r.length : 0), 0);

/* ===== Tìm dòng tiêu đề của một sheet ===== */
function findHeader(sh) {
  const R = sh.rows, W = widthOf(sh); let best = null;
  for (let N = 0; N < Math.min(R.length, 40); N++) {
    const row = R[N] || []; let nameCol = -1;
    for (let c = 0; c < W; c++) { const cl = classify(row[c], true); if (cl && cl.k === "name") { nameCol = c; break; } }
    if (nameCol < 0) continue;
    const cands = { a25: [], t26: [], a26: [], m: {}, q: {}, tot: [], region: [] }, order = [N, N - 1, N + 1, N - 2];
    for (let c = 0; c < W; c++) {
      if (c === nameCol) continue;
      for (const rr of order) {
        if (rr < 0 || rr >= R.length) continue;
        const v = (R[rr] || [])[c]; if (typeof v !== "string") continue;
        const cl = classify(v, false); if (!cl) continue;
        if (cl.k === "m") { const y = cl.y || 2026, kk = cl.mo + "|" + y; if (y !== 2025 && y !== 2026) break; (cands.m[kk] = cands.m[kk] || []).push(c); }
        else if (cl.k === "q") { const y = cl.y || 2026; if (y !== 2026) break; (cands.q[cl.q] = cands.q[cl.q] || []).push(c); }
        else cands[cl.k].push({ c, rank: cl.rank });
        break;
      }
    }
    const pick = a => a.length ? a.slice().sort((x, y) => y.rank - x.rank || x.c - y.c)[0].c : null;
    const nm = Object.keys(cands.m).filter(k => k.endsWith("|2026")).length, nm25 = Object.keys(cands.m).filter(k => k.endsWith("|2025")).length, nq = Object.keys(cands.q).length;
    const a25 = pick(cands.a25), t26 = pick(cands.t26), a26 = pick(cands.a26);
    const score = (a25 != null) + (t26 != null) + (a26 != null) + (nm >= 3 ? 2 : nm ? 1 : 0) + (nm25 >= 3 ? 1 : 0) + (nq >= 2 ? 1 : 0);
    // dòng tiêu đề thứ hai (nhãn tháng/quý nằm ngay dưới dòng có “Tên khách hàng”)
    let last = N; const nx = R[N + 1] || [];
    if (nx.filter((v, c) => typeof v === "string" && c !== nameCol && (() => { const x = classify(v, false); return x && (x.k === "m" || x.k === "q"); })()).length >= 3 && !txt(nx[nameCol])) last = N + 1;
    if (!best || score > best.score) best = { N, last, nameCol, a25, t26, a26, cands, score };
  }
  return best;
}

/* Cột khu vực: theo tiêu đề, hoặc cột chữ nằm bên trái cột tên mà phần lớn dòng có giá trị (kể cả ô gộp) và lặp lại nhiều lần */
function findRegionCol(sh, h) {
  if (h.cands.region.length) return h.cands.region[0].c;
  const names = []; for (let r = h.last + 1; r < sh.rows.length; r++) if (txt(rawAt(sh, r, h.nameCol))) names.push(r);
  if (names.length < 3) return null;
  for (let c = h.nameCol - 1; c >= 0; c--) {
    const vals = names.map(r => valAt(sh, r, c)).filter(v => v != null && v !== "");
    if (vals.length < names.length * 0.6) continue;
    if (vals.filter(v => typeof v === "string" && cellNum(v) == null).length < vals.length * 0.8) continue;
    if (new Set(vals.map(v => key(v))).size > Math.max(2, names.length * 0.6)) continue;
    return c;
  }
  return null;
}

/* ===== Dạng “khối 2 dòng KH/DS”: mỗi năm một sheet, mỗi khách chiếm 2 dòng (KH = kế hoạch/chỉ tiêu, DS = doanh số thực), tháng nằm ngang ===== */
const KIND_T = /^(kh|ke hoach|target|chi tieu|muc tieu|plan|kpi)$/, KIND_A = /^(ds|doanh so|thuc te|thuc hien|thuc|actual|dt|doanh thu)$/;
/* Dòng tổng: “TỔNG”, “TỔNG CỘNG”, “TỔNG DS 2026”… (không nhầm với khách tên “Tổng công ty …”) */
const TOTAL_ROW = /^(tong( cong| ket)?|total|tong (ds|doanh so|chi tieu|kh|ke hoach)\b.*)$/;
const kindOf = v => { if (typeof v !== "string") return null; const k = key(v); return KIND_T.test(k) ? "KH" : KIND_A.test(k) ? "DS" : null; };
const GENERIC_NAME_WORDS = new Set(["doanh", "so", "ds", "bg", "bao", "cao", "kh", "khach", "hang", "tong", "file", "data", "sales", "moi", "new", "copy", "final", "bang", "chi", "tieu", "kpi", "thang", "nam", "report", "sheet", "ban", "v1", "v2", "v3", "update", "cap", "nhat"]);
/* Đoán người phụ trách từ tên file: bỏ năm và các từ chung (“Doanh_số_BG_Ngọc_2026” → “Ngọc”) */
function ownerFromFile(fileName) {
  const toks = String(fileName || "").replace(/\.[^.]+$/, "").split(/[_\-()\s]+/).filter(t => t && !/^\d+$/.test(t) && !/^(19|20)\d\d$/.test(t) && !GENERIC_NAME_WORDS.has(key(t)));
  return toks.join(" ").trim();
}
/* Năm của sheet: ưu tiên tiêu đề phía trên bảng (“…TỪNG KH 2026”), rồi nhãn dòng tổng (“TỔNG DS 2026”), rồi tên sheet */
function sheetYear(sh, N, nameCol, typeCol, totalLabels) {
  const want = /chi tieu|doanh so|\bds\b|ke hoach|muc tieu|target|\bkh\b|tong/;
  for (let r = 0; r < N; r++) for (const v of sh.rows[r] || []) if (typeof v === "string") { const k = key(v), y = /(20\d\d)/.exec(k); if (y && want.test(k) && (+y[1] === 2025 || +y[1] === 2026)) return { year: +y[1], src: "tiêu đề “" + txt(v).slice(0, 40) + "”" }; }
  for (const v of totalLabels) { const y = /(20\d\d)/.exec(key(v)); if (y && (+y[1] === 2025 || +y[1] === 2026)) return { year: +y[1], src: "dòng “" + txt(v) + "”" }; }
  const y = /(20\d\d)/.exec(sh.name); if (y && (+y[1] === 2025 || +y[1] === 2026)) return { year: +y[1], src: "tên sheet" };
  return { year: null, src: "" };
}
function findBlocks(sh) {
  const R = sh.rows, W = widthOf(sh);
  for (let N = 0; N < Math.min(R.length, 30); N++) {
    const row = R[N] || [], mc = {};
    for (let c = 0; c < W; c++) { const cl = typeof row[c] === "string" ? classify(row[c], false) : null; if (cl && cl.k === "m" && !mc[cl.mo]) mc[cl.mo] = c; }
    if (Object.keys(mc).length < 6) continue;
    const months = Array.from({ length: 12 }, (_, i) => mc[i + 1] == null ? null : mc[i + 1]);
    let typeCol = -1, bn = 0;
    for (let c = 0; c < W; c++) { if (months.includes(c)) continue; let t = 0, a = 0; for (let r = N + 1; r < R.length; r++) { const k = kindOf(rawAt(sh, r, c)); if (k === "KH") t++; else if (k === "DS") a++; } if (t >= 2 && a >= 2 && t + a > bn) { bn = t + a; typeCol = c; } }
    if (typeCol < 0) continue;
    let nameCol = -1;
    for (const rr of [N, N - 1, N + 1]) { if (nameCol >= 0 || rr < 0) continue; for (let c = 0; c < typeCol; c++) { const cl = typeof (R[rr] || [])[c] === "string" ? classify(R[rr][c], true) : null; if (cl && cl.k === "name") { nameCol = c; break; } } }
    if (nameCol < 0) for (let c = typeCol - 1; c >= 0; c--) { let n = 0; for (let r = N + 1; r < R.length; r++) { const v = valAt(sh, r, c); if (typeof v === "string" && cellNum(v) == null && txt(v)) n++; } if (n >= 3) { nameCol = c; break; } }
    if (nameCol < 0) continue;
    const cfg = { N, nameCol, typeCol, months };
    const rd = readBlocks(sh, cfg);
    if (rd.entries.length < 3) continue;
    const y = sheetYear(sh, N, nameCol, typeCol, rd.totalLabels);
    return { ...cfg, year: y.year, yearSrc: y.src, nEntries: new Set(rd.entries.map(e => e.key)).size };
  }
  return null;
}
/* Đọc các dòng khách của một sheet dạng khối: [{name, key, kind: KH|DS, months[12], r}] + các dòng TỔNG ở cuối */
function readBlocks(sh, cfg) {
  const R = sh.rows, entries = [], totals = {}, totalLabels = []; let ended = false;
  for (let r = cfg.N + 1; r < R.length; r++) {
    const kind = kindOf(rawAt(sh, r, cfg.typeCol)); if (!kind) continue;
    const nm = txt(valAt(sh, r, cfg.nameCol)), lead = []; for (let c = 0; c < cfg.typeCol; c++) { const v = rawAt(sh, r, c); if (typeof v === "string" && txt(v)) lead.push(txt(v)); }
    const isTot = TOTAL_ROW.test(key(nm)) || (!nm && lead.some(t => TOTAL_ROW.test(key(t))));
    const months = cfg.months.map(c => c == null ? null : cellNum(rawAt(sh, r, c)));
    if (isTot) { ended = true; totals[kind] = months; [nm, ...lead].forEach(t => { if (t && TOTAL_ROW.test(key(t))) totalLabels.push(t); }); continue; }
    if (ended || !nm || cellNum(nm) != null) continue;
    entries.push({ name: nm, key: key(nm), kind, months, r: r + 1 });
  }
  return { entries, totals, totalLabels };
}
function analyzeBlocks(book, fileName) {
  const sheets = [];
  book.sheets.forEach((sh, i) => { const b = findBlocks(sh); if (b) sheets.push({ sheet: i, name: sh.name, ...b }); });
  if (!sheets.length) return null;
  const warnings = [], seen = {};
  sheets.forEach(s => { if (s.year == null) warnings.push("Chưa xác định được năm của sheet “" + s.name + "”: hãy chọn năm ở bảng bên dưới (nếu để “Bỏ qua” thì sheet này không được đọc)."); else (seen[s.year] = seen[s.year] || []).push(s.name); });
  Object.entries(seen).forEach(([y, a]) => { if (a.length > 1) warnings.push("Các sheet " + a.map(n => "“" + n + "”").join(", ") + " cùng là năm " + y + ": khách trùng tên giữa các sheet được xử lý theo lựa chọn “khách trùng tên”."); });
  return { ok: true, kind: "blocks", fileName: fileName || "", sheets, ownerGuess: ownerFromFile(fileName), warnings };
}
const yIdx = y => y === 2025 ? 0 : y === 2026 ? 1 : -1;
/* Độ giống giữa hai tên khách (0..1) để gợi ý ghép giữa các sheet khác năm */
function nameSim(a, b) {
  const x = key(a).replace(/[^a-z0-9 ]+/g, " ").split(" ").filter(Boolean), y = key(b).replace(/[^a-z0-9 ]+/g, " ").split(" ").filter(Boolean);
  if (!x.length || !y.length) return 0;
  const sx = new Set(x), sy = new Set(y); let i = 0; sx.forEach(t => { if (sy.has(t)) i++; });
  return i / (sx.size + sy.size - i);
}
function convertBlocks(book, an, opts) {
  const o = { owner: an.ownerGuess, dup: "sum", includeSingle: true, qtFromPlan: true, alias: {}, guess: () => "Khác", ...(opts || {}) };
  const notes = { merged: [], checks: [], single: [], suggest: [], aliasApplied: [], negatives: [], noRegion: 0, sheets: [], conflicts: [], mismatch: [], filledA25: 0, filledT26: 0, refOnly: 0 }, issues = [];
  // 1) đọc từng sheet → entries theo (khách, năm)
  const per = [];   // [{year, key, name, kh:[12]|null, ds:[12]|null, rows:[]}]
  let rawCount = 0; const checks = [];
  for (const cfg of an.sheets) {
    const yi = yIdx(cfg.year), sh = book.sheets[cfg.sheet];
    if (yi < 0) { notes.sheets.push({ name: cfg.name, year: cfg.year, used: false, n: 0 }); continue; }
    const rd = readBlocks(sh, cfg), by = new Map();
    for (const e of rd.entries) {
      let g = by.get(e.key); if (!g) { g = { year: cfg.year, key: e.key, name: e.name, kh: null, ds: null, rows: [], nk: 0, nd: 0 }; by.set(e.key, g); }
      const f = e.kind === "KH" ? "kh" : "ds", cnt = e.kind === "KH" ? "nk" : "nd";
      g[cnt]++; g.rows.push(e.r);
      if (g[cnt] > 1) { if (o.dup === "sum") g[f] = g[f].map((v, i) => v == null && e.months[i] == null ? null : (v || 0) + (e.months[i] || 0)); }
      else g[f] = e.months.slice();
      if (e.kind === "DS") e.months.forEach((v, i) => { if (v != null && v < 0 && notes.negatives.length < 40) notes.negatives.push({ name: e.name, year: cfg.year, month: i + 1, v }); });
    }
    by.forEach(g => { if (g.nk > 1 || g.nd > 1) notes.merged.push({ name: g.name, rows: g.rows, mode: o.dup, year: cfg.year }); per.push(g); });
    rawCount += by.size;
    notes.sheets.push({ name: cfg.name, year: cfg.year, used: true, n: by.size, src: cfg.yearSrc });
    for (const [k, lab] of [["DS", "DS thực"], ["KH", "Kế hoạch (KH)"]]) if (rd.totals[k]) {
      const ft = rd.totals[k].reduce((s, v) => s + (v || 0), 0), mine = rd.entries.filter(e => e.kind === k).reduce((s, e) => s + e.months.reduce((t, v) => t + (v || 0), 0), 0);
      checks.push({ f: lab + " " + cfg.year + " (cả năm, sheet “" + cfg.name + "”)", file: ft, mine, ok: Math.abs(ft - mine) < 2 });
    }
  }
  // 2) ghép khách giữa các năm: cùng tên → cùng khách; tên khác chỉ ghép khi người dùng chọn (alias)
  const years = [...new Set(per.map(g => g.year))].sort(), maxY = years[years.length - 1];
  const byKey = new Map(); per.forEach(g => { (byKey.get(g.key) || byKey.set(g.key, []).get(g.key)).push(g); });
  const target = k => { const a = o.alias[k]; return a && a !== k && byKey.has(a) ? a : k; };
  const cust = new Map();
  for (const [k, gs] of byKey) {
    const tk = target(k), disp = byKey.get(tk)[0].name;
    let c = cust.get(tk); if (!c) { c = { key: tk, name: disp, d: {}, from: [] }; cust.set(tk, c); }
    if (tk !== k) { c.from.push(gs[0].name); notes.aliasApplied.push({ from: gs[0].name, to: disp }); }
    for (const g of gs) {
      const cur = c.d[g.year];
      if (!cur) c.d[g.year] = { kh: g.kh && g.kh.slice(), ds: g.ds && g.ds.slice() };
      else if (o.dup === "sum") { const add = (a, b) => a && b ? a.map((v, i) => v == null && b[i] == null ? null : (v || 0) + (b[i] || 0)) : (a || b && b.slice()); cur.kh = add(cur.kh, g.kh); cur.ds = add(cur.ds, g.ds); }
    }
  }
  // 3) khách chỉ có ở một năm (không phải năm mới nhất) + gợi ý ghép
  const sumA = a => a ? a.reduce((s, v) => s + (v || 0), 0) : 0;
  const onlyOld = [...cust.values()].filter(c => c.d[maxY] == null && c.from.length === 0), onlyNew = [...cust.values()].filter(c => c.d[maxY] != null && Object.keys(c.d).length === 1);
  onlyOld.forEach(c => {
    const yr = Math.max(...Object.keys(c.d).map(Number)), kh = sumA(c.d[yr].kh);
    const best = onlyNew.map(n => { const s = nameSim(c.name, n.name), planEq = kh > 0 && Math.abs(kh - sumA(n.d[maxY].kh)) < 2; return { to: n.key, name: n.name, score: Math.max(s, 0) + (planEq && s >= 0.2 ? 0.6 : 0), s, planEq }; }).filter(x => x.score >= 0.5).sort((a, b) => b.score - a.score)[0];
    notes.single.push({ key: c.key, name: c.name, years: Object.keys(c.d).map(Number), kh, cand: onlyNew.map(n => ({ key: n.key, name: n.name })), suggest: best ? { to: best.to, name: best.name, why: best.planEq ? "cùng kế hoạch cả năm" : "tên gần giống" } : null });
    if (best) notes.suggest.push({ from: c.key, to: best.to });
  });
  notes.refOnly = onlyOld.length;
  // 4) dựng dòng chuẩn
  const rows = [], qtSum = [0, 0, 0, 0]; let anyQt = false;
  for (const c of cust.values()) {
    if (!o.includeSingle && c.d[maxY] == null) continue;
    const m = Array.from({ length: 12 }, () => [null, null]); let a25 = null, a26 = null, t26 = null;
    for (const [ys, d] of Object.entries(c.d)) {
      const yi = yIdx(+ys); if (yi < 0) continue;
      if (d.ds) { d.ds.forEach((v, i) => { m[i][yi] = r2(v); }); const s = sumA(d.ds); if (yi === 0) a25 = r2(s); else a26 = r2(s); }
      if (yi === 1 && d.kh) { const s = d.kh.filter(v => v != null); t26 = s.length ? r2(sumA(d.kh)) : null; d.kh.forEach((v, i) => { if (v != null) { qtSum[Math.floor(i / 3)] += v; anyQt = true; } }); }
    }
    const q = [0, 1, 2, 3].map(i => { const s = sumN(m.slice(3 * i, 3 * i + 3).map(p => p[1])); return [r2(s), null]; });
    let region = o.guess(c.name); notes.noRegion++;
    rows.push({ id: c.key, name: c.name, a25, t26, a26, q, m, region, updated: Date.now() });
  }
  const qt = o.qtFromPlan && anyQt ? qtSum.map(v => v ? r2(v) : null) : [];
  return { owner: o.owner, qt, rows, issues, hdr: an.sheets[0].N + 1, notes, checks, rawCount, conv: true, blocks: true, years, maxY };
}

/* ===== Phân tích toàn bộ workbook ===== */
function analyzeColumns(book, fileName) {
  const heads = book.sheets.map((sh, i) => ({ i, sh, h: findHeader(sh) })).filter(x => x.h);
  if (!heads.length) return { ok: false, reason: "Không tìm thấy dòng tiêu đề có cột “Tên khách hàng” ở sheet nào." };
  heads.sort((a, b) => b.h.score - a.h.score || a.i - b.i);
  const main = heads[0];
  if (main.h.score < 2) return { ok: false, reason: "Có cột “Tên khách hàng” nhưng không nhận ra các cột doanh số (DS thực, Target, Tháng…). Hãy kiểm tra tên cột trong file." };
  const h = main.h, W = widthOf(main.sh), pick = a => a.length ? a.slice().sort((x, y) => y.rank - x.rank || x.c - y.c)[0].c : null;
  const map = { name: h.nameCol, a25: h.a25, t26: h.t26, a26: h.a26, q: [1, 2, 3, 4].map(k => (h.cands.q[k] || [null])[0]), m25: [], m26: [] };
  for (let mo = 1; mo <= 12; mo++) { map.m25.push((h.cands.m[mo + "|2025"] || [null])[0]); map.m26.push((h.cands.m[mo + "|2026"] || [null])[0]); }
  const warnings = [];
  const dupM = Object.entries(h.cands.m).filter(([, v]) => v.length > 1);
  if (dupM.length) warnings.push("Có cột tháng trùng nhau (" + dupM.slice(0, 3).map(([k, v]) => "tháng " + k.split("|")[0] + ": " + v.map(colL).join(", ")).join("; ") + "); đã lấy cột đầu tiên, bạn có thể chỉnh ở phần “Chỉnh cột”.");
  const blank = main.sh.formulaNoCache || 0;
  if (blank > 0) warnings.push(blank + " ô công thức chưa có giá trị đã tính (file chưa được Excel tính lại). Hãy mở file trong Excel, lưu lại rồi nhập lại để có đủ số liệu.");
  // mục tiêu từng quý: số nằm phía trên nhãn “Quý n” cùng cột
  const qt = map.q.map(c => { if (c == null) return null; const lr = (() => { for (const rr of [h.N, h.N - 1, h.N + 1]) if (typeof rawAt(main.sh, rr, c) === "string" && quarterOf(key(rawAt(main.sh, rr, c)))) return rr; return h.N; })(); for (let r = lr - 1; r >= 0; r--) { const v = cellNum(rawAt(main.sh, r, c)); if (v != null && v > 0) return v; } return null; });
  // sheet tham chiếu (khu vực, DS 2025, Target 2026 bổ sung)
  const refs = [];
  for (const x of heads.slice(1)) {
    const rc = findRegionCol(x.sh, x.h); if (rc == null) continue;
    refs.push({ sheet: x.i, name: x.sh.name, N: x.h.N, last: x.h.last, nameCol: x.h.nameCol, regionCol: rc, a25: x.h.a25, t26: x.h.t26 });
  }
  const mainRc = findRegionCol(main.sh, h);
  const owner = ownerFromFile(fileName);
  return { ok: true, kind: "columns", fileName: fileName || "", main: { sheet: main.i, name: main.sh.name, N: h.N, last: h.last, nameCol: h.nameCol, regionCol: mainRc, width: W }, map, refs, qt, ownerGuess: owner, warnings };
}

function analyze(book, fileName) { return analyzeBlocks(book, fileName) || analyzeColumns(book, fileName); }
function convert(book, an, opts) { return an.kind === "blocks" ? convertBlocks(book, an, opts) : convertColumns(book, an, opts); }
/* Nhãn cột của một sheet (dạng khối) để hiển thị trong ô chọn */
function blockLabels(book, cfg) {
  const sh = book.sheets[cfg.sheet], out = [];
  for (let c = 0; c < widthOf(sh); c++) { const t = [sh.rows[cfg.N], sh.rows[cfg.N - 1]].map(r => r && typeof r[c] === "string" ? txt(r[c]) : "").filter(Boolean)[0] || ""; out.push({ c, text: colL(c) + (t ? " — " + t.slice(0, 28) : "") }); }
  return out;
}

/* Nhãn cột để hiển thị trong ô chọn: “H — Tháng 1” */
function colLabels(book, an) {
  const sh = book.sheets[an.main.sheet], out = [];
  for (let c = 0; c < an.main.width; c++) {
    const t = [sh.rows[an.main.N], sh.rows[an.main.N - 1], sh.rows[an.main.N + 1]].map(r => r && typeof r[c] === "string" ? txt(r[c]) : "").filter(Boolean)[0] || "";
    out.push({ c, text: colL(c) + (t ? " — " + t.slice(0, 28) : "") });
  }
  return out;
}

/* ===== Chuyển đổi ===== */
function readRows(sh, an) {
  const m = an.map, out = [], N = an.main.last;
  const at = (r, c) => c == null ? null : cellNum(rawAt(sh, r, c));
  for (let r = N + 1; r < sh.rows.length; r++) {
    const nm = txt(rawAt(sh, r, m.name)); if (!nm) continue;
    const k = key(nm); if (RE.total.test(k) || /^tong (cong|doanh so|ket)\b/.test(k) || RE.name.test(k) && !/\d/.test(k) && k.length < 20 || cellNum(nm) != null) continue;
    out.push({ r: r + 1, name: nm, a25: at(r, m.a25), t26: at(r, m.t26), a26: at(r, m.a26), qf: m.q.map(c => at(r, c)), m: Array.from({ length: 12 }, (_, i) => [at(r, m.m25[i]), at(r, m.m26[i])]),
      region: an.main.regionCol != null ? (v => v == null || v === "" ? "" : txt(v))(valAt(sh, r, an.main.regionCol)) : "" });
  }
  return out;
}
const sumN = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) : null; };
function readRef(book, ref) {
  const sh = book.sheets[ref.sheet], out = new Map();
  for (let r = ref.last + 1; r < sh.rows.length; r++) {
    const nm = txt(rawAt(sh, r, ref.nameCol)); if (!nm) continue;
    const k = key(nm); if (RE.total.test(k)) continue;
    const rg = valAt(sh, r, ref.regionCol), reg = rg == null ? "" : txt(rg);
    if (!out.has(k)) out.set(k, { name: nm, region: reg, a25: ref.a25 == null ? null : cellNum(rawAt(sh, r, ref.a25)), t26: ref.t26 == null ? null : cellNum(rawAt(sh, r, ref.t26)) });
  }
  return out;
}

/* opts: { owner, dup: "sum" | "first", fillRef: bool, includeRefOnly: bool, guess: name => region } → kết quả có cùng cấu trúc với parse() + báo cáo */
function convertColumns(book, an, opts) {
  const o = { owner: an.ownerGuess, dup: "sum", fillRef: true, includeRefOnly: false, guess: () => "Khác", ...(opts || {}) };
  const sh = book.sheets[an.main.sheet], raw = readRows(sh, an), notes = { merged: [], filledA25: 0, filledT26: 0, conflicts: [], noRegion: 0, refOnly: 0, mismatch: [], ignoredRows: 0 }, issues = [];
  const groups = new Map();
  for (const x of raw) { const k = key(x.name); (groups.get(k) || groups.set(k, []).get(k)).push(x); }
  const ref = new Map(); for (const rf of an.refs || []) readRef(book, rf).forEach((v, k) => { if (!ref.has(k)) ref.set(k, v); });
  const rows = [];
  for (const [k, g] of groups) {
    let x = g[0];
    if (g.length > 1) {
      if (o.dup === "sum") {
        x = { ...g[0], a25: sumN(g.map(y => y.a25)), t26: sumN(g.map(y => y.t26)), a26: sumN(g.map(y => y.a26)), qf: [0, 1, 2, 3].map(i => sumN(g.map(y => y.qf[i]))), m: Array.from({ length: 12 }, (_, i) => [sumN(g.map(y => y.m[i][0])), sumN(g.map(y => y.m[i][1]))]), region: g.map(y => y.region).find(Boolean) || "" };
        notes.merged.push({ name: g[0].name, rows: g.map(y => y.r), mode: "sum" });
      } else { notes.merged.push({ name: g[0].name, rows: g.map(y => y.r), mode: "first" }); issues.push("Dòng " + g.slice(1).map(y => y.r).join(", ") + " trùng tên với dòng " + g[0].r + ", đã bỏ qua: " + g[0].name); }
    }
    const rf = ref.get(k);
    let a25 = x.a25, t26 = x.t26;
    if (rf) {
      if (a25 == null && rf.a25 != null && o.fillRef) { a25 = rf.a25; notes.filledA25++; }
      else if (a25 != null && rf.a25 != null && Math.abs(a25 - rf.a25) > 1) notes.conflicts.push({ name: x.name, f: "DS thực 2025", main: a25, ref: rf.a25 });
      if (t26 == null && rf.t26 != null && o.fillRef) { t26 = rf.t26; notes.filledT26++; }
      else if (t26 != null && rf.t26 != null && Math.abs(t26 - rf.t26) > 1) notes.conflicts.push({ name: x.name, f: "Target 2026", main: t26, ref: rf.t26 });
    }
    const m = x.m.map(p => [r2(p[0]), r2(p[1])]), m26sum = sumN(m.map(p => p[1]));
    let a26 = x.a26;
    if (a26 == null) a26 = m26sum; else if (m26sum != null && Math.abs(a26 - m26sum) > 1) notes.mismatch.push({ name: x.name, file: a26, months: m26sum });
    const q = [0, 1, 2, 3].map(i => { if (x.qf[i] != null) return [r2(x.qf[i]), null]; const s = sumN(m.slice(3 * i, 3 * i + 3).map(p => p[1])); return [r2(s), null]; });
    let region = (rf && rf.region) || x.region || "";
    if (!region) { region = o.guess(x.name); notes.noRegion++; }
    rows.push({ id: k, name: x.name, a25: r2(a25), t26: r2(t26), a26: r2(a26), q, m, region, updated: Date.now() });
  }
  if (o.includeRefOnly) ref.forEach((rf, k) => { if (!groups.has(k)) { notes.refOnly++; rows.push({ id: k, name: rf.name, a25: r2(rf.a25), t26: r2(rf.t26), a26: null, q: [0, 1, 2, 3].map(() => [null, null]), m: Array.from({ length: 12 }, () => [null, null]), region: rf.region || o.guess(rf.name), updated: Date.now() }); } });
  else notes.refOnly = [...ref.keys()].filter(k => !groups.has(k)).length;
  // đối chiếu với dòng TỔNG của chính file (nếu có ở phía trên bảng)
  const checks = [];
  const totRow = (() => { for (let r = 0; r <= an.main.last; r++) { const v = rawAt(sh, r, an.main.nameCol); if (typeof v === "string" && RE.total.test(key(v))) return r; } return -1; })();
  if (totRow >= 0) for (const [f, label] of [["a25", "DS thực 2025"], ["t26", "Target 2026"], ["a26", "DS thực 2026"]]) {
    const c = an.map[f]; if (c == null) continue; const ft = cellNum(rawAt(sh, totRow, c)); if (ft == null) continue;
    const mine = sumN(raw.map(x => x[f])) || 0; checks.push({ f: label, file: ft, mine, ok: Math.abs(ft - mine) < 2 });
  }
  const qt = (an.qt || []).map(v => v == null ? null : r2(v));
  return { owner: o.owner, qt, rows, issues, hdr: an.main.N + 1, notes, checks, rawCount: raw.length, conv: true };
}

/* ===== Dựng file .xlsx đúng mẫu gốc (không cần thư viện) ===== */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  for (const [name, content] of files) {
    const nb = enc.encode(name), d = typeof content === "string" ? enc.encode(content) : content, crc = crc32(d);
    const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true); lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), nb, d);
    const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
    cen.push(new Uint8Array(ch.buffer), nb); off += 30 + nb.length + d.length;
  }
  const cs = cen.reduce((s, a) => s + a.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cs, true); end.setUint32(16, off, true);
  const all = [...parts, ...cen, new Uint8Array(end.buffer)], out = new Uint8Array(all.reduce((s, a) => s + a.length, 0)); let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}
const SHEET = "DOANH SỐ KH 2026", REGCOL = 41;   // cột phụ do BG thêm (tiêu đề “KHU VỰC (BG)”), cách xa các cột của mẫu gốc
function buildXlsx(res, fileName) {
  const cells = new Map(); // "r,c" → {v, s}
  const put = (r, c, v, s) => { if (v == null || v === "") return; cells.set(r + "," + c, { v, s: s || 0 }); };
  const H = 2;            // dòng tiêu đề (0-based) = dòng 3 trong Excel; chứa “PTKD” ở cột A
  put(0, 0, "BẢNG DOANH SỐ KHÁCH HÀNG 2026 — chuyển đổi tự động từ file “" + (fileName || "") + "” bằng BG Sales Management", 2);
  put(H, 0, "PTKD", 2); put(H, 1, "DS thực 2025", 2); put(H, 2, "Target 2026", 2); put(H, 5, "DS thực 2026", 2);
  for (let k = 0; k < 4; k++) { put(H, 8 + 2 * k, "DS thực Quý " + (k + 1), 2); put(H, 9 + 2 * k, "Target Quý " + (k + 1), 2); }
  for (let i = 0; i < 12; i++) { put(H, 16 + 2 * i, "Tháng " + (i + 1) + "/2025", 2); put(H, 17 + 2 * i, "Tháng " + (i + 1) + "/2026", 2); }
  put(H + 1, 0, res.owner || "", 2); (res.qt || []).forEach((v, k) => put(H + 1, 9 + 2 * k, v, 1));
  put(H + 2, 0, "Khách hàng", 2); put(H + 2, 1, "Thực tế 2025", 2); put(H + 2, 2, "Mục tiêu 2026", 2); put(H + 2, 5, "Thực tế 2026", 2); put(H, REGCOL, "KHU VỰC (BG)", 2);
  const first = H + 3; let r = first;
  for (const c of res.rows) {
    put(r, 0, c.name, 0); put(r, 1, c.a25, 1); put(r, 2, c.t26, 1); put(r, 5, c.a26, 1);
    c.q.forEach((q, k) => put(r, 8 + 2 * k, q[0], 1)); c.m.forEach((p, i) => { put(r, 16 + 2 * i, p[0], 1); put(r, 17 + 2 * i, p[1], 1); });
    put(r, REGCOL, c.region, 0); r++;
  }
  const last = r - 1;
  put(r, 0, "TỔNG CỘNG", 2);
  const colsSum = [1, 2, 5, 8, 10, 12, 14, ...Array.from({ length: 24 }, (_, i) => 16 + i)];
  for (const c of colsSum) { let t = 0, any = false; for (let i = first; i <= last; i++) { const v = (cells.get(i + "," + c) || {}).v; if (typeof v === "number") { t += v; any = true; } } if (any) cells.set(r + "," + c, { v: t, s: 1, f: "SUM(" + colL(c) + (first + 1) + ":" + colL(c) + (last + 1) + ")" }); }
  const rowsX = []; const maxR = r;
  for (let i = 0; i <= maxR; i++) {
    const cs = []; for (let c = 0; c <= REGCOL; c++) { const x = cells.get(i + "," + c); if (!x) continue; const ref = colL(c) + (i + 1);
      cs.push(typeof x.v === "number" ? `<c r="${ref}" s="${x.s}">${x.f ? `<f>${x.f}</f>` : ""}<v>${x.v}</v></c>` : `<c r="${ref}" s="${x.s}" t="inlineStr"><is><t xml:space="preserve">${esc(x.v)}</t></is></c>`); }
    if (cs.length) rowsX.push(`<row r="${i + 1}">${cs.join("")}</row>`);
  }
  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', RN = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet ${NS}><sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="5" topLeftCell="B6" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="40" customWidth="1"/><col min="2" max="41" width="16" customWidth="1"/><col min="42" max="42" width="22" customWidth="1"/></cols><sheetData>${rowsX.join("")}</sheetData></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet ${NS}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook ${NS} ${RN}><sheets><sheet name="${SHEET}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wrels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  return zipStore([["[Content_Types].xml", ct], ["_rels/.rels", rels], ["xl/workbook.xml", wb], ["xl/_rels/workbook.xml.rels", wrels], ["xl/styles.xml", styles], ["xl/worksheets/sheet1.xml", sheet]]);
}

const api = { key, cellNum, colL, classify, analyze, colLabels, blockLabels, convert, buildXlsx, SHEET, REGCOL, ownerFromFile, nameSim };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.XlsxConvert = api;
})(typeof window !== "undefined" ? window : globalThis);
