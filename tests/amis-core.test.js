const assert=require("assert");const C=require("../amis-core.js");
const cfg={map:{orderId:"id",orderNo:"no",accountId:"acc",accountCode:"code",accountName:"name",orderDate:"date",modified:"mod",status:"st",amount:"amt"},eligible:["Hoàn thành"],cutover:"2026-01-01"};
const cus=(name,extra)=>({id:C.key(name),name,a25:null,t26:1e9,a26:100,q:[[100,null],[null,null],[null,null],[null,null]],m:Array.from({length:12},(_,i)=>[null,i===0?100:null]),...extra});
const norm=r=>{const x=C.normalizeOrder(r,cfg.map);assert(x.ok,JSON.stringify(x));return x.order};
const ord=(id,acc,name,date,amt,st="Hoàn thành")=>norm({id,no:"SO"+id,acc,code:"C"+acc,name,date,mod:"2026-03-05 10:00:00",st,amt});
let S={customers:[cus("Kia Bắc Ninh")],orders:[],links:[],pending:[]};
const apply=(S,ch)=>{const up=(a,b,k)=>{const m=new Map(a.map(x=>[x.id,x]));b.forEach(x=>m.set(x.id,x));return[...m.values()]};
 return{customers:up(S.customers,ch.customers),orders:up(S.orders,ch.orders),links:up(S.links,ch.links).filter(x=>!ch.delLinks.includes(x.id)),pending:up(S.pending,ch.pending).filter(x=>!ch.delPending.includes(x.id))}};
// 1. khớp chính xác tên (bỏ dấu, hoa thường, dấu câu)
let ch=C.processOrders(S,[ord("1","A1","KIA  bắc ninh.","2026-03-10",500),ord("2","A2","Công ty ABC","2026-03-11",300)],cfg,1000);S=apply(S,ch);
assert.equal(S.links.length,1);assert.equal(S.pending.length,1);
let k=S.customers.find(c=>c.name==="Kia Bắc Ninh");assert.equal(k.a26,600);assert.equal(k.m[2][1],500);assert.equal(k.q[0][0],600);
// 2. gửi lại cùng dữ liệu: không đổi
ch=C.processOrders(S,[ord("1","A1","KIA  bắc ninh.","2026-03-10",500)],cfg,2000);assert.equal(ch.customers.length,0);assert.equal(ch.stats.unchanged,1);
// 3. sửa tiền & đổi trạng thái hủy → đảo đúng
ch=C.processOrders(S,[ord("1","A1","Kia Bắc Ninh","2026-03-10",700)],cfg,3000);S=apply(S,ch);assert.equal(S.customers[0].a26,800);
ch=C.processOrders(S,[ord("1","A1","Kia Bắc Ninh","2026-03-10",700,"Hủy")],cfg,3500);S=apply(S,ch);assert.equal(S.customers[0].a26,100);assert.equal(S.customers[0].m[2][1],0);
ch=C.processOrders(S,[ord("1","A1","Kia Bắc Ninh","2026-03-10",700)],cfg,3600);S=apply(S,ch);assert.equal(S.customers[0].a26,800);
// 4. Đơn khách chờ chưa cộng; duyệt thêm mới → hồ sơ tối thiểu + cộng toàn bộ đơn chờ
ch=C.processOrders(S,[ord("3","A2","Công ty ABC","2026-04-02",200)],cfg,4000);S=apply(S,ch);
let pv=C.pendingView(S);assert.equal(pv[0].valid,2);assert.equal(pv[0].sum,500);
ch=C.approveNew(S,"A2",cfg,5000);S=apply(S,ch);let n=S.customers.find(c=>c.name==="Công ty ABC");
assert.equal(n.a26,500);assert.equal(n.code,"CA2");assert.equal(n.src,"amis");assert.equal(S.pending.length,0);
// 5. Trùng tên khi duyệt → báo lỗi; ghép
S2={customers:[cus("Công ty XYZ")],orders:[],links:[],pending:[]};
ch=C.processOrders(S2,[ord("9","B1","Cty TNHH XYZ","2026-05-01",100)],cfg,1);S2=apply(S2,ch);assert.equal(S2.pending.length,1);assert(S2.pending[0].candidates.length===1);
ch=C.approveLink(S2,"B1",S2.customers[0].id,cfg,2);S2=apply(S2,ch);assert.equal(S2.customers[0].a26,200);
// 6. Bỏ qua / khôi phục
S3={customers:[],orders:[],links:[],pending:[]};ch=C.processOrders(S3,[ord("5","Z","Zed","2026-02-02",50)],cfg,1);S3=apply(S3,ch);
ch=C.ignoreAccount(S3,"Z",cfg,2);S3=apply(S3,ch);assert.equal(S3.orders[0].state,"ignored");
ch=C.processOrders(S3,[ord("6","Z","Zed","2026-02-03",50)],cfg,3);S3=apply(S3,ch);assert.equal(S3.orders.every(o=>o.state==="ignored"),true);
ch=C.restoreAccount(S3,"Z",cfg,4);S3=apply(S3,ch);assert.equal(S3.orders[0].state,"pending");
// 7. Đơn trước ngày bắt đầu không vào sổ; đổi rule trạng thái; Excel nhập đè rồi tính lại
ch=C.processOrders(S3,[ord("7","Z","Zed","2025-12-31",50)],cfg,5);assert.equal(ch.stats.skippedOld,1);
S4=S;const wiped={...S4,customers:S4.customers.map(c=>{const {amisAdd,...r}=c;return {...r,a26:0,m:c.m.map(()=>[null,null]),q:c.q.map(()=>[null,null])}})};
ch=C.resettle(wiped,cfg,9);S4=apply(wiped,ch);assert.equal(S4.customers.find(c=>c.name==="Kia Bắc Ninh").a26,700);
ch=C.resettle(S,{...cfg,eligible:[]},10);S5=apply(S,ch);assert.equal(S5.customers.find(c=>c.name==="Kia Bắc Ninh").a26,100);
// 8. Phân tích
assert.equal(C.parseAmount("1.234.567,5"),1234567.5);assert.equal(C.parseAmount("1,234,567"),1234567);assert.equal(C.parseAmount("12.5"),12.5);assert.equal(C.parseAmount("abc"),null);
assert.equal(C.parseDate("2026-03-05T23:59:00Z"),"2026-03-05");assert.equal(C.parseDate("05/03/2026"),"2026-03-05");assert.equal(C.parseDate("x"),null);
assert.deepEqual(C.findList({success:true,data:[1,2],total:2}).list,[1,2]);assert.equal(C.findList({data:{items:[1]}}).path,"data.items");
assert.equal(C.findToken({data:{access_token:"abcdefghijkl",expires_in:60}}).ttl,60);
assert.equal(C.normalizeOrder({id:1},cfg.map).ok,false);
assert.equal(C.quarterVal({m:[[null,null],[null,null],[null,300]],q:[[1300,null]],amisAdd:{"2026-03":300}},0),1300);
console.log("amis-core: tất cả kiểm thử đạt");

