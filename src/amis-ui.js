/* ===== v0.17.0: Tích hợp AMIS CRM (một chiều AMIS → BG) =====
   Đoạn này được build_app.py chèn vào app.js (cùng phạm vi với các hàm $, S, esc, put, notify…).
   Lõi nghiệp vụ (đối chiếu khách, sổ đơn, tính doanh số) nằm ở amis-core.js; khóa bí mật và việc gọi MISA nằm ở tiến trình chính (amis.js).
   Dữ liệu lưu trong IndexedDB: amisOrders (sổ đơn), amisLinks (liên kết ID AMIS ↔ khách BG), amisPending (khách chờ/bỏ qua),
   amisLogs (nhật ký), amisState (cấu hình "cfg" và trạng thái đồng bộ "sync"). */
const AMC = window.AmisCore, AMX = window.bgsm && window.bgsm.amis;
const AM_ST = ["amisOrders", "amisLinks", "amisPending", "amisLogs", "amisState"];
const amCfg = () => AMC.cfgOf(S.am.cfg);
const amDraftCfg = () => AMC.cfgOf(S.am.draft || S.am.cfg);   // cấu hình đang sửa trên màn hình (chưa lưu) nếu có
const amSnap = () => ({ customers: S.cus, orders: S.am.orders, links: S.am.links, pending: S.am.pending });
const amT = t => t ? new Date(t).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";
const amMoney = n => n == null ? "–" : fmt(n);
const amEmpty = () => ({ customers: [], orders: [], links: [], pending: [], delLinks: [], delPending: [], logs: [], stats: {} });

async function amLoad() {
  const g = await getAll("amisLogs");
  S.am.orders = await getAll("amisOrders"); S.am.links = await getAll("amisLinks"); S.am.pending = await getAll("amisPending");
  S.am.logs = g.sort((a, b) => b.id < a.id ? -1 : 1);
  const st = await getAll("amisState");
  S.am.cfg = (st.find(x => x.id === "cfg") || {}).v || null; S.am.sync = st.find(x => x.id === "sync") || { id: "sync" };
  if (S.am.logs.length > 700) { const old = S.am.logs.splice(600); await run("amisLogs", "readwrite", o => { old.forEach(x => o.delete(x.id)); }); }
}
/* Ghi MỘT giao dịch: khách hàng + sổ đơn + liên kết + chờ + nhật ký + trạng thái, nên không bao giờ ghi dở dang */
async function amPersist(ch, extra) {
  await run(["c", ...AM_ST], "readwrite", (c, o, l, p, g, s) => {
    ch.customers.forEach(x => c.put(x)); ch.orders.forEach(x => o.put(x));
    ch.links.forEach(x => l.put(x)); ch.delLinks.forEach(i => l.delete(i));
    ch.pending.forEach(x => p.put(x)); ch.delPending.forEach(i => p.delete(i));
    ch.logs.forEach(x => g.put({ ...x, id: String(x.time).padStart(14, "0") + "-" + Math.random().toString(36).slice(2, 8) }));
    (Array.isArray(extra) ? extra : extra ? [extra] : []).forEach(x => s.put(x));
  });
}
async function amRefresh() { await load(); amRender(); render(); }
async function amSaveCfg(cfg) { await amPersist(amEmpty(), { id: "cfg", v: cfg }); S.am.cfg = cfg; S.am.draft = null; await amResettle(); }
/* Đối chiếu lại sổ đơn (sau khi đổi cấu hình, nhập Excel hoặc khôi phục sao lưu) */
async function amResettle() {
  if (!S.am.orders.length && !S.am.links.length && !S.am.pending.length) return;
  const ch = AMC.resettle(amSnap(), amCfg(), Date.now());
  if (ch.customers.length || ch.orders.length || ch.links.length || ch.pending.length || ch.delLinks.length || ch.delPending.length) { await amPersist(ch); await load(); }
}

