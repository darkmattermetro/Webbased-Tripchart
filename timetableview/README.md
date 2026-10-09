# Line 7 — Time Table View

Standalone, self-contained timetable viewer and admin console for the DMRC Line 7
(Pink Corridor) timetable, plus the build tooling that generates them.

This folder is embedded into the main `index.html` app (see the root `README`/project
notes): the viewer is shown from a **Time Table View** link on the home page, and the
admin console is available as a **Time Table** tab in the admin console.

## Files

| File | Role |
|---|---|
| `timetable.xlsx` | Source workbook (single sheet `07WDC09_24092026`). The only build input that changes with a new timetable. |
| `extract.py` | Build script (Python 3, standard library only). Reads the workbook and writes everything below. |
| `l7-template.html` | Viewer template. Markers `/*__L7_DATA__*/`, `/*__L7_META__*/`, `/*__L7_CSS__*/` are replaced at build time. |
| `l7-admin-template.html` | Admin template. Carries `/*__L7_UPLOAD__*/` and a base64 copy of the built viewer (`/*__L7_BASE__*/`). |
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
not fully self-contained (no network) or that presents itself as an ATS.

## Test

The suite fetches the generated files, so it must be served over HTTP (not `file://`):

```
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/timetableview/l7-test.html`. `window.__TEST_RESULT`
holds the machine-readable result.

## Notes

- The generated files are designed to open straight from disk with **no network**.
  Keep it that way: the build gate rejects external URLs, `<script src>`,
  `<link href>`, `@import` and non-`data:` `url()` references.
- Operator-typed text is serialised with `<` escaped as `\u003c` and rendered with
  `textContent`/DOM only — never `innerHTML`.