// ===== v0.17.0: nhân viên kinh doanh + Ký gửi =====
const cfg2={map:{...cfg.map,owner:"own",consign:"kg"},eligible:["Hoàn thành"],owners:["Nguyễn Năng Nghĩa"],consignValues:["true","Ký gửi"],cutover:"2026-01-01"};
const o2=(id,acc,name,date,amt,own,kg,st="Hoàn thành")=>{const x=C.normalizeOrder({id,no:"SO"+id,acc,code:"C"+acc,name,date,mod:"2026-03-05 10:00:00",st,amt,own,kg},cfg2.map);assert(x.ok);return x.order};
// 8a. cấu hình thiếu: chưa chọn trường / chưa xác nhận tên → chặn đồng bộ
assert(C.cfgProblems({...cfg2,owners:[]}).some(x=>/xác nhận tên kinh doanh/.test(x)));
assert(C.cfgProblems({...cfg2,map:{...cfg2.map,owner:""}}).some(x=>/nhân viên kinh doanh/.test(x)));
assert(C.cfgProblems({...cfg2,map:{...cfg2.map,consign:""}}).some(x=>/Ký gửi/.test(x)));
assert.deepEqual(C.cfgProblems(cfg2),[]);
assert(C.cfgWarnings({...cfg2,consignValues:[]}).length>=1);
// 8b. chỉ lấy đơn của đúng kinh doanh (so khớp không phân biệt hoa/thường/dấu); đơn người khác không được lưu
let T={customers:[cus("Kia Bắc Ninh")],orders:[],links:[],pending:[]};
ch=C.processOrders(T,[o2("1","A1","Kia Bắc Ninh","2026-03-10",500,"nguyen nang nghia",false),o2("2","A1","Kia Bắc Ninh","2026-03-11",900,"Trần Phú Tâm",false),o2("3","A9","Khách của Tâm","2026-03-12",100,"Trần Phú Tâm",false)],cfg2,1);T=apply(T,ch);
assert.equal(T.orders.length,1);assert.equal(ch.stats.skippedOwner,2);assert.equal(T.customers[0].a26,600);assert.equal(T.pending.length,0);
// 8c. Ký gửi: chưa ghi nhận; bỏ Ký gửi trên AMIS → lần sau tự cộng; có dấu hiệu Ký gửi trở lại → đảo
ch=C.processOrders(T,[o2("4","A1","Kia Bắc Ninh","2026-03-15",300,"Nguyễn Năng Nghĩa","true")],cfg2,2);T=apply(T,ch);
assert.equal(T.customers[0].a26,600);assert.equal(T.orders.find(o=>o.id==="4").consigned,true);assert.equal(ch.stats.consigned,1);
ch=C.processOrders(T,[o2("4","A1","Kia Bắc Ninh","2026-03-15",300,"Nguyễn Năng Nghĩa","false")],cfg2,3);T=apply(T,ch);assert.equal(T.customers[0].a26,900);
ch=C.processOrders(T,[o2("4","A1","Kia Bắc Ninh","2026-03-15",300,"Nguyễn Năng Nghĩa","Ký gửi")],cfg2,4);T=apply(T,ch);assert.equal(T.customers[0].a26,600);
ch=C.processOrders(T,[o2("4","A1","Kia Bắc Ninh","2026-03-15",300,"Nguyễn Năng Nghĩa","")],cfg2,5);T=apply(T,ch);assert.equal(T.customers[0].a26,900);   // trống = không ký gửi
// 8d. đơn đổi người phụ trách sang người khác → gỡ doanh số; đổi lại → cộng lại
ch=C.processOrders(T,[o2("4","A1","Kia Bắc Ninh","2026-03-15",300,"Dương Quang Linh","")],cfg2,6);T=apply(T,ch);assert.equal(T.customers[0].a26,600);assert.equal(T.orders.find(o=>o.id==="4").state,"foreign");assert.equal(ch.stats.foreign,1);
ch=C.processOrders(T,[o2("4","A1","Kia Bắc Ninh","2026-03-15",300,"Nguyễn Năng Nghĩa","")],cfg2,7);T=apply(T,ch);assert.equal(T.customers[0].a26,900);
// 8e. đổi danh sách tên / giá trị Ký gửi trong cấu hình rồi đối chiếu lại (không cần gọi lại AMIS)
ch=C.resettle(T,{...cfg2,consignValues:["","false"].concat(["Ký gửi"])},8);let T2=apply(T,ch);assert.equal(T2.customers[0].a26,400);   // đơn có giá trị “false” bị coi là ký gửi (500 bị loại); đơn trống vẫn tính (300)
ch=C.resettle(T,{...cfg2,owners:["Trần Phú Tâm"]},9);T2=apply(T,ch);assert.equal(T2.customers[0].a26,100);
// 8f. khách chờ chỉ sinh ra từ đơn của bạn; đơn Ký gửi không tính vào số “đơn hợp lệ” đang chờ
let U={customers:[],orders:[],links:[],pending:[]};
ch=C.processOrders(U,[o2("10","N1","Khách mới","2026-04-01",100,"Nguyễn Năng Nghĩa","false"),o2("11","N1","Khách mới","2026-04-02",50,"Nguyễn Năng Nghĩa","true"),o2("12","N2","Của người khác","2026-04-03",70,"Trần Phú Tâm","false")],cfg2,1);U=apply(U,ch);
pv=C.pendingView(U);assert.equal(pv.length,1);assert.equal(pv[0].valid,1);assert.equal(pv[0].sum,100);assert.equal(pv[0].n,2);
// 8g. đơn lưu từ bản cũ (chưa có owner) không bị gỡ cho đến khi đồng bộ lại
const legacy={customers:[cus("Kia Bắc Ninh",{amisAdd:{"2026-03":500},a26:600})],orders:[{id:"L1",orderNo:"L1",accountId:"A1",accountName:"Kia Bắc Ninh",accountCode:"",orderDate:"2026-03-10",status:"Hoàn thành",amount:500,state:"linked",cid:"kia bac ninh",eligible:true,inRange:true,counted:true}],links:[{id:"A1",cid:"kia bac ninh"}],pending:[]};
ch=C.resettle(legacy,cfg2,1);assert.equal(ch.customers.length,0);
// 8h. giá trị dạng đối tượng/danh sách chọn
const po=C.normalizeOrder({id:"5",acc:"x",name:"n",date:"2026-03-01",amt:1,own:{id:3,name:"Trần Phú Tâm"},kg:true},cfg2.map);assert.equal(po.order.owner,"Trần Phú Tâm");assert.equal(po.order.consign,"true");
console.log("amis-core v0.17.0: nhân viên kinh doanh + Ký gửi đạt");
