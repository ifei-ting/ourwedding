const { spawn } = require("child_process"); const path=require("path"), os=require("os");
const EDGE="C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe";
const FILE="file:///C:/Users/tian/WorkBuddy/%E7%94%B5%E5%AD%90%E9%82%80%E8%AF%B7%E5%87%BD/index.html";
const PORT=9377, PROFILE=path.join(os.tmpdir(),"edge-chk-"+Date.now());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const proc=spawn(EDGE,["--headless=new","--disable-gpu","--no-first-run","--remote-debugging-port="+PORT,"--user-data-dir="+PROFILE,"--window-size=1440,900","about:blank"],{stdio:"ignore"});
try{ let v; for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`);if(r.ok){v=await r.json();break;}}catch(_){} await sleep(400);}
const bws=new WebSocket(v.webSocketDebuggerUrl); await new Promise(r=>bws.addEventListener("open",r));
const bs=(m,p={})=>new Promise((res,rej)=>{const id=Math.floor(Math.random()*1e9);const h=e=>{const x=JSON.parse(e.data);if(x.id===id){bws.removeEventListener("message",h);x.error?rej(new Error(JSON.stringify(x.error))):res(x.result);}};bws.addEventListener("message",h);bws.send(JSON.stringify({id,method:m,params:p}));});
const{targetId}=await bs("Target.createTarget",{url:"about:blank"});const{sessionId}=await bs("Target.attachToTarget",{targetId,flatten:true});
const send=(m,p={})=>new Promise((res,rej)=>{const id=Math.floor(Math.random()*1e9);const h=e=>{const x=JSON.parse(e.data);if(x.id===id){bws.removeEventListener("message",h);x.error?rej(new Error(JSON.stringify(x.error))):res(x.result);}};bws.addEventListener("message",h);bws.send(JSON.stringify({id,method:m,params:p,sessionId}));setTimeout(()=>{bws.removeEventListener("message",h);rej(new Error("t/o "+m));},40000);});
const ev=e=>send("Runtime.evaluate",{expression:e,awaitPromise:true,returnByValue:true});
await send("Page.enable");await send("Runtime.enable");await send("Page.navigate",{url:FILE});await sleep(3500);
await ev(`(async()=>{document.documentElement.style.scrollBehavior='auto';const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}window.scrollTo(0,0);})()`);
await sleep(2500);
const out = await ev(`(()=>{const imgs=[...document.querySelectorAll('img')];const bad=imgs.filter(i=>!(i.complete&&i.naturalWidth>0)).map(i=>i.getAttribute('src'));return {total:imgs.length, bad, h:document.documentElement.scrollHeight};})()`);
console.log(JSON.stringify(out.result.value,null,1));
}catch(e){console.error("ERR",e.message);}finally{try{proc.kill()}catch(_){};setTimeout(()=>{try{proc.kill("SIGKILL")}catch(_){};process.exit(0)},600);}})();
