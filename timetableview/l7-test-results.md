# L7 regression suite — result

Run: 2026-10-09 (local)
Viewer under test: `line7-timetable-timesync.html`  |  Admin under test: `line7-timetable-admin.html`
Suite: `l7-test.html`

**29 / 29 checks passed** — 501 assertions pass, 0 fail, 0 skip.

The generated files were rebuilt from the templates (`python extract.py`) immediately before this run.

## Checklist

| # | Category | Check | Result |
|---|---|---|---|
| 1 | Data validation | Missing L7_DATA or missing required properties | PASS |
| 2 | Data validation | Null or non-finite departure and terminal times | PASS |
| 3 | Data validation | Descending station times and duplicate trip IDs | PASS |
| 4 | Data validation | Invalid station indices and malformed service windows | PASS |
| 5 | Data validation | Loaded table with empty or incomplete direction arrays | PASS |
| 6 | Time engine | Exactly at trip departure and arrival | PASS |
| 7 | Time engine | Exactly at a station arrival/departure boundary | PASS |
| 8 | Time engine | Dwell intervals immediately below, at, and above 300 seconds | PASS |
| 9 | Time engine | Forward and backward time jumps | PASS |
| 10 | Time engine | Wrap disabled, first wrap, and repeated wraps | PASS |
| 11 | Date programming | Weekday, Saturday, and Sunday selection | PASS |
| 12 | Date programming | Exact-date override versus annual recurrence | PASS |
| 13 | Date programming | Duplicate dates and unloaded target tables | PASS |
| 14 | Date programming | Leap day and device timezone changes | PASS |
| 15 | Date programming | No valid timetable available | PASS |
| 16 | Admin and export | Corrupt and unsupported workbook uploads | PASS |
| 17 | Admin and export | Failed upload leaves previous valid data unchanged | PASS |
| 18 | Admin and export | Special characters in station names and metadata | PASS |
| 19 | Admin and export | Export with every expected placeholder replaced | PASS |
| 20 | Admin and export | Open exported HTML independently and verify its data guard | PASS |
| 21 | Performance and usability | Largest expected timetable at desktop and mobile widths | PASS |
| 22 | Performance and usability | Hidden tab and return to foreground | PASS |
| 23 | Performance and usability | Repeated resize and table changes | PASS |
| 24 | Performance and usability | Keyboard controls and focus behavior | PASS |
| 25 | Performance and usability | No uncaught console errors during playback | PASS |
| 26 | Time engine | Service clock across midnight and the after-midnight tail | PASS |
| 27 | Duty roster | Duty number or X shown above each train for the displayed time | PASS |
| 28 | Service tabs | AUTO and weekday / Saturday / Sunday / Special view selection | PASS |
| 29 | Admin and export | Upload re-map, shifted grids, anchor tolerance, and tolerant WEF dates | PASS |

## Fixes covered by the suite

- **P0 — schema guard.** The viewer guard requires finite numeric start/end
  times inside each trip's active span `[a, b]`, rejects null/undefined values
  *inside* the span while still allowing them *outside* it (where the train is
  simply not present), rejects out-of-range times, enforces nondecreasing times,
  and rejects non-positive trip durations. Guard failures hide the board and
  never start the render loop.
- **P1 — fallback and strict mode.** `pickTable()` keeps the requested and
  displayed table ids separate, shows a prominent fallback warning, and exposes
  a strict mode that refuses substitute service (`STRICT MODE - SERVICE REFUSED`,
  `REFUSED`, `... (STRICT: NOT SUBSTITUTED)`). Requested/displayed ids are
  mirrored on `window.__L7.last()`.
- **P1 — admin access disclosure.** The admin page documents that the browser
  lock is a UI convenience (`FNV-1a`), not a security boundary, and that genuinely
  sensitive changes belong behind server-side auth. The lock no longer presents
  itself as protection.
- **P1 — unsafe HTML.** Dynamic and operator-typed values (station codes,
  labels, metadata) are rendered with `textContent` / `createElement()`; no
  dynamic value is written through `innerHTML`. An `<img onerror>` / `<script>`
  payload in a station name does not execute.