/* ===== Đồng bộ ===== */
const amProblems = () => { const p = AMC.cfgProblems(amCfg()); if (AMX && S.am.sec && !S.am.sec.complete) p.unshift("Chưa lưu đủ API Key, Client ID và Client Secret."); return p; };
function amState() {
  if (!AMX) return ["Chỉ có trong bản cài Windows", ""];
  if (S.amBusy) return ["Đang đồng bộ…", "info"];
  if (amProblems().length) return ["Chưa cấu hình xong", "warning"];
  const sy = S.am.sync || {};
  if (sy.lastError) return [sy.lastCode === "OFFLINE" ? "Chờ kết nối mạng" : "Lỗi đồng bộ", sy.lastCode === "OFFLINE" ? "warning" : "danger"];
  if (!amCfg().enabled) return ["Đã tạm dừng", ""];
  return sy.lastOk ? ["Đang hoạt động", "success"] : ["Sẵn sàng, chưa đồng bộ", "info"];
}
async function amSync(manual, full) {
  if (!AMX) { if (manual) notify("Đồng bộ AMIS chỉ có trong bản cài Windows."); return; }
  if (S.amBusy) return;
  const pr = amProblems();
  if (pr.length) { if (manual) { notify(pr[0]); S.amTab = "conn"; go("amis"); } return; }
  if (!navigator.onLine) { if (manual) notify("Đang ngoại tuyến. BG sẽ tự đồng bộ khi có mạng trở lại."); amDraw(); return; }
  const cfg = amCfg(), sy = S.am.sync || { id: "sync" }, t0 = Date.now();
  S.amBusy = true; amDraw();
  try {
    const stopBefore = full || !sy.watermark ? null : sy.watermark - 60 * 60e3;   // lùi 1 giờ để không sót đơn sửa sát mốc
    const r = await AMX.fetchOrders({ map: cfg.map, orderBy: cfg.orderBy, stopBefore });
    if (!r.ok) { const e = new Error(r.message || "Lỗi không xác định"); e.code = r.code; throw e; }
    const now = Date.now(), ch = AMC.processOrders(amSnap(), r.orders, cfg, now), s = ch.stats;
    const seen = { ...(sy.statuses || {}) }; Object.keys(r.statuses || {}).forEach(k => { seen[k] = now; });
    const mergeCnt = (a, b) => { const o = { ...(a || {}) }; Object.entries(b || {}).forEach(([k, n]) => { o[k] = Math.max(o[k] || 0, n); }); return o; };
    ch.logs.push({ time: now, level: "info", action: "đồng bộ", objectId: "", result: "thành công", message: `${r.raw} đơn đọc từ ${r.pages} trang; mới ${s.added}, cập nhật ${s.updated}, không đổi ${s.unchanged}, ngoài kỳ ${s.skippedOld}, của kinh doanh khác (không lưu) ${s.skippedOwner}, đơn Ký gửi đang giữ ${s.consigned}` + (r.invalid.length ? `, lỗi dữ liệu ${r.invalid.length}` : "") });
    r.invalid.slice(0, 5).forEach(x => ch.logs.push({ time: now, level: "warn", action: "đơn hàng", objectId: x.ref, result: "bỏ qua", message: "Đơn không đọc được: " + x.errors.join(", ") }));
    if (r.hitMax) ch.logs.push({ time: now, level: "warn", action: "đồng bộ", objectId: "", result: "cảnh báo", message: "Đạt giới hạn số trang trong một lượt; các lượt sau sẽ tiếp tục." });
    const next = { ...sy, id: "sync", lastRun: t0, lastOk: now, lastError: null, lastCode: null, statuses: seen, owners: mergeCnt(sy.owners, r.owners), consigns: mergeCnt(sy.consigns, r.consigns),
      watermark: r.hitMax && !sy.watermark ? null : (r.maxModified != null ? Math.max(sy.watermark || 0, r.maxModified) : sy.watermark || null),
      last: { raw: r.raw, pages: r.pages, invalid: r.invalid.length, stopped: r.stoppedEarly, added: s.added, updated: s.updated, unchanged: s.unchanged, skippedOld: s.skippedOld, skippedOwner: s.skippedOwner, consigned: s.consigned } };
    await amPersist(ch, next);
    await load();
    const np = AMC.pendingView(amSnap()).filter(x => x.state === "pending").length;
    if (manual || s.added || s.updated) notify(`AMIS: ${s.added} đơn mới, ${s.updated} đơn cập nhật` + (s.consigned ? `, ${s.consigned} đơn Ký gửi chưa tính` : "") + (np ? `; ${np} khách hàng chờ xác nhận` : ""));
    if (!manual && !s.added && !s.updated) { amRender(); nbRefresh(); } else { render(); }
  } catch (e) {
    const now = Date.now(), msg = vi(e.message) === e.message ? e.message : "Lỗi không xác định";
    try {
      await amPersist({ ...amEmpty(), logs: [{ time: now, level: e.code === "OFFLINE" ? "warn" : "error", action: "đồng bộ", objectId: "", result: "thất bại", message: msg }] }, { ...sy, id: "sync", lastRun: t0, lastError: msg, lastCode: e.code || "ERROR", lastErrorAt: now });
      await load();
    } catch (_) { /* không ghi được nhật ký: bỏ qua */ }
    if (manual) notify("Đồng bộ AMIS thất bại: " + msg);
  } finally { S.amBusy = false; amDraw(); nbRefresh(); }
}
let amTimer = null;
function amSchedule() {
  clearInterval(amTimer); amTimer = null;
  const c = amCfg(); if (!AMX || !c.enabled) return;
  amTimer = setInterval(() => amSync(false), Math.max(1, +c.interval || 5) * 60e3);
}
window.addEventListener("online", () => { if (AMX && amCfg().enabled) setTimeout(() => amSync(false), 1500); });

