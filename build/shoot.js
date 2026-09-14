const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const FILE = "file:///C:/Users/tian/WorkBuddy/%E7%94%B5%E5%AD%90%E9%82%80%E8%AF%B7%E5%87%BD/index.html";
const OUT = "C:\\Users\\tian\\WorkBuddy\\电子邀请函\\build\\shots";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--force-device-scale-factor=1", "--hide-scrollbars"],
  });

  // ---- 桌面 ----
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(FILE, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise(r => setTimeout(r, 1800));
  // 触发所有 reveal
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 1200));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 600));
  });

  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log("page height:", H);

  const spots = [0, 900, 1800, 2700, 3600, 4500, 5400, 6300, 7200, 8100, 9000];
  for (let i = 0; i < spots.length; i++) {
    if (spots[i] > H - 900 + 60 && i > 0) break;
    await page.evaluate(y => window.scrollTo(0, y), spots[i]);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, `d${String(i).padStart(2, "0")}.png`) });
  }
  console.log("desktop shots done");

  // ---- 手机 ----
  const m = await browser.newPage();
  await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.goto(FILE, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise(r => setTimeout(r, 1600));
  await m.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 1200));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 600));
  });
  const MH = await m.evaluate(() => document.documentElement.scrollHeight);
  console.log("mobile height:", MH);
  for (let i = 0; i < 6; i++) {
    await m.evaluate(y => window.scrollTo(0, y), i * 800);
    await new Promise(r => setTimeout(r, 400));
    await m.screenshot({ path: path.join(OUT, `m${String(i).padStart(2, "0")}.png`) });
  }
  console.log("mobile shots done");

  await browser.close();
})();
