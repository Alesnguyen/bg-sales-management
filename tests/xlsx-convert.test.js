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