/* ===== Thao tác với khách hàng chờ ===== */
async function amDo(fn, okMsg) {
  try { const ch = fn(); await amPersist(ch); await load(); amRender(); render(); notify(okMsg); }
  catch (e) { notify(vi(e.message) === e.message ? e.message : "Không thực hiện được: " + vi(e.message)); }
}
async function amApprove(id) {
  const p = S.am.pending.find(x => x.id === id); if (!p) return;
  const v = AMC.pendingView(amSnap()).find(x => x.id === id) || { valid: 0, sum: 0 };
  if (!await askConfirm(`Thêm “${p.name}” (mã AMIS ${p.code || "chưa có"}) vào danh sách khách hàng BG? Chỉ lưu tên công ty và mã AMIS. Sẽ cộng ${v.valid} đơn hợp lệ, tổng ${amMoney(v.sum)} VND trước thuế.`, { ok: "Đồng ý thêm", title: "Thêm khách hàng từ AMIS" })) return;
  await amDo(() => AMC.approveNew(amSnap(), id, amCfg(), Date.now()), "Đã thêm khách hàng và cộng doanh số");
}
async function amIgnore(id) {
  const p = S.am.pending.find(x => x.id === id); if (!p) return;
  if (!await askConfirm(`Bỏ qua “${p.name}”? Các đơn của khách hàng này sẽ không được cộng doanh số. Bạn có thể khôi phục ở mục “Đã bỏ qua”.`, { ok: "Bỏ qua", title: "Bỏ qua khách hàng AMIS" })) return;
  await amDo(() => AMC.ignoreAccount(amSnap(), id, amCfg(), Date.now()), "Đã bỏ qua khách hàng");
}
const amRestore = id => amDo(() => AMC.restoreAccount(amSnap(), id, amCfg(), Date.now()), "Đã đưa lại vào danh sách chờ");
function amLinkDialog(id) {
  const p = S.am.pending.find(x => x.id === id); if (!p) return;
  const f = $("#dlg-form"), cand = p.candidates || [], cs = S.cus.filter(c => !c.archived).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  f.innerHTML = `<h3 id="dlg-title" style="margin:0 0 6px">Ghép với khách hàng có sẵn</h3><p class="small muted" style="margin:0">Khách hàng AMIS: <strong>${esc(p.name)}</strong> (mã ${esc(p.code || "chưa có")}). Toàn bộ đơn hợp lệ, kể cả các đơn sau này, sẽ được cộng vào khách hàng BG bạn chọn.</p>`
    + (cand.length ? `<div class="flabel">Gợi ý tên gần giống</div><div class="toolbar" style="margin:0">${cand.map(c => `<button type="button" class="btn" data-amcand="${esc(c.name)}">${esc(c.name)} · ${Math.round(c.score * 100)}%</button>`).join("")}</div>` : "")
    + `<label class="flabel" for="am_lk">Khách hàng BG *</label><input id="am_lk" list="am_lk_l" autocomplete="off" placeholder="Gõ để tìm khách hàng…" value="${esc(cand[0] ? cand[0].name : "")}"><datalist id="am_lk_l">${cs.map(c => `<option value="${esc(c.name)}">`).join("")}</datalist>`
    + `<div class="dlg-actions"><button type="button" class="btn" id="am_lk_x">Hủy</button><span style="flex:1"></span><button type="submit" class="btn primary">Ghép và cộng doanh số</button></div>`;
  $("#am_lk_x").onclick = () => $("#dlg").close();
  f.onclick = e => { const b = e.target.closest("[data-amcand]"); if (b) $("#am_lk").value = b.dataset.amcand; };
  f.onsubmit = async e => {
    e.preventDefault();
    const c = S.cus.find(x => key(x.name) === key($("#am_lk").value));
    if (!c) { setErr("am_lk", "Không tìm thấy khách hàng này. Hãy chọn từ danh sách gợi ý."); return; }
    $("#dlg").close(); f.onclick = null; f.onsubmit = null;
    await amDo(() => AMC.approveLink(amSnap(), id, c.id, amCfg(), Date.now()), "Đã ghép khách hàng và cộng doanh số");
  };
  $("#dlg").style.width = "min(560px,94vw)"; $("#dlg").showModal(); $("#am_lk").focus(); $("#am_lk").select();
}

