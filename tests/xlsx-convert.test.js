// Kiểm thử bộ phân tích/chuyển đổi Excel (không cần trình duyệt). Dữ liệu mẫu tự dựng, mô phỏng bố cục “Linh_2026”.
const assert=require("assert");const X=require("../src/xlsx-convert.js");
const book=(()=>{const R=[];const set=(r,c,v)=>{(R[r]=R[r]||[])[c]=v};
 set(0,1,"Target 2026");set(0,10,2.8e9);set(0,14,3.5e9);set(0,18,3.5e9);set(0,22,4.2e9);
 set(1,1,"TỔNG");set(1,3,1500);set(1,4,5000);set(1,5,1650);["Tháng 1","Tháng 2","Tháng 3","Quý 1","Tháng 4","Tháng 5","Tháng 6","Quý 2","Tháng 7","Tháng 8","Tháng 9","Quý 3","Tháng 10","Tháng 11","Tháng 12","Quý 4","Tổng"].forEach((t,i)=>set(1,7+i,t));
 ["STT","Tên khách hàng","TB 2025","Ds thực 2025","Target 2026","DS THỰC 2026","% ĐẠT"].forEach((t,i)=>set(2,i,t));
 const mcols=[7,8,9,11,12,13,15,16,17,19,20,21];
 const row=(r,name,a25,t26,ms,qf)=>{set(r,0,r-2);set(r,1,name);if(a25!=null)set(r,3,a25);if(t26!=null)set(r,4,t26);set(r,5,ms.reduce((s,x)=>s+(x||0),0));ms.forEach((v,i)=>{if(v!=null)set(r,mcols[i],v)});(qf||[]).forEach((v,i)=>{if(v!=null)set(r,10+4*i,v)})};
 row(3,"  Honda A ",1000,2000,[100,100,100,100,50,0,70,80,0,0,0,0].map(x=>x||null),[300,150]);
 row(4,"Toyota B",null,3000,[200,null,null,null,null,null,10,null,null,null,null,null]);
 row(5,"Huyndai C",500,0,[10,10,10,null,null,null,null,null,null,null,null,null]);
 row(6,"HUYNDAI c",0,0,[null,null,null,null,null,null,null,7,null,null,null,null]);   // trùng tên (khác hoa thường)
 row(7,"Tổng cộng",1500,5000,[1,1,1,1,1,1,1,1,1,1,1,1]);                          // dòng tổng cuối bảng: phải bị bỏ qua
 const s2=[];const s=(r,c,v)=>{(s2[r]=s2[r]||[])[c]=v};
 ["Tên khách hàng","DS 2024","TB 2024","TB 2025","Ds thực 2025","Target 2026"].forEach((t,i)=>s(2,1+i,t));
 s(3,0,"Thái Nguyên");s(3,1,"Honda A");s(3,5,1111);s(3,6,2222);s(4,1,"Toyota B");s(4,5,900);s(4,6,2800);s(5,0,"Miền Nam");s(5,1,"Chỉ ở sheet khu vực");
 return{sheets:[{name:"Sheet1",rows:R,merges:[[0,1,0,3]]},{name:"Sheet2",rows:s2,merges:[[3,0,4,0]]}]}})();
