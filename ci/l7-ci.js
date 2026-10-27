#!/usr/bin/env node
/* ci/l7-ci.js -- CI test runner for the DMRC Line 7 viewer test suite.
 *
 * Serves this folder over http, opens l7-test.html headless with Playwright,
 * waits for the suite to finish, prints the checklist summary, and exits
 * non-zero on any FAIL or any SKIP not in an allowlist.
 *
 * Modes:
 *   http (default) -- l7-test.html is served over http:// and fetch() of the
 *                     built files works, so all 26 checks run. No skips are
 *                     expected; the allowlist is empty.
 *   file://        -- l7-test.html is opened as a local file. fetch() is
 *                     blocked from file://, so the structural fault-injection,
 *                     special-character, no-table and admin/export checks
 *                     self-skip. Those checks go in the file:// allowlist.
 *
 * Usage:
 *   node ci/l7-ci.js [--mode http|file] [--port 8765] [--allowlist 15,16,17,18,19,20]
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_PORT = 8765;

/* Checks that are allowed to SKIP. In http mode none are expected. In file://
   mode the suite itself skips the checks that need fetch() of the built/admin
   files (which file:// blocks). */
const DEFAULT_ALLOWLIST = {
  http: [],
  file: [15, 16, 17, 18, 19, 20],
};

function parseArgs(argv) {
  const args = { mode: "http", port: DEFAULT_PORT, allowlist: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mode") args.mode = argv[++i];
    else if (a === "--port") args.port = Number(argv[++i]) || DEFAULT_PORT;
    else if (a === "--allowlist") {
      args.allowlist = argv[++i].split(",").map(Number).filter(n => Number.isFinite(n));
    }
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node ci/l7-ci.js [--mode http|file] [--port 8765] [--allowlist 15,16,17,18,19,20]");
      process.exit(0);
    }
  }
  if (args.mode !== "http" && args.mode !== "file") {
    console.error("invalid --mode", args.mode, "(expected http or file)");
    process.exit(2);
  }
  if (args.allowlist === null) args.allowlist = DEFAULT_ALLOWLIST[args.mode];
  return args;
}

/* -------- tiny static file server -------- */
function serve(root, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(root, path.normalize(decodeURIComponent(req.url)));
      if (!filePath.startsWith(root + path.sep) && filePath !== root) {
        res.writeHead(403); res.end("forbidden"); return;
      }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.writeHead(404); res.end("not found"); return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const type = { ".html": "text/html", ".js": "application/javascript",
          ".css": "text/css", ".json": "application/json",
          ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
          ".svg": "image/svg+xml", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.listen(port, "127.0.0.1", err => (err ? reject(err) : resolve(server)));
  });
}

function waitForResult(page, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const guard = setTimeout(() => {
      if (!done) { done = true; reject(new Error("timed out waiting for test result")); }
    }, timeoutMs);

    const poll = async () => {
      if (done) return;
      try {
        const result = await page.evaluate(() => window.__TEST_RESULT);
        if (result) { done = true; clearTimeout(guard); resolve(result); return; }
        const ds = await page.evaluate(() => document.body && document.body.dataset.result);
        if (ds === "pass" || ds === "fail") {
          // result object may not be exposed yet; poll once more shortly
          setTimeout(poll, 100);
          return;
        }
      } catch (e) { /* page not ready yet */ }
      setTimeout(poll, 100);
    };
    poll();
  });
}

function printSummary(result, allowlist) {
  const { pass, fail, skip, checked, total, checklist } = result;
  const unexpectedSkips = checklist.filter(c => c.status === "SKIP" && !allowlist.includes(c.n));
  const fails = checklist.filter(c => c.status === "FAIL");
  const missing = checklist.filter(c => c.status === "MISSING");

  console.log("\n=== L7 test suite result ===");
  console.log(`mode          : ${process.env.L7_CI_MODE || "http"}`);
  console.log(`checks        : ${checked}/${total} checklist items checked`);
  console.log(`pass          : ${pass}`);
  console.log(`fail          : ${fail}`);
  console.log(`skip          : ${skip} (${unexpectedSkips.length} unexpected)`);
  if (missing.length) {
    console.log(`missing       : ${missing.length}`);
    missing.forEach(c => console.log(`  check ${c.n} [${c.cat}] ${c.name} -- never ran`));
  }
  if (unexpectedSkips.length) {
    console.log("unexpected skips (not in allowlist):");
    unexpectedSkips.forEach(c => console.log(`  check ${c.n} [${c.cat}] ${c.name}`));
  }
  if (fails.length) {
    console.log("failing checks:");
    fails.forEach(c => console.log(`  check ${c.n} [${c.cat}] ${c.name}`));
  }
  console.log(`\nallowlist     : ${JSON.stringify(allowlist)}`);
  console.log(`checklist detail:`);
  for (const c of checklist) {
    const flag = c.status === "PASS" ? "  " :
                 c.status === "FAIL" ? "!! " :
                 c.status === "SKIP" ? (allowlist.includes(c.n) ? "-- " : "?? ") : "-- ";
    console.log(`  ${flag}${String(c.n).padStart(2)} [${c.cat}] ${c.name} : ${c.status}`);
  }
  return { failCount: fail, unexpectedSkipCount: unexpectedSkips.length, missingCount: missing.length };
}

(async function main() {
  const args = parseArgs(process.argv.slice(2));
  process.env.L7_CI_MODE = args.mode;

  let server;
  let url;
  if (args.mode === "http") {
    server = await serve(ROOT, args.port);
    url = `http://127.0.0.1:${args.port}/l7-test.html`;
  } else {
    url = "file://" + path.join(ROOT, "l7-test.html").replace(/\\/g, "/");
  }
  console.log(`opening ${url}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console output from the page (the suite logs its own summary).
  page.on("console", msg => console.log(`[page] ${msg.text()}`));
  page.on("pageerror", err => console.log(`[page error] ${err.message}`));

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  const result = await waitForResult(page, 120000);
  await browser.close();
  if (server) server.close();

  const summary = printSummary(result, args.allowlist);

  if (summary.failCount > 0 || summary.unexpectedSkipCount > 0 || summary.missingCount > 0) {
    console.log("\nRESULT: FAIL (build should not pass)");
    process.exit(1);
  }
  console.log("\nRESULT: PASS (all checks passed, no unexpected skips)");
  process.exit(0);
})().catch(err => {
  console.error("CI runner error:", err.message);
  process.exit(2);
});
