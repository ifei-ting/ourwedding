// 定点截图：滚动到指定元素并截取
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const FILE = "file:///C:/Users/tian/WorkBuddy/%E7%94%B5%E5%AD%90%E9%82%80%E8%AF%B7%E5%87%BD/index.html";
const OUT = "C:\\Users\\tian\\WorkBuddy\\电子邀请函\\build\\shots";
fs.mkdirSync(OUT, { recursive: true });
const PORT = 9345;
const PROFILE = path.join(os.tmpdir(), "edge-shot-" + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--mute-audio",
    "--remote-debugging-port="+PORT,"--user-data-dir="+PROFILE,"--window-size=390,844","about:blank"], { stdio:"ignore" });
  try {
    let v;
    for (let i=0;i<60;i++){ try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`); if(r.ok){v=await r.json();break;}}catch(_){} await sleep(400);}
    const bws = new WebSocket(v.webSocketDebuggerUrl);
    await new Promise(r=>bws.addEventListener("open",r));
    const bsend = (m,p={})=>new Promise((res,rej)=>{const id=Math.floor(Math.random()*1e9);
      const h=e=>{const x=JSON.parse(e.data); if(x.id===id){bws.removeEventListener("message",h); x.error?rej(new Error(JSON.stringify(x.error))):res(x.result);}};
      bws.addEventListener("message",h); bws.send(JSON.stringify({id,method:m,params:p}));});
    const {targetId}=await bsend("Target.createTarget",{url:"about:blank"});
    const {sessionId}=await bsend("Target.attachToTarget",{targetId,flatten:true});
    const send=(m,p={})=>new Promise((res,rej)=>{const id=Math.floor(Math.random()*1e9);
      const h=e=>{const x=JSON.parse(e.data); if(x.id===id){bws.removeEventListener("message",h); x.error?rej(new Error(JSON.stringify(x.error))):res(x.result);}};
      bws.addEventListener("message",h); bws.send(JSON.stringify({id,method:m,params:p,sessionId}));
      setTimeout(()=>{bws.removeEventListener("message",h);rej(new Error("t/o "+m));},40000);});
    const ev = e => send("Runtime.evaluate",{expression:e,awaitPromise:true,returnByValue:true});

    const mode = process.argv[2] === "d" ? "d" : "m";
    if (mode === "m") { await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:2,mobile:true}); await send("Emulation.setTouchEmulationEnabled",{enabled:true}); }
    else { await send("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false}); }
    await send("Page.enable"); await send("Runtime.enable");
    await send("Page.navigate",{url:FILE}); await sleep(4000);
    await ev(`document.documentElement.style.scrollBehavior='auto'`);
    // 先整体滚动一遍触发 reveal
    await ev(`(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,300));})()`);
    await sleep(800);

    const targets = [["info",".info"],["ending",".ending"],["foot","footer"],["date","#count"],["gallery","#gallery"]];
    for (const [name, sel] of targets) {
      await ev(`document.querySelector('${sel}').scrollIntoView({block:'center'})`);
      await sleep(600);
      const {data} = await send("Page.captureScreenshot",{format:"png"});
      fs.writeFileSync(path.join(OUT, mode+"_"+name+".png"), Buffer.from(data,"base64"));
    }
    console.log("done", mode);
  } catch(e){ console.error("ERR", e.message); }
  finally { try{proc.kill();}catch(_){}; setTimeout(()=>{try{proc.kill("SIGKILL")}catch(_){};process.exit(0);},600); }
})();
