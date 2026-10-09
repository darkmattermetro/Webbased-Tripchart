/* ============================================================================
   TIMETABLE UPLOAD ENGINE
   ----------------------------------------------------------------------------
   Reads an .xlsx in the browser and rebuilds the timetable data from it.

   This is a deliberate port of extract.py, not a second opinion about it.
   Every rule below (column A holds labels, column B is a spacer, the DN and UP
   block row numbers, the >= MIN_CELLS floor, forward-fill then non-decreasing
   repair, the parity check) exists because the source sheet demanded it. The
   port is verified by extracting the real workbook here and getting identical
   counts to the Python build.

   Two details are load-bearing:

     - Time cells are raw Excel day-fractions taken from the cached <v> value,
       NOT via a spreadsheet library, because those coerce them to the wrong
       datetime. Values above 1.0 are past-midnight trips and are kept.
     - The workbook's stop times are formulas pointing at an external DEPOT
       file, so the cached values are all that exist. Reading <v> is what makes
       extraction possible at all.

   A second, deliberately smaller rule set handles sheet-to-sheet drift: the
   weekday / Saturday / Sunday books share one corridor (same names, same order,
   same count) but the grid may sit a few rows or columns further into the page.
   buildFromCells() accepts the known corridor as a reference and re-anchors the
   whole block to wherever that list appears, falling back to the fixed template
   layout above when no anchor matches.

   No third-party code: the zip is read with DataView plus the platform
   DecompressionStream, and the XML with regular expressions, matching the
   Python implementation step for step.
   ============================================================================ */