/* ===== Hiển thị ===== */
const AM_TABS = [["pend", "Chờ xác nhận"], ["ord", "Đơn hàng"], ["log", "Nhật ký"], ["conn", "Kết nối & cấu hình"]];
const AM_STATE = { counted: ["Đã ghi nhận", "success"], consign: ["Ký gửi (chưa ghi nhận)", "warning"], pending: ["Chờ duyệt khách hàng", "warning"], ignored: ["Đã bỏ qua", ""], foreign: ["Của kinh doanh khác", ""], inel: ["Không đủ điều kiện", ""], range: ["Ngoài kỳ", ""] };
const amOrdState = o => o.state === "foreign" ? "foreign" : o.state === "ignored" ? "ignored" : o.state === "pending" ? "pending" : o.consigned ? "consign" : !o.eligible ? "inel" : !o.inRange ? "range" : "counted";
const amPend = () => AMC.pendingView(amSnap());
function amRender() { if (S.view === "amis") amDraw(true); }
function amBadge() { const bd = $("#am-badge"); if (!bd) return; const n = S.am ? S.am.pending.filter(p => p.state === "pending").length : 0; bd.hidden = !n; bd.textContent = n > 9 ? "9+" : n; }
function amDraw(force) {
  const root = $("#am-body"); if (!root) return;
  const [txt, cls] = amState(), sy = S.am.sync || {}, pv = amPend(), np = pv.filter(x => x.state === "pending").length, tab = S.amTab || "pend";
  $("#am-tag").className = "tag " + cls; $("#am-tag").textContent = txt;
  $("#am-sync").disabled = !!S.amBusy || !AMX;
  $("#am-meta").innerHTML = `<span>Lần đồng bộ gần nhất thành công: <strong>${amT(sy.lastOk)}</strong></span>` + (sy.last ? `<span>${sy.last.raw} đơn đọc · ${sy.last.added} mới · ${sy.last.updated} cập nhật</span>` : "")
    + (amCfg().owners.length ? `<span>Đang lấy đơn của: <strong>${esc(amCfg().owners.join(", "))}</strong> (đơn Ký gửi chưa tính)</span>` : '<span style="color:var(--warning)">Chưa xác nhận tên kinh doanh</span>')
    + (sy.lastError ? `<span style="color:var(--danger)">Lỗi gần nhất (${amT(sy.lastErrorAt || sy.lastRun)}): ${esc(sy.lastError)}</span>` : "")
    + (!navigator.onLine ? '<span style="color:var(--warning)">Đang ngoại tuyến</span>' : "");
  $("#am-tabs").innerHTML = AM_TABS.map(([k, l]) => `<button type="button" role="tab" data-amtab="${k}" aria-pressed="${k === tab}">${l}${k === "pend" && np ? ` (${np})` : ""}</button>`).join("");
  amBadge();
  /* Đang gõ trong ô nhập thì không vẽ lại nội dung (tránh mất chữ đang gõ khi đồng bộ tự động chạy ngầm) */
  const ae = document.activeElement;
  if (!force && ae && root.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return;
  if (tab === "pend") amDrawPend(root, pv); else if (tab === "ord") amDrawOrd(root); else if (tab === "log") amDrawLog(root); else amDrawConn(root);
}
function amDrawPend(root, pv) {
  const act = pv.filter(x => x.state === "pending"), ign = pv.filter(x => x.state === "ignored"), c = amCfg();
  const noRule = c.map.status && !c.eligible.length ? '<div class="notice" style="margin-bottom:12px"><strong>Chưa chọn trạng thái đơn được tính doanh số.</strong> Vào “Kết nối & cấu hình” để chọn, nếu không các đơn sẽ chưa được cộng.</div>' : "";
  const card = x => `<div class="card amcard" data-amid="${esc(x.id)}"><div class="amcard-main"><div><div class="amname">${esc(x.name || "(chưa có tên)")}</div><div class="small muted">Mã AMIS: ${esc(x.code || "chưa có")} · ID: ${esc(x.id)} · nhận lần đầu ${amT(x.firstSeen)}</div>`
    + `<div class="amsum"><strong>${x.valid}</strong> đơn hợp lệ · <strong>${amMoney(x.sum)}</strong> VND trước thuế` + (x.n > x.valid ? ` <span class="muted">(+${x.n - x.valid} đơn chưa tính)</span>` : "") + `</div>`
    + (x.candidates && x.candidates.length ? `<div class="small muted">Tên gần giống trong BG: ${x.candidates.map(k => esc(k.name)).join("; ")}</div>` : "") + `</div>`
    + `<div class="amacts">${x.state === "pending" ? `<button type="button" class="btn primary" data-amact="approve">Đồng ý thêm</button><button type="button" class="btn" data-amact="link">Ghép với khách có sẵn…</button><button type="button" class="btn" data-amact="ignore">Bỏ qua</button>` : `<button type="button" class="btn" data-amact="restore">Khôi phục</button>`}</div></div></div>`;
  root.innerHTML = noRule + (act.length ? `<p class="small muted" style="margin:0 0 10px">Các khách hàng này có đơn trên AMIS nhưng chưa có trong BG. Doanh số chỉ được cộng sau khi bạn duyệt.</p>` + act.map(card).join("") : `<div class="card"><p class="muted" style="margin:0">Không có khách hàng nào đang chờ xác nhận.</p></div>`)
    + (ign.length ? `<details class="how" style="margin-top:14px"><summary>Đã bỏ qua (${ign.length})</summary><div style="margin-top:10px">${ign.map(card).join("")}</div></details>` : "");
}
function amDrawOrd(root) {
  const q = S.amQ || "", st = S.amF || "";
  root.innerHTML = `<div class="card"><div class="toolbar"><input type="search" id="am-q" placeholder="Tìm theo số đơn, khách hàng…" aria-label="Tìm đơn hàng" value="${esc(q)}" style="min-width:240px"><select id="am-f" aria-label="Lọc theo tình trạng"><option value="">Mọi tình trạng</option>${Object.entries(AM_STATE).map(([k, v]) => `<option value="${k}"${st === k ? " selected" : ""}>${v[0]}</option>`).join("")}</select><span class="muted small" id="am-oc"></span></div><div class="table-wrap"><table class="stbl"><thead><tr><th style="text-align:left">Số đơn</th><th style="text-align:left">Khách hàng AMIS</th><th style="text-align:left">Khách hàng BG</th><th style="text-align:left">Kinh doanh</th><th>Ngày đơn</th><th style="text-align:left">Trạng thái AMIS</th><th>Trước thuế (VND)</th><th style="text-align:left">Tình trạng</th></tr></thead><tbody id="am-orows"></tbody></table></div></div>`;
  amOrdRows();
}
function amOrdRows() {
  const q = key(S.amQ || ""), st = S.amF || "", cm = new Map(S.cus.map(c => [c.id, c.name]));
  const all = S.am.orders.filter(o => (!st || amOrdState(o) === st) && (!q || key([o.orderNo, o.id, o.accountName, o.accountCode, o.owner || "", cm.get(o.cid) || ""].join(" ")).includes(q))).sort((a, b) => b.orderDate < a.orderDate ? -1 : b.orderDate > a.orderDate ? 1 : 0);
  const tb = $("#am-orows"); if (!tb) return;
  tb.innerHTML = all.slice(0, 300).map(o => { const s = AM_STATE[amOrdState(o)]; return `<tr><td style="text-align:left">${esc(o.orderNo || o.id)}</td><td style="text-align:left">${esc(o.accountName)}</td><td style="text-align:left">${esc(cm.get(o.cid) || "—")}</td><td style="text-align:left">${esc(o.owner || "—")}</td><td>${dmy(o.orderDate)}</td><td style="text-align:left">${esc(o.status || "—")}</td><td>${amMoney(o.amount)}</td><td style="text-align:left"><span class="tag ${s[1]}">${s[0]}</span></td></tr>`; }).join("") || '<tr><td colspan="8" class="muted" style="text-align:center">Chưa có đơn hàng nào.</td></tr>';
  $("#am-oc").textContent = `Hiển thị ${Math.min(300, all.length)}/${all.length} đơn` + (all.length > 300 ? " (thu hẹp bằng ô tìm kiếm)" : "");
}
function amDrawLog(root) {
  root.innerHTML = `<div class="card"><div class="table-wrap"><table class="stbl"><thead><tr><th style="text-align:left">Thời gian</th><th style="text-align:left">Mức</th><th style="text-align:left">Thao tác</th><th style="text-align:left">Đối tượng</th><th style="text-align:left">Kết quả</th><th style="text-align:left">Chi tiết</th></tr></thead><tbody>`
    + (S.am.logs.slice(0, 200).map(l => `<tr><td style="text-align:left">${amT(l.time)}</td><td style="text-align:left"><span class="tag ${l.level === "error" ? "danger" : l.level === "warn" ? "warning" : ""}">${esc(l.level)}</span></td><td style="text-align:left">${esc(l.action)}</td><td style="text-align:left">${esc(l.objectId)}</td><td style="text-align:left">${esc(l.result)}</td><td style="text-align:left;white-space:normal">${esc(l.message)}</td></tr>`).join("") || '<tr><td colspan="6" class="muted" style="text-align:center">Chưa có nhật ký.</td></tr>') + `</tbody></table></div><p class="tiny muted" style="margin:8px 0 0">Hiện 200 dòng mới nhất, giữ tối đa khoảng 600 dòng. Nhật ký không chứa khóa bí mật hay token.</p></div>`;
}
function amDrawConn(root) {
  const c = amDraftCfg(), sec = S.am.sec, sy = S.am.sync || {}, fl = sy.fields || [];
  const sv = (k, l) => `<div><label class="flabel" for="am_${k}">${l}</label><input id="am_${k}" type="password" autocomplete="off" spellcheck="false" placeholder="${sec && sec.saved[k] ? ("Đã lưu " + (sec.hint[k] || "")).trim() : "Chưa có"}"></div>`;
  const mp = k => `<div><label class="flabel" for="am_m_${k}">${AMC.MAP_LABELS[k]}${["orderId", "accountId", "orderDate", "amount", "accountName", "owner", "consign"].includes(k) ? " *" : ""}</label><input id="am_m_${k}" list="am_fl" autocomplete="off" spellcheck="false" value="${esc(c.map[k] || "")}" placeholder="vd: tên trường trong phản hồi"></div>`;
  const stNames = [...new Set([...Object.keys(sy.statuses || {}), ...c.eligible])].sort((a, b) => a.localeCompare(b, "vi"));
  root.innerHTML = (AMX ? "" : '<div class="notice" style="margin-bottom:12px"><strong>Kết nối AMIS chỉ hoạt động trong bản cài Windows.</strong> Bạn vẫn xem được dữ liệu đã đồng bộ.</div>')
    + `<div class="card"><h3 class="ch">1. Thông tin đăng nhập MISA</h3><p class="small muted" style="margin:0 0 6px">Lưu mã hóa bằng Windows trên máy này, không nằm trong tệp sao lưu và không hiện lại sau khi lưu. Để trống ô nào thì giữ nguyên giá trị đã lưu. ${sec && !sec.encryption ? '<strong style="color:var(--danger)">Máy này không hỗ trợ mã hóa nên không lưu được khóa.</strong>' : ""}</p>`
    + `<div class="fgrid">${sv("apiKey", "API Key")}${sv("clientId", "Client ID (AppID)")}${sv("clientSecret", "Client Secret")}</div><div class="toolbar" style="margin-top:12px"><button type="button" class="btn primary" data-amconn="save"${AMX ? "" : " disabled"}>Lưu thông tin</button><button type="button" class="btn" data-amconn="test"${AMX ? "" : " disabled"}>Kiểm tra kết nối</button><button type="button" class="btn" data-amconn="clear" style="color:var(--danger)"${AMX ? "" : " disabled"}>Xóa thông tin đã lưu</button><span class="small muted" id="am-connmsg" aria-live="polite"></span></div></div>`
    + `<div class="card section-gap"><h3 class="ch">2. Cấu trúc dữ liệu đơn hàng của MISA</h3><p class="small muted" style="margin:0 0 8px">Tên trường JSON do MISA quy định và chưa được tự đoán. Bấm nút bên dưới để đọc 3 đơn mẫu từ AMIS, rồi chọn trường tương ứng ở bước 3.</p><div class="toolbar" style="margin:0"><button type="button" class="btn" data-amconn="probe"${AMX ? "" : " disabled"}>Xem cấu trúc phản hồi SaleOrders</button></div>`
    + (fl.length ? `<div class="table-wrap" style="margin-top:10px;max-height:260px"><table class="stbl"><thead><tr><th style="text-align:left">Trường</th><th style="text-align:left">Kiểu</th><th style="text-align:left">Giá trị mẫu (đơn mới nhất)</th></tr></thead><tbody>${fl.map(x => `<tr><td style="text-align:left"><code>${esc(x.path)}</code></td><td style="text-align:left">${esc(x.type)}</td><td style="text-align:left">${esc(x.sample)}</td></tr>`).join("")}</tbody></table></div>` : "") + `</div>`
    + `<div class="card section-gap"><h3 class="ch">3. Ánh xạ trường và quy tắc ghi nhận</h3><datalist id="am_fl">${fl.map(x => `<option value="${esc(x.path)}">${esc(x.sample)}</option>`).join("")}</datalist><div class="fgrid">${AMC.MAP_KEYS.map(mp).join("")}</div>`
    + amOwnerBlock(c, sy)
    + `<div class="flabel" style="margin-top:16px">Trạng thái đơn được tính doanh số</div>` + (c.map.status ? (stNames.length ? `<div class="toolbar" style="margin:0">${stNames.map(s => `<label class="chk"><input type="checkbox" data-amelig="${esc(s)}"${c.eligible.some(e => key(e) === key(s)) ? " checked" : ""}> ${esc(s)}</label>`).join("")}</div>` : '<p class="small muted" style="margin:0">Chưa thấy trạng thái nào. Hãy đồng bộ một lần để liệt kê các trạng thái có trong AMIS, rồi tích chọn.</p>') : '<p class="small muted" style="margin:0">Chưa chọn trường trạng thái: mọi đơn đều được tính. Nên chọn trường trạng thái để loại đơn nháp/đã hủy.</p>')
    + `<div class="fgrid" style="margin-top:12px"><div><label class="flabel" for="am_cut">Chỉ ghi nhận đơn từ ngày *</label><input id="am_cut" type="date" value="${esc(c.cutover)}"><div class="tiny muted">Tránh cộng trùng với doanh số đã nhập từ Excel trước đó.</div></div><div><label class="flabel" for="am_int">Tự đồng bộ mỗi</label><select id="am_int">${[5, 10, 15, 30, 60].map(m => `<option value="${m}"${+c.interval === m ? " selected" : ""}>${m} phút (khi BG đang mở)</option>`).join("")}</select></div><div><label class="flabel" for="am_ob">Sắp xếp khi đọc (orderBy)</label><input id="am_ob" value="${esc(c.orderBy)}" autocomplete="off"></div></div>`
    + `<div class="toolbar" style="margin-top:8px"><label class="chk"><input type="checkbox" id="am_auto"${c.autoLink ? " checked" : ""}> Tự ghép khi tên công ty trùng chính xác và chỉ có một khách hàng BG</label><label class="chk"><input type="checkbox" id="am_en"${c.enabled ? " checked" : ""}> Bật đồng bộ tự động</label></div>`
    + `<div class="toolbar" style="margin-top:12px"><button type="button" class="btn primary" data-amconn="cfg">Lưu cấu hình</button><button type="button" class="btn" data-amconn="full"${AMX ? "" : " disabled"}>Đồng bộ lại toàn bộ</button></div><div id="am-cfgmsg" class="small" style="margin-top:8px"></div></div>`;
  amCfgHint();
}

/* Xác nhận tên kinh doanh + giá trị nghĩa là Ký gửi. Khóa API MISA cấp cho cả ứng dụng/công ty nên có thể đọc được đơn của nhiều người:
   BG chỉ lưu đơn của các tên được tích ở đây. */
function amOwnerBlock(c, sy) {
  const own = sy.owners || {}, cg = sy.consigns || {}, me = key(S.prefs?.name || "");
  const names = [...new Set([...Object.keys(own), ...c.owners])].sort((a, b) => a.localeCompare(b, "vi"));
  const cvals = [...new Set([...Object.keys(cg), ...c.consignValues])].sort((a, b) => a.localeCompare(b, "vi"));
  const nOwn = Object.keys(own).length;
  const info = !sy.scanAt ? "Chưa quét. Bấm “Quét” để BG đọc danh sách kinh doanh và giá trị Ký gửi đang có trên AMIS."
    : nOwn > 1 ? `Đã quét ${sy.scanN} đơn: khóa API đang đọc được đơn của <strong>${nOwn} kinh doanh</strong> (dùng chung cho cả nhóm). BG chỉ lấy đơn của tên bạn tích; đơn của người khác không được lưu vào BG.`
    : nOwn === 1 ? `Đã quét ${sy.scanN} đơn: chỉ thấy <strong>1 kinh doanh</strong> trong dữ liệu đọc được.` : `Đã quét ${sy.scanN} đơn nhưng chưa thấy tên kinh doanh nào. Hãy kiểm tra đã chọn đúng trường “Nhân viên kinh doanh” và các trường bắt buộc ở trên.`;
  return `<div class="flabel" style="margin-top:16px">Xác nhận tên kinh doanh của bạn *</div><p class="small muted" style="margin:0 0 8px">${info}${sy.scanHitMax ? " (đạt giới hạn số trang quét, có thể còn tên khác ở đơn cũ hơn; có thể thêm tên bằng tay)" : ""}</p>`
    + `<div class="toolbar" style="margin:0 0 8px"><button type="button" class="btn" data-amconn="scan"${AMX ? "" : " disabled"}>Quét tên kinh doanh & giá trị Ký gửi</button></div>`
    + (names.length ? `<div class="toolbar" style="margin:0">${names.map(n => `<label class="chk"><input type="checkbox" data-amown="${esc(n)}"${c.owners.some(o => key(o) === key(n)) ? " checked" : ""}> ${esc(n)}${own[n] ? ` <span class="muted">(${own[n]} đơn)</span>` : ""}${me && key(n) === me ? ' <span class="tag success">trùng tên hiển thị của bạn</span>' : ""}</label>`).join("")}</div>` : "")
    + `<div class="toolbar" style="margin:8px 0 0"><input id="am_ownx" placeholder="Thêm tên khác (nếu ghi nhiều cách)" autocomplete="off" style="min-width:300px"><button type="button" class="btn" data-amconn="addown">Thêm tên</button></div>`
    + `<div class="flabel" style="margin-top:16px">Giá trị nghĩa là “Ký gửi” (đơn Ký gửi chưa được ghi nhận doanh số)</div>`
    + (c.map.consign ? (cvals.length ? `<div class="toolbar" style="margin:0">${cvals.map(v => `<label class="chk"><input type="checkbox" data-amcg="${esc(v)}"${c.consignValues.some(x => key(x) === key(v)) ? " checked" : ""}> ${esc(v)}${cg[v] ? ` <span class="muted">(${cg[v]} đơn)</span>` : ""}</label>`).join("")}</div>` : '<p class="small muted" style="margin:0">Chưa thấy giá trị nào. Bấm “Quét”, hoặc tự thêm giá trị bên dưới (vd: true, Ký gửi).</p>') : '<p class="small muted" style="margin:0">Hãy chọn trường Ký gửi ở bảng ánh xạ phía trên.</p>')
    + `<div class="toolbar" style="margin:8px 0 0"><input id="am_cgx" placeholder="Thêm giá trị Ký gửi (vd: true)" autocomplete="off" style="min-width:300px"><button type="button" class="btn" data-amconn="addcg">Thêm giá trị</button></div>`
    + `<p class="tiny muted" style="margin:6px 0 0">Kinh doanh tick “Ký gửi” trên AMIS thì BG chưa cộng doanh số. Khi bỏ tick, lần đồng bộ sau BG tự cộng. Đơn có giá trị Ký gửi để trống được xem là không ký gửi.</p>`;
}
function amCfgHint() { const el = $("#am-cfgmsg"); if (!el) return; const p = AMC.cfgProblems(amDraftCfg()), w = AMC.cfgWarnings(amDraftCfg()); el.innerHTML = p.length ? `<div class="notice"><strong>Còn thiếu:</strong><ul style="margin:6px 0 0 18px;padding:0">${p.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : '<span style="color:var(--success)">✓ Cấu hình đủ để đồng bộ.</span>'; if (w.length) el.innerHTML += `<div class="small" style="margin-top:6px;color:var(--warning)">${w.map(x => "⚠ " + esc(x)).join("<br>")}</div>`; }
const amMsg = t => { const e = $("#am-connmsg"); if (e) e.textContent = t || ""; };
async function amSecStatus() { if (!AMX) return; try { const r = await AMX.status(); if (r && r.ok !== false) S.am.sec = r; } catch (_) { /* bỏ qua */ } }
function amReadCfg() {
  const map = {}; AMC.MAP_KEYS.forEach(k => { map[k] = ($("#am_m_" + k).value || "").trim(); });
  const prev = amDraftCfg(), el = [...$$("[data-amelig]")], ow = [...$$("[data-amown]")], cg = [...$$("[data-amcg]")];
  return { ...prev, map, eligible: el.length ? el.filter(x => x.checked).map(x => x.dataset.amelig) : prev.eligible,
    owners: ow.length ? ow.filter(x => x.checked).map(x => x.dataset.amown) : prev.owners, consignValues: cg.length ? cg.filter(x => x.checked).map(x => x.dataset.amcg) : prev.consignValues, cutover: $("#am_cut").value || prev.cutover, interval: +$("#am_int").value || 5, orderBy: ($("#am_ob").value || "modified_date").trim(), autoLink: $("#am_auto").checked, enabled: $("#am_en").checked };
}
async function amConnClick(act) {
  if (act === "save") {
    const o = {}; ["apiKey", "clientId", "clientSecret"].forEach(k => { o[k] = $("#am_" + k).value.trim(); });
    if (!o.apiKey && !o.clientId && !o.clientSecret) { amMsg("Hãy nhập ít nhất một thông tin cần lưu."); return; }
    amMsg("Đang lưu…"); const r = await AMX.saveSecrets(o);
    if (!r.ok) { amMsg(r.message); return; }
    ["apiKey", "clientId", "clientSecret"].forEach(k => { $("#am_" + k).value = ""; }); S.am.sec = r; amDraw(true); amMsg("Đã lưu (mã hóa).");
  } else if (act === "clear") {
    if (!await askConfirm("Xóa API Key, Client ID và Client Secret đã lưu trên máy này? Dữ liệu đã đồng bộ vẫn được giữ.", { ok: "Xóa", danger: true, title: "Xóa thông tin đăng nhập" })) return;
    const r = await AMX.clearSecrets(); if (r.ok) { S.am.sec = r; amDraw(true); amMsg("Đã xóa."); }
  } else if (act === "test") {
    amMsg("Đang kiểm tra…"); const r = await AMX.test(); amMsg(r.ok ? "✓ Kết nối thành công, lấy được token." : "✗ " + r.message);
  } else if (act === "probe") {
    amMsg("Đang đọc đơn mẫu…"); const r = await AMX.probe({ endpoint: "SaleOrders", orderBy: ($("#am_ob")?.value || "modified_date").trim() });
    if (!r.ok) { amMsg("✗ " + r.message); return; }
    const sy = { ...(S.am.sync || { id: "sync" }), fields: r.fields.slice(0, 120).map(x => ({ path: x.path, type: x.type, sample: x.sample })) };
    await amPersist(amEmpty(), sy); S.am.sync = sy; S.am.draft = amReadCfg(); amDraw(true); amMsg(r.count ? `✓ Đọc được ${r.count} đơn mẫu (tổng ${r.total ?? "không rõ"}), danh sách ở mục “${r.listPath || "gốc"}”.` : "Không có đơn nào để xem cấu trúc.");
  } else if (act === "addown" || act === "addcg") {
    const inp = $(act === "addown" ? "#am_ownx" : "#am_cgx"), v = (inp.value || "").trim(); if (!v) { amMsg("Hãy nhập giá trị cần thêm."); return; }
    const d = amReadCfg(), f = act === "addown" ? "owners" : "consignValues"; if (!d[f].some(x => key(x) === key(v))) d[f] = [...d[f], v];
    S.am.draft = d; amDraw(true); amMsg("Đã thêm “" + v + "” (nhớ bấm Lưu cấu hình).");
  } else if (act === "scan") {
    await amScan();
  } else if (act === "cfg" || act === "full") {
    const cfg = amReadCfg(), old = amCfg();
    const sig = c => JSON.stringify([c.owners.map(key).sort(), c.map.owner, c.map.consign]);
    try { await amSaveCfg(cfg); amSchedule(); amDraw(true); notify("Đã lưu cấu hình AMIS"); }
    catch (e) { notify("Không lưu được: " + vi(e.message)); return; }
    const refetch = sig(AMC.cfgOf(cfg)) !== sig(old);   // đổi tên kinh doanh/trường: cần đọc lại từ AMIS vì sổ đơn chưa có đơn của người mới
    if (refetch && !AMC.cfgProblems(cfg).length) { notify("Đã đổi tên kinh doanh/trường: BG đọc lại toàn bộ đơn từ AMIS."); amSync(true, true); return; }
    if (act === "full") { if (AMC.cfgProblems(cfg).length) { notify("Cấu hình chưa đủ để đồng bộ."); return; } amSync(true, true); }
  }
}


/* Quét một số trang đơn gần nhất để liệt kê tên kinh doanh, giá trị Ký gửi, trạng thái thực tế (không ghi đơn nào vào sổ) */
async function amScan() {
  if (!AMX || S.amBusy) return;
  const d = amReadCfg(); S.am.draft = d;
  if (!d.map.owner) { amMsg("Hãy chọn trường “Nhân viên kinh doanh” ở bảng ánh xạ trước."); return; }
  S.amBusy = true; amMsg("Đang quét các đơn gần nhất…");
  try {
    const r = await AMX.fetchOrders({ map: d.map, orderBy: d.orderBy, stopBefore: null, maxPages: 40 });
    if (!r.ok) { amMsg("✗ " + r.message); return; }
    const sy = { ...(S.am.sync || { id: "sync" }), owners: r.owners || {}, consigns: r.consigns || {}, scanAt: Date.now(), scanN: r.raw, scanHitMax: !!r.hitMax };
    const st = { ...(sy.statuses || {}) }; Object.keys(r.statuses || {}).forEach(k => { st[k] = Date.now(); }); sy.statuses = st;
    await amPersist({ ...amEmpty(), logs: [{ time: Date.now(), level: "info", action: "quét", objectId: "", result: "thành công", message: `${r.raw} đơn: ${Object.keys(sy.owners).length} kinh doanh, ${Object.keys(sy.consigns).length} giá trị Ký gửi` }] }, sy);
    S.am.sync = sy; S.am.draft = d; await load(); S.am.draft = d; amDraw(true);
    amMsg(r.raw && !Object.keys(sy.owners).length ? "✗ Đọc được đơn nhưng không có tên kinh doanh" + (r.invalid.length ? " (đơn lỗi: " + r.invalid[0].errors.join(", ") + "; hãy hoàn tất ánh xạ ID, ngày, tổng tiền)" : "") : `✓ Đã quét ${r.raw} đơn.`);
  } finally { S.amBusy = false; amDraw(); }
}

/* ===== Sự kiện ===== */
$("#am-sync").addEventListener("click", () => amSync(true, false));
$("#am-tabs").addEventListener("click", e => { const b = e.target.closest("[data-amtab]"); if (b) { S.amTab = b.dataset.amtab; amDraw(true); } });
$("#am-body").addEventListener("click", e => {
  const a = e.target.closest("[data-amact]"), card = e.target.closest("[data-amid]");
  if (a && card) { const id = card.dataset.amid, k = a.dataset.amact; if (k === "approve") amApprove(id); else if (k === "link") amLinkDialog(id); else if (k === "ignore") amIgnore(id); else if (k === "restore") amRestore(id); return; }
  const c = e.target.closest("[data-amconn]"); if (c && AMX) amConnClick(c.dataset.amconn);
});
$("#am-body").addEventListener("input", e => { if (e.target.id === "am-q") { S.amQ = e.target.value; amOrdRows(); } });
$("#am-body").addEventListener("change", e => { if (e.target.id === "am-f") { S.amF = e.target.value; amOrdRows(); } if (S.amTab === "conn" && e.target.closest("#am_fl,.fgrid,[data-amelig],[data-amown],[data-amcg],#am_cut,#am_int,#am_ob,#am_auto,#am_en")) { S.am.draft = amReadCfg(); amCfgHint(); } });
async function amInit() {
  await amSecStatus();
  if (AMX && amCfg().enabled && !amProblems().length) setTimeout(() => amSync(false), 3000);
  amSchedule(); amDraw();
}
