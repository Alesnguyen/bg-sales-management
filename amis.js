// Kết nối MISA AMIS CRM (chạy trong tiến trình chính của Electron; giao diện KHÔNG bao giờ thấy khóa bí mật hay token).
// - Khóa (API Key, Client ID, Client Secret) được mã hóa bằng safeStorage của hệ điều hành (Windows DPAPI) và lưu ở thư mục dữ liệu ứng dụng,
//   không nằm trong IndexedDB, không nằm trong tệp sao lưu, không đi vào nhật ký.
// - Chỉ gọi tới máy chủ MISA đã cho phép (https, đúng tên miền), không theo chuyển hướng.
// - Chỉ ĐỌC dữ liệu (GET danh sách đơn hàng). Không ghi ngược lại AMIS.
const fs = require("fs");
const path = require("path");
const core = require("./amis-core");

const DEFAULT_BASE = "https://developer.misa.vn/apis/amiscrm/v1";
const ALLOWED_HOSTS = ["developer.misa.vn"];
const ENDPOINTS = { SaleOrders: "/SaleOrders", Customers: "/Customers" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fail(code, message) { const e = new Error(message); e.code = code; return e; }

function create({ safeStorage, dir, fetchImpl, baseUrl = DEFAULT_BASE, minGapMs = 250, now = () => Date.now() }) {
  const doFetch = fetchImpl || ((...a) => fetch(...a));
  const file = path.join(dir, "amis-secrets.bin");
  let secrets = null, tok = null, busy = false, lastCall = 0;

  const base = (() => {
    const u = new URL(baseUrl);
    if (u.protocol !== "https:" && !fetchImpl) throw new Error("Địa chỉ AMIS phải dùng https.");
    if (!fetchImpl && !ALLOWED_HOSTS.includes(u.hostname)) throw new Error("Tên miền AMIS không nằm trong danh sách cho phép.");
    return baseUrl.replace(/\/+$/, "");
  })();

  // ---- Lưu khóa bí mật ----
  const encOk = () => { try { return !!safeStorage && safeStorage.isEncryptionAvailable(); } catch (_) { return false; } };
  function loadSecrets() {
    if (secrets) return secrets;
    if (!fs.existsSync(file)) return (secrets = {});
    try {
      if (!encOk()) return (secrets = {});
      secrets = JSON.parse(safeStorage.decryptString(fs.readFileSync(file)));
    } catch (_) { secrets = {}; }
    return secrets;
  }
  function writeSecrets(o) {
    if (!encOk()) throw fail("NO_ENCRYPTION", "Máy này không hỗ trợ mã hóa khóa bí mật (Windows DPAPI), nên ứng dụng không lưu khóa để tránh lộ.");
    fs.mkdirSync(dir, { recursive: true });
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, safeStorage.encryptString(JSON.stringify(o)));
    fs.renameSync(tmp, file);
    secrets = o; tok = null;
  }
  const FIELDS = ["apiKey", "clientId", "clientSecret"];
  const tail = (s) => (s ? "••••" + String(s).slice(-4) : "");
  function status() {
    const s = loadSecrets();
    return {
      encryption: encOk(), complete: FIELDS.every((k) => !!s[k]),
      saved: Object.fromEntries(FIELDS.map((k) => [k, !!s[k]])), hint: { apiKey: tail(s.apiKey), clientId: tail(s.clientId) }, base
    };
  }
  function saveSecrets(input) {
    const cur = { ...loadSecrets() }, inp = input || {};
    for (const k of FIELDS) { const v = inp[k]; if (typeof v === "string" && v.trim()) cur[k] = v.trim().slice(0, 500); }
    writeSecrets(cur);
    return status();
  }
  function clearSecrets() { try { fs.unlinkSync(file); } catch (_) { /* chưa có */ } secrets = {}; tok = null; return status(); }

  // Che mọi giá trị bí mật khỏi thông báo lỗi
  function scrub(msg) {
    let m = String(msg == null ? "" : msg);
    [...FIELDS.map((k) => loadSecrets()[k]), tok && tok.value].forEach((v) => { if (v && String(v).length >= 4) m = m.split(String(v)).join("***"); });
    return m.slice(0, 300);
  }
  const serverMsg = (j) => { const c = j && typeof j === "object" ? (j.message || j.Message || j.error || j.error_description || j.description) : null; return typeof c === "string" ? scrub(c) : ""; };

  // ---- HTTP ----
  async function http(method, url, { headers, body, timeout = 30000 } = {}) {
    const gap = minGapMs - (now() - lastCall); if (gap > 0) await sleep(gap);
    lastCall = now();
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await doFetch(url, { method, headers, body, signal: ctl.signal, redirect: "error" });
      const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch (_) { /* không phải JSON */ }
      return { status: r.status, retry: r.headers && r.headers.get ? r.headers.get("retry-after") : null, json };
    } catch (e) {
      if (e && e.name === "AbortError") throw fail("TIMEOUT", "MISA không phản hồi kịp (quá 30 giây).");
      throw fail("OFFLINE", "Không kết nối được tới MISA. Hãy kiểm tra mạng.");
    } finally { clearTimeout(t); }
  }

  async function token(force) {
    if (!force && tok && tok.exp > now() + 30000) return tok.value;
    const s = loadSecrets();
    if (!FIELDS.every((k) => s[k])) throw fail("NOT_CONFIGURED", "Chưa nhập đủ API Key, Client ID và Client Secret.");
    const r = await http("POST", base + "/Account", {
      headers: { "Content-Type": "application/json", "api-key": s.apiKey, Accept: "application/json" },
      body: JSON.stringify({ client_id: s.clientId, client_secret: s.clientSecret })
    });
    if (r.status === 401 || r.status === 403) throw fail("AUTH", "MISA từ chối thông tin đăng nhập" + (serverMsg(r.json) ? ": " + serverMsg(r.json) : "."));
    if (r.status < 200 || r.status >= 300) throw fail("HTTP", "MISA trả lỗi " + r.status + " khi lấy token" + (serverMsg(r.json) ? ": " + serverMsg(r.json) : "."));
    const f = core.findToken(r.json);
    if (!f) throw fail("BAD_RESPONSE", "Phản hồi lấy token không có trường access token. Hãy đối chiếu tài liệu API của MISA.");
    tok = { value: f.token, exp: now() + (f.ttl ? Math.max(60, f.ttl - 60) : 20 * 60) * 1000 };
    return tok.value;
  }

  async function get(endpoint, query) {
    const qs = Object.entries(query || {}).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
    const url = base + ENDPOINTS[endpoint] + (qs ? "?" + qs : "");
    let refreshed = false, retries = 0;
    for (;;) {
      const t = await token(false), s = loadSecrets();
      const r = await http("GET", url, { headers: { Authorization: "Bearer " + t, "api-key": s.apiKey, ClientId: s.clientId, Accept: "application/json" } });
      if (r.status === 401 && !refreshed) { refreshed = true; tok = null; continue; }
      if (r.status === 401) throw fail("AUTH", "Token bị từ chối sau khi làm mới. Hãy kiểm tra lại thông tin đăng nhập.");
      if (r.status === 403) throw fail("FORBIDDEN", "Tài khoản API chưa được cấp quyền đọc " + endpoint + (serverMsg(r.json) ? ": " + serverMsg(r.json) : "."));
      if (r.status === 429 && retries < 3) { retries++; await sleep(Math.min(30000, (Number(r.retry) || 2 * retries) * 1000)); continue; }
      if (r.status === 429) throw fail("RATE_LIMIT", "MISA giới hạn số lần gọi. Hãy thử lại sau.");
      if (r.status >= 500 && retries < 2) { retries++; await sleep(2000 * retries); continue; }
      if (r.status < 200 || r.status >= 300) throw fail("HTTP", "MISA trả lỗi " + r.status + (serverMsg(r.json) ? ": " + serverMsg(r.json) : "."));
      if (r.json == null) throw fail("BAD_RESPONSE", "MISA trả về nội dung không phải JSON.");
      return r.json;
    }
  }

  const guard = async (fn) => {
    if (busy) throw fail("BUSY", "Đang có một lượt đồng bộ khác, hãy đợi xong.");
    busy = true;
    try { return await fn(); } finally { busy = false; }
  };
  const wrap = (fn) => async (...a) => {
    try { return { ok: true, ...(await fn(...a)) }; }
    catch (e) { return { ok: false, code: e.code || "ERROR", message: scrub(e.message) }; }
  };

  // ---- Chức năng cho giao diện ----
  const test = () => guard(async () => { await token(true); return {}; });

  /* Xem cấu trúc thật của phản hồi để người dùng chọn đúng trường (không đoán tên trường) */
  const probe = (endpoint, orderBy) => guard(async () => {
    if (!ENDPOINTS[endpoint]) throw fail("BAD_INPUT", "Chức năng không hợp lệ.");
    const j = await get(endpoint, { page: 1, pageSize: 3, orderBy: orderBy || "modified_date", isDescending: true });
    const f = core.findList(j);
    if (!f) throw fail("BAD_RESPONSE", "Không tìm thấy danh sách dữ liệu trong phản hồi. Các khóa cấp cao: " + (j && typeof j === "object" ? Object.keys(j).join(", ") : typeof j));
    return { listPath: f.path, count: f.list.length, total: core.findTotal(j), fields: f.list.length ? core.flatten(f.list[0]) : [], topKeys: Object.keys(j || {}) };
  });

  /* Kéo đơn hàng (đã sắp theo ngày sửa đổi giảm dần), chuẩn hóa theo bảng ánh xạ. Dừng sớm khi đã qua mốc đã đồng bộ. */
  const fetchOrders = (o) => guard(async () => {
    const map = { ...core.DEFAULT_MAP, ...((o && o.map) || {}) }, ps = Math.min(200, Math.max(10, +(o && o.pageSize) || 100));
    const maxPages = Math.min(1000, Math.max(1, +(o && o.maxPages) || 500)), stop = o && Number.isFinite(o.stopBefore) ? o.stopBefore : null;
    const orderBy = (o && typeof o.orderBy === "string" && /^[A-Za-z0-9_.]{1,60}$/.test(o.orderBy)) ? o.orderBy : "modified_date";
    const byId = new Map(), invalid = [], statuses = {}, owners = {}, consigns = {};
    let pages = 0, raw = 0, maxMod = null, stopped = false;
    for (let page = 1; page <= maxPages; page++) {
      const j = await get("SaleOrders", { page, pageSize: ps, orderBy, isDescending: true });
      const f = core.findList(j);
      if (!f) { if (page === 1) throw fail("BAD_RESPONSE", "Không tìm thấy danh sách đơn hàng trong phản hồi."); break; }
      pages++; raw += f.list.length;
      let lastMod = null;
      for (const r of f.list) {
        const n = core.normalizeOrder(r, map);
        if (!n.ok) { if (invalid.length < 20) invalid.push({ ref: n.ref, errors: n.errors }); continue; }
        const x = n.order; if (x.status) statuses[x.status] = (statuses[x.status] || 0) + 1;
        if (x.owner) owners[x.owner] = (owners[x.owner] || 0) + 1;
        if (x.consign) consigns[x.consign] = (consigns[x.consign] || 0) + 1;
        if (x.modified != null) { lastMod = x.modified; if (maxMod == null || x.modified > maxMod) maxMod = x.modified; }
        const p = byId.get(x.id); if (!p || (x.modified || 0) >= (p.modified || 0)) byId.set(x.id, x);
      }
      if (f.list.length < ps) break;
      if (stop != null && lastMod != null && lastMod < stop) { stopped = true; break; }
      if (page === maxPages) stopped = "max";
    }
    return { orders: [...byId.values()], pages, raw, invalid, statuses, owners, consigns, maxModified: maxMod, stoppedEarly: stopped === true, hitMax: stopped === "max" };
  });

  return { status, saveSecrets: wrap(saveSecrets), clearSecrets: wrap(clearSecrets), test: wrap(test), probe: wrap(probe), fetchOrders: wrap(fetchOrders), statusSafe: wrap(status), _scrub: scrub };
}

module.exports = { create, DEFAULT_BASE, ENDPOINTS };
