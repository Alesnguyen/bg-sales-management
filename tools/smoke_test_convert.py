# Kiểm thử tự phân tích & chuyển đổi file Excel không theo mẫu gốc (v0.18.0).
# Chạy: python3 tools/smoke_test_convert.py [file.xlsx] [thu-muc-anh]
#   Không truyền file: tự sinh một file mẫu có cấu trúc giống file “Linh_2026” (2 sheet, ô gộp khu vực, dòng trùng tên, cột quý bỏ trống…).
#   Đáp án đúng được tính độc lập bằng Python (openpyxl) từ chính file, rồi đối chiếu với kết quả trong ứng dụng.
import sys,pathlib,tempfile,os,re,unicodedata,subprocess,shutil
import openpyxl
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
args=[a for a in sys.argv[1:]]
src=next((a for a in args if a.lower().endswith(".xlsx")),None)
shots=pathlib.Path(next((a for a in args if not a.lower().endswith(".xlsx")),"")) if any(not a.lower().endswith(".xlsx") for a in args) else None
if shots: shots.mkdir(exist_ok=True,parents=True)
tmp=pathlib.Path(tempfile.mkdtemp())
bad=[]
def ok(c,m):
    print(("PASS ","FAIL ")[not c]+m)
    if not c: bad.append(m)
def key(s):
    s=unicodedata.normalize("NFD",str(s or ""));s="".join(c for c in s if unicodedata.category(c)!="Mn").replace("đ","d").replace("Đ","D")
    return re.sub(r"\s+"," ",s.lower()).strip()

def make_sample(path):
    wb=openpyxl.Workbook();w=wb.active;w.title="Sheet1"
    w["B1"]="Target 2026";w.merge_cells("B1:D1");w["K1"]=2.8e9;w["O1"]=3.5e9;w["S1"]=3.5e9;w["W1"]=4.2e9
    mon=["Tháng 1","Tháng 2","Tháng 3","Quý 1","Tháng 4","Tháng 5","Tháng 6","Quý 2","Tháng 7","Tháng 8","Tháng 9","Quý 3","Tháng 10","Tháng 11","Tháng 12","Quý 4","Tổng"]
    for i,t in enumerate(mon): w.cell(2,8+i,t)
    w["B2"]="TỔNG"
    for c,t in zip("ABCDEFG",["STT","Tên khách hàng","TB 2025","Ds thực 2025","Target 2026","DS THỰC 2026","% ĐẠT"]): w[c+"3"]=t
    data=[("Honda Ô tô A",1.2e9,1.4e9,[40e6,42e6,100e6,110e6,14e6,166e6,172e6,124e6,None,None,None,None]),
          ("Toyota B",None,2.0e9,[250e6,130e6,110e6,133e6,122e6,144e6,153e6,100e6,None,None,None,None]),
          ("Huyndai C",None,1.8e9,[150e6,160e6,60e6,100e6,180e6,180e6,220e6,390e6,None,None,None,None]),
          ("FORD D ",929e6,1.0e9,[40e6,77e6,105e6,39e6,2e6,138e6,71e6,93e6,None,None,None,None]),
          ("Mitsu E",114e6,240e6,[17e6]+[None]*11),
          ("Chỉ có doanh số F",None,None,[None]*6+[5e6]+[None]*5),
          ("Huyndai C",0,0,[None]*7+[4.3e6]+[None]*4),   # trùng tên
          ("mitsu e",0,0,[None]*7+[1.8e6]+[None]*4)]      # trùng tên khác hoa thường
    r=4
    for i,(n,a25,t26,ms) in enumerate(data):
        w.cell(r,1,i+1);w.cell(r,2,n);w.cell(r,4,a25);w.cell(r,5,t26)
        cols=[8,9,10,12,13,14,16,17,18,20,21,22]
        for c,v in zip(cols,ms): w.cell(r,c,v)
        q=[sum(x or 0 for x in ms[0:3]),sum(x or 0 for x in ms[3:6])]
        w.cell(r,11,q[0]);w.cell(r,15,q[1])   # Quý 3,4 để trống như file thật
        w.cell(r,6,sum(x or 0 for x in ms)); r+=1
    tot=lambda col:sum((w.cell(i,col).value or 0) for i in range(4,r))
    w["D2"]=tot(4);w["E2"]=tot(5);w["F2"]=tot(6)
    s2=wb.create_sheet("Sheet2");s2["A1"]="DANH SÁCH KHÁCH HÀNG THEO KHU";s2.merge_cells("A1:G1")
    for c,t in zip("BCDEFGH",["Tên khách hàng","DS 2024","TB 2024","TB 2025","Ds thực 2025","Target 2026","TB 2026"]): s2[c+"3"]=t
    s2["B4"]="Honda Ô tô A";s2["F4"]=1.2e9;s2["G4"]=1.5e9;s2["A4"]="Thái Nguyên";s2["B5"]="Mitsu E";s2["F5"]=114e6;s2["G5"]=300e6;s2.merge_cells("A4:A5")
    s2["A7"]="Miền Trung";s2["B7"]="Toyota B";s2["F7"]=1.9e9;s2["G7"]=2.1e9;s2["B8"]="Huyndai C";s2["F8"]=337e6;s2["G8"]=720e6;s2.merge_cells("A7:A8")
    s2["A9"]="Nam Định";s2["B9"]="FORD D";s2["F9"]=700e6;s2["G9"]=840e6
    s2["A10"]="Huyndai Miền Nam";s2["B10"]="Huyndai Tây Đô";s2["B11"]="Huyndai ĐSG";s2.merge_cells("A10:A11")
    wb.save(path)
