# Kiểm thử trình duyệt cho tích hợp AMIS CRM (v0.17.0), dùng MISA giả lập (không gọi mạng thật).
# Chạy: python3 tools/smoke_test_amis.py [thu-muc-anh]     (pip install playwright && playwright install chromium)
import sys,pathlib,json
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
shots=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else None
if shots: shots.mkdir(exist_ok=True,parents=True)
bad=[]
def ok(c,m):
    print(("PASS ","FAIL ")[not c]+m)
    if not c: bad.append(m)
INIT=r"""
(()=>{
 if(!sessionStorage.getItem('seeded')){ sessionStorage.setItem('seeded','1');
  // dữ liệu bản cũ (IndexedDB v2) để kiểm tra nâng cấp v3 giữ nguyên dữ liệu
  const r=indexedDB.open('bgsm',2);r.onupgradeneeded=()=>{const d=r.result;['c','w','m','s'].forEach(n=>d.createObjectStore(n,{keyPath:'id'}));
   const st=r.transaction.objectStore('c');
   st.put({id:'kia bac ninh',name:'Kia Bắc Ninh',region:'Bắc Ninh',a25:5e8,t26:2e9,a26:100,archived:false,q:[[100,null],[null,null],[null,null],[null,null]],m:Array.from({length:12},(_,i)=>[null,i===0?100:null])});
   st.put({id:'cong ty xyz',name:'Công ty XYZ',region:'Hà Nội',a25:null,t26:1e9,a26:null,archived:false,q:[[null,null],[null,null],[null,null],[null,null]],m:Array.from({length:12},()=>[null,null])});};r.onsuccess=()=>r.result.close();
 }
 window.__raw=[
  {oid:'O1',sale_order_no:'SO-1',aid:'A1',acode:'KH001',account_name:'KIA  bắc ninh.',own:'Nguyễn Năng Nghĩa',kg:false,odate:'2026-03-10',mdate:'2026-03-10 10:00:00',status:'Hoàn thành',amt:'500.000.000'},
  {oid:'O2',sale_order_no:'SO-2',aid:'A2',acode:'KH002',account_name:'Công ty ABC <img src=x onerror=window.__xss=1>',own:'Nguyễn Năng Nghĩa',kg:false,odate:'2026-04-02',mdate:'2026-04-02 09:00:00',status:'Hoàn thành',amt:300000000},
  {oid:'O3',sale_order_no:'SO-3',aid:'A2',acode:'KH002',account_name:'Công ty ABC <img src=x onerror=window.__xss=1>',own:'Nguyễn Năng Nghĩa',kg:false,odate:'2026-04-05',mdate:'2026-04-05 09:00:00',status:'Hoàn thành',amt:200000000},
  {oid:'O4',sale_order_no:'SO-4',aid:'A3',acode:'KH003',account_name:'Cty TNHH XYZ',own:'Nguyễn Năng Nghĩa',kg:false,odate:'2026-05-01',mdate:'2026-05-01 09:00:00',status:'Hoàn thành',amt:100000000},
  {oid:'O5',sale_order_no:'SO-5',aid:'A4',acode:'KH004',account_name:'Zed Corp',own:'Nguyễn Năng Nghĩa',kg:false,odate:'2026-05-02',mdate:'2026-05-02 09:00:00',status:'Hoàn thành',amt:70000000},
  {oid:'O6',sale_order_no:'SO-6',aid:'A1',acode:'KH001',account_name:'KIA  bắc ninh.',own:'Nguyễn Năng Nghĩa',kg:false,odate:'2026-03-12',mdate:'2026-03-12 10:00:00',status:'Nháp',amt:999000000},
  {oid:'O7',sale_order_no:'SO-7',aid:'A1',acode:'KH001',account_name:'KIA  bắc ninh.',own:'Nguyễn Năng Nghĩa',kg:false,odate:'2025-12-20',mdate:'2026-01-02 10:00:00',status:'Hoàn thành',amt:888000000},
  {oid:'O8',sale_order_no:'SO-8',aid:'A1',acode:'KH001',account_name:'KIA  bắc ninh.',own:'Trần Phú Tâm',kg:false,odate:'2026-06-02',mdate:'2026-06-02 10:00:00',status:'Hoàn thành',amt:111000000},
  {oid:'O9',sale_order_no:'SO-9',aid:'A1',acode:'KH001',account_name:'KIA  bắc ninh.',own:'Nguyễn Năng Nghĩa',kg:true,odate:'2026-06-01',mdate:'2026-06-01 10:00:00',status:'Hoàn thành',amt:222000000},
  {oid:'O10',sale_order_no:'SO-10',aid:'A7',acode:'KH007',account_name:'Khách của Dương Quang Linh',own:'Dương Quang Linh',kg:false,odate:'2026-06-03',mdate:'2026-06-03 10:00:00',status:'Hoàn thành',amt:333000000}];
 window.__calls=0;
 window.bgsm={check:async()=>({s:'dev'}),install:async()=>{},last:async()=>null,onUpdate:()=>{},amis:{
  status:async()=>({ok:true,encryption:true,complete:true,saved:{apiKey:true,clientId:true,clientSecret:true},hint:{apiKey:'••••1234',clientId:'••••5678'}}),
  saveSecrets:async()=>({ok:true,encryption:true,complete:true,saved:{apiKey:true,clientId:true,clientSecret:true},hint:{apiKey:'••••1234',clientId:'••••5678'}}),
  clearSecrets:async()=>({ok:true,encryption:true,complete:false,saved:{},hint:{}}),
  test:async()=>({ok:true}),
  probe:async()=>({ok:true,listPath:'data',count:3,total:7,fields:Object.keys(window.__raw[0]).map(k=>({path:k,type:'string',sample:String(window.__raw[0][k])}))}),
  fetchOrders:async(o)=>{window.__calls++;window.__lastArgs=o;if(window.__fail)return{ok:false,code:window.__fail,message:'Không kết nối được tới MISA. Hãy kiểm tra mạng.'};
   const orders=[],st={};let mx=null;for(const r of window.__raw){const n=AmisCore.normalizeOrder(r,o.map);if(n.ok){orders.push(n.order);st[n.order.status]=1;if(n.order.modified&&(mx==null||n.order.modified>mx))mx=n.order.modified}}
   const ow={},cg={};for(const o of orders){if(o.owner)ow[o.owner]=(ow[o.owner]||0)+1;if(o.consign)cg[o.consign]=(cg[o.consign]||0)+1}
   return{ok:true,orders,pages:1,raw:window.__raw.length,invalid:[],statuses:st,owners:ow,consigns:cg,maxModified:mx,stoppedEarly:false,hitMax:false}}}};
})();
"""
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={"width":1440,"height":900},accept_downloads=True);ctx.add_init_script(INIT);pg=ctx.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)));pg.on("dialog",lambda d:d.accept())
    pg.goto((root/"index.html").as_uri());pg.wait_for_selector("#splash",state="detached")
    shot=lambda n:shots and pg.screenshot(path=str(shots/(n+".png")))
    dball=lambda st:pg.evaluate("""async(st)=>{const db=await new Promise(r=>{const q=indexedDB.open('bgsm');q.onsuccess=()=>r(q.result)});const a=await new Promise(r=>{const t=db.transaction(st).objectStore(st).getAll();t.onsuccess=()=>r(t.result)});db.close();return a}""",st)
    go=lambda n:(pg.click(f'.nav button[data-page={n}]'),pg.wait_for_timeout(300))
    cust=lambda name:next((c for c in dball("c") if c["name"]==name),None)
    # --- Nâng cấp CSDL ---
    ver=pg.evaluate("""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('bgsm');q.onsuccess=()=>r(q.result)});const o={v:db.version,s:[...db.objectStoreNames]};db.close();return o}""")
    ok(ver["v"]==3 and all(s in ver["s"] for s in ["amisOrders","amisLinks","amisPending","amisLogs","amisState"]),"IndexedDB nâng lên v3, có 5 kho AMIS: "+str(ver))
    ok(cust("Kia Bắc Ninh") is not None and cust("Kia Bắc Ninh")["a26"]==100,"dữ liệu khách hàng bản cũ được giữ nguyên sau nâng cấp")
    # --- Trang AMIS, cấu hình ---
    ok(pg.is_visible('.nav button[data-page=amis]'),"menu AMIS CRM hiển thị")
    go("amis");ok("Chưa cấu hình xong" in pg.inner_text("#am-tag"),"trạng thái: chưa cấu hình khi chưa ánh xạ trường — "+pg.inner_text("#am-tag"))
    pg.click("[data-amtab=conn]");pg.wait_for_selector("#am_m_amount")
    ok(pg.input_value("#am_m_orderNo")=="sale_order_no" and pg.input_value("#am_m_accountName")=="account_name" and pg.input_value("#am_m_amount")=="","chỉ điền sẵn trường đã thấy trong tài liệu (sale_order_no, account_name); không đoán các trường còn lại")
    ok("Còn thiếu" in pg.inner_text("#am-cfgmsg"),"hiện danh sách điều kiện còn thiếu")
    pg.click("[data-amconn=test]");pg.wait_for_function("document.querySelector('#am-connmsg').textContent.includes('thành công')")
    pg.click("[data-amconn=probe]");pg.wait_for_selector("#am-body table code")
    ok(pg.locator("#am-body table code").count()>=8,"xem cấu trúc phản hồi: liệt kê trường mẫu")
    for k,v in dict(orderId="oid",accountId="aid",accountCode="acode",orderDate="odate",modified="mdate",status="status",amount="amt",owner="own",consign="kg").items(): pg.fill("#am_m_"+k,v)
    pg.dispatch_event("#am_m_amount","change");shot("amis-conn")
    pg.click("[data-amconn=cfg]");pg.wait_for_timeout(300)
    ok("xác nhận tên kinh doanh" in pg.inner_text("#am-cfgmsg"),"chưa xác nhận tên kinh doanh → báo còn thiếu")
    pg.click("#am-sync");pg.wait_for_timeout(500);ok(pg.evaluate("window.__calls")==0,"chưa xác nhận tên kinh doanh → chặn đồng bộ (không gọi AMIS, không lấy đơn của cả nhóm)")
    # --- Quét tên kinh doanh / giá trị Ký gửi ---
    pg.click("[data-amconn=scan]");pg.wait_for_selector("[data-amown]");pg.wait_for_timeout(300)
    ok(pg.locator("[data-amown]").count()==3,"quét thấy 3 kinh doanh trong dữ liệu đọc được")
    ok("3 kinh doanh" in pg.inner_text("#am-body"),"cảnh báo: khóa API đọc được đơn của nhiều kinh doanh")
    ok(sorted(pg.eval_on_selector_all("[data-amcg]","e=>e.map(x=>x.dataset.amcg)"))==["false","true"],"quét thấy các giá trị Ký gửi: true/false")
    shot("amis-owner")
    pg.check("[data-amown='Nguyễn Năng Nghĩa']");pg.check("[data-amcg='true']");pg.check("[data-amelig='Hoàn thành']")
    ok("đủ để đồng bộ" in pg.inner_text("#am-cfgmsg"),"tích tên + Ký gửi → cấu hình đủ để đồng bộ")
    pg.click("[data-amconn=cfg]");pg.wait_for_function("window.__calls>=2");pg.wait_for_timeout(900)
    ok(pg.evaluate("window.__lastArgs.map.owner")=="own","đọc đơn theo trường kinh doanh đã ánh xạ")
    ok(len(dball("amisOrders"))==7,"chỉ lưu đơn của Nghĩa (7 đơn, gồm 1 đơn Ký gửi); đơn của Tâm, Linh không lưu — có %d"%len(dball("amisOrders")))
    ok(not any(o["owner"]!="Nguyễn Năng Nghĩa" for o in dball("amisOrders")),"không có đơn của kinh doanh khác trong sổ đơn")
    k=cust("Kia Bắc Ninh");ok(k["a26"]==500000100 and k["m"][2][1]==500000000 and k["q"][0][0]==500000100,"khớp tên chính xác (khác hoa/thường/dấu câu) → cộng đúng 500.000.000 vào tháng 3: a26=%s"%k["a26"])
    ok(k["a25"]==5e8 and k["m"][11][0] is None,"đơn năm 2025 (trước ngày bắt đầu) và đơn Nháp không làm đổi doanh số")
    ok(cust("Công ty ABC") is None and cust("Zed Corp") is None,"khách chưa có trong BG không tự tạo")
    pg.click("[data-amtab=pend]");pg.wait_for_selector(".amcard")
    ok(pg.locator("#am-body .amcard").count()==3,"3 khách chờ xác nhận (ABC, XYZ-gần giống, Zed)")
    ok(pg.evaluate("window.__xss")is None,"tên khách từ AMIS được escape (không chạy mã)")
    txt=pg.inner_text("#am-body");ok("2 đơn hợp lệ" in txt and "500.000.000" in txt,"hiện số đơn và tổng trước thuế đang chờ")
    ok("Công ty XYZ" in txt,"gợi ý tên gần giống (Cty TNHH XYZ ~ Công ty XYZ)")
    ok(pg.is_visible("#am-badge") and pg.inner_text("#am-badge")=="3","huy hiệu 3 ở menu")
    shot("amis-pending")
    # --- Đồng ý thêm (ABC) ---
    pg.click(".amcard:has-text('Công ty ABC') [data-amact=approve]");pg.wait_for_selector("#cfm-yes");pg.click("#cfm-yes");pg.wait_for_timeout(500)
    n=next(c for c in dball("c") if c["name"].startswith("Công ty ABC"))
    ok(n["a26"]==500000000 and n["code"]=="KH002" and n.get("src")=="amis","Đồng ý thêm: tạo khách (tên+mã AMIS) và cộng toàn bộ 2 đơn = 500.000.000")
    ok(n["region"] if "region" in n else True,"") if False else None
    # --- Ghép (XYZ) ---
    pg.click(".amcard:has-text('Cty TNHH XYZ') [data-amact=link]");pg.wait_for_selector("#am_lk");ok(pg.input_value("#am_lk")=="Công ty XYZ","ô ghép gợi ý sẵn khách giống nhất")
    pg.click("#dlg-form button.primary");pg.wait_for_timeout(500);ok(cust("Công ty XYZ")["a26"]==100000000,"Ghép: cộng 100.000.000 vào khách có sẵn")
    # --- Bỏ qua / khôi phục (Zed) ---
    pg.click(".amcard:has-text('Zed Corp') [data-amact=ignore]");pg.wait_for_selector("#cfm-yes");pg.click("#cfm-yes");pg.wait_for_timeout(400)
    ok(pg.locator("#am-body details summary:has-text('Đã bỏ qua (1)')").count()==1 and cust("Zed Corp") is None,"Bỏ qua: không tạo khách, nằm ở mục Đã bỏ qua")
    pg.click("#am-body details summary");pg.click("[data-amact=restore]");pg.wait_for_timeout(400);ok(pg.locator("#am-body .amcard").count()==1,"Khôi phục: trở lại danh sách chờ")
    # --- Gửi lại / sửa đơn: không cộng trùng, sửa thì đảo đúng ---
    pg.click("#am-sync");pg.wait_for_timeout(700);ok(cust("Kia Bắc Ninh")["a26"]==500000100,"đồng bộ lại cùng dữ liệu: KHÔNG cộng trùng")
    pg.evaluate("window.__raw[0].amt=700000000;window.__raw[0].mdate='2026-03-11 08:00:00'");pg.click("#am-sync");pg.wait_for_timeout(700)
    ok(cust("Kia Bắc Ninh")["a26"]==700000100,"đơn được sửa tiền 500→700 triệu: doanh số cập nhật 700.000.100 (không cộng dồn)")
    pg.evaluate("window.__raw[0].status='Hủy';window.__raw[0].mdate='2026-03-12 08:00:00'");pg.click("#am-sync");pg.wait_for_timeout(700)
    ok(cust("Kia Bắc Ninh")["a26"]==100 and cust("Kia Bắc Ninh")["m"][2][1]==0,"đơn chuyển sang Hủy: phần đã cộng được đảo lại")
    pg.evaluate("window.__raw[0].status='Hoàn thành';window.__raw[0].mdate='2026-03-13 08:00:00'");pg.click("#am-sync");pg.wait_for_timeout(700)
    ok(pg.evaluate("window.__lastArgs.stopBefore")is not None,"lượt sau dùng mốc đồng bộ (đồng bộ gia tăng)")
    # --- Ký gửi: kinh doanh bỏ/đặt cờ trên AMIS ---
    sync=lambda:(pg.click("#am-sync"),pg.wait_for_timeout(700))
    pg.evaluate("const r=window.__raw.find(r=>r.oid=='O9');r.kg=false;r.mdate='2026-06-10 10:00:00'");sync()
    ok(cust("Kia Bắc Ninh")["a26"]==922000100,"kinh doanh BỎ Ký gửi trên AMIS → lần đồng bộ sau tự cộng 222 triệu (a26=%s)"%cust("Kia Bắc Ninh")["a26"])
    pg.evaluate("const r=window.__raw.find(r=>r.oid=='O9');r.kg=true;r.mdate='2026-06-11 10:00:00'");sync()
    ok(cust("Kia Bắc Ninh")["a26"]==700000100,"kinh doanh ĐẶT lại Ký gửi → đảo đúng 222 triệu")
    # --- Đơn đổi người phụ trách ---
    pg.evaluate("const r=window.__raw.find(r=>r.oid=='O1');r.own='Dương Quang Linh';r.mdate='2026-06-12 10:00:00'");sync()
    ok(cust("Kia Bắc Ninh")["a26"]==100,"đơn bị chuyển cho kinh doanh khác → gỡ khỏi doanh số của bạn (a26=%s)"%cust("Kia Bắc Ninh")["a26"])
    pg.evaluate("const r=window.__raw.find(r=>r.oid=='O1');r.own='Nguyễn Năng Nghĩa';r.mdate='2026-06-13 10:00:00'");sync()
    ok(cust("Kia Bắc Ninh")["a26"]==700000100,"đơn trở lại đúng kinh doanh → cộng lại")
    # --- Tab Đơn hàng, Nhật ký ---
    pg.click("[data-amtab=ord]");pg.wait_for_selector("#am-orows tr");ok(pg.locator("#am-orows tr").count()==7,"sổ đơn: 7 đơn (đơn 2025 trước ngày bắt đầu không vào sổ)");
    ok("Ký gửi (chưa ghi nhận)" in pg.inner_text("#am-orows") and "Nguyễn Năng Nghĩa" in pg.inner_text("#am-orows"),"tab Đơn hàng: có nhãn Ký gửi (chưa ghi nhận) và cột Kinh doanh");pg.fill("#am-q","SO-4");pg.wait_for_timeout(200);ok(pg.locator("#am-orows tr").count()==1,"tìm đơn theo số đơn");shot("amis-orders")
    pg.click("[data-amtab=log]");pg.wait_for_selector("#am-body tbody tr");lg=pg.inner_text("#am-body");ok("đồng bộ" in lg and "KEY" not in lg,"nhật ký có lượt đồng bộ, không lộ khóa")
    # --- Lỗi mạng → báo, không mất dữ liệu ---
    pg.evaluate("window.__fail='OFFLINE'");pg.click("#am-sync");pg.wait_for_timeout(600);ok("Chờ kết nối mạng" in pg.inner_text("#am-tag"),"mất mạng: trạng thái 'Chờ kết nối mạng' — "+pg.inner_text("#am-tag"));ok(cust("Kia Bắc Ninh")["a26"]==700000100,"mất mạng không làm đổi dữ liệu")
    pg.evaluate("window.__fail=null");pg.click("#am-sync");pg.wait_for_timeout(600)
    # --- Nhập lại Excel sau khi đã có doanh số AMIS: AMIS được tính lại trên nền Excel, không mất, không nhân đôi ---
    import openpyxl,tempfile,os
    wb=openpyxl.Workbook();ws=wb.active;ws.title="DOANH SỐ KH 2026"
    ws.append(["Tiêu đề"]);ws.append([]);ws.append([]);ws.append(["PTKD"]);ws.append(["Chủ sở hữu"]);ws.append(["h"])
    row=["Kia Bắc Ninh",5e8,2e9,None,None,100]+[None]*10+[None]*24
    for k in range(12): row[16+2*k]=None;row[17+2*k]=100 if k==0 else None
    ws.append(row);ws.append(["TỔNG CỘNG"])
    xl=os.path.join(tempfile.mkdtemp(),"t.xlsx");wb.save(xl)
    go("import");pg.set_input_files("#excel-file",xl);pg.wait_for_selector("#imp-go");pg.click("#imp-go");pg.wait_for_selector("#imp-body .notice:has-text('Đã nhập xong')");pg.wait_for_timeout(400)
    k=cust("Kia Bắc Ninh");ok(k["a26"]==700000100 and k["m"][2][1]==700000000 and k["m"][0][1]==100,"nhập lại Excel: doanh số AMIS được cộng lại trên số Excel (a26=%s), không mất, không nhân đôi"%k["a26"])
    # --- Sao lưu / khôi phục / xóa ---
    go("settings");
    with pg.expect_download() as d: pg.click("#bk-export")
    path=d.value.path();j=json.load(open(path,encoding="utf-8"))
    ok(j["v"]==3 and len(j["amis"]["orders"])==7 and len(j["amis"]["links"])>=2,"tệp sao lưu có sổ đơn và liên kết AMIS")
    ok("KEY" not in json.dumps(j) and "secret" not in json.dumps(j).lower(),"tệp sao lưu không chứa khóa bí mật")
    pg.once("dialog",lambda d:d.accept());pg.click("#wipe");pg.wait_for_selector("#cfm-yes");pg.click("#cfm-yes");pg.wait_for_selector("#cfm-yes");pg.click("#cfm-yes");pg.wait_for_timeout(500)
    ok(len(dball("amisOrders"))==0 and len(dball("c"))==0,"xóa toàn bộ cũng xóa sổ đơn AMIS")
    pg.set_input_files("#bk-file",path);pg.wait_for_selector("#cfm-yes");pg.click("#cfm-yes");pg.wait_for_timeout(700)
    ok(len(dball("amisOrders"))==7 and cust("Kia Bắc Ninh")["a26"]==700000100 and next(c for c in dball("c") if c["name"].startswith("Công ty ABC"))["a26"]==500000000,"khôi phục sao lưu: sổ đơn và doanh số trở lại đúng (không nhân đôi)")
    # --- Cài đặt thông báo ---
    ok(pg.is_visible("#nc-amis"),"Cài đặt có tuỳ chọn thông báo AMIS")
    ok(not errs,"không có lỗi JavaScript: "+"; ".join(errs[:3]))
    b.close()
print("\nKẾT QUẢ:", "TẤT CẢ ĐẠT" if not bad else f"{len(bad)} mục lỗi")
sys.exit(1 if bad else 0)