window.L7_UPLOAD = (function () {
  "use strict";

  var UPL = {
    FIRST_COL: 3,     // C -- column A holds labels, B is a spacer
    LAST_COL: 194,    // GL
    MIN_CELLS: 5,     // a trip must cover at least this many station times
    /* Hard ceilings, not tuning knobs. The real workbook is ~0.45 MB and its
       largest part decompresses to ~3 MB, so these leave an order of magnitude
       of headroom while refusing a zip bomb or a file that would simply run the
       browser out of memory. A compressed part's DECLARED size is only a hint
       (it is attacker-controlled), so zipText also caps the bytes it actually
       produces. */
    MAX_WORKBOOK: 16 * 1024 * 1024,
    MAX_XML: 32 * 1024 * 1024,
    // label, trip row, depot row, md row, first grid row, last grid row, key
    BLOCKS: [
      ["DN", 1, 7, 8, 9, 52, "dn"],
      ["UP", 62, 66, 67, 68, 111, "up"]
    ]
  };

  /* ------------------------------------------------------------------ zip */
  function zipOpen(ab) {
    var u8 = new Uint8Array(ab), dv = new DataView(ab), i;
    var eocd = -1, floor = Math.max(0, u8.length - 66000);
    for (i = u8.length - 22; i >= floor; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("not a zip archive (no end-of-central-directory record)");
    var count = dv.getUint16(eocd + 10, true);
    var cdOff = dv.getUint32(eocd + 16, true);
    if (cdOff === 0xffffffff || count === 0xffff) {
      throw new Error("this workbook is a Zip64 archive, which is not supported");
    }
    if (cdOff + 46 > u8.length) throw new Error("corrupt central directory offset");
    var dec = new TextDecoder("utf-8"), entries = {}, p = cdOff, n;
    for (n = 0; n < count; n++) {
      if (p + 46 > u8.length) throw new Error("corrupt central directory at entry " + n);
      if (dv.getUint32(p, true) !== 0x02014b50) {
        throw new Error("corrupt central directory at entry " + n);
      }
      var method = dv.getUint16(p + 10, true);
      var csize = dv.getUint32(p + 20, true);
      var usize = dv.getUint32(p + 24, true);
      var nlen = dv.getUint16(p + 28, true);
      var elen = dv.getUint16(p + 30, true);
      var clen = dv.getUint16(p + 32, true);
      var lho = dv.getUint32(p + 42, true);
      entries[dec.decode(u8.subarray(p + 46, p + 46 + nlen))] =
        { method: method, csize: csize, usize: usize, lho: lho };
      p += 46 + nlen + elen + clen;
    }
    return { u8: u8, dv: dv, entries: entries, count: count };
  }

  function zipText(z, name) {
    var e = z.entries[name];
    if (!e) return Promise.resolve(null);
    /* Only the two methods every .xlsx writer emits, and that the platform can
       decode: store (0) and deflate (8). Anything else -- bzip2, LZMA, an
       encrypted entry -- is refused by name rather than mis-decoded. */
    if (e.method !== 0 && e.method !== 8) {
      return Promise.reject(new Error(name + " uses compression method " + e.method
        + ", which is not supported (only stored and deflate entries can be read)"));
    }
    /* The declared uncompressed size is a cheap early refusal for a lying
       header; the real bound is applied to the bytes produced below. */
    if (e.usize > UPL.MAX_XML) {
      return Promise.reject(new Error(name + " declares " + e.usize
        + " bytes uncompressed, over the " + UPL.MAX_XML + " byte limit"));
    }
    var p = e.lho;
    if (p + 30 > z.u8.length) {
      return Promise.reject(new Error("corrupt local header for " + name));
    }
    if (z.dv.getUint32(p, true) !== 0x04034b50) {
      return Promise.reject(new Error("corrupt local header for " + name));
    }
    var nlen = z.dv.getUint16(p + 26, true), elen = z.dv.getUint16(p + 28, true);
    var start = p + 30 + nlen + elen;
    var raw = z.u8.subarray(start, start + e.csize);
    if (e.method === 0) {
      if (raw.length > UPL.MAX_XML)
        return Promise.reject(new Error(name + " is over the " + UPL.MAX_XML + " byte limit"));
      return Promise.resolve(new TextDecoder("utf-8").decode(raw));
    }
    /* Decompress incrementally so a body that expands far beyond its declared
       size is stopped at the ceiling instead of being materialised in full. */
    var stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    var reader = stream.getReader();
    var chunks = [], total = 0;
    function pump() {
      return reader.read().then(function (r) {
        if (r.done) {
          var buf = new Uint8Array(total), off = 0, i;
          for (i = 0; i < chunks.length; i++) { buf.set(chunks[i], off); off += chunks[i].length; }
          return new TextDecoder("utf-8").decode(buf);
        }
        total += r.value.length;
        if (total > UPL.MAX_XML) {
          try { reader.cancel(); } catch (x) { }
          throw new Error(name + " decompresses beyond the " + UPL.MAX_XML + " byte limit");
        }
        chunks.push(r.value);
        return pump();
      });
    }
    return pump();
  }

  /* ----------------------------------------------------------------- xlsx */
  function xmlUnescape(v) {
    /* Same substitution order as extract.py so the two unescape identically. */
    return v.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
            .replace(/&amp;/g, "&");
  }

  var NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

  function colToNum(letters) {
    var n = 0;
    for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n;
  }

  function attr(tag, name) {
    var m = new RegExp('\\b' + name + '="([^"]*)"').exec(tag);
    return m ? m[1] : null;
  }

  function sheetListFrom(wbXml, relXml) {
    var rels = {}, tag;
    var REL_RE = /<Relationship\b[^>]*\/?>/g;
    while ((tag = REL_RE.exec(relXml))) {
      var id = attr(tag[0], "Id"), tgt = attr(tag[0], "Target");
      if (id && tgt) rels[id] = tgt;
    }
    var out = [], SH_RE = /<sheet\b[^>]*\/?>/g;
    while ((tag = SH_RE.exec(wbXml))) {
      var nm = attr(tag[0], "name");
      var rid = attr(tag[0], "r:id") || attr(tag[0], "id");
      var state = attr(tag[0], "state") || "visible";
      if (!nm || !rid || !rels[rid]) continue;
      var path = rels[rid].replace(/^\//, "");
      if (path.indexOf("xl/") !== 0) path = "xl/" + path;
      out.push({ name: nm, path: path, hidden: state !== "visible" });
    }
    return out;
  }

  /* The worksheet is walked with the platform XML parser rather than a regex.
     A regex has to assume attribute order -- Excel writes <c r="C9" s="1">, but
     nothing stops another writer emitting <c s="1" r="C9" t="s">, and a pattern
     anchored on r="..." would then silently read no cell at all. The DOM gives
     attributes by name, so the order does not matter, and a malformed part is
     reported instead of yielding a plausible-looking empty sheet. */
  function cellsFrom(sheetXml, shared) {
    var doc;
    try { doc = new DOMParser().parseFromString(sheetXml, "application/xml"); }
    catch (e) { throw new Error("the worksheet XML could not be parsed: " + e.message); }
    if (!doc || !doc.documentElement || doc.documentElement.nodeName === "parsererror"
        || doc.getElementsByTagName("parsererror").length) {
      throw new Error("the worksheet XML is not well formed");
    }
    var cells = {}, rows = doc.getElementsByTagName("row"), i, j;
    for (i = 0; i < rows.length; i++) {
      var rowEl = rows[i];
      var row = +rowEl.getAttribute("r");
      if (!row) continue;
      var cs = rowEl.getElementsByTagName("c");
      for (j = 0; j < cs.length; j++) {
        var c = cs[j];
        var ref = /^([A-Z]+)(\d+)$/.exec(c.getAttribute("r") || "");
        if (!ref) continue;
        var col = colToNum(ref[1]);
        var key = col + "," + row, t = c.getAttribute("t");
        /* inlineStr carries its text in <is><t>, not <v>. Excel normally uses
           the shared string table, but plenty of writers emit inline strings,
           and silently dropping them would lose the station labels. */
        if (t === "inlineStr") {
          var is = c.getElementsByTagName("is")[0];
          if (is) {
            var buf = "", ts = is.getElementsByTagName("t"), q;
            for (q = 0; q < ts.length; q++) buf += ts[q].textContent;
            cells[key] = buf;
          }
          continue;
        }
        var v = c.getElementsByTagName("v")[0];
        if (!v) continue;
        var raw = v.textContent;
        if (t === "s") {
          var si = shared[+raw];
          if (si !== undefined) cells[key] = si;
        } else {
          var txt = raw.trim();
          cells[key] = NUM_RE.test(txt) ? parseFloat(txt) : raw;
        }
      }
    }
    return cells;
  }

  async function readWorkbook(ab) {
    if (!ab || typeof ab.byteLength !== "number" || !ab.byteLength) {
      throw new Error("no workbook bytes were supplied");
    }
    if (ab.byteLength > UPL.MAX_WORKBOOK) {
      throw new Error("the workbook is " + (ab.byteLength / 1048576).toFixed(1)
        + " MB, over the " + (UPL.MAX_WORKBOOK / 1048576) + " MB limit");
    }
    var z = zipOpen(ab), i;
    var shared = [], ssXml = await zipText(z, "xl/sharedStrings.xml");
    if (ssXml) {
      var SI_RE = /<si>([\s\S]*?)<\/si>/g, T_RE = /<t[^>]*>([\s\S]*?)<\/t>/g, si, t, buf;
      while ((si = SI_RE.exec(ssXml))) {
        buf = ""; T_RE.lastIndex = 0;
        while ((t = T_RE.exec(si[1]))) buf += xmlUnescape(t[1]);
        shared.push(buf);
      }
    }
    var wbXml = await zipText(z, "xl/workbook.xml");
    if (!wbXml) throw new Error("xl/workbook.xml is missing - this is not an Excel workbook");
    var relXml = (await zipText(z, "xl/_rels/workbook.xml.rels")) || "";
    var sheets = sheetListFrom(wbXml, relXml);
    if (!sheets.length) throw new Error("the workbook declares no sheets");
    var hidden = 0;
    for (i = 0; i < sheets.length; i++) {
      if (sheets[i].hidden) { sheets[i].cells = null; sheets[i].skipped = "hidden sheet"; hidden++; continue; }
      var xml = await zipText(z, sheets[i].path);
      if (!xml) { sheets[i].cells = null; sheets[i].skipped = "part " + sheets[i].path + " not found"; continue; }
      sheets[i].xmlBytes = xml.length;
      sheets[i].cells = cellsFrom(xml, shared);
    }
    return { sheets: sheets, zipEntries: z.count, hiddenSheets: hidden };
  }

  /* ------------------------------------------- the port of build() itself */
  function toSecs(v) {
    /* Excel day-fraction -> seconds after midnight. Above 1.0 means the trip
       runs past midnight into the next service day; kept so replay stays
       monotonic. */
    if (typeof v !== "number" || !isFinite(v) || v < 0 || v >= 2) return null;
    return Math.round(v * 86400);
  }

  function buildFromCells(cells, opts) {
    opts = opts || {};
    /* A shifted sheet (same corridor, a few rows/columns further into the page
       than the template) is parsed by anchoring on the known station list and
       re-locating every block row relative to it. Without a reference, or when
       no anchor matches, parse the fixed template layout exactly as before. */
    if (opts.corridor && opts.corridor.length) {
      var runs = corridorRuns(cells, opts.corridor);
      if (runs.length && runs[0].len >= ANCHOR_MIN) return buildAnchored(cells, runs, opts.corridor);
    }
    return buildLegacy(cells);
  }

  var ANCHOR_MIN = 20;

  function normSt(s) {
    return String(s).replace(/\s+/g, " ").trim().toLowerCase();
  }

  /* corridorRuns(): every contiguous spot where the reference station list
     appears in a column, starting at the slot column's top. The DN block and the
     UP block are each one run. Matches are accepted three ways:
       - verbatim (same text, same order, same count);
       - normalized (stray spaces, different case) -- the sheet's own names are
         still reported, but the corridor names win if the whole run only
         differs cosmetically;
       - as a strict prefix of the corridor with >= ANCHOR_MIN slots (a sheet
         that omits the closing MKPR ring row).
     A run is recorded with the number of slots it actually matched; parseAnchored
     indexes the grid to that length, so a shorter list still drives the corridor
     diff / RE-MAP flow in the admin rather than being mis-read. */
  function corridorRuns(cells, ref, maxCol, maxRow) {
    var out = [];
    maxCol = maxCol || 24; maxRow = maxRow || 1200;
    var refN = ref.map(normSt);
    var col, r, s, i, j;
    for (col = 1; col <= maxCol; col++) {
      var txt = [], rows = [], txtN = [];
      for (r = 1; r <= maxRow; r++) {
        s = cells[col + "," + r];
        if (typeof s === "string" && s.trim()) {
          txt.push(s.trim()); rows.push(r); txtN.push(normSt(s));
        }
      }
      if (txt.length < ANCHOR_MIN) continue;
      for (i = 0; i + ANCHOR_MIN <= txt.length; i++) {
        var k = 0, rawHits = 0;
        for (j = 0; j < ref.length; j++) {
          var rawHit = txt[i + j] === ref[j];
          if (!rawHit && txtN[i + j] !== refN[j]) break;
          k++;
          if (rawHit) rawHits++;
        }
        if (k >= ANCHOR_MIN) {
          out.push({ col: col, r0: rows[i], len: k,
                     exact: k === ref.length && rawHits === k,
                     full: k === ref.length,
                     stops: txt.slice(i, i + k) });
          i += k - 1;
        }
      }
    }
    out.sort(function (x, y) { return x.r0 - y.r0; });
    return out;
  }

  function findFirstTripCol(cells, stationCol, tripRow) {
    for (var c = stationCol + 1; c <= UPL.LAST_COL; c++) {
      var v = cells[c + "," + tripRow];
      if (typeof v === "number" && isFinite(v)) return c;
    }
    return 0;
  }

  function freshStats() {
    return { parity: [], dropped: [], repaired: 0, partial: 0, zero: 0 };
  }

  /* One direction block (DN or UP). Every anchor is caller-supplied so the same
     scanning logic serves the fixed template layout and a re-anchored one. */
  function buildBlock(cells, o, st) {
    var tripR = o.tripR, depotR = o.depotR, mdR = o.mdR,
        r0 = o.r0, r1 = o.r1, firstCol = o.firstCol, label = o.label, key = o.key;
    var out = [], col, no, t, times, filled, a, z, i;
    for (col = firstCol; col <= UPL.LAST_COL; col++) {
      no = cells[col + "," + tripR];
      if (typeof no !== "number" || !isFinite(no)) continue;
      no = Math.trunc(no);

      times = []; filled = [];
      for (var rr = r0; rr <= r1; rr++) {
        t = toSecs(cells[col + "," + rr]);
        times.push(t);
        if (t !== null) filled.push(times.length - 1);
      }
      if (filled.length < UPL.MIN_CELLS) {
        st.dropped.push([label, no, filled.length]);
        continue;
      }
      a = filled[0]; z = filled[filled.length - 1];
      if (a !== 0 || z !== times.length - 1) st.partial++;

      /* Forward-fill interior gaps, then force non-decreasing so a train can
         never jump backwards on screen. */
      var repaired = false;
      for (i = a + 1; i <= z; i++) {
        if (times[i] === null) { times[i] = times[i - 1]; repaired = true; }
        else if (times[i] < times[i - 1]) { times[i] = times[i - 1]; repaired = true; }
      }
      if (repaired) st.repaired++;

      /* Two adjacent calls at the same instant are a zero-second link. They
         are legal -- the real workbook has two, both a station with no booked
         time that the fill above carries forward -- so they are counted for
         review and left exactly as booked, never nudged a second apart.
         Counted after the fill, because that is the shape the board will
         actually draw. */
      for (i = a + 1; i <= z; i++) {
        if (times[i] === times[i - 1]) st.zero++;
      }

      var rec = { n: no, a: a, b: z, t: times };
      var depot = cells[col + "," + depotR];
      if (typeof depot === "string" && depot.trim() && depot.trim() !== "DEPOT") rec.d = depot.trim();
      var md = cells[col + "," + mdR];
      if (typeof md === "string" && (md.trim() === "M" || md.trim() === "D")) rec.m = md.trim();
      if ((no % 2 === 0) === (key === "dn")) { rec.x = 1; st.parity.push([label, no]); }
      out.push(rec);
    }
    return out;
  }

  /* Locate the head of a direction block that sits above a found station grid.
     The template puts the trip numbers 6-8 rows above the grid with the depot
     and midday rows in between, but a shifted sheet may have a taller/shorter
     head. Instead of assuming the offset, vote on the row in
     [gridTop-30, gridTop-1] where the most candidate trip columns hold a plain
     integer, then require (a) a numeric trip number there and (b) at least one
     column whose grid cells hold >= MIN_CELLS usable times. Returns
     { tripRow, firstCol } or null when no block head can be found. */
  function findBlockHead(cells, sc, r0, r1) {
    var maxCol = Math.min(sc + 1 + 90, UPL.LAST_COL);
    var rowsCount = {}, firstSeen = {}, c, r, v;
    for (c = sc + 1; c <= maxCol; c++) {
      var rowNum = 0;
      for (r = r0 - 30; r <= r0 - 1; r++) {
        v = cells[c + "," + r];
        if (typeof v === "number" && isFinite(v) && Math.abs(v - Math.round(v)) < 1e-9
            && v >= 1 && v <= 9999) rowNum = r;
      }
      if (rowNum) {
        rowsCount[rowNum] = (rowsCount[rowNum] || 0) + 1;
        if (!(rowNum in firstSeen)) firstSeen[rowNum] = c;
      }
    }
    var cands = Object.keys(rowsCount).map(Number).sort(function (a, b) {
      return (rowsCount[b] - rowsCount[a]) || (b - a);
    });
    for (var i = 0; i < cands.length; i++) {
      var tr = cands[i], fc = findFirstTripCol(cells, sc, tr);
      if (!fc) continue;
      for (c = fc; c <= maxCol; c++) {
        var no = cells[c + "," + tr];
        if (typeof no !== "number" || !isFinite(no)) continue;
        var n = 0;
        for (r = r0; r <= r1; r++) {
          if (toSecs(cells[c + "," + r]) !== null) n++;
        }
        if (n >= UPL.MIN_CELLS) return { tripRow: tr, firstCol: c };
      }
    }
    return null;
  }

  /* Anchor-based parse: the station list tells us where the grid lives, and
     the block head (trip-number row, first trip column) is SEARCHED for in the
     rows above each grid rather than assumed from the template. The depot and
     midday rows sit one and two rows above either grid start ("basic structure
     remains"), and are only used for the optional D/M flags. */
  function buildAnchored(cells, runs, ref) {
    var dn = runs[0], up = null, k;
    for (k = 1; k < runs.length; k++) {
      if (runs[k].r0 > dn.r0) { up = runs[k]; break; }
    }
    var st = freshStats();
    var dn0 = dn.r0, dn1 = dn0 + dn.stops.length - 1;
    var dnHead = findBlockHead(cells, dn.col, dn0, dn1);
    var out = {
      stops: (dn.full && !dn.exact) ? ref.slice() : dn.stops.slice(),
      ring: dn.stops.length > 1 && dn.stops[0] === dn.stops[dn.stops.length - 1],
      dn: [], up: [],
      anchor: { col: dn.col, r0: dn0, len: dn.stops.length, up: 0,
                match: dn.exact ? "exact" : (dn.full ? "normalized" : "prefix"),
                dnTripRow: 0, upTripRow: 0 }
    };
    if (dnHead) {
      out.anchor.dnTripRow = dnHead.tripRow;
      out.dn = buildBlock(cells, { tripR: dnHead.tripRow, depotR: dn0 - 2, mdR: dn0 - 1,
        r0: dn0, r1: dn1, firstCol: dnHead.firstCol, label: "DN", key: "dn" }, st);
    }
    if (up) {
      var up0 = up.r0, up1 = up0 + up.stops.length - 1;
      var upHead = findBlockHead(cells, up.col, up0, up1);
      if (upHead) {
        out.anchor.up = up0;
        out.anchor.upTripRow = upHead.tripRow;
        out.up = buildBlock(cells, { tripR: upHead.tripRow, depotR: up0 - 2, mdR: up0 - 1,
          r0: up0, r1: up1, firstCol: upHead.firstCol, label: "UP", key: "up" }, st);
      }
    }
    out._stats = st;
    return out;
  }

  /* The fixed template layout: corridor in column A rows 9-52, trips from
     column C, block rows as baked into UPL.BLOCKS. Kept byte-for-byte for
     workbooks that are not shifted (and for the same error text). */
  function buildLegacy(cells) {
    var out = { stops: [], ring: false, dn: [], up: [] };
    var st = freshStats();
    var DN = UPL.BLOCKS[0], raw = [], r, s;
    for (r = DN[4]; r <= DN[5]; r++) {
      s = cells["1," + r];
      if (typeof s === "string" && s.trim()) raw.push(s.trim());
    }
    out.stops = raw;
    out.ring = raw.length > 1 && raw[0] === raw[raw.length - 1];
    if (!out.stops.length) {
      throw new Error("no station labels in column A rows " + DN[4] + "-" + DN[5]
        + " - this does not look like a Line 7 working timetable");
    }
    for (var b = 0; b < UPL.BLOCKS.length; b++) {
      var B = UPL.BLOCKS[b], label = B[0], tripR = B[1], depotR = B[2], mdR = B[3],
          r0 = B[4], r1 = B[5], key = B[6];
      out[key] = buildBlock(cells, { tripR: tripR, depotR: depotR, mdR: mdR, r0: r0, r1: r1,
        firstCol: UPL.FIRST_COL, label: label, key: key }, st);
    }
    out._stats = st;
    return out;
  }

  function windowOf(d) {
    var all = d.dn.concat(d.up), lo = Infinity, hi = -Infinity, i;
    if (!all.length) return null;
    for (i = 0; i < all.length; i++) {
      if (all[i].t[all[i].a] < lo) lo = all[i].t[all[i].a];
      if (all[i].t[all[i].b] > hi) hi = all[i].t[all[i].b];
    }
    return [lo, hi];
  }

  function activeAt(trips, T) {
    var n = 0;
    for (var i = 0; i < trips.length; i++) {
      if (trips[i].t[trips[i].a] <= T && T <= trips[i].t[trips[i].b]) n++;
    }
    return n;
  }

  /* ------------------------------------------------- sheet name conventions */
  /* The one sheet we have is named 07WDC09_24092026: WDC for weekday and a
     DDMMYYYY suffix. That is a single sample, so this only ever *suggests* --
     every field it fills is editable, and nothing is written until confirmed. */
  function tableOf(code) {
    switch (code) {
      case "SAT": return "saturday";
      case "SUN": case "SPN": return "sunday";
      case "HOL": case "SPD": case "SPL": return "special";
      default: return "weekday";                 // WDC, WK, WD
    }
  }
  function guessTable(name) {
    var u = String(name).toUpperCase();
    /* The house style is <nn><3-letter code><nn>_<DDMMYYYY>, so the code sits
       between two digits and no word boundary ever matches it. That pattern has
       to be tried first: with only the delimited forms, 07SAT09_03102026 maps
       to nothing, and a sheet that maps to nothing is silently not extracted.
       That is the worst possible failure here, because the weekend data is
       exactly what an admin uploads this to add. The delimited spellings stay
       as a fallback for names that are not in house style. */
    var m = /^\d{0,2}(WDC|SAT|SUN|SPN|HOL|SPD|SPL|WK|WD)\d{0,2}(?:_|$)/.exec(u);
    if (m) return tableOf(m[1]);
    if (/SATUR|\bSAT\b|STA-/.test(u)) return "saturday";
    if (/SUNDI|^SUN|\bSUN\b/.test(u)) return "sunday";
    if (/HOLI|SPECIAL|\bSPL\b|\bSPD\b/.test(u)) return "special";
    if (/WDC|WEEK|\bWD\b|WD_/.test(u)) return "weekday";
    return "";
  }
  function dateFromName(name) {
    /* Trailing junk is allowed ("_v2", " (final)") so a revision suffix does not
       cost the sheet its valid-from date, while the group itself must be all
       digits so a bare column name cannot turn into a bogus date. */
    var m = /(\d{2})(\d{2})(\d{4})(?:\D.*)?$/.exec(String(name));
    if (!m) return null;
    var dd = +m[1], mm = +m[2], yyyy = +m[3];
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    var d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
    return { iso: yyyy + "-" + pad(mm) + "-" + pad(dd), dow: d.getDay() };
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  return {
    UPL: UPL,
    zipOpen: zipOpen,
    zipText: zipText,
    readWorkbook: readWorkbook,
    buildFromCells: buildFromCells,
    corridorRuns: corridorRuns,
    findFirstTripCol: findFirstTripCol,
    findBlockHead: findBlockHead,
    normSt: normSt,
    cellsFrom: cellsFrom,
    windowOf: windowOf,
    activeAt: activeAt,
    colToNum: colToNum,
    guessTable: guessTable,
    tableOf: tableOf,
    dateFromName: dateFromName,
    needs: (typeof DecompressionStream === "function")
  };
})();