if not src:
    src=str(tmp/"Linh_2026.xlsx");make_sample(src)
fname=os.path.basename(src)

# ---- đáp án độc lập từ file ----
wv=openpyxl.load_workbook(src,data_only=True);ws=wv.worksheets[0]
hdr=next(r for r in range(1,30) if str(ws.cell(r,2).value or "").lower().startswith("tên khách"))
exp={};order=[]
for r in range(hdr+1,ws.max_row+1):
    n=ws.cell(r,2).value
    if not n or not str(n).strip(): continue
    k=key(n);F=ws.cell(r,6).value or 0
    if k not in exp: exp[k]={"name":str(n).strip(),"a26":0};order.append(k)
    exp[k]["a26"]+=F
N=len(exp);tot26=sum(v["a26"] for v in exp.values())
s2=wv.worksheets[1];reg={}
merged={}
for m in s2.merged_cells.ranges:
    if m.min_col==1: merged[(m.min_row,m.max_row)]=s2.cell(m.min_row,1).value
for r in range(1,s2.max_row+1):
    n=s2.cell(r,2).value
    if not n: continue
    v=s2.cell(r,1).value
    if v is None:
        for (a,b),val in merged.items():
            if a<=r<=b: v=val
    if v: reg[key(n)]=str(v).strip()
owner_exp=re.split(r"[_\-()]",re.sub(r"20\d\d","",os.path.splitext(fname)[0]))[0].strip()

def start(ctx_args=None):
    b=p.chromium.launch();ctx=b.new_context(viewport={"width":1440,"height":900},accept_downloads=True);pg=ctx.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)));pg.goto((root/"index.html").as_uri());pg.wait_for_selector("#splash",state="detached")
    pg.click('.nav button[data-page=import]');return b,pg,errs
dball=lambda pg,st:pg.evaluate("""async(st)=>{const db=await new Promise(r=>{const q=indexedDB.open('bgsm');q.onsuccess=()=>r(q.result)});const a=await new Promise(r=>{const t=db.transaction(st).objectStore(st).getAll();t.onsuccess=()=>r(t.result)});db.close();return a}""",st)

