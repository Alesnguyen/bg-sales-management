# Đo tương phản chữ/nền (WCAG AA: 4,5:1 chữ thường, 3:1 chữ lớn) trên giao diện thật ở cả hai chế độ.
# Chạy: python3 tools/contrast_check.py <duong-dan-xlsx>
import sys,pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
JS="""()=>{
const cv=document.createElement('canvas').getContext('2d');
const rgba=s=>{cv.fillStyle='#000';cv.fillStyle=s;const h=cv.fillStyle;if(h[0]==='#'){const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255,1]}const m=h.match(/[\\d.]+/g).map(Number);return[m[0],m[1],m[2],m.length>3?m[3]:1]};
const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
const bgOf=el=>{let acc=[255,255,255],layers=[];while(el){const c=rgba(getComputedStyle(el).backgroundColor);if(c[3]>0)layers.push(c);if(c[3]>=.99)break;el=el.parentElement}
 let base=layers.length&&layers[layers.length-1][3]>=.99?layers.pop():[getComputedStyle(document.body).backgroundColor?rgba(getComputedStyle(document.documentElement).backgroundColor):[255,255,255]][0];
 for(const l of layers.reverse()){base=[0,1,2].map(i=>l[i]*l[3]+base[i]*(1-l[3]))}return base};
const out=[];const seen=new Set();
document.querySelectorAll('body *').forEach(el=>{
 if(!el.offsetParent&&getComputedStyle(el).position!=='fixed')return;
 const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');if(!t)return;
 const cs=getComputedStyle(el);if(cs.visibility==='hidden'||+cs.opacity<1)return;
 const fg=rgba(cs.color),bg=bgOf(el);const f=fg[3]<1?[0,1,2].map(i=>fg[i]*fg[3]+bg[i]*(1-fg[3])):fg;
 const a=L(f),b=L(bg),r=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700,large=size>=24||(size>=18.66&&bold);
 const need=large?3:4.5;if(r<need){const k=(el.className||el.tagName)+'|'+t.slice(0,24);if(!seen.has(k)){seen.add(k);out.push([r.toFixed(2),need,String(el.className||el.tagName).slice(0,40),t.slice(0,36)])}}});
return out}"""
bad=0
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={"width":1440,"height":900});pg.goto((root/"index.html").as_uri());pg.wait_for_selector("#splash",state="detached")
    pg.click('.nav button[data-page=import]');pg.set_input_files("#excel-file",sys.argv[1]);pg.click("#imp-go");pg.wait_for_selector("#imp-body .notice:has-text('Đã nhập xong')")
    pg.click('.nav button[data-page=customers]');pg.click("#customer-rows tr >> nth=0");pg.wait_for_selector("#ce-form");pg.click("#ce-cancel")
    pg.click('.nav button[data-page=calendar]');pg.click("#add-work");pg.fill("#f_title","Thăm khách");pg.click("#dlg-form button.primary");pg.wait_for_timeout(300)
    for th in ("light","dark"):
        pg.evaluate(f"document.documentElement.dataset.theme='{th}'")
        for page in ("overview","customers","calendar","import","settings"):
            pg.click(f'.nav button[data-page={page}]');pg.wait_for_timeout(450)
            r=pg.evaluate(JS)
            for x in r: print(f"[{th}/{page}] {x[0]} (cần {x[1]}) · {x[2]} · {x[3]}");bad+=1
    b.close()
print("TƯƠNG PHẢN:", "ĐẠT" if not bad else f"{bad} mục dưới ngưỡng")