- **P1 — export end-to-end.** `buildEndUser()` validates the programme and target
  tables, `checkBuilt()` asserts every build marker was replaced and re-parses
  the embedded `L7_DATA` / `L7_META` literals to confirm byte-for-byte equality,
  and `verifyEndUser()` runs the finished HTML in a hidden iframe and confirms
  the viewer's own schema guard accepted the payload and the board booted.

### P1 fixes covered in this pass

- **Service clock across midnight.** The viewer runs a *service* clock, not the
  wall clock. `serviceTail()` derives the furthest after-midnight call from the
  loaded windows; `serviceSec()` / `serviceDate()` map the wall-clock interval
  `[00:00:00, tail]` onto `[24:00:00, 24:00:00 + tail]` and keep the date that
  has just ended; the board reports the new service day (and only then marks it
  out-of-window) once the tail has genuinely run out. Playback offsets stay in
  service seconds. Covered by check 26 at 23:59:59, 00:00:00, 00:39:26 and
  00:39:27.
- **Atomic workbook apply.** `stageApply()` validates every selected sheet
  before any of `DATA` is touched: all imported station lists must agree with a
  single canonical list, and a corridor change flags every loaded timetable it
  does not replace as incompatible. `APPLY` stays disabled until the corridor
  acknowledgement and each explicit `UNLOAD <table>` exclusion are ticked, and
  `upApply` commits only after the plan validates. Covered by check 17.

### Review items 3–7 (this pass)

- **Item 3 — headway cache.** `CALLS` is cleared in `refreshDerived()`, the cache
  is keyed by `TID + "|" + dir`, the gaps view reads the `#gTable` selector, and
  discarding an upload clears the cache (`A.callsCache()` empty after `#upRevert`).
  Covered by check 23.
- **Item 4 — date-programme conflicts.** The admin refuses two rules of equal
  specificity on one day, allows an exact date beside an annual recurrence (the
  exact rule wins), and validates imported configurations the same way. The
  viewer resolves the exact rule regardless of entry order. Covered by checks 12
  and 13.
- **Item 5 — workbook upload bounds.** `zipText` rejects compression methods
  other than 0/8, caps both the declared and the actually-decompressed part size
  (16 MiB workbook / 32 MiB per XML part), and `readWorkbook` refuses an oversized
  buffer before parsing. `cellsFrom` uses `DOMParser`, so attribute order no
  longer silently drops cells, and malformed worksheet XML is refused rather than
  read as empty. Covered by check 16.
- **Item 6 — script-safe serialization.** The admin's `jsScriptJson` and the
  build script's `js_literal()` escape `<` as `\u003c`, so operator text such as a
  closing script tag cannot terminate the generated script element. The admin
  HTML preview runs in a sandboxed frame (`sandbox="allow-scripts"`). Covered by
  check 18.
- **Item 7 — equal adjacent times.** Two zero-second links in the source
  workbook are legal and are forwarded-filled as-is; the builder counts them
  (`zero links : 2`) for review and never silently moves a call. Covered by
  check 16.

### Duty display (this pass)

- **Duty above the train.** Each drawn train carries a small chip above its
  number showing the crew working that rake at the displayed time. The lookup
  (`__L7.dutyFor(rake, sec)`) joins the board's rake number to the app's
  Supabase `trip_data` on `Rake Num` and takes the duty whose `Start Time`–`End
  Time` window contains the displayed second, for the active day type. When the
  roster is loaded but no window covers that time — a gap between duties, an
  unknown rake, or before the first window — the chip reads **X** (amber); a
  train tooltip adds a `duty` line with the number and its window, or `X`.
- **Full roster despite the response cap.** `trip_data` is 1847 rows against
  PostgREST's 1000-row cap, so the viewer pages by the unique `id`
  (`limit`/`offset`) until the table is exhausted; all four day types load.
  Confirmed live: 544 + 498 + 391 + 414 segments collected, and rake 708 maps to
  `201 → 224 → 219 → 412 → 230 → 908 → 255` across the day.
- **Offline-safe.** The roster fetch is skipped from `file://` and when sync is
  disabled, so the board draws exactly as before and no chip appears. Covered by
  check 27.

### Service tabs (this pass)

- **View by service type.** The header now carries **AUTO · WEEKDAY · SATURDAY ·
  SUNDAY · SPECIAL** tabs. **AUTO** is the default and folds away to the date
  programme; picking a service type overrides only that client's view for the
  session — it never rewrites the programme and is not persisted or read from the
  URL. A green dot marks types with data in the build.
