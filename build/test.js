// 交互与错误检查
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const FILE = "file:///C:/Users/tian/WorkBuddy/%E7%94%B5%E5%AD%90%E9%82%80%E8%AF%B7%E5%87%BD/index.html";
const PORT = 9355;
const PROFILE = path.join(os.tmpdir(), "edge-test-" + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--no-first-run","--autoplay-policy=no-user-gesture-required",
    "--remote-debugging-port="+PORT,"--user-data-dir="+PROFILE,"--window-size=1440,900","about:blank"], { stdio:"ignore" });
  try {
    let v;
    for (let i=0;i<60;i++){ try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`); if(r.ok){v=await r.json();break;}}catch(_){} await sleep(400);}
    const bws = new WebSocket(v.webSocketDebuggerUrl);
    await new Promise(r=>bws.addEventListener("open",r));
    const bsend=(m,p={})=>new Promise((res,rej)=>{const id=Math.floor(Math.random()*1e9);
      const h=e=>{const x=JSON.parse(e.data); if(x.id===id){bws.removeEventListener("message",h);x.error?rej(new Error(JSON.stringify(x.error))):res(x.result);}};
      bws.addEventListener("message",h);bws.send(JSON.stringify({id,method:m,params:p}));});
    const {targetId}=await bsend("Target.createTarget",{url:"about:blank"});
    const {sessionId}=await bsend("Target.attachToTarget",{targetId,flatten:true});
    const send=(m,p={})=>new Promise((res,rej)=>{const id=Math.floor(Math.random()*1e9);
      const h=e=>{const x=JSON.parse(e.data); if(x.id===id){bws.removeEventListener("message",h);x.error?rej(new Error(JSON.stringify(x.error))):res(x.result);}};
      bws.addEventListener("message",h);bws.send(JSON.stringify({id,method:m,params:p,sessionId}));
      setTimeout(()=>{bws.removeEventListener("message",h);rej(new Error("t/o "+m));},40000);});
    const ev = e => send("Runtime.evaluate",{expression:e,awaitPromise:true,returnByValue:true});

    const errs = [];
    bws.addEventListener("message", e => {
      const x = JSON.parse(e.data);
      if (x.method === "Runtime.exceptionThrown") errs.push("EXC: " + JSON.stringify(x.params.exceptionDetails.exception?.description || x.params.exceptionDetails.text));
      if (x.method === "Runtime.consoleAPICalled" && x.params.type === "error") errs.push("CONSOLE: " + x.params.args.map(a=>a.value||a.description).join(" "));
      if (x.method === "Log.entryAdded" && x.params.entry.level === "error") errs.push("LOG: " + x.params.entry.text);
    });

    await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");
    await send("Page.navigate",{url:FILE}); await sleep(3500);

    const r = async (label, expr) => { const x = await ev(expr); console.log(label, "=>", JSON.stringify(x.result.value)); };

    await r("图片数量", `document.querySelectorAll('#gallery img').length`);
    await r("图片是否都加载", `[...document.querySelectorAll('#gallery img')].every(i=>i.complete && i.naturalWidth>0)`);
    await r("封面图加载", `(()=>{const i=document.querySelector('.cover__bg img');return i.complete&&i.naturalWidth>0})()`);
    await r("倒数天", `document.getElementById('cd-d').textContent`);
    await r("倒数时分秒", `document.getElementById('cd-h').textContent+':'+document.getElementById('cd-m').textContent+':'+document.getElementById('cd-s').textContent`);

    // 点开灯箱
    await ev(`document.documentElement.style.scrollBehavior='auto';document.querySelector('#gallery .shot').click()`);
    await sleep(500);
    await r("灯箱已打开", `document.getElementById('lightbox').classList.contains('on')`);
    await r("灯箱图片src", `document.getElementById('lbImg').src.split('/').pop()`);

    // 下一张
    await ev(`document.getElementById('lbNext').click()`); await sleep(400);
    await r("下一张", `document.getElementById('lbImg').src.split('/').pop()`);
    await ev(`document.getElementById('lbClose').click()`); await sleep(400);
    await r("灯箱已关闭", `!document.getElementById('lightbox').classList.contains('on')`);

    // 复制地址
    await ev(`document.getElementById('copyAddr').click()`); await sleep(500);
    await r("Toast 出现", `document.getElementById('toast').classList.contains('on')`);

    // 音乐
    await ev(`document.getElementById('music').click()`); await sleep(1200);
    await r("音乐按钮显示", `document.getElementById('music').classList.contains('show')`);
    await r("音乐未暂停(播放中)", `!document.getElementById('music').classList.contains('paused')`);
    await ev(`document.getElementById('music').click()`); await sleep(500);
    await r("音乐已暂停", `document.getElementById('music').classList.contains('paused')`);
    await ev(`document.getElementById('music').click()`); await sleep(800);
    await r("音乐恢复播放", `!document.getElementById('music').classList.contains('paused')`);

    // 地图按钮存在
    await r("导航链接可用", `!!(document.getElementById('navAmap') && document.getElementById('navBaidu'))`);

    await sleep(1200);
    console.log("---- 页面错误 ----");
    console.log(errs.length ? errs.join("\n") : "无错误");
  } catch(e){ console.error("ERR", e.message); }
  finally { try{proc.kill();}catch(_){}; setTimeout(()=>{try{proc.kill("SIGKILL")}catch(_){};process.exit(0);},600); }
})();
