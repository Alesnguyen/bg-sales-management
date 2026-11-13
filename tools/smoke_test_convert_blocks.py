# Kiểm thử chuyển đổi file dạng “mỗi năm một sheet, mỗi khách 2 dòng KH/DS” (v0.18.1), ví dụ file “Doanh_số_BG_Ngọc”.
# Chạy: python3 tools/smoke_test_convert_blocks.py [file.xlsx] [thu-muc-anh]
#   Không truyền file: tự sinh file mẫu cùng cấu trúc. Đáp án đúng do Python tính độc lập từ chính file (không dùng code của ứng dụng).
import sys,pathlib,tempfile,os,re,unicodedata,subprocess,shutil
import openpyxl
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
args=sys.argv[1:]
src=next((a for a in args if a.lower().endswith(".xlsx")),None)
shots=pathlib.Path(next((a for a in args if not a.lower().endswith(".xlsx")),"")) if any(not a.lower().endswith(".xlsx") for a in args) else None
if shots: shots.mkdir(exist_ok=True,parents=True)
tmp=pathlib.Path(tempfile.mkdtemp());bad=[]
def ok(c,m):
    print(("PASS ","FAIL ")[not c]+m)
    if not c: bad.append(m)
def key(s):
    s=unicodedata.normalize("NFD",str(s or ""));s="".join(c for c in s if unicodedata.category(c)!="Mn").replace("đ","d").replace("Đ","D")
    return re.sub(r"\s+"," ",s.lower()).strip()

def make_sample(path):
    wb=openpyxl.Workbook()
    def sheet(ws,year,custs,title_cell):
        ws[title_cell]=f"CHỈ TIÊU DOANH SỐ TỪNG KH {year}"
        for c,t in zip("ABC",["STT","KHÁCH HÀNG",None]): ws[c+"3"]=t
        for i in range(12): ws.cell(3,4+i,f"Tháng {i+1}")
        ws["P3"]="Tổng chỉ tiêu cả năm 2024";ws["Q3"]="% DS Đạt được theo KH"
        r=4
        for i,(n,kh,ds) in enumerate(custs):
            ws.cell(r,1,str(i+1));ws.cell(r,2,n);ws.cell(r,3,"KH");ws.cell(r+1,3,"DS")
            for m in range(12):
                if kh[m] is not None: ws.cell(r,4+m,kh[m])
                if ds[m] is not None: ws.cell(r+1,4+m,ds[m])
            ws.cell(r,16,sum(x or 0 for x in kh));ws.cell(r+1,16,sum(x or 0 for x in ds))
            ws.merge_cells(start_row=r,start_column=1,end_row=r+1,end_column=1);ws.merge_cells(start_row=r,start_column=2,end_row=r+1,end_column=2)
            r+=2
        ws.cell(r,1,f"TỔNG DS {year}");ws.cell(r,3,"KH");ws.cell(r+1,3,"DS");ws.merge_cells(start_row=r,start_column=1,end_row=r+1,end_column=2)
        for m in range(12):
            ws.cell(r,4+m,sum((c[1][m] or 0) for c in custs));ws.cell(r+1,4+m,sum((c[2][m] or 0) for c in custs))
    flat=lambda v:[v]*12
    c26=[("Kia Mazda A",flat(250),[100,None,300,50,None,None,60,70,None,None,None,None]),
         ("Kia Thanh Hóa/Porsche",flat(23),[10,None,20,None,None,None,None,None,None,None,None,None]),
         ("Toyota LS/Hà Nam",[None]*12,[5,6,None,None,7,None,None,None,None,None,None,None]),
         ("Hyundai Hưng Yên",flat(50),[30,20,10,20,5,56,10,13,47,35,None,None]),
         ("Honda Vinh",flat(40),[None,None,-12,7,None,None,None,None,None,None,None,None]),
         ("Mới chỉ 2026",flat(10),[1,1,1,1,1,1,1,1,1,1,None,None])]
    c25=[("Kia Mazda A",flat(200),[90,80,70,60,50,40,30,20,10,5,4,3]),
         ("Kia Thanh Hóa (Lấy ngoài)",flat(23),[23,46,23,None,23,23,23,23,23,23,None,23]),
         ("Toyota Lạng Sơn",[None]*12,[None,None,25,16,10,17,7,44,18,15,18,4]),
         ("Hyundai Hưng Yên TP",flat(30),[10,10,10,None,None,None,None,None,None,None,None,None]),
         ("Hyundai Hưng Yên Phố Nối",flat(20),[None,5,5,5,None,None,None,None,None,None,None,None]),
         ("Honda Vinh",flat(30),[None,38,46,14,14,27,44,46,16,17,None,14]),
         ("Chỉ có 2025",flat(5),[1,2,3,4,5,6,7,8,9,10,11,12])]
    sheet(wb.active,2026,c26,"C1");wb.active.title="Sheet1"
    sheet(wb.create_sheet("Sheet2"),2025,c25,"C2")
    wb.save(path)
