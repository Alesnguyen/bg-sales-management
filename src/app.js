(()=>{"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],root=document.documentElement;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/\s+/g," ").trim();
const fmt=n=>n==null?"–":Math.round(n).toLocaleString("vi-VN");
const fmtB=n=>n==null?"–":Math.abs(n)>=1e9?(n/1e9).toFixed(1).replace(".",",")+" tỷ":Math.abs(n)>=1e6?Math.round(n/1e6).toLocaleString("vi-VN")+" triệu":fmt(n);
const pct=x=>x==null?"–":(x*100).toFixed(1).replace(".",",")+"%";
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const dmy=s=>s?s.split("-").reverse().join("/"):"";
const monday=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const vi=m=>/[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơưạ-ỹ]/.test(m||"")?m:"lỗi không xác định, vui lòng thử lại";
const VER="{{VER}}",S={cus:[],work:[],meta:{},prefs:{id:"prefs"},week:monday(new Date())};
/* ===== Lưu trữ IndexedDB ===== */
let db;
const open=()=>new Promise((ok,no)=>{const r=indexedDB.open("bgsm",1);r.onupgradeneeded=()=>["c","w","m"].forEach(n=>r.result.createObjectStore(n,{keyPath:"id"}));r.onsuccess=()=>{db=r.result;ok()};r.onerror=()=>no(r.error)});
const run=(st,mode,fn)=>new Promise((ok,no)=>{const t=db.transaction(st,mode);let r;try{r=fn(...[].concat(st).map(s=>t.objectStore(s)))}catch(e){try{t.abort()}catch(_){}no(e);return}t.oncomplete=()=>ok(r&&"result"in r?r.result:undefined);t.onerror=t.onabort=()=>no(t.error||Error("Giao dịch bị hủy"))});
const getAll=s=>run(s,"readonly",o=>o.getAll()),put=(s,a)=>run(s,"readwrite",o=>{a.forEach(x=>o.put(x))}),del=(s,id)=>run(s,"readwrite",o=>o.delete(id)),clr=()=>run(["c","w","m"],"readwrite",(c,w,m)=>{c.clear();w.clear();m.clear()});
async function load(){S.cus=await getAll("c");S.work=await getAll("w");const ms=await getAll("m");S.meta=ms.find(x=>x.id==="meta")||{};S.prefs=ms.find(x=>x.id==="prefs")||{id:"prefs"};S.cus.sort((a,b)=>(b.a26||0)-(a.a26||0))}
/* ===== Thông báo, điều hướng, giao diện ===== */
let tt;const notify=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("show"),2800)};
const setFocus=on=>{document.body.classList.toggle("focus",on);const b=$("#focus-toggle");b.setAttribute("aria-pressed",String(on));b.textContent=on?"⤡ Thu nhỏ bảng":"⤢ Mở rộng bảng"};
const META={overview:["KHÔNG GIAN LÀM VIỆC","Tổng quan","Bức tranh nhanh về dữ liệu kinh doanh của bạn."],customers:["QUẢN LÝ DỮ LIỆU","Danh sách khách hàng","Tìm kiếm, lọc, thêm và sửa khách hàng."],calendar:["KẾ HOẠCH CÔNG VIỆC","Lịch làm việc","Kế hoạch công tác và tác vụ theo tuần."],import:["QUẢN LÝ DỮ LIỆU","Nhập dữ liệu","Nhập Excel có xem trước và xác nhận."],settings:["TÙY CHỈNH","Cài đặt","Giao diện, sao lưu và thông tin ứng dụng."]};
function go(p){if(!META[p])return;setFocus(false);document.body.dataset.page=p;$$("[data-view]").forEach(v=>v.classList.toggle("active",v.dataset.view===p));$$(".nav button").forEach(b=>{const a=b.dataset.page===p;b.classList.toggle("active",a);a?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current")});$("#page-eyebrow").textContent=META[p][0];$("#page-title").textContent=META[p][1];$("#page-description").textContent=META[p][2];render()}
function theme(t,say){t=t==="dark"?"dark":"light";root.dataset.theme=t;try{localStorage.setItem("bgsm-theme",t)}catch(_){}const d=t==="dark";$("#theme-label").textContent=d?"Giao diện tối":"Giao diện sáng";$("#theme-toggle").setAttribute("aria-label",d?"Chuyển sang giao diện sáng":"Chuyển sang giao diện tối");$("#sun-icon").classList.toggle("selected",!d);$("#moon-icon").classList.toggle("selected",d);if(say)notify(d?"Đã chuyển sang giao diện tối":"Đã chuyển sang giao diện sáng")}
const flip=()=>theme(root.dataset.theme==="dark"?"light":"dark",true);
/* ===== Nghiệp vụ ===== */
const REG=[["Hà Nội",/ha noi|bac tu liem|pham van dong|pvd|long bien|phan trong tue/],["Bắc Ninh",/bac ninh|tu son/],["Bắc Giang",/bac giang/],["Quảng Ninh",/quang ninh/],["Thanh Hóa",/thanh hoa|nghi son/],["Lạng Sơn",/lang son/],["Cao Bằng",/cao bang/],["Phú Yên",/phu yen/],["Khánh Hòa",/nha trang/],["Đắk Lắk",/dak ?lak/],["Gia Lai",/gia lai/],["TP. Hồ Chí Minh",/gia dinh|sai gon|ho chi minh/]];
const guess=n=>{const k=key(n);return(REG.find(r=>r[1].test(k))||[,"Khác"])[0]};
const comp=c=>c.t26>0?(c.a26||0)/c.t26:null;
const stat=c=>c.archived?["Đã lưu trữ",""]:!(c.t26>0)?["Chưa có mục tiêu","info"]:!c.a26?["Chưa phát sinh","info"]:comp(c)>=.7?["Đang hoạt động","success"]:["Cần theo dõi","warning"];
const late=w=>w.st==="Dự kiến"&&w.date<iso(new Date());
const regions=()=>[...new Set(S.cus.filter(c=>!c.archived).map(c=>c.region||"Khác"))].sort((a,b)=>a.localeCompare(b,"vi"));
/* ===== Hiển thị ===== */
function render(){const p=($(".view.active")||{dataset:{}}).dataset.view;
 $("#side-count").textContent=S.cus.length+" khách hàng · "+S.work.length+" công việc";
 if(p==="overview")ovw();if(p==="customers")cust();if(p==="calendar")cal();if(p==="settings")sett()}
const QUOTES=["Mỗi cuộc gọi hôm nay là một cơ hội mới. Bắt đầu thôi!","Doanh số là kết quả của những việc nhỏ làm đều mỗi ngày.","Khách hàng nhớ người giữ lời hứa, và bạn đang làm rất tốt.","Tiến độ chậm vẫn là tiến độ. Cứ vững bước!","Một lần ghé thăm hôm nay có thể là đơn hàng của tháng sau.","Bạn không cần hoàn hảo, chỉ cần kiên trì.","Hôm nay hãy làm thật tốt một việc quan trọng nhất.","Mục tiêu lớn được tạo nên từ từng ngày chăm chỉ.","Cảm ơn bạn đã nỗ lực mỗi ngày. Thành quả sẽ đến.","Giữ nhịp đều đặn, kết quả sẽ tự tìm đến bạn."];
let qi=Math.floor(Date.now()/864e5)%QUOTES.length;
const greet=()=>{const h=new Date().getHours(),n=S.prefs?.name;return"Chào "+(h<11?"buổi sáng":h<14?"buổi trưa":h<18?"buổi chiều":"buổi tối")+(n?", "+n:"")+"!"};
function trend(mt,last){const W=640,H=250,L=62,R=16,T=14,B=30,mx=Math.max(...mt.flat());if(!(mx>0))return'<p class="muted small">Chưa có doanh số theo tháng. Hãy nhập từ Excel hoặc nhập số liệu tháng ở màn hình sửa khách hàng.</p>';
 const st=10**Math.floor(Math.log10(mx)),top=Math.ceil(mx/st)*st,x=i=>L+i*(W-L-R)/11,y=v=>T+(H-T-B)*(1-v/top),pts=(k,n)=>mt.slice(0,n).map((m,i)=>x(i).toFixed(1)+","+y(m[k]).toFixed(1)).join(" "),
 dots=(k,n,f)=>mt.slice(0,n).map((m,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(m[k]).toFixed(1)}" r="4" ${f}><title>Tháng ${i+1}/${k?2026:2025}: ${fmt(m[k])} VND</title></circle>`).join("");
 return`<div class="small muted" style="display:flex;gap:16px;margin-bottom:6px"><span><b style="color:var(--info)">┄┄</b> 2025</span><span><b>━━</b> 2026</span></div><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Biểu đồ đường doanh số theo tháng, 2025 so với 2026">`+[0,1,2,3,4].map(i=>{const v=top*i/4,yy=y(v);return`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="var(--border)"/><text x="${L-8}" y="${yy+4}" text-anchor="end" font-size="11" fill="var(--text-secondary)">${fmtB(v).replace(" triệu"," tr")}</text>`}).join("")+mt.map((_,i)=>`<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="11" fill="var(--text-secondary)">T${i+1}</text>`).join("")+`<polyline fill="none" stroke="var(--info)" stroke-width="2" stroke-dasharray="6 4" points="${pts(0,12)}"/>${dots(0,12,'fill="var(--surface)" stroke="var(--info)" stroke-width="2"')}`+(last>=0?`<polyline fill="none" stroke="var(--text)" stroke-width="3" points="${pts(1,last+1)}"/>${dots(1,last+1,'fill="var(--accent)" stroke="var(--text)" stroke-width="2"')}`:"")+"</svg>"}
function insights(mt,last){let b=-1;mt.forEach((m,i)=>{if(m[1]>0&&(b<0||m[1]>mt[b][1]))b=i});const n=last+1,y26=mt.reduce((s,m)=>s+m[1],0),y25=mt.slice(0,n).reduce((s,m)=>s+m[0],0);
 return[["Tháng cao nhất 2026",b<0?"–":"T"+(b+1)+" · "+fmtB(mt[b][1])],["Trung bình/tháng 2026",last<0?"–":fmtB(y26/n)],["So với cùng kỳ 2025",last<0||!y25?"–":pct(y26/y25-1)]].map(([l,v])=>`<div style="background:var(--surface-subtle);border-radius:var(--radius-md);padding:12px"><div class="muted tiny">${l}</div><strong>${v}</strong></div>`).join("")}
function ovw(){const rg=$("#ov-region"),rl=regions(),cur=rg.value;rg.innerHTML='<option value="">Tất cả khu vực</option>'+rl.map(r=>`<option>${esc(r)}</option>`).join("");rg.value=rl.includes(cur)?cur:"";
 $("#greet").textContent=greet();$("#quote").textContent=QUOTES[qi];
 const all=S.cus.filter(c=>!c.archived),a=rg.value?all.filter(c=>(c.region||"Khác")===rg.value):all,sum=f=>a.reduce((s,c)=>s+(f(c)||0),0),T=sum(c=>c.t26),R=sum(c=>c.a26),Y=sum(c=>c.a25);
 const k=[["Khách hàng đang theo dõi",a.length,"♙","Thực tế 2025: "+fmtB(Y)],["Mục tiêu doanh số 2026",fmtB(T),"◎","Tổng mục tiêu các khách hàng"],["Doanh số thực tế 2026",fmtB(R),"↗","So với 2025: "+(Y?pct(R/Y-1):"–")],["Tiến độ mục tiêu",pct(T?R/T:null),"◷","Thực tế / mục tiêu 2026"]];
 $("#kpis").innerHTML=k.map(x=>`<article class="card"><div class="kpi-line"><span class="kpi-label">${x[0]}</span><span class="kpi-icon">${x[2]}</span></div><div class="kpi-value">${x[1]}</div><div class="kpi-foot">${x[3]}</div></article>`).join("");
 const g={};all.forEach(c=>{const r=c.region||"Khác";(g[r]??={t:0,r:0}).t+=c.t26||0;g[r].r+=c.a26||0});
 const rb=Object.entries(g).filter(x=>x[1].t>0).sort((x,y)=>y[1].t-x[1].t).slice(0,7);
 $("#region-bars").innerHTML=rb.length?rb.map(([n,v])=>{const p=v.r/v.t;return`<div class="bar-row"><span>${esc(n)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,p*100)}%"></div></div><strong>${Math.round(p*100)}%</strong></div>`}).join(""):'<p class="muted small">Chưa có dữ liệu. Vào “Nhập dữ liệu” để nạp từ Excel.</p>';
 const lim=iso(new Date(Date.now()+7*864e5)),f=S.work.filter(w=>w.st==="Dự kiến"&&w.date<=lim).sort((x,y)=>(x.date+(x.time||"")).localeCompare(y.date+(y.time||""))).slice(0,5);
 $("#follow").innerHTML=f.length?f.map(w=>`<div class="activity-item"><div class="activity-dot">${late(w)?"!":"▦"}</div><div><strong class="small">${esc(w.title)}</strong><div class="muted tiny">${dmy(w.date)}${w.time?" · "+esc(w.time):""}${w.cus?" · "+esc(w.cus):""}${late(w)?" · Trễ hạn":""}</div></div></div>`).join(""):'<p class="muted small">Không có công việc nào trong 7 ngày tới.</p>';
 const mt=Array.from({length:12},(_,i)=>[0,1].map(y=>a.reduce((s,c)=>s+(c.m?.[i]?.[y]||0),0))),last=mt.reduce((l,m,i)=>m[1]>0?i:l,-1);
 $("#trend").innerHTML=trend(mt,last);$("#insights").innerHTML=insights(mt,last);$("#trend-tag").textContent=rg.value||"Tất cả khu vực";
 const t5=[...a].filter(c=>c.a26>0).sort((x,y)=>y.a26-x.a26).slice(0,5),m5=t5[0]?.a26||1;
 $("#top5").innerHTML=t5.length?t5.map(c=>`<div><div class="small" style="display:flex;justify-content:space-between;gap:8px"><span title="${esc(c.name)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span><strong>${fmtB(c.a26)}</strong></div><div class="bar-track" style="margin-top:4px"><div class="bar-fill" style="width:${c.a26/m5*100}%"></div></div></div>`).join(""):'<p class="muted small">Chưa có doanh số 2026.</p>';
 const m=S.meta.lastImport;$("#ov-note").innerHTML=m?`<strong>Dữ liệu:</strong> nhập từ “${esc(m.file)}” lúc ${new Date(m.at).toLocaleString("vi-VN")}${S.meta.owner?" · phụ trách: "+esc(S.meta.owner):""}.`:"<strong>Chưa có dữ liệu:</strong> hãy nhập file Excel ở mục “Nhập dữ liệu” hoặc thêm khách hàng thủ công."}
const tr=n=>n==null?"–":n===0?"0":(n/1e6).toFixed(1).replace(".",",")+" tr";
function head(){const f=["Khách hàng","Khu vực","Thực tế 2025","Mục tiêu 2026","Thực tế 2026","Tiến độ"];
 $("#cust-head").innerHTML=`<tr>${f.map((x,i)=>`<th rowspan="2" class="fz fz${i+1}">${x}</th>`).join("")}${[1,2,3,4].map(q=>`<th rowspan="2">Q${q} 2026</th>`).join("")}${Array.from({length:12},(_,i)=>`<th colspan="2">THÁNG ${i+1}</th>`).join("")}</tr><tr>${Array.from({length:12},()=>"<th>2025</th><th>2026</th>").join("")}</tr>`}
function cust(){const sel=$("#region-filter"),cur=sel.value;sel.innerHTML='<option value="">Tất cả khu vực</option>'+regions().map(r=>`<option>${esc(r)}</option>`).join("");sel.value=regions().includes(cur)?cur:"";
 const q=key($("#customer-search").value),r=sel.value,ar=$("#show-arch").checked,a=S.cus.filter(c=>(ar||!c.archived)&&(!r||(c.region||"Khác")===r)&&key(c.name+" "+(c.region||"")+" "+(c.code||"")).includes(q));
 $("#customer-rows").innerHTML=a.map(c=>{const p=comp(c),s=stat(c);return`<tr data-id="${esc(c.id)}" style="cursor:pointer"><td class="fz fz1"><div class="cname" title="${esc(c.name)}">${esc(c.name)}</div><div class="cmeta"><span class="ccode">${c.code?"Mã · "+esc(c.code):"Chưa có mã"}</span><span class="tag ${s[1]}">${s[0]}</span></div></td><td class="fz fz2">${esc(c.region||"Khác")}</td><td class="num fz fz3">${fmtB(c.a25)}</td><td class="num fz fz4">${fmtB(c.t26)}</td><td class="num fz fz5">${fmtB(c.a26)}</td><td class="progress-cell fz fz6"><div class="mini-track"><div class="mini-fill" style="width:${Math.min(100,(p||0)*100)}%"></div></div><span class="tiny">${pct(p)}</span></td>`+[0,1,2,3].map(k=>`<td class="num">${tr(c.q?.[k]?.[0])}</td>`).join("")+Array.from({length:12},(_,i)=>`<td class="num">${tr(c.m?.[i]?.[0])}</td><td class="num">${tr(c.m?.[i]?.[1])}</td>`).join("")+"</tr>"}).join("");
 $("#customer-empty").classList.toggle("show",!a.length);$("#customer-count").textContent="Đang hiển thị "+a.length+"/"+S.cus.length+" khách hàng"}
function cal(){const mon=S.week,days=[...Array(7)].map((_,i)=>{const d=new Date(mon);d.setDate(d.getDate()+i);return d}),n=days.slice(5).some(d=>S.work.some(w=>w.date===iso(d)))?7:5,N=["THỨ HAI","THỨ BA","THỨ TƯ","THỨ NĂM","THỨ SÁU","THỨ BẢY","CHỦ NHẬT"],a=days[0],b=days[n-1];
 $("#week-label").textContent="Tuần "+(a.getMonth()===b.getMonth()?String(a.getDate()).padStart(2,"0"):String(a.getDate()).padStart(2,"0")+"/"+String(a.getMonth()+1).padStart(2,"0"))+"–"+String(b.getDate()).padStart(2,"0")+"/"+String(b.getMonth()+1).padStart(2,"0")+"/"+b.getFullYear();
 const g=$("#week-grid");g.style.gridTemplateColumns=`repeat(${n},minmax(0,1fr))`;
 g.innerHTML=days.slice(0,n).map((d,i)=>{const s=iso(d),w=S.work.filter(x=>x.date===s).sort((x,y)=>(x.time||"").localeCompare(y.time||""));return`<div class="day-card"${s===iso(new Date())?' style="border-color:var(--accent)"':""}><div class="day-head"><span class="day-name">${N[i]}</span><span class="day-date">${String(d.getDate()).padStart(2,"0")}</span></div>${w.map(x=>`<div class="task${x.st==="Hoàn thành"?" done":""}${x.st==="Hủy"?" cancel":""}" tabindex="0" role="button" data-work="${esc(x.id)}" style="cursor:pointer${late(x)?";border-left-color:var(--danger)":""}"><div class="task-title">${esc(x.title)}</div><div class="task-meta">${esc(x.time||"Cả ngày")} · ${esc(x.cus||x.type)}${x.st!=="Dự kiến"?" · "+x.st:""}${late(x)?" · Trễ hạn":""}</div></div>`).join("")}<button class="btn" data-add-day="${s}" style="width:100%;min-height:30px" aria-label="Thêm công việc ngày ${dmy(s)}">＋</button></div>`}).join("")}
function sett(){$("#pf-name").value=S.prefs?.name||"";const m=S.meta.lastImport;$("#set-data").textContent=S.cus.length+" khách hàng · "+S.work.length+" công việc · lưu cục bộ (IndexedDB)";$("#set-import").textContent=m?`${m.file} · ${new Date(m.at).toLocaleString("vi-VN")} · ${m.n} dòng (mới ${m.nw}, cập nhật ${m.up})`:"Chưa nhập"}
/* ===== Hộp thoại biểu mẫu dùng chung ===== */
function form(title,fields,v,save,extra,remove){const f=$("#dlg-form");
 f.innerHTML=`<h3 id="dlg-title" style="margin:0 0 8px">${esc(title)}</h3>`+fields.map(([k,l,t,o,req])=>{const x=v[k]??"",id="f_"+k;return`<label class="flabel" for="${id}">${l}</label>`+(t==="sel"?`<select id="${id}">${o.map(z=>`<option${z===x?" selected":""}>${z}</option>`).join("")}</select>`:t==="area"?`<textarea id="${id}" rows="2">${esc(x)}</textarea>`:`<input id="${id}" type="${t}"${o?` list="${o}"`:""}${req?" required":""}${t==="number"?' step="any"':""} value="${esc(x)}">`)}).join("")+(extra||"")+`<div class="dlg-actions">${remove?'<button type="button" class="btn" id="dlg-del" style="color:var(--danger)">Xóa</button>':""}<span style="flex:1"></span><button type="button" class="btn" id="dlg-x">Hủy</button><button class="btn primary" type="submit">Lưu</button></div>`;
 $("#dlg-x").onclick=()=>$("#dlg").close();if(remove)$("#dlg-del").onclick=async()=>{if(confirm("Xóa mục này? Không thể hoàn tác.")){try{await remove();$("#dlg").close()}catch(e){notify("Lỗi: "+vi(e.message))}}};
 f.onsubmit=async e=>{e.preventDefault();const o={};fields.forEach(([k,,t])=>{const el=$("#f_"+k);o[k]=t==="number"?(el.value===""?null:Number(el.value)):el.value.trim()});try{if(await save(o)!==false)$("#dlg").close()}catch(er){notify("Lỗi: "+vi(er.message))}};
 $("#dlg").style.width=(extra||"").includes("mgrid")?"min(780px,94vw)":"";$("#dlg").showModal();const first=f.querySelector("input,select");if(first)first.focus()}
const sels=["Dự kiến","Hoàn thành","Hủy"],types=["Thăm khách hàng","Họp","Gọi điện","Báo giá","Đào tạo","Khác"];
function editCus(c){const nw=!c,inp=(id,v,ph,al)=>`<input id="${id}" type="number" step="any" value="${v??""}" placeholder="${ph}" aria-label="${al}">`;
 const ex=`<datalist id="rl">${regions().map(r=>`<option value="${esc(r)}">`).join("")}</datalist><div class="small muted" style="margin-top:14px"><strong>Doanh số theo quý — thực tế 2026 (VND)</strong></div><div class="mgrid">${[0,1,2,3].map(k=>`<div class="mcell"><span>Q${k+1} 2026</span>${inp("q_"+k,c?.q?.[k]?.[0],"0","Quý "+(k+1)+" năm 2026")}</div>`).join("")}</div>
 <div class="small muted" style="margin-top:14px"><strong>Doanh số theo tháng — thực tế (VND)</strong></div><div class="mgrid">${Array.from({length:12},(_,i)=>`<div class="mcell"><span>Tháng ${i+1}</span><div>${inp(`m_${i}_0`,c?.m?.[i]?.[0],"2025",`Tháng ${i+1} năm 2025`)}${inp(`m_${i}_1`,c?.m?.[i]?.[1],"2026",`Tháng ${i+1} năm 2026`)}</div></div>`).join("")}</div>
 <div class="toolbar" style="margin:14px 0 0"><button type="button" class="btn" id="recalc">Tính lại quý và tổng từ các tháng</button>${nw?"":`<button type="button" class="btn" id="arch-btn">${c.archived?"Khôi phục khách hàng":"Lưu trữ khách hàng"}</button>`}</div>`;
 form(nw?"Thêm khách hàng":"Sửa khách hàng",[["name","Tên khách hàng","text","",1],["code","Mã khách hàng (nhập tay, tuỳ chọn)","text"],["region","Khu vực","text","rl"],["a25","Thực tế 2025 (VND)","number"],["t26","Mục tiêu 2026 (VND)","number"],["a26","Thực tế 2026 (VND)","number"],["note","Ghi chú","area"]],c||{region:""},async o=>{
  if(!o.name){notify("Hãy nhập tên khách hàng.");return false}const id=nw?key(o.name):c.id;
  if(nw&&S.cus.some(x=>x.id===id)){notify("Khách hàng này đã tồn tại.");return false}
  if(!nw&&key(o.name)!==c.id&&S.cus.some(x=>x.id===key(o.name))){notify("Tên trùng với khách hàng khác.");return false}
  const rd=i=>{const v=$("#"+i).value;return v===""?null:Number(v)},q=[0,1,2,3].map(k=>[rd("q_"+k),null]),m=Array.from({length:12},(_,i)=>[rd(`m_${i}_0`),rd(`m_${i}_1`)]);
  await put("c",[{...(c||{archived:false,src:"manual"}),...o,q,m,region:o.region||guess(o.name),id,updated:Date.now()}]);await load();render();notify(nw?"Đã thêm khách hàng":"Đã lưu thay đổi")},ex);
 $("#recalc").onclick=()=>{const v=i=>Number($("#"+i).value)||0,s=y=>Array.from({length:12},(_,i)=>v(`m_${i}_${y}`)).reduce((a,b)=>a+b,0);if(!s(0)&&!s(1)){notify("Chưa có số liệu tháng để tính.");return}
  $("#f_a25").value=s(0);$("#f_a26").value=s(1);[0,1,2,3].forEach(k=>$("#q_"+k).value=[0,1,2].reduce((a,j)=>a+v(`m_${3*k+j}_1`),0));notify("Đã tính lại từ số liệu 12 tháng. Bấm Lưu để ghi.")};
 const ab=$("#arch-btn");if(ab)ab.onclick=async()=>{c.archived=!c.archived;await put("c",[c]);await load();render();$("#dlg").close();notify(c.archived?"Đã lưu trữ khách hàng":"Đã khôi phục khách hàng")}}
function editWork(w,day){const nw=!w;
 form(nw?"Thêm công việc":"Sửa công việc",[["title","Nội dung","text","",1],["date","Ngày","date","",1],["time","Giờ","time"],["cus","Khách hàng","text","cl"],["type","Loại","sel",types],["st","Trạng thái","sel",sels],["note","Ghi chú","area"]],w||{date:day||iso(new Date()),type:types[0],st:sels[0]},async o=>{
  if(!o.title||!o.date){notify("Cần có nội dung và ngày.");return false}
  await put("w",[{...(w||{}),...o,id:w?.id||crypto.randomUUID(),updated:Date.now()}]);await load();render();notify("Đã lưu công việc")},
  `<datalist id="cl">${S.cus.map(c=>`<option value="${esc(c.name)}">`).join("")}</datalist>`,nw?null:async()=>{await del("w",w.id);await load();render();notify("Đã xóa công việc")})}
/* ===== Đọc xlsx (zip + XML, không cần thư viện) ===== */
async function unzip(buf){const v=new DataView(buf),u=new Uint8Array(buf);let e=u.length-22;while(e>=0&&v.getUint32(e,true)!==0x06054b50)e--;if(e<0)throw Error("Không phải file .xlsx hợp lệ");
 const n=v.getUint16(e+10,true);let p=v.getUint32(e+16,true);const out={};
 for(let i=0;i<n;i++){const m=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),lo=v.getUint32(p+42,true),name=new TextDecoder().decode(u.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;
  out[name]=async()=>{const ds=lo+30+v.getUint16(lo+26,true)+v.getUint16(lo+28,true),d=u.subarray(ds,ds+cs);return new TextDecoder().decode(m===0?d:await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer())}}
 return out}
const xml=t=>new DOMParser().parseFromString(t,"application/xml"),cix=r=>{let n=0;for(const ch of r.replace(/\d/g,""))n=n*26+ch.charCodeAt(0)-64;return n-1};
async function sheet(buf,want){const z=await unzip(buf);if(!z["xl/workbook.xml"])throw Error("Không phải workbook Excel (.xlsx).");const wb=xml(await z["xl/workbook.xml"]()),rel=xml(await z["xl/_rels/workbook.xml.rels"]()),sh=[...wb.getElementsByTagName("sheet")],s=sh.find(x=>key(x.getAttribute("name"))===key(want));
 if(!s)throw Error("Không tìm thấy sheet “"+want+"”. Các sheet có: "+sh.map(x=>x.getAttribute("name")).join(", "));
 const rid=s.getAttribute("r:id"),t=[...rel.getElementsByTagName("Relationship")].find(x=>x.getAttribute("Id")===rid).getAttribute("Target"),path=t.startsWith("/")?t.slice(1):"xl/"+t;let ss=[];
 if(z["xl/sharedStrings.xml"])ss=[...xml(await z["xl/sharedStrings.xml"]()).getElementsByTagName("si")].map(si=>[...si.getElementsByTagName("t")].map(x=>x.textContent).join(""));
 const rows=[];for(const c of xml(await z[path]()).getElementsByTagName("c")){const r=c.getAttribute("r"),ty=c.getAttribute("t"),ve=c.getElementsByTagName("v")[0];let val=null;
  if(ty==="inlineStr")val=c.textContent;else if(ve)val=ty==="s"?ss[+ve.textContent]:ty==="str"?ve.textContent:ty==="e"?null:ty==="b"?ve.textContent==="1":Number(ve.textContent);
  if(val!==null&&val!=="")(rows[+r.replace(/\D/g,"")-1]??=[])[cix(r)]=val}
 return{rows,name:s.getAttribute("name")}}
const num=v=>typeof v==="number"&&isFinite(v)?v:null;
function parse(rows){const h=rows.findIndex(r=>r&&String(r[0]).trim().toUpperCase()==="PTKD");if(h<0)throw Error("Không thấy dòng tiêu đề “PTKD” ở cột A.");const out=[],issues=[];
 for(let i=h+3;i<rows.length;i++){const r=rows[i];if(!r||r[0]==null)continue;const nm=String(r[0]).trim();if(/^T[ỔO]NG C[ỘO]NG/i.test(nm)||/^T[ÍI]NH KPI/i.test(nm))break;
  const c={id:key(nm),name:nm,a25:num(r[1]),t26:num(r[2]),a26:num(r[5]),q:[0,1,2,3].map(k=>[num(r[8+2*k]),null]),m:Array.from({length:12},(_,k)=>[num(r[16+2*k]),num(r[17+2*k])]),region:guess(nm),updated:Date.now()};
  if(out.some(x=>x.id===c.id))issues.push("Dòng "+(i+1)+" trùng tên trong file, đã bỏ qua: "+nm);else out.push(c)}
 if(!out.length)throw Error("Không đọc được khách hàng nào dưới dòng tiêu đề.");
 return{owner:rows[h+1]?.[0]||"",qt:[0,1,2,3].map(k=>num(rows[h+1]?.[9+2*k])),rows:out,issues,hdr:h+1}}
/* ===== Luồng nhập Excel ===== */
const STEPS=[["Chọn workbook","Chọn tệp Excel cục bộ."],["Kiểm tra cấu trúc","Đối chiếu header, loại hàng và kiểu dữ liệu."],["Xem trước","Hiển thị lỗi và các thay đổi dự kiến."],["Xác nhận nhập","Chỉ ghi sau khi người dùng xác nhận."]];
function steps(n){$("#steps").innerHTML=STEPS.map((s,i)=>`<div class="step${i+1===n?" on":""}${i+1<n?" ok":""}"><div class="step-no">${i+1<n?"✓":i+1}</div><div class="step-title">${s[0]}</div><div class="step-desc">${s[1]}</div></div>`).join("")}
const same=(o,c)=>["a25","t26","a26"].every(k=>o[k]===c[k])&&JSON.stringify(o.q)===JSON.stringify(c.q)&&JSON.stringify(o.m)===JSON.stringify(c.m);
async function pick(f){const b=$("#imp-body");steps(1);b.innerHTML="";$("#file-note").textContent=f?f.name+" ("+Math.round(f.size/1024)+" KB)":"Chưa chọn tệp.";if(!f)return;
 if(!/\.xlsx$/i.test(f.name)){b.innerHTML='<div class="notice">Chỉ hỗ trợ file <strong>.xlsx</strong>. Hãy mở file trong Excel và lưu lại ở định dạng .xlsx.</div>';return}
 try{const sh=await sheet(await f.arrayBuffer(),"DOANH SỐ KH 2026"),res=parse(sh.rows),ex=new Map(S.cus.map(c=>[c.id,c])),st=res.rows.map(c=>{const o=ex.get(c.id);return[c,!o?"Mới":same(o,c)?"Không đổi":"Cập nhật"]}),cnt=k=>st.filter(x=>x[1]===k).length;steps(3);$("#imp-tag").textContent="Chờ xác nhận";
  b.innerHTML=`<div class="notice"><strong>Cấu trúc hợp lệ:</strong> sheet “${esc(sh.name)}”, tiêu đề tại dòng ${res.hdr}, người phụ trách “${esc(res.owner)}”, ${res.rows.length} khách hàng. Mới <strong>${cnt("Mới")}</strong> · Cập nhật <strong>${cnt("Cập nhật")}</strong> · Không đổi <strong>${cnt("Không đổi")}</strong>.</div>${res.issues.map(i=>`<div class="notice" style="border-left-color:var(--danger);margin-top:8px">${esc(i)}</div>`).join("")}
  <div class="notice" style="margin-top:8px">Khách hàng đã có trong app nhưng vắng trong file được giữ nguyên. Khu vực, mã, ghi chú và trạng thái lưu trữ đã nhập tay được bảo toàn. Việc ghi dữ liệu là một giao dịch: lỗi thì không thay đổi gì.</div>
  <div class="table-wrap" style="margin-top:12px;max-height:340px"><table><thead><tr><th>Khách hàng</th><th>Khu vực</th><th>Thực tế 2025</th><th>Mục tiêu 2026</th><th>Thực tế 2026</th><th>Thay đổi</th></tr></thead><tbody>${st.map(([c,s])=>`<tr><td>${esc(c.name)}</td><td>${esc(c.region)}</td><td class="num">${fmt(c.a25)}</td><td class="num">${fmt(c.t26)}</td><td class="num">${fmt(c.a26)}</td><td><span class="tag ${s==="Mới"?"success":s==="Cập nhật"?"warning":""}">${s}</span></td></tr>`).join("")}</tbody></table></div>
  <div class="toolbar" style="margin-top:12px"><button class="btn primary" id="imp-go">Xác nhận nhập ${cnt("Mới")+cnt("Cập nhật")} dòng</button><button class="btn" id="imp-no">Hủy</button></div>`;
  $("#imp-no").onclick=()=>{$("#excel-file").value="";pick(null);$("#imp-tag").textContent="Sẵn sàng"};
  $("#imp-go").onclick=async e=>{e.target.disabled=true;try{const rec=res.rows.map(c=>{const o=ex.get(c.id);return o?{...c,region:o.region||c.region,code:o.code,note:o.note,archived:o.archived}:{...c,archived:false,src:"excel"}}),meta={id:"meta",owner:res.owner,qt:res.qt,lastImport:{file:f.name,at:Date.now(),n:res.rows.length,nw:cnt("Mới"),up:cnt("Cập nhật")}};
   await run(["c","m"],"readwrite",(c,m)=>{rec.forEach(r=>c.put(r));m.put(meta)});await load();steps(5);$("#imp-tag").textContent="Đã nhập";$("#excel-file").value="";
   b.innerHTML=`<div class="notice" style="border-left-color:var(--success)"><strong>Đã nhập xong.</strong> Mới ${meta.lastImport.nw}, cập nhật ${meta.lastImport.up}. <button class="btn" data-page="customers">Xem danh sách khách hàng</button></div>`;render();notify("Nhập Excel thành công")}catch(er){e.target.disabled=false;notify("Nhập thất bại, dữ liệu không bị thay đổi: "+vi(er.message))}}
 }catch(er){steps(2);$("#imp-tag").textContent="Lỗi";b.innerHTML=`<div class="notice" style="border-left-color:var(--danger)"><strong>Không đọc được file:</strong> ${esc(vi(er.message))}</div>`}}
/* ===== Sao lưu / CSV ===== */
function dl(name,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4e3)}
const stamp=()=>iso(new Date());
async function restore(f){try{const j=JSON.parse(await f.text());if(j.app!=="bgsm"||!Array.isArray(j.customers)||!Array.isArray(j.work))throw Error("Không phải tệp sao lưu của ứng dụng này.");
 if(!confirm("Khôi phục "+j.customers.length+" khách hàng và "+j.work.length+" công việc? Dữ liệu trùng sẽ bị ghi đè."))return;
 await run(["c","w","m"],"readwrite",(c,w,m)=>{j.customers.forEach(x=>c.put(x));j.work.forEach(x=>w.put(x));if(j.meta?.id)m.put(j.meta);if(j.prefs?.id)m.put(j.prefs)});await load();render();notify("Đã khôi phục dữ liệu")}catch(e){notify("Khôi phục thất bại: "+vi(e.message))}}
function csv(){const q=s=>'"'+String(s??"").replace(/"/g,'""')+'"',h=["Khách hàng","Khu vực","Mã","Thực tế 2025","Mục tiêu 2026","Thực tế 2026","Tiến độ","Ghi chú","Q1 2026","Q2 2026","Q3 2026","Q4 2026"].concat(Array.from({length:12},(_,i)=>["T"+(i+1)+" 2025","T"+(i+1)+" 2026"]).flat());
 dl("khach-hang-"+stamp()+".csv",new Blob(["\ufeff"+[h.map(q).join(",")].concat(S.cus.filter(c=>!c.archived).map(c=>[c.name,c.region,c.code,c.a25,c.t26,c.a26,comp(c)==null?"":comp(c).toFixed(4),c.note,...[0,1,2,3].map(k=>c.q?.[k]?.[0]),...Array.from({length:12},(_,i)=>[c.m?.[i]?.[0],c.m?.[i]?.[1]]).flat()].map(q).join(","))).join("\r\n")],{type:"text/csv;charset=utf-8"}));notify("Đã xuất CSV")}
/* ===== Sự kiện ===== */
document.addEventListener("click",e=>{const t=e.target.closest("button[data-page]");if(t)go(t.dataset.page);
 const r=e.target.closest("tr[data-id]"),ab=e.target.closest("[data-arch]");
 if(ab){const c=S.cus.find(x=>x.id===ab.dataset.arch);c.archived=!c.archived;put("c",[c]).then(load).then(()=>{render();notify(c.archived?"Đã lưu trữ":"Đã khôi phục")}).catch(er=>notify("Lỗi: "+vi(er.message)));return}
 if(r)editCus(S.cus.find(x=>x.id===r.dataset.id));
 const w=e.target.closest("[data-work]");if(w)editWork(S.work.find(x=>x.id===w.dataset.work));
 const d=e.target.closest("[data-add-day]");if(d)editWork(null,d.dataset.addDay)});
document.addEventListener("keydown",e=>{const w=e.target.closest&&e.target.closest("[data-work]");if(w&&(e.key==="Enter"||e.key===" ")){e.preventDefault();editWork(S.work.find(x=>x.id===w.dataset.work))}});
$("#theme-toggle").onclick=flip;$("#settings-theme").onclick=flip;
$("#customer-search").oninput=cust;$("#region-filter").onchange=cust;$("#show-arch").onchange=cust;$("#clear-filters").onclick=()=>{$("#customer-search").value="";$("#region-filter").value="";$("#show-arch").checked=false;cust()};
$("#add-customer").onclick=()=>editCus(null);$("#add-work").onclick=()=>editWork(null);$("#export-csv").onclick=csv;
$("#prev-week").onclick=()=>{S.week.setDate(S.week.getDate()-7);cal()};$("#next-week").onclick=()=>{S.week.setDate(S.week.getDate()+7);cal()};$("#this-week").onclick=()=>{S.week=monday(new Date());cal()};
$("#pick-file").onclick=()=>$("#excel-file").click();$("#focus-toggle").onclick=()=>setFocus(!document.body.classList.contains("focus"));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.body.classList.contains("focus")&&!$("#dlg").open)setFocus(false)});
$("#excel-file").onchange=e=>pick(e.target.files[0]);
$("#bk-export").onclick=()=>{dl("bgsm-sao-luu-"+stamp()+".json",new Blob([JSON.stringify({app:"bgsm",v:1,ver:VER,at:new Date().toISOString(),customers:S.cus,work:S.work,meta:S.meta,prefs:S.prefs})],{type:"application/json"}));notify("Đã tạo tệp sao lưu")};
$("#bk-restore").onclick=()=>$("#bk-file").click();$("#bk-file").onchange=e=>{if(e.target.files[0])restore(e.target.files[0]);e.target.value=""};
$("#wipe").onclick=async()=>{if(confirm("Xóa TOÀN BỘ khách hàng, công việc và thông tin nhập? Không thể hoàn tác.")&&confirm("Xác nhận lần cuối: xóa toàn bộ dữ liệu?")){await clr();await load();render();notify("Đã xóa toàn bộ dữ liệu")}};
/* ===== Cập nhật ứng dụng (bản cài Windows) ===== */
const updErr=m=>{m=String(m||"");return/latest\.yml|404|Not Found/i.test(m)?"Chưa có thông tin bản cập nhật trên nơi phát hành. Hãy thử lại sau hoặc tải bản mới từ trang phát hành.":/401|403|auth|token/i.test(m)?"Không truy cập được nơi đăng bản cập nhật (kho lưu trữ riêng tư cần quyền truy cập).":/ENOTFOUND|ECONN|ETIMEDOUT|INTERNET|net::|network/i.test(m)?"Không kết nối được Internet để kiểm tra cập nhật.":"Không kiểm tra được cập nhật lúc này. Vui lòng thử lại sau."};
const U=window.bgsm,um=t=>{$("#upd-msg").textContent=t};
if(U){um("Phiên bản "+VER+". Ứng dụng tự kiểm tra khi mở.");U.onUpdate(s=>{if(s.s==="checking")um("Đang kiểm tra bản cập nhật…");else if(s.s==="none")um("Bạn đang dùng phiên bản mới nhất ("+VER+").");else if(s.s==="available")um("Có bản "+s.v+", đang tải…");else if(s.s==="progress")um("Đang tải bản cập nhật… "+s.p+"%");else if(s.s==="ready"){um("Bản "+s.v+" đã tải xong. Dữ liệu của bạn được giữ nguyên.");$("#upd-install").hidden=false}else if(s.s==="error")um(updErr(s.m))});
 $("#upd-check").onclick=()=>U.check().then(r=>{if(r&&r.s==="dev")um("Chỉ kiểm tra được trong bản đã cài đặt.")});$("#upd-install").onclick=()=>U.install()}
else{um("Phiên bản "+VER+". Tự cập nhật chỉ có trong bản cài Windows.");$("#upd-check").disabled=true}
$("#pf-name").onchange=async e=>{S.prefs={...S.prefs,id:"prefs",name:e.target.value.trim()};await put("m",[S.prefs]);notify("Đã lưu tên hiển thị")};
$("#ov-region").onchange=ovw;$("#quote-next").onclick=()=>{qi=(qi+1)%QUOTES.length;ovw()};
/* ===== Khởi động ===== */
let th="light";try{th=localStorage.getItem("bgsm-theme")||"light"}catch(_){}theme(th,false);steps(1);head();
const hide=()=>{const s=$("#splash");s.style.opacity="0";setTimeout(()=>s.remove(),260)};
open().then(load).then(()=>{go("overview");setTimeout(hide,500)}).catch(e=>{hide();go("overview");notify("Không mở được kho dữ liệu: "+vi(e.message)+". Hãy dùng Edge/Chrome ở chế độ thường.")});
})();
