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
    const depot = {}, trip = {};
    for (let c = 3; c <= 12; c++) { depot[c + ",7"] = sheet.cells[c + ",7"]; trip[c + ",1"] = sheet.cells[c + ",1"]; }
    return { sheets: wb.sheets.map(s => s.name), depot, trip, nSheets: wb.sheets.length };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})();
