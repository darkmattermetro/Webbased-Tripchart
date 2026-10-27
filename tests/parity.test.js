// tests/parity.test.js -- parity test: python extract.py vs JS l7-upload.js.
//
// Runs python extract.py on the fixture workbook, loads l7-upload.js against
// the same workbook in a headless browser, and deep-compares dn/up arrays,
// stops, ring flag and _stats. Fails (throws / exits non-zero) on any
// difference.
//
// Run with:  node tests/parity.test.js
//            (uses node:test; exits 0 on pass, 1 on any difference)

"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const XLSX = path.join(ROOT, "timetable.xlsx");
const PYTHON = process.env.PYTHON || "python";

/* Deep comparison returning a list of human-readable difference messages. */
function deepEqual(a, b, at) {
  const diffs = [];
  const aType = Array.isArray(a) ? "array" : a === null ? "null" : typeof a;
  const bType = Array.isArray(b) ? "array" : b === null ? "null" : typeof b;
  if (aType !== bType) {
    diffs.push(`${at || "$"}: type mismatch (${aType} vs ${bType})`);
    return diffs;
  }
  if (aType === "array") {
    if (a.length !== b.length) {
      diffs.push(`${at || "$"}: array length ${a.length} vs ${b.length}`);
    }
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      diffs.push(...deepEqual(a[i], b[i], `${at || "$"}[${i}]`));
    }
  } else if (aType === "object" && a !== null) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      diffs.push(...deepEqual(a[k], b[k], `${at || "$"}.${k}`));
    }
  } else if (a !== b) {
    diffs.push(`${at || "$"}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  }
  return diffs;
}

test("parity: python extract.py build() == JS l7-upload.js buildFromCells()", async () => {
  /* 1. Rebuild the fixtures with python extract.py (same workbook the build
     step uses). This regenerates l7-data.js etc. from timetable.xlsx. */
  execFileSync(PYTHON, [path.join(ROOT, "extract.py")], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });

  /* 2. Python-side ground truth: extract.build() on the same workbook. */
  const pyOut = execFileSync(PYTHON, [path.join(__dirname, "parity_fixture.py")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const pyData = JSON.parse(pyOut);

  /* 3. Read the fixture workbook as base64 to hand to the browser page. */
  const xlsxBase64 = fs.readFileSync(XLSX, { encoding: "base64" });

  /* 4. Load l7-upload.js + l7-data.js in a headless page and run the JS
     extraction. l7-upload.js needs a real window (DOMParser,
     DecompressionStream, TextDecoder, atob) so it runs in the browser, not
     plain Node. */
  const browser = await chromium.launch({ headless: true });
  let jsData;
  try {
    const page = await browser.newPage();
    const uploadJs = fs.readFileSync(path.join(ROOT, "l7-upload.js"), "utf8");
    const dataJs = fs.readFileSync(path.join(ROOT, "l7-data.js"), "utf8");

    await page.goto("about:blank", { waitUntil: "domcontentloaded" });

    /* Inject both scripts and stash the base64 workbook on window. */
    await page.evaluate(({ uploadJs, dataJs, xlsxBase64 }) => {
      window.__xlsxBase64 = xlsxBase64;
      new Function(uploadJs)();   // defines window.L7_UPLOAD
      new Function(dataJs)();     // defines window.L7_DATA
    }, { uploadJs, dataJs, xlsxBase64 });

    jsData = await page.evaluate(async () => {
      const bin = atob(window.__xlsxBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const wb = await window.L7_UPLOAD.readWorkbook(bytes.buffer);
      const sheet = wb.sheets.find(s => s.name === "07WDC09_24092026") || wb.sheets[0];
      if (!sheet.cells) throw new Error("uploaded sheet has no cells");
      return window.L7_UPLOAD.buildFromCells(sheet.cells);
    });
    await page.close();
  } finally {
    await browser.close();
  }

  /* 5. Deep-compare dn/up arrays, stops, ring flag and _stats. */
  const diffs = [];
  diffs.push(...deepEqual(jsData.stops, pyData.stops, "stops"));
  diffs.push(...deepEqual(jsData.ring, pyData.ring, "ring"));
  diffs.push(...deepEqual(jsData.dn, pyData.dn, "dn"));
  diffs.push(...deepEqual(jsData.up, pyData.up, "up"));
  diffs.push(...deepEqual(jsData._stats, pyData._stats, "_stats"));

  if (diffs.length) {
    console.log("PARITY MISMATCHES:");
    for (const d of diffs) console.log("  " + d);
    assert.fail(`parity check failed: ${diffs.length} difference(s) between python build() and JS buildFromCells()`);
  }

  console.log(
    `parity OK: ${jsData.dn.length} DN + ${jsData.up.length} UP trips, ` +
    `${jsData.stops.length} stops, ring=${jsData.ring}, ` +
    `repaired=${jsData._stats.repaired}, zero=${jsData._stats.zero}, dropped=${jsData._stats.dropped.length}`
  );
});