if not src:
    src=str(tmp/"Doanh_số_BG_Ngọc.xlsx");make_sample(src)
fname=os.path.basename(src)
owner_exp=(lambda t:" ".join(x for x in re.split(r"[_\-()\s]+",re.sub(r"\.[^.]+$","",t)) if x and not re.fullmatch(r"\d+",x) and key(x) not in {"doanh","so","ds","bg"}))(fname)

# ---- đáp án độc lập: đọc từng sheet theo cặp dòng KH/DS ----
wv=openpyxl.load_workbook(src,data_only=True)
data={}   # year -> {key: {"name":..,"kh":[12],"ds":[12]}}
tot_ds={};tot_kh={}
for ws in wv.worksheets:
    title=" ".join(str(ws.cell(r,c).value or "") for r in range(1,3) for c in range(1,8))
    year=int(re.search(r"(20\d\d)",title).group(1));d={}
    for r in range(4,ws.max_row+1):
        kind=str(ws.cell(r,3).value or "").strip()
        if kind not in("KH","DS"):continue
        nm=ws.cell(r,2).value
        if nm is None:
            for m in ws.merged_cells.ranges:
                if m.min_col==2 and m.min_row<=r<=m.max_row: nm=ws.cell(m.min_row,2).value
        a=str(ws.cell(r,1).value or "")
        if a.upper().startswith("TỔNG") or str(nm or "").upper().startswith("TỔNG"):
            (tot_kh if kind=="KH" else tot_ds)[year]=sum(ws.cell(r,c).value or 0 for c in range(4,16));continue
        if not nm:continue
        e=d.setdefault(key(nm),{"name":str(nm).strip(),"kh":[None]*12,"ds":[None]*12})
        e["kh" if kind=="KH" else "ds"]=[ws.cell(r,4+m).value for m in range(12)]
    data[year]=d
union=list(dict.fromkeys(list(data[2026].keys())+list(data[2025].keys())))
N=len(union);N26=len(data[2026]);N_only25=N-N26
s=lambda a:sum(x or 0 for x in a)
def exp_of(k):
    e26=data[2026].get(k);e25=data[2025].get(k)
    return {"a25":s(e25["ds"]) if e25 else None,"a26":s(e26["ds"]) if e26 else None,
            "t26":(s(e26["kh"]) if e26 and any(v is not None for v in e26["kh"]) else None),
            "m25":e25["ds"] if e25 else [None]*12,"m26":e26["ds"] if e26 else [None]*12}
qt_exp=[sum(v or 0 for e in data[2026].values() for v in e["kh"][3*q:3*q+3]) for q in range(4)]

def start():
    b=p.chromium.launch();ctx=b.new_context(viewport={"width":1440,"height":900},accept_downloads=True);pg=ctx.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)));pg.goto((root/"index.html").as_uri());pg.wait_for_selector("#splash",state="detached")
    pg.click('.nav button[data-page=import]');return b,pg,errs
