(function () {
  "use strict";
  if (window.PDFExport) return;

  /* ---------- 版式常量（A4 @150dpi 整页 canvas 渲染，系统字体支持中文） ---------- */
  var PAGE_W = 1240, PAGE_H = 1754;
  var M = 44;                          /* 页边距 */
  var CW = PAGE_W - M * 2;             /* 内容宽 */
  var FOOT_Y = PAGE_H - 30;            /* 页脚基线 */
  var Q_HEAD = 48, GAP = 22;           /* 题头高 / 块间距 */
  var Q_HEAD_C = 34;                   /* 选择题紧凑题头高 */
  var CHOICE_W = Math.round(CW * 0.85);/* 选择题题图渲染宽 ≈ 原卷真实印刷宽（不再放大到全版心） */
  var MAX_IMG_H = PAGE_H - M * 2 - Q_HEAD - 24;
  var JPEG_Q = 0.88;
  var FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
  var MONO = '"IBM Plex Mono",ui-monospace,Menlo,monospace';

  var busy = false;
  var ov = null;                       /* { root, status, bar, acts } */

  /* ---------- 懒加载 ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { s.remove(); rej(new Error("脚本加载失败：" + src)); };
      document.head.appendChild(s);
    });
  }
  function ensureQmap() {
    if (window.QMAP) {
      if (window.U && U.applyAssetBase) U.applyAssetBase();
      return Promise.resolve();
    }
    if (!ensureQmap._p) {
      ensureQmap._p = loadScript(window.QMAP_URL || "assets/qmap/qmap.js").then(function () {
        if (!window.QMAP) throw new Error("题库源数据缺失");
        if (window.U && U.applyAssetBase) U.applyAssetBase();
      });
    }
    return ensureQmap._p;
  }
  /* jsPDF 来源：优先本地 vendor（可离线自托管），失败再走公共 CDN */
  var JSPDF_SOURCES = [
    "js/vendor/jspdf.umd.min.js",
    "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
    "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"
  ];
  function ensureJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!ensureJsPDF._p) {
      var idx = 0;
      var tryNext = function () {
        if (idx >= JSPDF_SOURCES.length) return Promise.reject(new Error("PDF 组件加载失败"));
        var src = JSPDF_SOURCES[idx++];
        return loadScript(src).then(function () {
          var J = window.jspdf && window.jspdf.jsPDF;
          if (J) return J;
          return tryNext();
        }, function () {
          return tryNext();
        });
      };
      ensureJsPDF._p = tryNext().catch(function (err) {
        ensureJsPDF._p = null;
        throw err;
      });
    }
    return ensureJsPDF._p;
  }

  /* ---------- 环境 ---------- */
  function isIOSWeChat() {
    var ua = navigator.userAgent || "";
    if (!/MicroMessenger/i.test(ua)) return false;
    if (/iPhone|iPod/i.test(ua)) return true;
    return /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }

  /* ---------- 进度浮层 ---------- */
  function ensureOverlay() {
    if (ov) return ov;
    var root = document.createElement("div");
    root.className = "pdf-ov";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "导出 PDF");
    root.innerHTML =
      '<div class="pdf-card">' +
        '<div class="pdf-t"></div>' +
        '<div class="pdf-status"></div>' +
        '<div class="pdf-bar"><i></i></div>' +
        '<div class="pdf-acts"></div>' +
      "</div>";
    document.body.appendChild(root);
    ov = {
      root: root,
      title: root.querySelector(".pdf-t"),
      status: root.querySelector(".pdf-status"),
      bar: root.querySelector(".pdf-bar i"),
      barBox: root.querySelector(".pdf-bar"),
      acts: root.querySelector(".pdf-acts")
    };
    return ov;
  }
  function ovShow(title, status, pct) {
    var o = ensureOverlay();
    o.title.textContent = title;
    o.status.textContent = status || "";
    o.status.className = "pdf-status";
    o.acts.innerHTML = "";
    o.barBox.style.display = arguments.length >= 3 ? "" : "none";
    if (arguments.length >= 3) o.bar.style.width = Math.max(0, Math.min(100, pct * 100)) + "%";
    o.root.hidden = false;
  }
  function ovButtons(list) {
    var o = ensureOverlay();
    o.acts.innerHTML = "";
    list.forEach(function (b) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "pdf-btn" + (b.primary ? " is-primary" : "");
      el.textContent = b.label;
      el.addEventListener("click", b.fn);
      o.acts.appendChild(el);
    });
  }
  function ovClose() { if (ov) ov.root.hidden = true; }

  /* ---------- 数据收集 ---------- */
  function collect(p, provKey, module, sess) {
    var entries = [], missing = [], fallback = [];
    U.ALL_YEARS.forEach(function (y) {
      if (!p.years[y]) return;
      U.itemsFor(p, y, sess).forEach(function (it) {
        if (it.m !== module || it.m === U.PENDING) return;
        var rec = U.sourceOf(provKey, y, it.ses, it.n);
        if (!rec || (!rec.imgQ && !rec.img)) {
          missing.push(y + " 年第 " + it.n + " 题");
          return;
        }
        var whole = !rec.imgQ;
        if (whole) fallback.push(y + " 年第 " + it.n + " 题");
        entries.push({
          year: y, n: it.n, t: it.t || "", s: it.s, m: module,
          tag: it.tag || "", lv: it.lv || "", desc: it.d || "",
          img: whole ? rec.img : rec.imgQ, whole: whole,
          choice: rec.choice || "",
          detail: (rec.detail || "").trim(),
          detailFull: (rec.detailFull || "").trim(),
          imgA: rec.imgA || "",
          paper: (rec.paper || "").replace(/（[^）]*）/g, "")
        });
      });
    });
    /* 考点分组重排（对标汇编考点 01/02 形态）：组间按题量降序（并列按首现顺序），
       组内先选择题、后非选择题，块内按年份→题号；随后统一顺序编号，保证题号单调 */
    var gIdx = {}, gList = [];
    entries.forEach(function (e) {
      var tg = e.tag || "未细分考点";
      if (gIdx[tg] == null) { gIdx[tg] = gList.length; gList.push({ tag: tg, list: [] }); }
      gList[gIdx[tg]].list.push(e);
    });
    gList.forEach(function (g) {
      g.list.sort(function (a, b) {
        var ca = isChoiceEntry(a) ? 0 : 1, cb = isChoiceEntry(b) ? 0 : 1;
        if (ca !== cb) return ca - cb;
        if (a.year !== b.year) return a.year < b.year ? -1 : 1;
        return (+a.n || 0) - (+b.n || 0);
      });
    });
    gList.sort(function (a, b) {
      if (b.list.length !== a.list.length) return b.list.length - a.list.length;
      return gIdx[a.tag] - gIdx[b.tag];
    });
    entries = [];
    gList.forEach(function (g) { g.list.forEach(function (e) { entries.push(e); }); });
    /* 试卷式顺序题号：分组重排后 1..N */
    entries.forEach(function (e, i) { e.seq = i + 1; });
    return { entries: entries, missing: missing, fallback: fallback };
  }

  /* 题型判定：注意「非选择题」含「选择」子串，必须先排除；t 空时以有无字母答案兜底 */
  function isChoiceEntry(e) {
    var t = e.t || "";
    if (/非选择/.test(t)) return false;
    if (/选择/.test(t)) return true;
    if (!t && e.choice) return true;
    return false;
  }

  /* ---------- 图片加载（并发 5，允许单张失败） ---------- */
  function loadOneImg(url) {
    return new Promise(function (res, rej) {
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.blob();
      }).then(function (b) {
        var u = URL.createObjectURL(b);
        var im = new Image();
        im.onload = function () { URL.revokeObjectURL(u); res(im); };
        im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("图片解码失败")); };
        im.src = u;
      }).catch(rej);
    });
  }
  function loadImages(urls, onProgress) {
    var out = new Array(urls.length);
    var done = 0, idx = 0;
    return new Promise(function (resolve) {
      function next() {
        if (idx >= urls.length) return;
        var i = idx++;
        loadOneImg(urls[i]).then(function (im) {
          out[i] = { ok: true, im: im };
        }).catch(function () {
          out[i] = { ok: false };
        }).then(function () {
          done++;
          onProgress(done, urls.length);
          if (done === urls.length) resolve(out);
          else next();
        });
      }
      for (var k = 0; k < Math.min(5, urls.length); k++) next();
    });
  }

  /* ---------- canvas 页面 ---------- */
  function newPage() {
    var c = document.createElement("canvas");
    c.width = PAGE_W; c.height = PAGE_H;
    var g = c.getContext("2d");
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, PAGE_W, PAGE_H);
    g.textBaseline = "alphabetic";
    return { c: c, g: g };
  }
  function wrapText(g, text, maxW) {
    var lines = [], line = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === "\n") { lines.push(line); line = ""; continue; }
      var t = line + ch;
      if (g.measureText(t).width > maxW && line) { lines.push(line); line = ch; }
      else line = t;
    }
    lines.push(line);
    return lines;
  }
  function fmtDate() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  function drawCover(g, p, module, sess, items) {
    var color = U.colorOf(module);
    var CX = PAGE_W / 2;

    function cText(txt, font, fill, y) {
      g.font = font; g.fillStyle = fill;
      g.textAlign = "center";
      g.fillText(txt, CX, y);
      g.textAlign = "left";
    }

    /* 顶部小字 + 色条 */
    cText("高考化学考点分布查询站 · 真题专项", "400 19px " + FONT, "#6B7263", M + 46);
    g.fillStyle = color;
    g.fillRect(CX - 28, 150, 56, 7);

    /* 试卷式标题（居中） */
    cText(module, "600 54px " + FONT, "#1E2417", 320);
    cText("专项训练卷（" + U.YEAR_RANGE + "）", "400 26px " + FONT, "#454D3C", 372);
    cText(p.display + (sess ? " · " + sess : ""), "400 21px " + FONT, "#6B7263", 424);

    /* 信息表：题量 / 来源 / 答案（居中带框两列表） */
    var rows = [
      ["题　　量", String(items.entries.length) + " 题"],
      ["来　　源", p.display + (sess ? " " + sess : "") + " · " + U.YEAR_RANGE + " 年真题"],
      ["编　　排", "按考点分组 · 卷首附 5 年考情统计"],
      ["答　　案", "卷末统一附"]
    ];
    var tw = 760, lx = M + (CW - tw) / 2, lw = 200, ty = 560, rh = 62;
    g.strokeStyle = "#C9CFBD"; g.lineWidth = 1;
    g.strokeRect(lx, ty, tw, rh * rows.length);
    rows.forEach(function (r, i) {
      if (i) { g.beginPath(); g.moveTo(lx, ty + i * rh); g.lineTo(lx + tw, ty + i * rh); g.stroke(); }
      g.beginPath(); g.moveTo(lx + lw, ty); g.lineTo(lx + lw, ty + rh * rows.length); g.stroke();
      g.font = "400 18px " + FONT; g.fillStyle = "#6B7263";
      g.fillText(r[0], lx + 66, ty + i * rh + 40);
      g.font = "600 20px " + FONT; g.fillStyle = "#1E2417";
      g.fillText(r[1], lx + lw + 40, ty + i * rh + 40);
    });

    /* 说明（居中多行） */
    var notes = [
      "本卷按考点分组编排，题面截取自原卷；「待核」题目不计入，卷首附收录题考情统计。",
      "参考答案与解析截图统一附于卷末，可先作答再核对。"
    ];
    if (items.fallback.length) notes.push("部分题目暂无单题裁切图，采用原卷整页图展示。");
    if (items.missing.length) notes.push("以下题目原卷未公开、暂无题面图，未收录：" + items.missing.join("、") + "。");
    notes.push("本题卷由页面实时生成，与站内数据同步；仅供个人复习使用。");
    notes.forEach(function (t, i) {
      cText(t, "400 17px " + FONT, "#6B7263", 850 + i * 36);
    });

    g.font = "400 15px " + MONO;
    g.fillStyle = "#9AA194";
    g.textAlign = "center";
    g.fillText("生成日期 " + fmtDate(), CX, FOOT_Y);
    g.textAlign = "left";
  }

  /* 页流控制器：考情表与正文共用同一页面流——考情表画完正文直接续排同页，不再独占页 */
  function makeFlow(pages) {
    var F = { cur: null, cy: 0 };
    F.flush = function () { if (F.cur) pages.push(F.cur); F.cur = null; };
    F.ensureSpace = function (need) {
      if (!F.cur || F.cy + need > PAGE_H - M - 44) { F.flush(); F.cur = newPage(); F.cy = M; }
    };
    return F;
  }

  /* ---------- 考情表：对标汇编「5年考情·探规律」，画在正文页面流首部，不独占页 ---------- */
  function buildTrendPages(F, p, module, sess, entries) {
    if (!entries.length) return;
    var color = U.colorOf(module);
    var yrs = U.ALL_YEARS;
    /* 按考点标签聚合 */
    var idx = {}, groups = [];
    entries.forEach(function (e) {
      var tg = e.tag || "未细分考点";
      if (idx[tg] == null) { idx[tg] = groups.length; groups.push({ tag: tg, list: [], years: {}, lvs: {} }); }
      var g = groups[idx[tg]];
      g.list.push(e);
      g.years[e.year] = (g.years[e.year] || 0) + 1;
      var lv = e.lv || "未标";
      g.lvs[lv] = (g.lvs[lv] || 0) + 1;
    });
    groups.sort(function (a, b) { return b.list.length - a.list.length; });
    /* 考查重点：每组取前两条不同的 d 摘要 */
    groups.forEach(function (g) {
      var seen = {}, pick = [];
      for (var i = 0; i < g.list.length && pick.length < 2; i++) {
        var d = (g.list[i].desc || "").replace(/\s+/g, "");
        if (d.length > 34) d = d.slice(0, 33) + "…";
        if (d && !seen[d]) { seen[d] = 1; pick.push(d); }
      }
      g.focus = pick.join("；");
    });

    /* 表格几何 */
    var c0 = 244, cY = 60, cQ = 52, cL = 190;
    var cD = CW - c0 - yrs.length * cY - cQ - cL;
    var RH = 74, HH = 54;

    function drawHead(g, y) {
      g.fillStyle = "#F2F4EC";
      g.fillRect(M, y, CW, HH);
      if (color) { g.fillStyle = color; g.fillRect(M, y, 6, HH); }
      g.font = "600 17px " + FONT;
      g.fillStyle = "#1E2417";
      g.textBaseline = "middle";
      g.fillText("考点分类", M + 22, y + HH / 2 + 1);
      var x = M + c0;
      yrs.forEach(function (yr) {
        g.font = "600 15px " + FONT;
        g.fillText(yr, x + 14, y + HH / 2 + 1);
        x += cY;
      });
      g.font = "600 17px " + FONT;
      g.fillText("题量", x + 8, y + HH / 2 + 1); x += cQ;
      g.fillText("难度分布", x + 10, y + HH / 2 + 1); x += cL;
      g.fillText("考查重点（摘要）", x + 12, y + HH / 2 + 1);
      g.strokeStyle = "#C9CFBD"; g.lineWidth = 1;
      g.strokeRect(M, y, CW, HH);
      g.textBaseline = "alphabetic";
      return y + HH;
    }

    F.ensureSpace(200);
    var y = F.cy;
    function head(sub) {
      y = drawSectionHead(F.cur.g, y, "5 年考情 · 探规律", sub) + 8;
    }
    head("统计自本卷收录的 " + entries.length + " 道真题 ·「—」表示该年该考点未收录");

    groups.forEach(function (g, gi) {
      if (y + RH > PAGE_H - M - 34) {
        F.cy = y; F.flush();
        F.cur = newPage(); y = M;
        head("（续）");
      }
      if (gi % 2) { F.cur.g.fillStyle = "#FAFBF6"; F.cur.g.fillRect(M, y, CW, RH); }
      F.cur.g.textBaseline = "middle";
      /* 考点名：超长截断单行 */
      F.cur.g.font = "600 16px " + FONT;
      F.cur.g.fillStyle = "#1E2417";
      var tName = g.tag;
      while (F.cur.g.measureText(tName).width > c0 - 40 && tName.length > 2) tName = tName.slice(0, -1);
      if (tName !== g.tag) tName += "…";
      F.cur.g.fillText(tName, M + 22, y + RH / 2);
      /* 逐年题数 */
      var x = M + c0;
      yrs.forEach(function (yr) {
        var v = g.years[yr];
        F.cur.g.font = "400 17px " + FONT;
        F.cur.g.fillStyle = v ? "#1E2417" : "#C2C8B4";
        F.cur.g.fillText(v ? String(v) : "—", x + 14, y + RH / 2);
        x += cY;
      });
      F.cur.g.font = "600 17px " + FONT;
      F.cur.g.fillStyle = "#1E2417";
      F.cur.g.fillText(String(g.list.length), x + 12, y + RH / 2); x += cQ;
      /* 难度分布：按量降序拼接 */
      var lvTxt = Object.keys(g.lvs).map(function (k) { return [k, g.lvs[k]]; })
        .sort(function (a, b) { return b[1] - a[1]; })
        .map(function (p2) { return p2[0] + p2[1]; }).join("·");
      F.cur.g.font = "400 15px " + FONT;
      while (F.cur.g.measureText(lvTxt).width > cL - 14 && lvTxt.length > 4) lvTxt = lvTxt.slice(0, -2) + "…";
      F.cur.g.fillText(lvTxt, x + 10, y + RH / 2); x += cL;
      /* 考查重点：两行 wrap */
      F.cur.g.font = "400 15px " + FONT;
      F.cur.g.fillStyle = "#454D3C";
      var fl = wrapText(F.cur.g, g.focus, cD - 24).slice(0, 2);
      var fy = y + (RH - fl.length * 22) / 2 + 14;
      fl.forEach(function (ln) { F.cur.g.fillText(ln, x + 12, fy); fy += 22; });
      /* 行框与考点列分隔线 */
      F.cur.g.textBaseline = "alphabetic";
      F.cur.g.strokeStyle = "#DDE2D0"; F.cur.g.lineWidth = 1;
      F.cur.g.strokeRect(M, y, CW, RH);
      F.cur.g.beginPath(); F.cur.g.moveTo(M + c0, y); F.cur.g.lineTo(M + c0, y + RH); F.cur.g.stroke();

      y += RH;
    });
    y += 10;
    if (y < PAGE_H - M - 20) {
      F.cur.g.font = "400 14px " + FONT;
      F.cur.g.fillStyle = "#8A9182";
      F.cur.g.fillText("注：本表由页面从本站已收录真题实时计算；未收录年份不代表当年未考查，难度为站内定级。", M, y + 12);
    }
    F.cy = y;
  }
