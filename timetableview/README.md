# Line 7 — Time Table View

Standalone, self-contained timetable viewer and admin console for the DMRC Line 7
(Pink Corridor) timetable, plus the build tooling that generates them.

This folder is embedded into the main `index.html` app (see the root `README`/project
notes): the viewer is shown from a **Time Table View** link on the home page, and the
admin console is a **Time Table** tab in the admin console, restricted to admin-level
users.

When the console is opened from that tab the main app has already logged the operator
in, so the app sends the frame an `L7_ADMIN_UNLOCK` `postMessage` and the console skips
its own passphrase. Opened directly (standalone) it stays locked. The app loads both
pages with a `?v=<L7_TT_VERSION>` query: bump `L7_TT_VERSION` in the root `app.js`
whenever this folder is rebuilt so browsers fetch the new copy.

## Files

| File | Role |
|---|---|
| `timetable.xlsx` | Source workbook (single sheet `07WDC09_24092026`). The only build input that changes with a new timetable. |
| `extract.py` | Build script (Python 3, standard library only). Reads the workbook and writes everything below. |
| `l7-template.html` | Viewer template. Markers `/*__L7_DATA__*/`, `/*__L7_META__*/`, `/*__L7_CSS__*/`, `/*__L7_SUPA__*/` are replaced at build time. |
| `l7-admin-template.html` | Admin template. Carries `/*__L7_UPLOAD__*/`, `/*__L7_SUPA__*/` and a base64 copy of the built viewer (`/*__L7_BASE__*/`). |
| `l7-supa.json` | Optional online-sync endpoint (`url`, `anonKey`, `table`). Delete it to build fully-offline pages. |
| `supabase/l7_timetable.sql` | One-time Supabase migration: the `l7_timetable` table and `l7_publish()` used by online sync. |
| `l7-upload.js` | Dependency-free browser XLSX engine used by the admin console. |
| `style.css` | Viewer/admin stylesheet (inlined into both builds). |
| `l7-meta.json` | Optional metadata overrides (corridor text, WEF/notes, date programme). Edited by the admin export. |
| `l7-data.js`, `l7-meta.js` | Generated: the `window.L7_DATA` / `window.L7_META` payloads. |
| `line7-timetable-timesync.html` | **Generated** deployable viewer. |
| `line7-timetable-admin.html` | **Generated** deployable admin console. |
| `l7-test.html` | Browser regression suite (26 checks). Drives the generated files in hidden iframes. |
| `l7-test-results.md` | Latest recorded suite result. |

## Build

```
python extract.py
```

It regenerates `l7-data.js`, `l7-meta.js`, `line7-timetable-timesync.html` and
`line7-timetable-admin.html`, then runs a gate that refuses to ship a file which is
not self-contained or that presents itself as an ATS. "Self-contained" means no
external URLs, `<script src>`, `<link href>`, `@import` or non-`data:` `url()`, with
one deliberate exception: when `l7-supa.json` names an online-sync endpoint, that
single host is permitted and every other external URL still fails the build.

## Test

The suite fetches the generated files, so it must be served over HTTP (not `file://`):

```
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/timetableview/l7-test.html`. `window.__TEST_RESULT`
holds the machine-readable result.

## Online sync (optional)

By default the timetable is baked into the file. To let the admin console publish a
timetable that online viewers pick up without a redeploy:

1. Run `supabase/l7_timetable.sql` once in the Supabase SQL editor.
2. Rebuild. `extract.py` reads `l7-supa.json` and embeds `window.L7_SUPA` into both
   pages; the endpoint it names becomes the one permitted external host.
3. In the admin console's **Export** tab press **PUBLISH ONLINE**. This calls the
   `l7_publish()` RPC, which clears the old `is_current` row and inserts the new one
   atomically.
4. End-user viewers served over http(s) fetch the current row on load and prefer it;
   from `file://`, offline, or on any error they use their baked-in copy. The chosen
   source is on `window.__L7_SOURCE` (`"online"` or `"embedded"`).

Authentication caveat: the app uses the Supabase **anon** key with its own in-page
login, so Postgres RLS cannot tell admins from visitors and the shipped policies are
permissive (writes are gated by the app). Harden later by moving to Supabase Auth and
tightening the `l7_write` policy, as described in the SQL file.

## Notes

- The generated files open straight from disk with **no network**: the payload is
  baked in, and the viewer only attempts its optional Supabase fetch over http(s),
  never from `file://`. If that fetch fails, times out or returns nothing, it boots
  the baked-in copy. Keep every other network reference out: the build gate rejects
  any external URL other than the configured sync endpoint.
- Operator-typed text is serialised with `<` escaped as `\u003c` and rendered with
  `textContent`/DOM only — never `innerHTML`.