const an=X.analyze(book,"Nguyễn Năng Nghĩa_2026.xlsx");
assert(an.ok);assert.equal(an.main.name,"Sheet1");assert.equal(an.main.N,2);
assert.equal(an.map.name,1);assert.equal(an.map.a25,3);assert.equal(an.map.t26,4);assert.equal(an.map.a26,5);   // TB 2025 và % ĐẠT bị bỏ qua
assert.deepEqual(an.map.m26,[7,8,9,11,12,13,15,16,17,19,20,21]);assert.deepEqual(an.map.q,[10,14,18,22]);        // cột Quý xen kẽ không bị nhầm thành tháng
assert.deepEqual(an.qt,[2.8e9,3.5e9,3.5e9,4.2e9]);assert.equal(an.ownerGuess,"Nguyễn Năng Nghĩa");
assert.equal(an.refs.length,1);assert.equal(an.refs[0].regionCol,0);                                            // khu vực qua ô gộp
let r=X.convert(book,an,{guess:()=>"Khác"});
assert.equal(r.rows.length,3);assert.equal(r.rawCount,4);assert.equal(r.notes.merged.length,1);
const by=n=>r.rows.find(c=>c.id===X.key(n));
assert.equal(by("Honda A").name,"Honda A");assert.equal(by("Honda A").region,"Thái Nguyên");assert.equal(by("Toyota B").region,"Thái Nguyên");assert.equal(by("Huyndai C").region,"Khác");
assert.equal(by("Toyota B").a25,900);assert.equal(r.notes.filledA25,1);                                         // bổ sung số trống từ sheet tham chiếu
assert.equal(by("Honda A").a25,1000);assert.equal(r.notes.conflicts.length,3);                                  // số khác nhau: giữ sheet chính, ghi nhận
assert.equal(by("Huyndai C").a26,37);assert.equal(by("Huyndai C").m[7][1],7);assert.equal(by("Huyndai C").m[0][1],10);   // cộng gộp dòng trùng
assert.deepEqual(by("Honda A").q.map(x=>x[0]),[300,150,150,null]);                                              // Quý trống → tính từ tháng; có số quý thì giữ số của file
assert.equal(r.checks.length,3);assert.deepEqual(r.checks.map(c=>c.ok),[true,true,false]);   // dòng TỔNG của mẫu cố ý ghi sai DS 2026 → phải báo lệch
r=X.convert(book,an,{dup:"first",fillRef:false,includeRefOnly:true,guess:()=>"Khác"});
assert.equal(by("Huyndai C").a26,30);assert.equal(r.rows.length,4);assert.equal(by("Toyota B").a25,null);assert.equal(by("Chỉ ở sheet khu vực").region,"Miền Nam");
// chỉnh cột thủ công: bỏ cột Target → không còn mục tiêu (rồi có thể bổ sung từ sheet tham chiếu)
an.map.t26=null;r=X.convert(book,an,{guess:()=>"Khác"});assert.equal(by("Honda A").t26,2222);
// file không có cột Tên khách hàng
assert.equal(X.analyze({sheets:[{name:"x",rows:[["a","b"],[1,2]],merges:[]}]},"a.xlsx").ok,false);
// dựng xlsx: là zip hợp lệ có các phần bắt buộc, CRC đúng
const zip=X.buildXlsx(r,"Linh_2026.xlsx");assert.equal(zip[0],0x50);assert.equal(zip[1],0x4b);
assert(Buffer.from(zip).includes("xl/worksheets/sheet1.xml"));assert(Buffer.from(zip).toString("utf8").includes("PTKD"));
assert.equal(X.cellNum("1.234.567"),1234567);assert.equal(X.cellNum("1,5"),1.5);assert.equal(X.cellNum("(200)"),-200);assert.equal(X.cellNum("abc"),null);
console.log("xlsx-convert: tất cả kiểm thử đạt");

// ===== v0.18.1: dạng “mỗi năm một sheet, mỗi khách 2 dòng KH/DS” (mô phỏng file Doanh_số_BG_Ngọc) =====
assert.equal(X.ownerFromFile("Doanh_số_BG_Ngọc.xlsx"),"Ngọc");assert.equal(X.ownerFromFile("Linh_2026.xlsx"),"Linh");assert.equal(X.ownerFromFile("Nguyễn Năng Nghĩa_2026.xlsx"),"Nguyễn Năng Nghĩa");
const blk=(year,custs)=>{const R=[],M=[];const set=(r,c,v)=>{(R[r]=R[r]||[])[c]=v};set(year===2026?0:1,2,"CHỈ TIÊU DOANH SỐ TỪNG KH "+year);
 set(2,0,"STT");set(2,1,"KHÁCH HÀNG");for(let i=0;i<12;i++)set(2,3+i,"Tháng "+(i+1));set(2,15,"Tổng chỉ tiêu cả năm 2024");
 let r=3;custs.forEach(([n,kh,ds],i)=>{set(r,0,String(i+1));set(r,1,n);set(r,2,"KH");set(r+1,2,"DS");kh.forEach((v,m)=>{if(v!=null)set(r,3+m,v)});ds.forEach((v,m)=>{if(v!=null)set(r+1,3+m,v)});M.push([r,0,r+1,0],[r,1,r+1,1]);r+=2});
 set(r,0,"TỔNG DS "+year);set(r,2,"KH");set(r+1,2,"DS");M.push([r,0,r+1,1]);for(let m=0;m<12;m++){set(r,3+m,custs.reduce((s,c)=>s+(c[1][m]||0),0));set(r+1,3+m,custs.reduce((s,c)=>s+(c[2][m]||0),0))}
 return{name:year===2026?"Sheet1":"Sheet2",rows:R,merges:M}};