dball=lambda pg,st:pg.evaluate("""async(st)=>{const db=await new Promise(r=>{const q=indexedDB.open('bgsm');q.onsuccess=()=>r(q.result)});const a=await new Promise(r=>{const t=db.transaction(st).objectStore(st).getAll();t.onsuccess=()=>r(t.result)});db.close();return a}""",st)
num=lambda t:int(re.sub(r"[^\d-]","",t.replace("−","-")) or 0) if re.search(r"\d",t) else None
with sync_playwright() as p:
    b,pg,errs=start();txt=lambda s_:pg.inner_text(s_)
    pg.set_input_files("#excel-file",src);pg.wait_for_selector("#imp-prev .table-wrap",timeout=20000)
    ok("mỗi năm một sheet" in txt("#imp-conv") and "cả 2 sheet" in txt("#imp-conv"),"file lạ: BG nhận ra dạng 2 dòng KH/DS và đọc cả 2 sheet")
    yrs=pg.eval_on_selector_all("[data-by]","e=>e.map(x=>x.value)");ok(sorted(yrs)==["2025","2026"],"tự nhận đúng năm của từng sheet (từ tiêu đề): %s"%yrs)
    prev=txt("#imp-prev")
    ok(pg.locator("#imp-prev tbody tr").count()==N,f"gộp 2 sheet thành {N} khách (2026: {N26}; chỉ có ở 2025: {N_only25})")
    ok("Lệch tổng" not in prev and prev.count("khớp")>=4,"đối chiếu tổng với dòng TỔNG của từng sheet (DS và KH, 2 năm): khớp (%d phép)"%prev.count("khớp"))
    ok("ô doanh số âm" in prev,"báo các ô doanh số âm (trả hàng/điều chỉnh) và giữ nguyên")
    ok("Chưa có gì được ghi" in txt("#imp-conv"),"nhắc rõ chưa ghi dữ liệu")
    ok(pg.locator("#imp-pair details").count()==1 and pg.locator("#pair-apply").count()==1,"có mục ghép khách khác tên giữa các sheet và nút áp dụng gợi ý")
    if shots: pg.screenshot(path=str(shots/"blocks-preview.png"),full_page=True)
    # --- tùy chọn ---
    pg.uncheck("#cv-single");pg.wait_for_timeout(300)
    ok(pg.locator("#imp-prev tbody tr").count()==N26,f"bỏ ‘thêm khách chỉ có ở năm cũ’: còn {N26} khách của 2026");pg.check("#cv-single");pg.wait_for_timeout(300)
    pg.select_option("[data-by='0']","");pg.wait_for_timeout(300)
    ok("bỏ qua" in txt("#imp-prev") and pg.locator("#imp-prev tbody tr").count()==len(data[2025]),"chọn ‘Bỏ qua sheet này’ cho sheet 2026: chỉ còn %d khách của 2025"%len(data[2025]))
    pg.select_option("[data-by='0']","2026");pg.wait_for_timeout(300)
    ok(pg.locator("#imp-prev tbody tr").count()==N,"chọn lại năm 2026: trở lại %d khách"%N)
    # --- ghép khách khác tên: mặc định không ghép; áp dụng gợi ý → ghép đúng ---
    sug=pg.eval_on_selector_all("[data-alias]","els=>els.map(s=>{const o=[...s.options].find(o=>o.text.includes('BG gợi ý'));return o?{from:s.dataset.alias,to:o.value}:null}).filter(Boolean)")
    pg.click("#pair-apply");pg.wait_for_timeout(500)
    ok(pg.locator("#imp-prev tbody tr").count()==N-len(sug),f"áp dụng {len(sug)} gợi ý: {N} → {N-len(sug)} khách")
    ok("Đã ghép" in txt("#imp-prev"),"có ghi chú các tên đã ghép")
    # --- ghép thủ công 1 khách (nếu có ứng viên và chưa ghép) ---
    pg.fill("#cv-owner",owner_exp);pg.dispatch_event("#cv-owner","change");pg.wait_for_timeout(300)
    # --- tải file chuyển đổi ---
    with pg.expect_download() as d: pg.click("#cv-dl")
    conv=str(tmp/"converted.xlsx");d.value.save_as(conv)
    wc=openpyxl.load_workbook(conv).active
    ok(wc.title=="DOANH SỐ KH 2026" and wc["A3"].value=="PTKD" and wc["A4"].value==owner_exp,"file tải về đúng mẫu gốc (sheet, PTKD, người phụ trách ‘%s’)"%wc["A4"].value)
    if shutil.which("soffice"):
        subprocess.run(["soffice","--headless","--convert-to","csv","--outdir",str(tmp/"lo"),conv],capture_output=True,timeout=120)
        ok(os.path.exists(tmp/"lo"/"converted.csv") and os.path.getsize(tmp/"lo"/"converted.csv")>200,"LibreOffice mở được file đã chuyển đổi")
    # --- nhập: kiểm tra từng khách với đáp án độc lập ---
    pg.click("#imp-go");pg.wait_for_selector("#imp-body .notice:has-text('Đã nhập xong')");pg.wait_for_timeout(300)
    cs={c["id"]:c for c in dball(pg,"c")};ok(len(cs)==N-len(sug),"đã ghi %d khách"%len(cs))
    amap={x["from"]:x["to"] for x in sug}
    errs_a=[]
    for k in union:
        tk=amap.get(k,k)
        if tk!=k: continue                      # khách đã bị ghép vào khách khác: kiểm tra riêng bên dưới
        c=cs[k];e=exp_of(k)
        # cộng các khách đã ghép vào k
        add=[exp_of(f) for f,t in amap.items() if t==k]
        a25=(e["a25"] or 0)+sum((x["a25"] or 0) for x in add) if (e["a25"] is not None or add) else None
        m25=[ (e["m25"][i] if e["m25"][i] is not None else None) for i in range(12)]
        for x in add:
            for i in range(12):
                if x["m25"][i] is not None: m25[i]=(m25[i] or 0)+x["m25"][i]
        okk=(abs((c["a25"] or 0)-(a25 or 0))<=1 and (c["a25"] is None)==(a25 is None)) and ((c["a26"] is None)==(e["a26"] is None)) and abs((c["a26"] or 0)-(e["a26"] or 0))<=1 and ((c["t26"] is None)==(e["t26"] is None)) and abs((c["t26"] or 0)-(e["t26"] or 0))<=1
        okk=okk and all(abs((c["m"][i][0] or 0)-(m25[i] or 0))<=1 and abs((c["m"][i][1] or 0)-(e["m26"][i] or 0))<=1 for i in range(12))
        if not okk: errs_a.append(c["name"])
    ok(not errs_a,"DS 2025, DS 2026, Target 2026 và 12 tháng × 2 năm của từng khách khớp đáp án độc lập (sai: %s)"%errs_a[:3])
    meta=[m for m in dball(pg,"m") if m["id"]=="meta"][0]
    ok(meta["owner"]==owner_exp and all(abs((meta["qt"][q] or 0)-qt_exp[q])<=1 for q in range(4)),"người phụ trách ‘%s’ và mục tiêu quý = tổng KH các khách: %s"%(meta["owner"],meta["qt"]))
    qbad=[k for k,c in cs.items() if any(((c["q"][i][0] or 0)!=sum((c["m"][3*i+j][1] or 0) for j in range(3))) for i in range(4))]
    ok(not qbad,"doanh số từng quý 2026 = tổng 3 tháng")
    # --- nhập lại file đã chuyển đổi: đọc như mẫu gốc, không đổi gì ---
    pg.click('.nav button[data-page=import]');pg.set_input_files("#excel-file",conv);pg.wait_for_selector("#imp-prev .table-wrap",timeout=20000);pv=txt("#imp-prev")
    ok("Cấu trúc hợp lệ" in pv and re.search(rf"Không đổi\s*{len(cs)}\b",pv) is not None and re.search(r"Cập nhật\s*0\b",pv) is not None,"nhập lại file đã chuyển đổi: đọc trực tiếp như mẫu gốc, toàn bộ %d khách ‘Không đổi’"%len(cs))
    ok(not errs,"không có lỗi JavaScript: "+"; ".join(errs[:3]));b.close()
print("\nKẾT QUẢ:","TẤT CẢ ĐẠT" if not bad else f"{len(bad)} mục lỗi");sys.exit(1 if bad else 0)
