# Kiểm thử ô tích chọn khách hàng + dòng Tổng cộng theo khách được chọn (v0.17.1).
# Chạy: python3 tools/smoke_test_select.py [thu-muc-anh]
import sys,pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
shots=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else None
if shots: shots.mkdir(exist_ok=True,parents=True)
bad=[]
def ok(c,m):
    print(("PASS ","FAIL ")[not c]+m)
    if not c: bad.append(m)
INIT=r"""
(()=>{ if(sessionStorage.getItem('seeded'))return; sessionStorage.setItem('seeded','1');
 const r=indexedDB.open('bgsm',3);r.onupgradeneeded=()=>{const d=r.result;['c','w','m','s','amisOrders','amisLinks','amisPending','amisLogs','amisState'].forEach(n=>d.createObjectStore(n,{keyPath:'id'}));
  const st=r.transaction.objectStore('c');
  const mk=(id,name,reg,a25,t26,a26)=>({id,name,region:reg,code:id.slice(-3),a25,t26,a26,archived:false,q:[[a26/4,null],[a26/4,null],[a26/4,null],[a26/4,null]],m:Array.from({length:12},(_,i)=>[null,i<9?Math.round(a26/9):null])});
  st.put(mk('thaco pham van dong','Thaco Phạm Văn Đồng (CÔNG TY TNHH THACO AUTO HÀ NỘI)','Hà Nội',3.6e9,4.3e9,3.5e9));
  st.put(mk('kia bac ninh','Kia Bắc Ninh (CÔNG TY TNHH DƯƠNG TUẤN)','Bắc Ninh',3.1e9,3.2e9,2.5e9));
  st.put(mk('toyota lang son','Toyota Lạng Sơn (CÔNG TY CỔ PHẦN TOYOTA LẠNG SƠN)','Lạng Sơn',1e9,1e9,0.4e9));
  for(let i=0;i<30;i++)st.put(mk('kh'+(100+i),'Khách mẫu '+(i+1),i%2?'Hà Nội':'Bắc Ninh',1e8,2e8,1e8));
 };r.onsuccess=()=>r.result.close();})();
"""
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={"width":1440,"height":900});ctx.add_init_script(INIT);pg=ctx.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto((root/"index.html").as_uri());pg.wait_for_selector("#splash",state="detached")
    pg.click('.nav button[data-page=customers]');pg.wait_for_selector("#customer-rows tr")
    txt=lambda s:pg.inner_text(s).strip()
    row=lambda n:pg.locator(f"#customer-rows tr:has-text('{n}')")
    ok(pg.locator("#customer-rows tr").count()==33,"33 khách hàng hiển thị")
    ok(pg.locator("#customer-rows .selbox").count()==33,"mỗi khách hàng có một ô tích")
    ok(pg.is_visible("#sel-all"),"có ô tích chọn tất cả ở tiêu đề cột Khách hàng")
    f0=txt("#customer-foot td.fz1");ok("33 khách hàng đang hiển thị" in f0 and "Tổng cộng" in f0 and "đã chọn" not in f0,"chưa tích: Tổng cộng theo cả danh sách đang hiển thị — "+f0.replace("\n"," | "))
    all26=txt("#customer-foot td.fz5")
    # --- Tích Kia Bắc Ninh + Thaco ---
    row("Kia Bắc Ninh").locator(".selbox").check();row("Thaco Phạm Văn Đồng").locator(".selbox").check()
    ok(pg.is_hidden("[data-view=customer-edit]") or not pg.is_visible("[data-view=customer-edit]"),"bấm ô tích KHÔNG mở hồ sơ khách hàng")
    f1=txt("#customer-foot td.fz1");ok("Tổng cộng (đã chọn)" in f1 and "2 khách hàng được chọn" in f1,"Tổng cộng chuyển sang 'đã chọn': "+f1.replace("\n"," | "))
    ok(txt("#customer-foot td.fz5")=="6,0 tỷ","Thực tế 2026 = chỉ Kia (2,5 tỷ) + Thaco (3,5 tỷ) = 6,0 tỷ (trước đó cả bảng: %s) — thấy %s"%(all26,txt("#customer-foot td.fz5")))
    ok(txt("#customer-foot td.fz3")=="6,7 tỷ" and txt("#customer-foot td.fz4")=="7,5 tỷ","Thực tế 2025 = 6,7 tỷ; Mục tiêu 2026 = 7,5 tỷ (chỉ 2 khách)")
    ok(txt("#customer-foot td.fz6")==" 80,0%".strip() or "80" in txt("#customer-foot td.fz6"),"Tiến độ tính theo 2 khách: "+txt("#customer-foot td.fz6"))
    ok("Đã chọn 2" in txt("#customer-count"),"đếm: "+txt("#customer-count"))
    ok(row("Kia Bắc Ninh").evaluate("e=>e.classList.contains('picked')"),"dòng được chọn được tô nổi bật")
    ok(pg.evaluate("document.querySelector('#sel-all').indeterminate")==True,"ô chọn tất cả ở trạng thái 'một phần'")
    if shots: pg.screenshot(path=str(shots/"select-2.png"))
    # --- Cột cố định vẫn thẳng hàng khi cuộn ngang ---
    pg.evaluate("document.querySelector('.wide').scrollLeft=700");pg.wait_for_timeout(200)
    L=pg.evaluate("""()=>{const w=document.querySelector('.wide').getBoundingClientRect().left,r=s=>document.querySelector(s).getBoundingClientRect().left-w;
      return {h1:r('#cust-head th.fz1'),h2:r('#cust-head th.fz2'),b1:r('#customer-rows td.fz1'),b2:r('#customer-rows td.fz2'),b6:r('#customer-rows td.fz6'),f2:r('#customer-foot td.fz2'),f6:r('#customer-foot td.fz6')}}""")
    ok(abs(L['b1'])<2 and abs(L['h1'])<2 and abs(L['b2']-252)<2 and abs(L['h2']-252)<2 and abs(L['f2']-252)<2 and abs(L['b6']-574)<2 and abs(L['f6']-574)<2,"6 cột đầu vẫn cố định và thẳng hàng khi cuộn ngang: "+str({k:round(v) for k,v in L.items()}))
    pg.evaluate("document.querySelector('.wide').scrollLeft=0")
    # --- Bấm vào tên khách vẫn mở hồ sơ ---
    row("Toyota Lạng Sơn").locator(".cname").click();pg.wait_for_timeout(300)
    ok(pg.is_visible("[data-view=customer-edit]"),"bấm vào tên khách vẫn mở hồ sơ như cũ")
    pg.click('#crumbs [data-crumb=customers]');pg.wait_for_selector("#customer-rows tr")
    ok(row("Kia Bắc Ninh").locator(".selbox").is_checked() and "2 khách hàng được chọn" in txt("#customer-foot td.fz1"),"quay lại bảng: lựa chọn được giữ nguyên")
    # --- Bộ lọc: khách được chọn bị ẩn vẫn tính, có ghi chú ---
    pg.fill("#customer-search","Thaco");pg.wait_for_timeout(300)
    f2=txt("#customer-foot td.fz1");ok("2 khách hàng được chọn" in f2 and "1 đang bị lọc ẩn" in f2,"lọc 'Thaco': ghi chú khách được chọn đang bị ẩn — "+f2.replace("\n"," | "))
    ok(txt("#customer-foot td.fz5")=="6,0 tỷ","tổng vẫn chỉ gồm 2 khách đã chọn")
    # --- Bỏ chọn ---
    pg.click("#sel-clear");pg.wait_for_timeout(200)
    f3=txt("#customer-foot td.fz1");ok("đang hiển thị" in f3 and "Tổng cộng (đã chọn)" not in f3,"Bỏ chọn → trở lại tổng theo danh sách hiển thị — "+f3.replace("\n"," | "))
    ok(pg.locator("#customer-rows .selbox:checked").count()==0,"bỏ chọn xóa mọi ô tích")
    # --- Chọn tất cả theo bộ lọc ---
    pg.fill("#customer-search","Khách mẫu");pg.wait_for_timeout(300);n=pg.locator("#customer-rows tr").count()
    pg.check("#sel-all");pg.wait_for_timeout(200)
    ok(pg.locator("#customer-rows .selbox:checked").count()==n==30 and pg.evaluate("document.querySelector('#sel-all').checked")==True,"chọn tất cả: chọn đúng 30 khách đang hiển thị")
    ok(txt("#customer-foot td.fz5")=="3,0 tỷ","tổng 30 khách mẫu = 3,0 tỷ — "+txt("#customer-foot td.fz5"))
    pg.uncheck("#sel-all");pg.wait_for_timeout(200)
    ok(pg.locator("#customer-rows .selbox:checked").count()==0,"bỏ tích 'chọn tất cả' bỏ chọn các khách đang hiển thị")
    # --- Sắp xếp giữ lựa chọn; bàn phím ---
    pg.fill("#customer-search","");pg.wait_for_timeout(300)
    row("Toyota Lạng Sơn").locator(".selbox").focus();pg.keyboard.press("Space");pg.wait_for_timeout(150)
    ok(row("Toyota Lạng Sơn").locator(".selbox").is_checked() and pg.is_hidden("[data-view=customer-edit]"),"phím cách tích được, Enter/Space trên ô tích không mở hồ sơ")
    pg.click("#cust-head [data-sort=a26]");pg.wait_for_timeout(250)
    ok(row("Toyota Lạng Sơn").locator(".selbox").is_checked(),"đổi cách sắp xếp vẫn giữ lựa chọn")
    if shots: pg.screenshot(path=str(shots/"select-1.png"))
    ok(not errs,"không có lỗi JavaScript: "+"; ".join(errs[:3]))
    b.close()
print("\nKẾT QUẢ:","TẤT CẢ ĐẠT" if not bad else f"{len(bad)} mục lỗi");sys.exit(1 if bad else 0)
