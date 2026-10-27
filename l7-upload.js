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

  function buildFromCells(cells) {
    var out = { stops: [], ring: false, dn: [], up: [] };
    var st = { parity: [], dropped: [], repaired: 0, partial: 0, zero: 0 };
    var DN = UPL.BLOCKS[0], raw = [], r, s;

    /* Corridor: column A, the DN grid rows. The last slot repeats the first
       (MKPR) -- that repetition is the sheet closing the ring, so KEEP it. The
       board then starts and finishes at MKPR and the closing link is drawn as
       real track rather than hidden. */
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
          r0 = B[4], r1 = B[5], key = B[6], col, no, t, times, filled, a, z, i;
      for (col = UPL.FIRST_COL; col <= UPL.LAST_COL; col++) {
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
        out[key].push(rec);
      }
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