const f12=v=>Array(12).fill(v),ex=(a)=>a.concat(Array(12-a.length).fill(null));
const bk={sheets:[blk(2026,[["Kia A",f12(10),ex([1,null,3])],["Kia Thanh Hóa/Porsche",f12(23),ex([5])],["Hyundai HY",f12(50),ex([7,8])],["Chỉ 2026",f12(1),ex([2])]]),
                   blk(2025,[["Kia A",f12(9),ex([4,4,4,4,4,4,4,4,4,4,4,4])],["Kia Thanh Hóa (Lấy ngoài)",f12(23),ex([9,null,9])],["Hyundai HY TP",f12(30),ex([1,1])],["Hyundai HY Phố Nối",f12(20),ex([2,null,2])],["Chỉ 2025",f12(0),ex([-5])]])]};
const ab=X.analyze(bk,"Doanh_số_BG_Ngọc.xlsx");
assert(ab.ok&&ab.kind==="blocks");assert.deepEqual(ab.sheets.map(x=>x.year),[2026,2025]);assert.equal(ab.ownerGuess,"Ngọc");   // năm lấy từ tiêu đề, không bị nhầm bởi nhãn “…năm 2024”
let rb=X.convert(bk,ab,{guess:()=>"Khác"});const g=n=>rb.rows.find(c=>c.id===X.key(n));
assert.equal(rb.rows.length,8);                                                      // 4 (2026) + 4 chỉ có ở 2025: không tự ghép tên khác nhau
assert.equal(g("Kia A").a25,48);assert.equal(g("Kia A").a26,4);assert.equal(g("Kia A").t26,120);assert.equal(g("Kia A").m[2][0],4);assert.equal(g("Kia A").m[2][1],3);assert.equal(g("Kia A").m[1][1],null);
assert.equal(g("Chỉ 2025").a26,null);assert.equal(g("Chỉ 2025").a25,-5);assert.equal(g("Chỉ 2026").a25,null);assert.deepEqual(g("Kia A").q.map(x=>x[0]),[4,null,null,null]);
assert.equal(rb.checks.length,4);assert(rb.checks.every(c=>c.ok));                  // dòng TỔNG của từng sheet (DS và KH) khớp
assert.deepEqual(rb.qt,[(10+23+50+1)*3,(10+23+50+1)*3,(10+23+50+1)*3,(10+23+50+1)*3]);
assert.equal(rb.notes.single.length,4);assert.equal(rb.notes.suggest.length,3);       // gợi ý: Hyundai TP, Phố Nối → Hyundai HY; Kia Thanh Hóa (Lấy ngoài) → Kia Thanh Hóa/Porsche
assert(rb.notes.negatives.some(n=>n.name==="Chỉ 2025"&&n.v===-5));
const alias={};rb.notes.suggest.forEach(x=>{alias[x.from]=x.to});
rb=X.convert(bk,ab,{alias,guess:()=>"Khác"});assert.equal(rb.rows.length,5);assert.equal(g("Hyundai HY").a25,(1+1)+(2+2));assert.equal(g("Hyundai HY").m[0][0],3);assert.equal(g("Kia Thanh Hóa/Porsche").a25,18);
assert.equal(rb.notes.aliasApplied.length,3);
rb=X.convert(bk,ab,{includeSingle:false,guess:()=>"Khác"});assert.equal(rb.rows.length,4);
ab.sheets[0].year=null;rb=X.convert(bk,ab,{guess:()=>"Khác"});assert.equal(g("Kia A").a26,null);assert.equal(rb.notes.sheets[0].used,false);   // bỏ qua sheet khi chưa chọn năm
console.log("xlsx-convert (dạng KH/DS): đạt");
