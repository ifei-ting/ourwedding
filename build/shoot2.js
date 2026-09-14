// 用 Edge 的 DevTools 协议截图，零依赖（Node 22 自带 fetch / WebSocket）
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const FILE = "file:///C:/Users/tian/WorkBuddy/%E7%94%B5%E5%AD%90%E9%82%80%E8%AF%B7%E5%87%BD/index.html";
const OUT = "C:\\Users\\tian\\WorkBuddy\\电子邀请函\\build\\shots";
fs.mkdirSync(OUT, { recursive: true });

const PORT = 9333;
const PROFILE = path.join(os.tmpdir(), "edge-shot-profile-" + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++cdp._id;
    const onMsg = ev => {
      const m = JSON.parse(ev.data);
      if (m.id === id) { ws.removeEventListener("message", onMsg); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); }
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { ws.removeEventListener("message", onMsg); reject(new Error("timeout " + method)); }, 30000);
  });
}
cdp._id = 0;

async function waitHttp(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch (_) {}
    await sleep(400);
  }
  throw new Error("devtools not ready: " + url);
}

(async () => {
  const proc = spawn(EDGE, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    "--no-default-browser-check", "--mute-audio",
    "--remote-debugging-port=" + PORT, "--user-data-dir=" + PROFILE,
    "--window-size=1440,900", "about:blank"
  ], { stdio: "ignore", detached: false });

  try {
    await waitHttp(`http://127.0.0.1:${PORT}/json/version`);
    const v = await waitHttp(`http://127.0.0.1:${PORT}/json/version`);
    const ws = new WebSocket(v.webSocketDebuggerUrl.replace(/\/devtools\/browser\/.*$/, ""));
    // 使用 browser 端点建 Target
    const bws = new WebSocket(v.webSocketDebuggerUrl);
    await new Promise(r => bws.addEventListener("open", r));
    const bcdp = (m, p) => new Promise((resolve, reject) => {
      const id = ++cdp._id;
      const onMsg = ev => { const x = JSON.parse(ev.data); if (x.id === id) { bws.removeEventListener("message", onMsg); x.error ? reject(new Error(JSON.stringify(x.error))) : resolve(x.result); } };
      bws.addEventListener("message", onMsg);
      bws.send(JSON.stringify({ id, method: m, params: p }));
    });
    const { targetId } = await bcdp("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await bcdp("Target.attachToTarget", { targetId, flatten: true });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++cdp._id;
      const onMsg = ev => {
        const x = JSON.parse(ev.data);
        if (x.id === id) { bws.removeEventListener("message", onMsg); x.error ? reject(new Error(JSON.stringify(x.error))) : resolve(x.result); }
      };
      bws.addEventListener("message", onMsg);
      bws.send(JSON.stringify({ id, method, params, sessionId }));
      setTimeout(() => { bws.removeEventListener("message", onMsg); reject(new Error("timeout " + method)); }, 40000);
    });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: FILE });
    await sleep(4200);

    const shot = async (name) => {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(data, "base64"));
    };
    const evalJs = expr => send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });

    await evalJs(`document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,document.body.scrollHeight);`);
    await sleep(1500);
    await evalJs(`window.scrollTo(0,0)`);
    await sleep(800);

    const h = (await evalJs(`document.documentElement.scrollHeight`)).result.value;
    console.log("desktop height:", h);

    let i = 0;
    for (let y = 0; y < h - 100; y += 860) {
      await evalJs(`window.scrollTo(0,${y})`);
      await sleep(450);
      await shot("d" + String(i).padStart(2, "0"));
      i++;
      if (i > 16) break;
    }
    console.log("desktop shots:", i);

    // 手机视图
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await send("Page.navigate", { url: FILE });
    await sleep(3600);
    await evalJs(`document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,document.body.scrollHeight);`);
    await sleep(1500);
    await evalJs(`window.scrollTo(0,0)`);
    await sleep(700);
    for (let k = 0; k < 8; k++) {
      await evalJs(`window.scrollTo(0,${k * 820})`);
      await sleep(420);
      await shot("m" + String(k).padStart(2, "0"));
    }
    console.log("mobile shots done");

    await send("Emulation.clearDeviceMetricsOverride").catch(() => {});
  } catch (e) {
    console.error("ERR", e.message);
  } finally {
    try { proc.kill(); } catch (_) {}
    setTimeout(() => { try { proc.kill("SIGKILL"); } catch (_) {} process.exit(0); }, 600);
  }
})();