- **Same honesty as a programmed date.** Picking an unloaded type falls back (or
  refuses in strict mode) and labels it `FALLBACK` / `SHOWN FOR` / `NOT LOADED`,
  so substitute service is always flagged, never silently presented.
  `window.__L7.view()` / `setView(id)` expose the same state the tabs set. Covered
  by check 28.

### Uploading one timetable beside another (this pass)

- **Why the "UNLOAD WEEKDAY" gate existed.** One board means one corridor; a sheet
  whose station list differs from the file's cannot be drawn on it, so the apply
  used to demand that every loaded timetable built on the old list be unloaded.
- **Re-map by station name.** A sheet whose station list appears inside the file's
  list *in the same order* (possibly shorter, e.g. a Saturday book built on a
  subset of the same stations, including the MKPR ring closure) now gets a
  "RE-MAP THIS SHEET ONTO THE CURRENT STATION LIST" option on its report card.
  Ticking it keeps the sheet *and* every already-loaded timetable — no corridor
  change, no unload. At apply, each trip is re-based by station name and interior
  gaps are filled exactly like blank grid cells.
- **Corridor change with a choice.** When a sheet genuinely changes the corridor,
  each incompatible loaded timetable now shows **UNLOAD** or **RE-MAP ONTO THE NEW
  STATION LIST (BY STATION NAME)** radio buttons instead of a forced unload
  checkbox. Re-map is only offered when the loaded timetable's stations appear in
  the new list in order; otherwise it is disabled with an explanation.
- **Honest diagnostics.** A differing sheet's card reports exactly which slots the
  file has that the sheet lacks, and which slots the sheet has that the file lacks,
  so an admin can see at a glance whether the workbook matches or needs aligning.
- **Tolerant WEF / VALID-FROM entry.** The native locale-bound date input was
  wiping values on partial keystrokes. WEF, VALID-TO and VALID-FROM are now plain
  `yyyy-mm-dd` fields that accept `24-09-2026`, `09/24/2026`, `2026.09.24`, etc.,
  normalise to ISO `yyyy-mm-dd` on blur/Enter, and never let an invalid blur clear
  a stored date. Covered by check 29.
- **Sheets shifted a few rows or columns parse anyway.** The weekday /
  Saturday / Sunday books share one corridor — same names, same order, same count —
  but the grid may sit a few rows or columns further into the page than the
  workbook the viewer was built from. `buildFromCells()` now anchors on the known
  station list wherever it appears and re-locates the whole DN/UP block relative
  to it. The trip-number row is **searched for** in the 30 rows above each grid
  (voted by the widest run of trip numbers, then verified against usable stop
  times), so a taller/shorter block head is irrelevant. A sheet that re-anchors
  to the *same* corridor list applies alongside the loaded weekday table with no
  station-list conflict, and its card prints a "GRID RE-ANCHORED" note naming the
  column, rows and found trip rows. Covered by check 29.
- **Tolerant anchor matching.** The station list is located verbatim; otherwise a
  normalised pass (case, stray spaces) — a cosmetic-only match reuses the
  corridor names so the sheet still applies cleanly — or as a strict prefix of
  at least 20 slots (a sheet that omits the closing MKPR ring row); a shorter
  grid keeps its own (shorter) list and flows through the normal corridor
  diff / RE-MAP decision instead of aborting extraction. Scan bounds widened to
  columns 1-24, rows 1-1200.
- **Extraction failures explain themselves.** When no trip can be built, the
  report card now says whether the station list was found (and where / which
  match mode), whether a DN trip-number row could be located, and how many
  DN/UP trips were read, instead of the bare error line. Covered by check 29 (8
  new assertions).

## How to run

```
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/timetableview/l7-test.html`. The page drives the real built files
in hidden iframes and reports PASS/FAIL/SKIP per assertion, plus the "N/29
checks" summary. `window.__TEST_RESULT` holds the machine-readable result
(`pass`, `fail`, `skip`, `checked`, `total`, `rows[]`, `checklist[]`).

## Notes

- Section-geometry regression coverage (chunking, seam sharing, seam drawing) is
  folded into check 21.
- The suite must be served over `http://`; `fetch()` of the built files is
  blocked from `file://`.