/*v43Trend*/

  function drawQHead(g, y, e, compact) {
    /* 试卷式题头栏：左「第 N 题」，右「来源卷 · 原卷第 n 题 · 题型分值」；选择题用紧凑矮头 */
    var h = compact ? Q_HEAD_C : Q_HEAD;
    g.fillStyle = "#F2F4EC";
    g.fillRect(M, y, CW, h - 12);
    var col = U.colorOf(e.m || "");
    if (col) { g.fillStyle = col; g.fillRect(M, y, 6, h - 12); }
    g.font = "600 " + (compact ? 19 : 22) + "px " + FONT;
    g.fillStyle = "#1E2417";
    g.fillText("第 " + e.seq + " 题", M + 22, y + (compact ? 23 : 26));
    var pn = e.paper || e.year + " 年卷";
    pn = pn.replace(/^(20\d\d)年/, "$1·");
    var src = pn + " · 第 " + e.n + " 题";
    if (e.t) src += " · " + e.t;
    if (e.s != null) src += " " + e.s + " 分";
    g.font = "400 " + (compact ? 14 : 15) + "px " + FONT;
    g.fillStyle = "#8A9182";
    g.textAlign = "right";
    g.fillText(src, PAGE_W - M - 18, y + (compact ? 22 : 25));
    g.textAlign = "left";
    return y + h;
  }
