// 模拟大陆网络环境：屏蔽 Google Fonts 域名，检验降级效果与可用性
const { spawn } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const FILE = "file:///C:/Users/tian/WorkBuddy/%E7%94%B5%E5%AD%90%E9%82%80%E8%AF%B7%E5%87%BD/index.html";
const OUT = "C:\\Users\\tian\\WorkBuddy\\电子邀请函\\build\\shots";
fs.mkdirSync(OUT, { recursive: true });
const PORT = 9388, PROFILE = path.join(os.tmpdir(), "edge-cn-" + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run",
    "--remote-debugging-port="+PORT, "--user-data-dir="+PROFILE, "--window-size=390,844","about:blank"], { stdio:"ignore" });
  try {
    let v;
    for (let i=0;i<60;i++){ try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`); if(r.ok){v=await r.json();break;}}catch(_){} await sleep(400); }
    const bws = new WebSocket(v.webSocketDebuggerUrl);
    await new Promise(r=>bws.addEventListener("open",r));
    const bs=(m,p={})=>new Promise((res,rej)=>{const id=Math.floor(Math.random()*1e9);
      const h=e=>{const x=JSON.parse(e.data);if(x.id===id){bws.removeEventListener("message",h);x.error?rej(new Error(JSON.stringify(x.error))):res(x.result);}};
      bws.addEventListener("message",h);bws.send(JSON.stringify({id,method:m,params:p}));});
    const {targetId}=await bs("Target.createTarget",{url:"about:blank"});
    const {sessionId}=await bs("Target.attachToTarget",{targetId,flatten:true});
    const send=(m,p={})=>new Promise((res,rej)=>{const id=Math.floor(Math.random()*1e9);
      const h=e=>{const x=JSON.parse(e.data);if(x.id===id){bws.removeEventListener("message",h);x.error?rej(new Error(JSON.stringify(x.error))):res(x.result);}};
      bws.addEventListener("message",h);bws.send(JSON.stringify({id,method:m,params:p,sessionId}));
      setTimeout(()=>{bws.removeEventListener("message",h);rej(new Error("t/o "+m));},40000);});
    const ev = e => send("Runtime.evaluate",{expression:e,awaitPromise:true,returnByValue:true});

    await send("Page.enable"); await send("Runtime.enable");
    await send("Network.enable");
    // 关键：屏蔽 Google 字体，模拟大陆网络
    await send("Network.setBlockedURLs", { urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"] });
    await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:2,mobile:true});
    await send("Emulation.setTouchEmulationEnabled",{enabled:true});

    const t0 = Date.now();
    await send("Page.navigate",{url:FILE});
    await sleep(1500);
    // 首屏是否已经能滚动？（即 unlock 兜底是否生效）
    const lock = await ev(`({overflow:document.documentElement.style.overflow, ready:document.body.classList.contains('ready')})`);
    console.log("1700ms 后:", JSON.stringify(lock.result.value));
    const {data} = await send("Page.captureScreenshot",{format:"png"});
    fs.writeFileSync(path.join(OUT,"cn_cover.png"), Buffer.from(data,"base64"));

    // 等久一点看字体是否一直没来、以及整体是否正常
    await sleep(3000);
    await ev(`document.documentElement.style.scrollBehavior='auto'`);
    await ev(`(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,80));}window.scrollTo(0,0);})()`);
    await sleep(1200);
    await ev(`document.querySelector('.letter').scrollIntoView({block:'start'})`);
    await sleep(600);
    const {data:d2} = await send("Page.captureScreenshot",{format:"png"});
    fs.writeFileSync(path.join(OUT,"cn_letter.png"), Buffer.from(d2,"base64"));

    const st = await ev(`({
      coverH: Math.round(document.querySelector('.cover').getBoundingClientRect().height),
      viewportH: window.innerHeight,
      canScroll: document.documentElement.scrollHeight > window.innerHeight,
      imgsOk: [...document.querySelectorAll('#gallery img')].filter(i=>i.complete&&i.naturalWidth>0).length,
      bodyFont: getComputedStyle(document.querySelector('.cover__names')).fontFamily
    })`);
    console.log("状态:", JSON.stringify(st.result.value, null, 1));
    console.log("耗时:", Date.now()-t0, "ms");
  } catch(e){ console.error("ERR", e.message); }
  finally { try{proc.kill();}catch(_){}; setTimeout(()=>{try{proc.kill("SIGKILL")}catch(_){};process.exit(0);},600); }
})();
