const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const ROOT = "E:\\opencodetest\\Time Table view";
const xlsxBase64 = fs.readFileSync(path.join(ROOT, "timetable.xlsx"), { encoding: "base64" });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const uploadJs = fs.readFileSync(path.join(ROOT, "l7-upload.js"), "utf8");
  await page.goto("about:blank");
  await page.evaluate(function ({ u, b }) {
    window.__x = b;
    eval(u);
  }, { u: uploadJs, b: xlsxBase64 });
  const info = await page.evaluate(async function () {
    const bin = atob(window.__x);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const wb = await window.L7_UPLOAD.readWorkbook(bytes.buffer);
    const sheet = wb.sheets.find(s => s.name === "07WDC09_24092026") || wb.sheets[0];
    const data = window.L7_UPLOAD.buildFromCells(sheet.cells);
    const out = [];
    for (let i = 0; i < data.dn.length; i++) {
      const r = data.dn[i];
      if ([25, 49, 72, 92, 112].includes(i)) out.push({ i, n: r.n, d: r.d, a: r.a, b: r.b });
    }
    return { dnCount: data.dn.length, upCount: data.up.length, sample: out, stops: data.stops, ring: data.ring };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})();