/*v43QHead*/

  function drawImageBlock(g, y, im, noteText, maxH, w) {
    if (im) {
      var iw = im.naturalWidth, ih = im.naturalHeight;
      var dw = w || CW, dh = Math.round(ih * dw / iw);
      var cap = maxH || MAX_IMG_H;
      if (dh > cap) { dh = cap; dw = Math.round(iw * dh / ih); }
      var x = M + (CW - dw) / 2;
      g.drawImage(im, x, y, dw, dh);
      return y + dh;
    }
    /* 加载失败占位 */
    var h = 200;
    g.fillStyle = "#F2F4EC";
    g.fillRect(M, y, CW, h);
    g.font = "400 17px " + FONT;
    g.fillStyle = "#8A9182";
    var lines = wrapText(g, noteText || "本题图片加载失败，可稍后重试。", CW - 60);
    for (var i = 0; i < lines.length; i++) g.fillText(lines[i], M + 30, y + 84 + i * 28);
    return y + h;
  }

  /* 答案区（试卷版）：仅题号 + 解析截图；共享答案表按 imgA 分组只嵌一次 */
  function drawAnswerPage(pages, entries, ansImgs) {
    var pg = newPage(), y = M;
    pg.g.font = "600 30px " + FONT;
    pg.g.fillStyle = "#1E2417";
    pg.g.fillText("参考答案", M, y + 32);
    pg.g.strokeStyle = "#1E2417";
    pg.g.lineWidth = 2;
    pg.g.beginPath(); pg.g.moveTo(M, y + 52); pg.g.lineTo(PAGE_W - M, y + 52); pg.g.stroke();
    y += 90;

    function newPg() { pages.push(pg); pg = newPage(); y = M; }
    function need(h) { if (y + h > PAGE_H - M - 30) newPg(); }

    /* 按 imgA 路径分组，保持排序后的出现顺序 */
    var groups = [], idxOf = {};
    entries.forEach(function (e) {
      var key = e.imgA || "__none__";
      if (idxOf[key] == null) { idxOf[key] = groups.length; groups.push({ imgA: e.imgA, list: [] }); }
      groups[idxOf[key]].list.push(e);
    });

    groups.forEach(function (gr) {
      var shared = gr.list.length > 1;
      var r = gr.imgA ? ansImgs[gr.imgA] : null;
      var im = r && r.ok ? r.im : null;

      /* 组头：顺序题号 + 原卷定位（共享答案表列出全部适用题号，只嵌一次） */
      var heads = gr.list.map(function (e) {
        return "第 " + e.seq + " 题（" + (e.paper || e.year + " 年卷") + " 第 " + e.n + " 题）";
      });
      var headTxt = shared ? heads.join("　") + "　（共用同一张答案表）" : heads[0];
      pg.g.font = "600 18px " + FONT;
      var hLines = wrapText(pg.g, headTxt, CW).length;
      /* 图高上限随组头行数动态收紧：保证「组头 + 图」在一页内恒可容纳（防组头孤页/溢页底） */
      var aCap = PAGE_H - M * 2 - 30 - (hLines * 28 + 56);
      var aH = im ? Math.min(Math.round(im.naturalHeight * CW / im.naturalWidth), aCap) : 30;
      /* 组头 + 解析图原子预留：整块放不下先换页 */
      need(hLines * 28 + aH + 48);
      pg.g.fillStyle = "#1E2417";
      wrapText(pg.g, headTxt, CW).forEach(function (ln) {
        pg.g.fillText(ln, M, y + 6); y += 28;
      });
      y += 8;

      /* 解析截图 */
      if (gr.imgA) {
        if (im) {
          need(aH + 20);
          y = drawImageBlock(pg.g, y, im, "解析截图加载失败。", aH) + GAP;
        } else {
          need(30);
          pg.g.font = "400 15px " + FONT;
          pg.g.fillStyle = "#8A9182";
          pg.g.fillText("解析截图加载失败，可到站内该题详情查看。", M, y + 6);
          y += 30;
        }
      } else {
        need(30);
        pg.g.font = "400 15px " + FONT;
        pg.g.fillStyle = "#8A9182";
        pg.g.fillText("该题暂无解析截图。", M, y + 6);
        y += 30;
      }
      y += 14;
    });
    pages.push(pg);
  }

  /* ---------- 组卷 ---------- */
  function drawSectionHead(g, y, title, sub) {
    g.font = "600 30px " + FONT;
    g.fillStyle = "#1E2417";
    g.fillText(title, M, y + 30);
    if (sub) {
      g.font = "400 15px " + FONT;
      g.fillStyle = "#8A9182";
      g.fillText(sub, M, y + 56);
      g.strokeStyle = "#1E2417";
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(M, y + 70); g.lineTo(PAGE_W - M, y + 70); g.stroke();
      return y + 86;
    }
    g.strokeStyle = "#1E2417";
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(M, y + 44); g.lineTo(PAGE_W - M, y + 44); g.stroke();
    return y + 60;
  }

  function buildPages(p, module, sess, items, imgs, ansImgs) {
    var pages = [];
    var cover = newPage();
    drawCover(cover.g, p, module, sess, items);
    pages.push(cover);

    var F = makeFlow(pages);
    /* v44：按用户要求移除5年考情页，正文直接从考点分组开始 */

    function drawGroup(title, sub, list) {
      if (!list.length) return;
      var TITLE_H = 110;
      var titlePending = true;          /* 组标题延后画：与首题同页，防首题过高时孤儿标题页 */
      function drawTitle() {
        F.ensureSpace(TITLE_H + 14);
        F.cy += 14;
        F.cy = drawSectionHead(F.cur.g, F.cy, title, sub);
        titlePending = false;
      }
      list.forEach(function (e, gi) {
        var i = items.entries.indexOf(e);
        var r = imgs[i];
        var im = r && r.ok ? r.im : null;
        var choice = isChoiceEntry(e);
        var big = !choice;               /* 非选择大题独占一页（对标试卷大题版式） */
        var qh = choice ? Q_HEAD_C : Q_HEAD;
        var w = choice ? CHOICE_W : CW;  /* 选择题回原卷真实宽（不放大），一页可排多题 */
        var gap = choice ? 16 : GAP;
        var body = PAGE_H - M * 2 - 44;
        var cap2 = (body - 2 * (qh + gap)) / 2;  /* v44：选择题图高封顶，超高题图等比缩小，保证一页至少2题 */
        var cap2T = cap2 - 74;                   /* v44：组标题页标题占位74px，首题再收紧，保证标题+2题同页 */
        var cap = choice ? Math.floor(titlePending ? cap2T : cap2) : MAX_IMG_H;
        if (titlePending && !choice) cap = PAGE_H - M * 2 - 44 - TITLE_H - qh - gap; /* 标题+首题共页的收紧上限（大题） */ /*v44Cap*/
        var dh = im ? Math.min(Math.round(im.naturalHeight * w / im.naturalWidth), cap) : 200;
        if (big && gi > 0) F.flush();    /* 大题一题一页（组标题后首题紧跟不换页） */
        if (titlePending) drawTitle();
        F.ensureSpace(qh + dh + gap);
        F.cy = drawQHead(F.cur.g, F.cy, e, choice);
        F.cy = drawImageBlock(F.cur.g, F.cy, im, "第 " + e.n + " 题图片加载失败，可稍后重试导出。", cap, w) + gap;
      });
    }
    /* 正文按考点分组（考点 01/02 形态），组内沿用「选择在前→年份→题号」排序 */
    var idxT = {}, tGroups = [];
    items.entries.forEach(function (e) {
      var tg = e.tag || "未细分考点";
      if (idxT[tg] == null) { idxT[tg] = tGroups.length; tGroups.push({ tag: tg, list: [] }); }
      tGroups[idxT[tg]].list.push(e);
    });
    tGroups.forEach(function (g, k) {
      var ch = g.list.filter(function (e) { return isChoiceEntry(e); }).length;
      var no = ("0" + (k + 1)).slice(-2);
      drawGroup("考点 " + no + "　" + g.tag,
        "共 " + g.list.length + " 题 · 选择 " + ch + " 题 · 非选择 " + (g.list.length - ch) + " 题",
        g.list);
    });
    F.flush();

    drawAnswerPage(pages, items.entries, ansImgs);
/*v43Flow*/
    return pages;
  }

  function buildPDF(J, p, module, sess, items, imgs, ansImgs) {
    var pages = buildPages(p, module, sess, items, imgs, ansImgs);
    var doc = new J({ unit: "mm", format: "a4", compress: true });
    pages.forEach(function (pg, i) {
      if (i) doc.addPage();
      /* 页脚：试卷式 — N — */
      pg.g.font = "400 16px " + FONT;
      pg.g.fillStyle = "#9AA194";
      pg.g.textAlign = "center";
      pg.g.fillText("— " + (i + 1) + " —", PAGE_W / 2, FOOT_Y);
      pg.g.textAlign = "left";
      doc.addImage(pg.c.toDataURL("image/jpeg", JPEG_Q), "JPEG", 0, 0, 210, 297);
    });
    return doc.output("blob");
  }

  /* ---------- 保存 ---------- */
  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    /* 不支持 download 属性的手机浏览器会把当前页导航到 blob: 地址导致页面卡死；
       target=_blank 让这类浏览器在新标签页打开，保住当前页（支持 download 的浏览器会忽略 target） */
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  /* 系统分享面板保存（Web Share API，安卓 Chrome/夸克/UC 及 iOS Safari 均支持"存储到文件"）。
     必须在用户点击的同步调用栈里执行，故由按钮回调直接调用。 */
  function canSharePdf(blob, name) {
    try {
      if (!navigator.share || !navigator.canShare) return false;
      var file = new File([blob], name, { type: "application/pdf" });
      return navigator.canShare({ files: [file] });
    } catch (e) { return false; }
  }
  function sharePdf(blob, name) {
    var file = new File([blob], name, { type: "application/pdf" });
    navigator.share({ files: [file], title: name }).catch(function () {});
  }

  /* ---------- 主入口 ---------- */
  function start(module, provKey, sess) {
    if (busy) return;
    var p = U.D.provinces[provKey];
    if (!p || !module) return;
    if (isIOSWeChat()) {
      ovShow("请在浏览器中打开", "", null);
      var o = ensureOverlay();
      o.status.innerHTML =
        "微信（iOS）暂不支持直接下载文件。<br>请点击右上角「<b>···</b>」，选择「<b>在浏览器打开</b>（Safari）」，进入后再点击一次「PDF」即可下载。";
      o.status.className = "pdf-status is-rich";
      ovButtons([{ label: "我知道了", primary: true, fn: ovClose }]);
      return;
    }
    busy = true;
    ovShow("导出 PDF", "正在加载题库数据…", 0.06);
    Promise.resolve()
      .then(ensureQmap)
      .then(function () {
        var items = collect(p, provKey, module, sess);
        if (!items.entries.length) {
          busy = false;
          ovShow("导出 PDF", "「" + module + "」板块近五年暂无已收录题目，未生成 PDF。", null);
          ovButtons([{ label: "关闭", primary: true, fn: ovClose }]);
          return null;
        }
        var entry0 = items.entries;
        /* 答案解析图：按 imgA 路径去重（共享答案表只加载一次） */
        var ansUrls = [], seenA = {};
        entry0.forEach(function (e) {
          if (e.imgA && !seenA[e.imgA]) { seenA[e.imgA] = true; ansUrls.push(e.imgA); }
        });
        var qUrls = entry0.map(function (e) { return e.img; });
        var allUrls = qUrls.concat(ansUrls);
        return ensureJsPDF().then(function (J) {
          ovShow("导出 PDF", "正在加载图片 0 / " + allUrls.length + " …", 0.12);
          return loadImages(allUrls, function (i, n) {
            ovShow("导出 PDF", "正在加载图片 " + i + " / " + n + " …", 0.12 + 0.68 * (i / n));
          }).then(function (all) {
            ovShow("导出 PDF", "正在生成 PDF（共 " + entry0.length + " 题）…", 0.84);
            var imgs = all.slice(0, qUrls.length);
            var ansImgs = {};
            ansUrls.forEach(function (u, k) { ansImgs[u] = all[qUrls.length + k]; });
            return new Promise(function (resolve) {
              setTimeout(function () {
                try {
                  var blob = buildPDF(J, p, module, sess, items, imgs, ansImgs);
                  resolve({ blob: blob, items: items });
                } catch (err) { resolve({ err: err }); }
              }, 30);
            });
          });
        });
      })
      .then(function (result) {
        busy = false;
        if (!result) return;
        if (result.err) {
          ovShow("导出失败", "生成 PDF 时出现问题：" + (result.err && result.err.message ? result.err.message : "未知错误"), null);
          ovButtons([{ label: "关闭", primary: true, fn: ovClose }]);
          return;
        }
        var name = p.display + "·" + module + "·专项训练卷.pdf";
        saveBlob(result.blob, name);
        window.PDFExport._lastResult = { name: name, size: result.blob.size, blob: result.blob };
        var mb = (result.blob.size / 1048576).toFixed(1);
        var shareable = canSharePdf(result.blob, name);
        var tip;
        if (/MicroMessenger/i.test(navigator.userAgent || "")) {
          tip = shareable
            ? "若浏览器未开始下载，可点「保存 / 分享」调起系统面板存储文件。"
            : "微信内若未弹出保存，请点击右上角「···」→「在浏览器打开」后重试。";
        } else {
          tip = (shareable ? "若未开始下载，点「保存 / 分享」可直接存储到手机。" : "若浏览器未开始下载，可点「重新下载」再试一次。") +
            "部分 App 内置浏览器不支持在线生成文件的下载，遇此情况请复制本页链接，用 Chrome / Safari / Edge 打开后再点一次「PDF」。";
        }
        ovShow("导出完成", "《" + name + "》共 " + result.items.entries.length + " 题、约 " + mb + " MB，已尝试开始下载。" + tip, 1);
        var acts = [];
        if (shareable) {
          acts.push({ label: "保存 / 分享", primary: true, fn: function () { sharePdf(result.blob, name); } });
          acts.push({ label: "重新下载", fn: function () { saveBlob(result.blob, name); } });
        } else {
          acts.push({ label: "重新下载", primary: true, fn: function () { saveBlob(result.blob, name); } });
        }
        acts.push({ label: "关闭", fn: ovClose });
        ovButtons(acts);
      })
      .catch(function (err) {
        busy = false;
        ovShow("导出失败", (err && err.message ? err.message : "未知错误") + "，请稍后重试。", null);
        ovButtons([{ label: "关闭", primary: true, fn: ovClose }]);
      });
  }

  window.PDFExport = { start: start };
})();
