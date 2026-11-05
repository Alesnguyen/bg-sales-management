const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");const A=require("../amis.js");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"amis-"));
const ss={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from("ENC:"+Buffer.from(s).toString("base64")),decryptString:b=>Buffer.from(b.toString().slice(4),"base64").toString()};
const mk=n=>Array.from({length:n},(_,i)=>({oid:"O"+i,sale_order_no:"SO"+i,aid:"A"+(i%3),account_name:"KH "+(i%3),odate:"2026-03-0"+(1+i%9),mdate:new Date(Date.UTC(2026,2,30,10,0)-i*3600e3).toISOString(),status:i%2?"Hoàn thành":"Mới",own:["Nguyễn Năng Nghĩa","Trần Phú Tâm","Dương Quang Linh"][i%3],kg:i%5===0,amt:String(1000*(i+1))}));
const DATA=mk(230);let calls=[],tokenCalls=0,expire401=false,r429=0;
const fetchImpl=async(url,o)=>{calls.push({url,method:o.method,h:o.headers});const res=(s,j,h={})=>({status:s,headers:{get:k=>h[k]||null},text:async()=>JSON.stringify(j)});
 if(url.endsWith("/Account")){tokenCalls++;if(o.headers["api-key"]!=="KEY12345")return res(401,{message:"bad key "+o.headers["api-key"]});return res(200,{data:{access_token:"TOKEN-ABCDEFGHIJ",expires_in:3600}})}
 if(expire401){expire401=false;return res(401,{})}
 if(r429>0){r429--;return res(429,{},{"retry-after":"0"})}
 const u=new URL(url),p=+u.searchParams.get("page"),ps=+u.searchParams.get("pageSize");
 assert.equal(o.headers.Authorization,"Bearer TOKEN-ABCDEFGHIJ");assert.equal(u.searchParams.get("isDescending"),"true");
 return res(200,{success:true,data:DATA.slice((p-1)*ps,p*ps),total:DATA.length})};
(async()=>{
 const a=A.create({safeStorage:ss,dir,fetchImpl,minGapMs:0,baseUrl:"https://mock.test/v1"});
 assert.equal(a.status().complete,false);
 let r=await a.test();assert.equal(r.ok,false);assert.equal(r.code,"NOT_CONFIGURED");
 r=await a.saveSecrets({apiKey:"WRONG",clientId:"CID98765",clientSecret:"SECRET4321"});assert.equal(r.ok,true);assert.equal(r.complete,true);
 assert(!fs.readFileSync(path.join(dir,"amis-secrets.bin")).toString().includes("SECRET4321")); // không lưu dạng thô
 r=await a.test();assert.equal(r.ok,false);assert.equal(r.code,"AUTH");assert(!r.message.includes("WRONG"));
 await a.saveSecrets({apiKey:"KEY12345"});r=await a.test();assert.equal(r.ok,true);
 // thăm dò cấu trúc
 r=await a.probe("SaleOrders");assert.equal(r.ok,true);assert.equal(r.listPath,"data");assert.equal(r.total,230);assert(r.fields.some(f=>f.path==="account_name"));
 r=await a.probe("Hack");assert.equal(r.ok,false);
 const map={owner:"own",consign:"kg",orderId:"oid",orderNo:"sale_order_no",accountId:"aid",accountName:"account_name",orderDate:"odate",modified:"mdate",status:"status",amount:"amt"};
 // kéo toàn bộ (3 trang)
 calls=[];r=await a.fetchOrders({map,pageSize:100});assert.equal(r.ok,true);assert.equal(r.orders.length,230);assert.equal(r.pages,3);assert.deepEqual(Object.keys(r.statuses).sort(),["Hoàn thành","Mới"]);
 assert.equal(r.maxModified,Date.UTC(2026,2,30,10,0));
 assert.equal(Object.keys(r.owners).length,3);assert.equal(r.owners["Nguyễn Năng Nghĩa"],77);assert.deepEqual(Object.keys(r.consigns).sort(),["false","true"]);assert.equal(r.consigns["true"],46);assert.equal(r.orders.find(o=>o.id==="O0").consign,"true");
 // dừng sớm khi qua mốc: chỉ trang 1 vì bản ghi cuối trang 1 (i=99) cũ hơn mốc
 calls=[];const stop=Date.UTC(2026,2,30,10,0)-10*3600e3;r=await a.fetchOrders({map,pageSize:100,stopBefore:stop});assert.equal(r.pages,1);assert.equal(r.stoppedEarly,true);
 // 401 giữa chừng → làm mới token; 429 → thử lại
 tokenCalls=0;expire401=true;r429=1;r=await a.fetchOrders({map,pageSize:200,maxPages:1});assert.equal(r.ok,true);assert(tokenCalls>=1);
 // đơn lỗi ánh xạ được báo, không làm hỏng cả lượt
 r=await a.fetchOrders({map:{...map,amount:"khong_co"},pageSize:200,maxPages:1});assert.equal(r.ok,true);assert.equal(r.orders.length,0);assert(r.invalid.length>0);
 // mạng đứt
 const b=A.create({safeStorage:ss,dir,fetchImpl:async()=>{throw new TypeError("fetch failed")},minGapMs:0,baseUrl:"https://mock.test/v1"});
 r=await b.test();assert.equal(r.code,"OFFLINE");
 // chặn tên miền lạ khi chạy thật
 assert.throws(()=>A.create({safeStorage:ss,dir,baseUrl:"https://evil.example.com/v1"}));assert.throws(()=>A.create({safeStorage:ss,dir,baseUrl:"http://developer.misa.vn/x"}));
 // không có mã hóa → từ chối lưu
 const c=A.create({safeStorage:{isEncryptionAvailable:()=>false},dir:dir+"2",fetchImpl,baseUrl:"https://mock.test/v1"});r=await c.saveSecrets({apiKey:"a",clientId:"b",clientSecret:"c"});assert.equal(r.code,"NO_ENCRYPTION");
 // xóa khóa
 r=await a.clearSecrets();assert.equal(r.complete,false);
 console.log("amis-client: tất cả kiểm thử đạt");
})().catch(e=>{console.error(e);process.exit(1)});