with sync_playwright() as p:
    b,pg,errs=start()
    pg.set_input_files("#excel-file",src);pg.wait_for_selector("#imp-prev .table-wrap",timeout=15000)
    txt=lambda s:pg.inner_text(s)
    ok("không theo mẫu gốc" in txt("#imp-conv"),"file lạ: BG báo đã tự phân tích và chuyển đổi")
    prev=txt("#imp-prev")
    ok(f"{N} khách hàng" in prev and re.search(rf"Mới\s*{N}\b",prev) is not None,f"đọc đúng {N} khách (sau khi gộp dòng trùng tên)")
    ok(pg.locator("#imp-prev tbody tr").count()==N,"bảng xem trước có đủ %d dòng"%N)
    ok("khớp" in prev and "Lệch tổng" not in prev,"đối chiếu tổng với dòng TỔNG của chính file: khớp")
    ndup=len(re.findall(r"\(dòng",prev));ok("xuất hiện ở nhiều dòng" in prev,"báo các khách xuất hiện nhiều dòng và đã cộng gộp")
    ok("Chưa có gì được ghi" in txt("#imp-conv"),"nhắc rõ chưa ghi dữ liệu")
    # mặc định: tổng DS 2026 trong bảng xem trước = đáp án độc lập
    nums=pg.eval_on_selector_all("#imp-prev tbody tr","rs=>rs.map(r=>r.children[4].textContent)")
    got=sum(int(re.sub(r'\D','',x) or 0) for x in nums)
    ok(abs(got-round(tot26))<=N,f"tổng DS thực 2026 trong xem trước = {got:,} (đáp án độc lập {round(tot26):,})")
    if shots: pg.screenshot(path=str(shots/"convert-preview.png"),full_page=True)
    # --- tùy chọn ---
    pg.select_option("#cv-dup","first");pg.wait_for_timeout(300)
    ok(pg.locator("#imp-prev tbody tr").count()==N and "chỉ giữ dòng đầu tiên" in txt("#imp-prev"),"chọn ‘chỉ giữ dòng đầu’: vẫn %d khách, có ghi chú"%N)
    got1=sum(int(re.sub(r'\D','',x) or 0) for x in pg.eval_on_selector_all("#imp-prev tbody tr","rs=>rs.map(r=>r.children[4].textContent)"))
    ok(got1<got,"giữ dòng đầu → tổng nhỏ hơn cộng gộp (bỏ phần của dòng trùng)")
    pg.select_option("#cv-dup","sum");pg.wait_for_timeout(300)
    if pg.locator("#cv-ref").count():
        pg.check("#cv-ref");pg.wait_for_timeout(300);more=pg.locator("#imp-prev tbody tr").count()
        ok(more>N,f"tích ‘thêm khách chỉ có ở sheet khu vực’: {N} → {more} dòng");pg.uncheck("#cv-ref");pg.wait_for_timeout(300)
        pg.uncheck("#cv-fill");pg.wait_for_timeout(300);ok("Đã bổ sung từ sheet tham chiếu" not in txt("#imp-prev"),"bỏ ‘bổ sung số trống từ sheet tham chiếu’ thì không bổ sung");pg.check("#cv-fill");pg.wait_for_timeout(300)
    pg.fill("#cv-owner","Tester");pg.dispatch_event("#cv-owner","change");pg.wait_for_timeout(300);ok("Tester" in txt("#imp-prev"),"đổi người phụ trách được")
    pg.fill("#cv-owner",owner_exp);pg.dispatch_event("#cv-owner","change");pg.wait_for_timeout(300)
    # --- tải file đã chuyển đổi ---
    with pg.expect_download() as d: pg.click("#cv-dl")
    conv=str(tmp/"converted.xlsx");d.value.save_as(conv)
    wc=openpyxl.load_workbook(conv);wsx=wc.active
    ok(wsx.title=="DOANH SỐ KH 2026" and wsx["A3"].value=="PTKD" and wsx["A4"].value==owner_exp,"file tải về: đúng tên sheet, dòng PTKD, người phụ trách (%s)"%wsx["A4"].value)
    ok(wsx["J4"].value is None or isinstance(wsx["J4"].value,(int,float)),"mục tiêu quý nằm ở dòng người phụ trách (cột J, L, N, P)")
    rowsx=[r for r in range(6,wsx.max_row+1) if wsx.cell(r,1).value and not str(wsx.cell(r,1).value).startswith("TỔNG")]
    ok(len(rowsx)==N,"file tải về có %d khách + dòng TỔNG CỘNG"%N)
    soffice=shutil.which("soffice")
    if soffice:
        out=subprocess.run([soffice,"--headless","--convert-to","csv","--outdir",str(tmp/"lo"),conv],capture_output=True,text=True,timeout=120)
        ok(os.path.exists(tmp/"lo"/"converted.csv") and os.path.getsize(tmp/"lo"/"converted.csv")>200,"LibreOffice mở được file đã chuyển đổi (xác nhận file hợp lệ với Excel)")
    # --- xác nhận nhập ---
    pg.click("#imp-go");pg.wait_for_selector("#imp-body .notice:has-text('Đã nhập xong')");pg.wait_for_timeout(300)
    cs=dball(pg,"c");ok(len(cs)==N,f"đã ghi {N} khách vào dữ liệu")
    byid={c["id"]:c for c in cs}
    bad_a26=[k for k in order if abs((byid[k]["a26"] or 0)-exp[k]["a26"])>1]
    ok(not bad_a26,"DS thực 2026 của từng khách khớp đáp án độc lập (sai: %s)"%bad_a26[:3])
    badreg=[k for k in order if k in reg and byid[k]["region"]!=reg[k]]
    ok(not badreg,"khu vực lấy đúng từ ô gộp của sheet khu vực (%d khách có khu vực; sai: %s)"%(sum(1 for k in order if k in reg),badreg[:3]))
    meta=[m for m in dball(pg,"m") if m["id"]=="meta"][0]
    ok(meta["owner"]==owner_exp and meta["lastImport"].get("conv") is True,"ghi người phụ trách ‘%s’ và đánh dấu là file đã chuyển đổi"%meta["owner"])
    ok(any(v for v in meta["qt"]),"đã đọc mục tiêu từng quý: %s"%meta["qt"])
    # khách có tháng: kiểm tra quý được tính từ tháng khi file bỏ trống cột Quý 3
    q3=[c for c in cs if c["m"][6][1] is not None or c["m"][7][1] is not None]
    ok(q3 and all(c["q"][2][0] is not None for c in q3),"cột Quý 3 trống trong file → BG tính từ các tháng (%d khách)"%len(q3))
    # --- nhập lại file đã chuyển đổi: phải đọc như file gốc, không đổi gì ---
    pg.click('.nav button[data-page=import]');pg.set_input_files("#excel-file",conv);pg.wait_for_selector("#imp-prev .table-wrap",timeout=15000)
    pv=txt("#imp-prev")
    ok(pg.locator("#imp-conv .notice").count()==0 and "Cấu trúc hợp lệ" in pv,"file đã chuyển đổi được đọc trực tiếp như file mẫu gốc (không cần chuyển đổi lại)")
    ok(re.search(rf"Không đổi\s*{N}\b",pv) is not None and re.search(r"Cập nhật\s*0\b",pv) is not None and re.search(r"Mới\s*0\b",pv) is not None,"nhập lại: toàn bộ %d khách ‘Không đổi’ (chuyển đổi đúng 100%%)"%N)
    ok(not errs,"không có lỗi JavaScript: "+"; ".join(errs[:3]));b.close()
    # --- máy mới: chỉ nhập file đã chuyển đổi → vẫn giữ khu vực ---
    b,pg,errs=start();pg.set_input_files("#excel-file",conv);pg.wait_for_selector("#imp-prev .table-wrap",timeout=15000);pg.click("#imp-go");pg.wait_for_selector("#imp-body .notice:has-text('Đã nhập xong')");pg.wait_for_timeout(300)
    byid2={c["id"]:c for c in dball(pg,"c")}
    ok(all(byid2[k]["region"]==byid[k]["region"] for k in order),"nhập file đã chuyển đổi vào máy trống: khu vực được giữ nguyên (cột phụ KHU VỰC (BG))")
    ok(not errs,"không có lỗi JavaScript (máy trống)");b.close()
print("\nKẾT QUẢ:","TẤT CẢ ĐẠT" if not bad else f"{len(bad)} mục lỗi");sys.exit(1 if bad else 0)
