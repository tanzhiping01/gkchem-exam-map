/* 页面模板：首页 / 省份详情 */
(function () {
  const U = window.U;
  const esc = U.esc;

  const PROVINCE_PINYIN_ORDER = [
    "安徽", "北京", "重庆", "福建", "甘肃", "广东", "广西", "贵州",
    "海南", "河北", "黑吉辽蒙", "河南", "湖北", "湖南",
    "江苏", "江西", "山东", "上海", "陕晋青宁", "四川",
    "天津", "新疆", "云南", "浙江"
  ];
  const PROVINCE_SORT_INDEX = new Map(PROVINCE_PINYIN_ORDER.map((key, i) => [key, i]));

  /* 首页公告：更新时只改标题、正文和日期（日期用 YYYY-MM-DD） */
  const ANNOUNCEMENT = {
    title: "抖音：\n让潘叔先来\n无偿分享。设置门槛/收费可耻。",
    shortTitle: "抖音：\n让潘叔先来\n无偿分享。设置门槛/收费可耻。",
    body: "",
    date: "2026-11-18"
  };

  const ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.4"/><path d="M15.6 15.6 20 20"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="9" y="9" width="10.5" height="10.5"/><path d="M15 5.5H6.2A.7.7 0 0 0 5.5 6.2V15"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 10a8 8 0 0 1 13.7-4.6L20 8"/><path d="M20 4v4h-4"/><path d="M20 14a8 8 0 0 1-13.7 4.6L4 16"/><path d="M4 20v-4h4"/></svg>',
    page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></svg>',
    calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17"/><path d="M8 7.5h8M8.5 12h2M13.5 12h2M8.5 16h2M13.5 16h2"/></svg>',
    lib: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4.5 6.5h6.2c1 0 1.8.8 1.8 1.8v11.2H6.3c-1 0-1.8-.8-1.8-1.8V6.5Z"/><path d="M19.5 6.5h-5.2c-1 0-1.8.8-1.8 1.8v11.2h6.2c1 0 1.8-.8 1.8-1.8V6.5Z"/><path d="M4.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h4.9c.8 0 1.5.7 1.5 1.5v3.3"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M13 4h7v7"/><path d="M20 4 10.5 13.5"/><path d="M18 13.5V19H5V6h5.5"/></svg>'
  };

  function homeView() {
    const totalQA = U.D.order.reduce((s, k) => s + U.totalItems(U.D.provinces[k]), 0);
    const provinceKeys = U.D.order.slice().sort((a, b) =>
      (PROVINCE_SORT_INDEX.get(a) ?? PROVINCE_PINYIN_ORDER.length) -
      (PROVINCE_SORT_INDEX.get(b) ?? PROVINCE_PINYIN_ORDER.length));
    const chips = provinceKeys.map((key) => {
      const p = U.D.provinces[key];
      return '<button class="chip" type="button" data-action="openProvince" data-key="' + esc(key) + '">' +
        '<span class="chip-name">' + esc(p.display) + "</span>" +
        '<span class="chip-sub">' + esc(U.chipSub(p)) + "</span></button>";
    }).join("");

    return '<main class="shell home view-enter" data-screen-label="首页">' +
      '<div class="masthead"><span class="mast-left">高考化学 · 各省独立命题卷</span>' +
        '<div class="mast-end"><span class="mast-right">' + U.ALL_YEARS[0] + " — " + U.ALL_YEARS[U.ALL_YEARS.length - 1] + '</span>' +
          '<button class="mast-tool" type="button" data-action="fufen">赋分速查</button>' +
          '<button class="mast-tool" type="button" data-action="mockref">模考库</button></div></div>' +
      '<section class="hero">' +
        '<p class="eyebrow">24 个省份 · 逐题考点</p>' +
        '<div class="hero-top">' +
          '<h1 class="display">你的省份，<br>化学考什么</h1>' +
          '<details class="bulletin">' +
            '<summary class="bulletin-summary" aria-label="查看公告：' + esc(ANNOUNCEMENT.title) + '">' +
              '<span class="bulletin-kicker">公告</span>' +
              '<span class="bulletin-title">' + ANNOUNCEMENT.shortTitle + "</span>" +
              '<span class="bulletin-foot"><time datetime="' + esc(ANNOUNCEMENT.date) + '">' +
                esc(ANNOUNCEMENT.date.slice(5).replace("-", ".")) + " 优化考点搜索功能</time>" + ICON.chev + "</span>" +
            "</summary>" +
            '<div class="bulletin-pop">' +
              '<div class="bulletin-meta"><span>站务说明</span>' +
                '<time datetime="' + esc(ANNOUNCEMENT.date) + '">更新于 ' + esc(ANNOUNCEMENT.date.replace(/-/g, ".")) + "</time></div>" +
              '<h2 class="bulletin-pop-title">' + esc(ANNOUNCEMENT.title) + "</h2>" +
              (ANNOUNCEMENT.body ? '<p class="bulletin-copy">' + esc(ANNOUNCEMENT.body) + "</p>" : "") +
            "</div>" +
          "</details>" +
        "</div>" +
        '<p class="lede">输入省份，查看近五年高考化学真题的考试时长、逐题考点与分值、难度分级、模块占比与变化趋势。家长可以看懂，学生可以直接对表复习。</p>' +
      "</section>" +
      '<form class="search-form" id="search-form" role="search" autocomplete="off">' +
        '<label class="field" for="province-input">' + ICON.search +
          '<input id="province-input" type="text" placeholder="输入省份，如 浙江 / 广东" aria-label="输入省份名称" aria-controls="suggest" aria-autocomplete="list" enterkeyhint="search">' +
        "</label>" +
        '<button class="btn-primary" type="submit">查询</button>' +
        '<div class="suggest" id="suggest" role="listbox" aria-label="省份候选" hidden></div>' +
      "</form>" +
      '<div class="chip-head"><span>或直接选择省份</span><span id="last-visit-slot"></span></div>' +
      '<div class="chip-grid">' + chips + "</div>" +
      '<footer class="home-foot">' +
        "<span><b>" + U.D.order.length + "</b> 个省份</span>" +
        "<span><b>" + totalQA + "</b> 道题</span>" +
        "<span>更新 <b>" + esc((U.D.meta.updated || "").replace(/-/g, ".")) + "</b></span>" +
        "<span>无需登录，链接可直接转发</span>" +
        '<span class="home-signature">——ｂｙ豆包＆波波老师</span>' +
      "</footer>" +
    "</main>";
  }

  function suggestionList(provinces) {
    if (!provinces.length) {
      return '<div class="s-empty">没有找到这个省份。试试输入「浙江」「广东」或简称「浙」「粤」。</div>';
    }
    return provinces.map((p, i) =>
      '<button type="button" role="option" data-action="pickSuggest" data-key="' + esc(p.key) + '" data-idx="' + i + '">' +
        '<span class="s-name">' + esc(p.display) + "</span>" +
        '<span class="s-meta">' + esc(U.subtitleOf(p)) + " · " + U.yearsOf(p).length + " 年</span>" +
      "</button>"
    ).join("");
  }

  function examStatHTML(k, v, unit) {
    return '<span class="es"><span class="es-k">' + k + '</span><span class="es-v">' + v +
      '<em>' + unit + "</em></span></span>";
  }

  /* 卷面档案：逐年份（浙江再逐场次）列出考试时长、满分、卷面结构与给分口径；
     若各年（各场次）的时长、满分、选择/非选择题分值、题量完全一致，则合并为一行 */
  function examItemsOf(entry) {
    return entry.has ? U.itemsFor(entry.p, entry.y, entry.sess) : [];
  }

  function examNotesOf(entry) {
    const e = entry.e;
    const items = examItemsOf(entry);
    const nc = items.filter((it) => it.t === "非选择题");
    const ncNull = nc.filter((it) => it.s == null).length;
    const notes = [];
    if (e.minutesNote && e.minutesNote.indexOf("单科考试时长") < 0) notes.push(e.minutesNote);
    if (ncNull && ncNull === nc.length && e.nonChoice) {
      notes.push("非选择题 " + nc.length + " 题合计 " + e.nonChoice + " 分，未逐题拆分");
    } else if (ncNull) {
      notes.push("有 " + ncNull + " 道题分值未公开，清单中标为 —");
    } else if (!e.choice && e.ncNote) {
      notes.push(e.ncNote);
    }
    return notes;
  }

  function examSignature(entry) {
    const e = entry.e;
    return [e.minutes || 0, e.full || 0, e.choice || 0, e.nonChoice || 0, examItemsOf(entry).length].join("|");
  }

  function examStatsOf(e) {
    const stats = [];
    if (e.minutes) stats.push(examStatHTML("考试时长", e.minutes, "分钟"));
    if (e.full) stats.push(examStatHTML("满分", e.full, "分"));
    if (e.choice && e.nonChoice) stats.push(examStatHTML("选择 / 非选择", e.choice + " + " + e.nonChoice, "分"));
    return stats.join("");
  }

  function structRowHTML(entry, labelHTML, structure, extraNotes, cutoffAside) {
    const e = entry.e;
    if (!e || e.noPaper) {
      return '<div class="struct-row is-missing">' + labelHTML +
        '<span class="struct-body"><span class="struct-s">' + esc(e && e.noPaper ? e.noPaper : structure) + "</span></span></div>";
    }
    const notes = examNotesOf(entry).concat(extraNotes || []);
    return '<div class="struct-row' + (cutoffAside ? " has-cutoff" : "") + '">' + labelHTML +
      '<span class="struct-body">' +
        '<span class="exam-stats">' + examStatsOf(e) + "</span>" +
        (structure ? '<span class="struct-s">' + esc(structure) + "</span>" : "") +
        notes.map((n) => '<span class="exam-note">' + esc(n) + "</span>").join("") +
      "</span>" + (cutoffAside || "") + "</div>";
  }

  function structEntries(p) {
    const out = [];
    U.ALL_YEARS.forEach((y) => {
      const e = U.examOf(p, y);
      const has = !!p.years[y];
      const structure = has ? p.years[y].structure || "卷面结构未标注" : "无独立卷（旧高考理综），本表未收录";
      if (e && e.sessions) {
        e.sessions.forEach((se) => out.push({ p, y, sess: se.label, e: se, has, structure }));
      } else {
        out.push({ p, y, sess: "", e, has, structure });
      }
    });
    return out;
  }

  function entryLabel(x) {
    return x.sess
      ? '<span class="struct-y">' + x.y + '<em class="struct-sess">' + esc(x.sess) + "</em></span>"
      : '<span class="struct-y">' + x.y + "</span>";
  }

  function structSig(x, withStructure) {
    const e = x.e;
    return [e.minutes || 0, e.full || 0, e.choice || 0, e.nonChoice || 0,
      examItemsOf(x).length, withStructure ? x.structure : ""].join("|");
  }

  /* 一组相同卷面信息的合并行：统计信息只出现一次，结构与备注去重后列出 */
  function mergedStructRowHTML(p, group, labelHTML, scopeText, cutoffAside) {
    const base = group[0];
    const baseEntry = { p, y: base.y, sess: base.sess, e: base.e, has: base.has };
    const structures = Array.from(new Set(group.map((x) => x.structure).filter(Boolean)));
    const allNotes = Array.from(new Set(group.reduce((a, x) => a.concat(examNotesOf(x)), [])));
    const baseNotes = examNotesOf(baseEntry);
    const extra = allNotes.filter((n) => baseNotes.indexOf(n) < 0).concat([scopeText]);
    return structRowHTML(baseEntry, labelHTML, structures.join(" / "), extra, cutoffAside);
  }

  function cutoffStackHTML(p, years) {
    const cards = Array.from(new Set(years)).map((y) => cutoffHTML(p, y)).filter(Boolean);
    if (cards.length < 2) return cards[0] || "";
    return '<div class="cutoff-stack">' + cards.join("") + "</div>";
  }

  function structRowsHTML(p) {
    const entries = structEntries(p);
    const present = entries.filter((x) => x.has && x.e && !x.e.noPaper);
    const others = entries.filter((x) => !(x.has && x.e && !x.e.noPaper));

    /* 全部年份与场次完全相同：合并成一行 */
    const sigs = present.map((x) => structSig(x, true));
    if (present.length >= 2 && sigs.every((v) => v === sigs[0])) {
      const years = Array.from(new Set(present.map((x) => x.y)));
      const hasSessions = present.some((x) => x.sess);
      const yearsText = years.length > 1 ? years[0] + "—" + years[years.length - 1] : years[0];
      const label = '<span class="struct-y struct-y-merged">' + years.length + " 年" +
        '<em class="struct-sess">' + (hasSessions ? "含各场次" : "各年一致") + "</em></span>";
      const scopeText = yearsText + " 各年" + (hasSessions ? "、各场次" : "") + "的考试时长、满分与卷面结构相同";
      const merged = mergedStructRowHTML(p, present, label, scopeText,
        cutoffStackHTML(p, present.map((x) => x.y)));
      const rest = others.map((x) => structRowHTML(x, entryLabel(x), x.sess ? "" : x.structure)).join("");
      return merged + rest;
    }

    /* 否则按年份列出；同一年内各场次完全相同，则在年内地合并一次 */
    const byYear = [];
    U.ALL_YEARS.forEach((y) => {
      const group = entries.filter((x) => x.y === y);
      if (!group.length) return;
      byYear.push(group);
    });

    return byYear.map((group) => {
      const groupCutoff = cutoffHTML(p, group[0].y);
      const ok = group.filter((x) => x.has && x.e && !x.e.noPaper);
      const gsig = ok.map((x) => structSig(x, true));
      if (ok.length >= 2 && gsig.every((v) => v === gsig[0])) {
        const label = '<span class="struct-y struct-y-merged">' + group[0].y +
          '<em class="struct-sess">两场次一致</em></span>';
        const scopeText = group[0].y + " 年两场次的考试时长、满分与卷面结构相同";
        const merged = mergedStructRowHTML(p, ok, label, scopeText, groupCutoff);
        const rest = group.filter((x) => ok.indexOf(x) < 0)
          .map((x) => structRowHTML(x, entryLabel(x), x.sess ? "" : x.structure)).join("");
        return merged + rest;
      }
      return group.map((x, i) => structRowHTML(x, entryLabel(x), x.sess ? "" : x.structure, null,
        i === 0 ? groupCutoff : "")).join("");
    }).join("");
  }

  function profileHTML(p) {
    const years = U.yearsOf(p);
    const missing = U.ALL_YEARS.filter((y) => !p.years[y]);
    const members = U.sharedMembers(p);
    const structRows = structRowsHTML(p);

    let notices = "";
    if (missing.length) {
      notices += '<div class="notice"><b>' + missing.join("、") + " 年</b>该省仍为旧高考理综，化学未单独成卷，因此没有该年度的独立卷考点数据。</div>";
    }
    if (members && years.length) {
      notices += '<div class="notice">本页按<b>共用卷</b>展开：' + esc(U.subtitleOf(p).replace(" 共用卷", "")) + " 使用同一套题，考点完全相同。</div>";
    }
    if (years.length && U.sessionsOf(p, years[0]).length) {
      notices += '<div class="notice">本省选考每年分 <b>1 月首考</b> 与 <b>6 月选考</b> 两场独立命题：本页按场次分组展示，两组的模块占比、难度分布与逐题清单分别统计，互不合并。</div>';
    }
    const counts = years.map((y) => U.itemCount(p, y));
    const maxC = Math.max.apply(null, counts.concat([0]));
    years.forEach((y, i) => {
      if (maxC >= 12 && counts[i] < maxC * 0.6) {
        notices += '<div class="notice"><b>' + y + " 年</b>为" + counts[i] + " 条主题级记录（其余年度逐题收录），题量口径不同，该年占比仅供参考。</div>";
      }
    });
    if (!missing.length && (p.mode || "").indexOf("旧高考") >= 0) {
      const first = p.years[years[0]].items[0];
      notices += '<div class="notice">该省目前仍为老高考理综，化学不单独成卷；本页收录理综卷中的化学部分，题号沿用理综卷（自第 ' + esc(first ? first.n : "") + " 题起）。</div>";
    }

    const pendingTotal = U.totalPending(p);
    return '<section class="profile">' +
      '<div class="profile-eyebrow"><span>卷面档案</span><span>' + years.length + " 个年度收录</span></div>" +
      '<h1 class="province">' + esc(p.display) + "</h1>" +
      '<div class="province-sub">' + esc(U.subtitleOf(p)) + "</div>" +
      '<div class="stamp" aria-hidden="true"><span>五</span><span>年</span><span>真</span><span>题</span></div>' +
      '<div class="meta-row">' +
        '<span class="tag tag-mode">高考模式 <b>' + esc(U.modeLabel(p)) + "</b></span>" +
        "<span class=\"tag\">五年共 <b>" + U.totalItems(p) + "</b> 题</span>" +
        (pendingTotal ? '<span class="tag tag-pending">待核 <b>' + pendingTotal + "</b> 题</span>" : "") +
      "</div>" +
      '<div class="struct">' + structRows + "</div>" +
      notices +
    "</section>";
  }

  function yearTabsHTML(p, year) {
    return '<div class="years" role="tablist" aria-label="选择年度">' + U.ALL_YEARS.map((y) => {
      const has = !!p.years[y];
      const sel = y === year;
      const pend = has ? U.pendingCount(p, y) : 0;
      return '<button class="year-tab" type="button" role="tab" data-action="year" data-year="' + y + '"' +
        ' aria-selected="' + sel + '"' + (has ? "" : " disabled") + ">" +
        y +
        (pend ? '<span class="dot" title="含待核题目"></span>' : "") +
      "</button>";
    }).join("") + "</div>";
  }

  /* ---------- 省控线 ---------- */
  const CUT = window.CUTOFF || { meta: {}, provinces: {} };
  const CUT_GROUPS = {
    "黑吉辽蒙": ["黑龙江", "吉林", "辽宁", "内蒙古"],
    "陕晋青宁": ["陕西", "山西", "青海", "宁夏"]
  };
  const FULL_SCORE = { "上海": 660, "海南": 900 };

  function cutoffMembersOf(p) {
    return CUT_GROUPS[p.key] || [p.display];
  }

  function cutoffValue(v) {
    return v == null || v === "" ? '<span class="cs-na" title="该年数据未取得">—</span>' : String(v);
  }

  function cutoffNotesHTML(records) {
    const notes = records.filter((x) => x.rec && x.rec.note).map((x) =>
      (records.length > 1 ? x.name + "：" : "口径备注：") + x.rec.note
    );
    return notes.length ? '<p class="cs-note">' + esc(notes.join("；")) + "</p>" : "";
  }

  function cutoffHeadHTML(year, extra) {
    return '<div class="cs-head"><span class="cs-title">省控线 <b>' + year + '</b></span>' +
      '<span class="cs-full">' + extra + "</span></div>";
  }

  function cutoffHTML(p, year) {
    const members = cutoffMembersOf(p);
    const records = members.map((name) => ({ name, rec: CUT.provinces[name] })).filter((x) => x.rec);
    if (!records.length) return "";

    const single = records.length === 1;
    const full = single ? FULL_SCORE[records[0].name] : null;
    const sub = full ? "满分 " + full : "物理类 / 理科";

    if (single) {
      const rec = records[0].rec;
      const line = rec.lines[year] || {};
      return '<aside class="cutoff-slip" aria-label="' + year + " 年" + esc(records[0].name) + '省控线">' +
        cutoffHeadHTML(year, sub) +
        '<div class="cs-cells">' +
          '<div class="cs-cell"><span class="cs-k">本科线</span><span class="cs-v">' + cutoffValue(line.ben) + "</span></div>" +
          '<div class="cs-cell"><span class="cs-k">特控线</span><span class="cs-v">' + cutoffValue(line.tek) + "</span></div>" +
          '<div class="cs-cell is-211" title="211 线按锚点校普通类常规批最低投档分，不含中外合作、专项、预科等">' +
            '<span class="cs-k">211线</span><span class="cs-v">' + cutoffValue(rec.c211[year]) + "</span></div>" +
        "</div>" +
        '<p class="cs-foot" title="' + esc(rec.anchor) + ' 在该省普通类常规批的最低投档分"><span>211 锚点</span>' + esc(rec.anchor) + "</p>" +
        cutoffNotesHTML(records) +
      "</aside>";
    }

    return '<aside class="cutoff-multi" aria-label="' + year + ' 年分省省控线">' +
      cutoffHeadHTML(year, "同卷分省 · 物理类 / 理科") +
      '<table class="cs-table"><caption class="sr-only">' + year + ' 年分省本科线、特控线与 211 线</caption>' +
        "<thead><tr><th scope=\"col\">省份</th><th scope=\"col\">本科线</th><th scope=\"col\">特控线</th><th scope=\"col\">211线</th></tr></thead><tbody>" +
        records.map((x) => {
          const line = x.rec.lines[year] || {};
          return "<tr><th scope=\"row\">" + esc(x.name) + "</th><td>" + cutoffValue(line.ben) + "</td><td>" +
            cutoffValue(line.tek) + '</td><td class="is-211">' + cutoffValue(x.rec.c211[year]) + "</td></tr>";
        }).join("") +
      "</tbody></table>" +
      '<p class="cs-foot"><span>211 锚点</span>' +
        esc(Array.from(new Set(records.map((x) => x.rec.anchor))).join("、")) + " · 普通类最低投档分</p>" +
      cutoffNotesHTML(records) +
    "</aside>";
  }

  function yearBarHTML(p, year) {
    return yearTabsHTML(p, year);
  }

  /* 一年两场（浙江）：场次分组卡片；两场次的时长、满分、题量一致时只说明一次 */
  function sessionCardsHTML(p, year, state) {
    const labels = U.sessionsOf(p, year);
    if (!labels.length) return "";

    const info = labels.map((label) => {
      const e = U.examOf(p, year, label) || {};
      const items = U.itemsFor(p, year, label);
      const nc = items.filter((it) => it.t === "非选择题").length;
      return {
        label, e, total: items.length, nc,
        sig: [e.minutes || 0, e.full || 0, items.length].join("|")
      };
    });
    const uniform = info.every((x) => x.sig === info[0].sig);

    const shared = uniform
      ? '<p class="sessions-shared">两场次一致：' + (info[0].e.minutes ? info[0].e.minutes + " 分钟 · " : "") +
        (info[0].e.full ? info[0].e.full + " 分 · " : "") + info[0].total + " 题" +
        '<span class="ss-sub">选择 ' + (info[0].total - info[0].nc) + " 题 / 非选择题 " + info[0].nc + " 题</span></p>"
      : "";

    const cards = info.map((x) => {
      const sel = x.label === state.sess;
      const meta = [x.e.minutes ? x.e.minutes + " 分钟" : "", x.e.full ? x.e.full + " 分" : ""].filter(Boolean).join(" · ");
      return '<button class="session-card' + (sel ? " is-active" : "") + (uniform ? " is-compact" : "") + '" type="button" role="tab"' +
        ' data-action="session" data-session="' + esc(x.label) + '" aria-selected="' + sel + '">' +
        '<span class="sc-top"><span class="sc-name">' + esc(x.label) + '</span><span class="sc-dot" aria-hidden="true"></span></span>' +
        (uniform ? "" :
          '<span class="sc-meta">' + x.total + " 题" + (meta ? " · " + meta : "") + "</span>" +
          '<span class="sc-sub">选择题 ' + (x.total - x.nc) + " 题 · 非选择题 " + x.nc + " 题</span>") +
      "</button>";
    }).join("");

    return shared + '<div class="sessions' + (uniform ? " is-uniform" : "") +
      '" role="tablist" aria-label="选择场次">' + cards + "</div>";
  }

  function fmtScore(v) {
    const r = Math.round(v * 10) / 10;
    return r % 1 === 0 ? String(r) : r.toFixed(1);
  }

  /* 有效口径：选「按分值」但该年分值不可用时，回落题数 */
  function expandKey(sess, m) {
    return (sess ? sess + "|" : "") + m;
  }

  function basisOf(st, state) {
    return st.scoreUsable && state.basis !== "count" ? "score" : "count";
  }

  function basisHTML(st, state) {
    const basis = basisOf(st, state);
    const meta = st.scoreUsable
      ? "卷面 " + fmtScore(st.scoreTotal) + " 分 · " + st.total + " 题"
      : "该年分值未逐题拆分";
    return '<div class="basis-row">' +
      '<div class="basis" role="group" aria-label="统计口径">' +
        '<button type="button" data-action="basis" data-basis="score" aria-pressed="' + (basis === "score") + '"' +
          (st.scoreUsable ? "" : " disabled") + '>按分值</button>' +
        '<button type="button" data-action="basis" data-basis="count" aria-pressed="' + (basis === "count") + '">按题数</button>' +
      "</div>" +
      '<span class="basis-meta">' + esc(meta) + "</span>" +
    "</div>";
  }

  function barsHTML(p, year, state, sess) {
    const st = U.moduleStats(p, year, sess);
    if (!st.total) {
      const yearItems = U.itemCount(p, year, sess);
      const fallback = U.defaultYear(p);
      return '<div class="bars-empty">' +
        "该年度收录的 <b>" + yearItems + "</b> 道题尚未取得原卷逐题核实，暂无法给出模块占比。" +
        (fallback && fallback !== year ? '<br>可先查看 <b>' + fallback + "</b> 年的已核实数据。" : "") +
      "</div>";
    }
    const exam = U.examOf(p, year, sess);
    const ss = U.scoreStats(p, year, sess);
    const basis = basisOf(st, state);
    const all = itemsOfModule(p, year, null, sess);
    const shown = st.rows.filter((r) => (basis === "score" ? r.c > 0 || r.s > 0 : r.c > 0)).sort((a, b) =>
      basis === "score" ? b.s - a.s || b.c - a.c || a.i - b.i : b.c - a.c || b.s - a.s || a.i - b.i);
    const rows = shown.map((r) => {
      const color = U.colorOf(r.m);
      const open = !!(state.expanded || {})[expandKey(sess, r.m)];
      const pct = basis === "score" ? r.pctScore : r.pctCount;
      const split = st.splitByModule[r.m] || {};
      const splitOnly = r.c === 0 && split.count > 0;
      const detail = st.scoreUsable
        ? (basis === "score"
          ? fmtScore(r.s) + " 分 · " + (splitOnly ? "拆入 " + split.count + " 题" : r.c + " 题")
          : r.c + " 题 · " + fmtScore(r.s) + " 分")
        : r.c + " 题";
      const modAttr = ' data-action="toggleModule" data-module="' + esc(r.m) + '" data-session="' + esc(sess || "") + '"';
      return '<div class="mod' + (open ? " is-open" : "") + '" style="--c:' + color + '">' +
        '<div class="mod-head">' +
          '<button class="bar-row" type="button"' + modAttr +
            ' aria-expanded="' + (open ? "true" : "false") + '" aria-label="' + esc(r.m) + "（" + (open ? "收起逐题清单" : "展开逐题清单") + '）">' +
            '<span class="bar-top">' +
              '<span class="bar-label"><i></i>' + esc(r.m) + "</span>" +
              '<span class="bar-value"><b>' + pct + '%</b> · ' + detail + "</span>" +
            "</span>" +
          "</button>" +
          '<button class="mod-toggle" type="button"' + modAttr + ' aria-expanded="' + (open ? "true" : "false") + '">' +
            '<span class="mt-text">' + (open ? "收起" : "展开") + "</span>" +
            '<span class="bar-chev">' + ICON.chev + "</span>" +
          "</button>" +
          '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%"></span></span>' +
        "</div>" +
        (open ? modulePanelHTML(p, year, state, sess, r, st, exam, ss) : "") +
      "</div>";
    }).join("");

    const yearItems = U.itemsFor(p, year, sess);
    const overFull = !!(exam && exam.full && st.scoreTotal > exam.full + 0.5);

    let note;
    if (basis === "score") {
      note = "按分值统计：占比 = 该模块分值合计 ÷ 该年" + (overFull ? "计入分值合计" : "卷面分值合计") +
        "（" + fmtScore(st.scoreTotal) + " 分）" +
        (st.scoreEstimated ? "；其中 " + st.scoreEstimated + " 道非选择题公开来源未逐题标分，按该卷非选择题合计均分估算" : "") + "。";
      if (overFull) {
        note += "该年含选考大题（二选一），选考题目分值均计入，故计入合计 " + fmtScore(st.scoreTotal) + " 分（卷面满分 " + fmtScore(exam.full) + " 分）。";
      }
      if (st.splitTotal) {
        const splitParts = Object.keys(st.splitByModule).map((m) =>
          m + " " + fmtScore(st.splitByModule[m].total) + " 分"
        ).join("、");
        note += "其中 " + fmtScore(st.splitTotal) + " 分跨模块小问已从原大题划入对应模块（" + splitParts +
          "；实值 " + fmtScore(st.splitReal) + " 分、推定 " + fmtScore(st.splitEst) + " 分，共 " + st.splitCount + " 题）。";
      }
    } else {
      note = "按题数统计：占比 = 该模块题数 ÷ 该年题目数（" + st.total + " 题）" +
        (st.scoreUsable ? "。大分值大题与小分值选择题各计一题，可与分值口径对照看" : "；该年分值未逐题拆分，仅支持题数口径") + "。";
      if (overFull) {
        note += "该年含选考大题（二选一），选考题目均计入题量。";
      }
      if (st.splitCount) {
        note += "按题数口径仍以整题主考点归类，跨模块小问不单独计题。";
      }
    }
    note += "占比四舍五入" + (st.pending ? "；该年另有 <b>" + st.pending + "</b> 道题标注待核，未计入占比" : "") +
      "。点击任一模块，逐题清单会在该模块下方就地展开。";

    return basisHTML(st, state) +
      '<div class="bars">' + rows + "</div>" +
      '<div class="mod-foot">' +
        '<button class="mod-all" type="button" data-action="toggleAllItems" data-session="' + esc(sess || "") + '" aria-expanded="' + ((state.showAll) ? "true" : "false") + '">' +
          (state.showAll ? "收起全部题目" : "查看该年全部 " + all.length + " 道题") + "</button>" +
        '<button class="tool-btn" type="button" data-action="toggleAll" data-session="' + esc(sess || "") + '">' + (state.allOpen ? "收起全部题面" : "展开全部题面") + "</button>" +
      "</div>" +
      (state.showAll ? panelHTML(all, year, state, { exam, grouped: true, title: "全部题目", ss, sess }) : "") +
      '<p class="sec-note">' + note + "</p>";
  }

  /* 难度 → 分值分布：有分值时按分值，未标分值的卷（如上海回忆版）回退到题量 */
  function difficultyHTML(p, year, sess) {
    const st = U.diffStats(p, year, sess);
    if (!st.total) return "";
    const exam = U.examOf(p, year, sess);
    const segs = st.rows.filter((r) => (st.byScore ? r.score : r.count) > 0).map((r) => {
      const v = st.byScore ? r.score : r.count;
      return '<span class="diff-seg" style="flex:' + v + ";--c:" + r.color + '"></span>';
    }).join("");
    const cells = st.rows.filter((r) => r.count > 0).map((r) =>
      '<div class="diff-cell"><span class="diff-k" style="--c:' + r.color + '"><i></i>' + r.k + "</span>" +
        '<span class="diff-v">' + r.count + " 题" +
        (st.byScore ? " · <b>" + r.score + "</b> 分" : "") + "</span></div>"
    ).join("");

    let note;
    if (st.byScore) {
      note = "按每题分值统计";
      if (st.missing) note += "；另有 " + st.missing + " 道题分值未逐题拆分，不计入";
      note += "。已知分值合计 <b>" + st.known + " 分</b>" +
        (exam && exam.full && st.known === exam.full ? "，与满分一致" : "") + "。难度为教学参考分级，非官方标注。";
    } else {
      note = "这年的试卷未逐题标注分值（公开来源仅给出总分），因此改按<b>题量</b>统计难度分布。";
    }
    return '<div class="diff">' +
        '<div class="diff-bar">' + segs + "</div>" +
        '<div class="diff-legend">' + cells + "</div>" +
      "</div>" +
      '<p class="sec-note">' + note + "</p>";
  }

  function trendHTML(p, year, state, sess) {
    const order = U.moduleOrder(p);
    const scoreBasis = state.basis !== "count" && U.ALL_YEARS.some((y) => U.scoreStats(p, y, sess).usable);
    const stats = {};
    U.ALL_YEARS.forEach((y) => { stats[y] = U.scoreStats(p, y, sess); });
    const hasSplit = U.ALL_YEARS.some((y) => stats[y] && stats[y].splitTotal);
    const cellValue = (y, m) => {
      if (!p.years[y]) return null;
      if (scoreBasis) {
        const ss = stats[y];
        if (!ss.usable) return null; /* 该年分值未逐题拆分，无法进入分值口径 */
        return Math.round(ss.byModule[m] || 0);
      }
      return U.itemsFor(p, y, sess).filter((it) => it.m === m && it.m !== U.PENDING).length;
    };
    let max = 0;
    const table = {};
    order.forEach((m) => {
      table[m] = U.ALL_YEARS.map((y) => {
        const v = cellValue(y, m);
        if (v != null) max = Math.max(max, v);
        return v;
      });
    });
    const head = '<div class="trend-head">右上角浏览器打开再下载，目前排版不好，有时间再优化</div>' + U.ALL_YEARS.map((y) =>
      '<div class="trend-head' + (y === year ? " is-current" : "") + '">' + y.slice(2) + "′</div>").join("");
    const rows = order.map((m) => {
      const color = U.colorOf(m);
      /* 该板块（当前场次口径）五年内是否有已收录题目——有才显示导出按钮 */
      const hasItems = U.ALL_YEARS.some((y) => p.years[y] &&
        U.itemsFor(p, y, sess).some((it) => it.m === m && it.m !== U.PENDING));
      const cells = table[m].map((v, i) => {
        const y = U.ALL_YEARS[i];
        if (v === null) return '<div class="trend-cell is-zero">—</div>';
        const alpha = v === 0 ? 0 : 0.1 + 0.32 * (v / (max || 1));
        return '<div class="trend-cell' + (v === 0 ? " is-zero" : "") + (y === year ? " is-current" : "") +
          '" style="background:' + U.hexToRgba(color, alpha) + '">' + (v === 0 ? "0" : v) + "</div>";
      }).join("");
      return '<div class="trend-label" style="--c:' + color + '"><i></i><span class="trend-name">' + esc(m) + "</span>" +
        (hasItems
          ? '<button class="trend-dl" type="button" data-action="exportPdf" data-module="' + esc(m) +
            '" aria-label="导出 ' + esc(m) + ' 近五年题目 PDF" title="导出该板块近五年全部题目为 PDF（答案附文末）">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 4v10.5"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/></svg><em>PDF</em></button>'
          : "") +
        "</div>" + cells;
    }).join("");
    const key = scoreBasis
      ? '<span><i></i>分值较少</span><span><i class="deep"></i>分值较多</span><span>「—」为当年无数据或分值未拆分</span>'
      : '<span><i></i>题量较少</span><span><i class="deep"></i>题量较多</span><span>「—」为当年无数据</span>';
    const note = scoreBasis
      ? "同一模块五年分值的起伏，比单看某一年多一重参考：分值持续走高、且连年命中的模块，值得优先安排复习。未逐题标分的年份不进入分值口径。" +
        (hasSplit ? "跨模块小问分值已按拆分口径划入对应目标模块。" : "")
      : "同一模块五年题量的变化，比单看某一年多一重参考：连续两年出现、且占比上升的模块，值得优先安排复习。";
    const noteAll = note + " 点击模块行右侧的「PDF」可导出该板块近五年全部题目（客户端实时生成，参考答案附文末）。";
    return '<div class="trend">' + head + rows + "</div>" +
      '<div class="trend-key">' + key + "</div>" +
      '<p class="sec-note">' + noteAll + "</p>";
  }

  /* 题号前缀：依据该卷「选择题题数」（选择题最后一题题号）区分选择第N题 / N大题；
     个别年份题号与题型标注冲突时以逐题题型为准（如上海 2024 题号仅到 10）。 */
  function itemNoHTML(it, exam, pending) {
    const n = parseInt(it.n, 10);
    const max = exam && exam.choiceMax;
    const min = (exam && exam.choiceMin) || 1;
    let kind = null;
    if (max && n) {
      const byField = n >= min && n <= max ? "choice" : "big";
      const byType = it.t === "选择题" ? "choice" : it.t ? "big" : null;
      kind = byType && byType !== byField ? byType : byField;
    } else if (it.t) {
      kind = it.t === "选择题" ? "choice" : "big";
    }
    const cls = "item-num" + (pending ? " is-pending" : "");
    if (kind === "choice") return '<span class="' + cls + '">选择第<b>' + esc(it.n) + "</b>题</span>";
    if (kind === "big") return '<span class="' + cls + '"><b>' + esc(it.n) + "</b>大题</span>";
    return '<span class="' + cls + '"><b>' + esc(it.n) + "</b></span>";
  }

  function scoreHTML(it, exam) {
    if (it.s != null) {
      return '<span class="item-score"><b>' + it.s + "</b><em>分</em></span>";
    }
    const tip = it.m === U.PENDING
      ? "此题题面未取得原卷，分值与难度均未定级"
      : exam && exam.nonChoice
        ? "该题分值未逐题拆分，所在大题合计 " + exam.nonChoice + " 分，详见卷面档案"
        : "该题分值未逐题拆分";
    return '<span class="item-score is-null" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">—</span>';
  }

  /* 选择题解析若只重复答案字母（如「5.A」），不单独渲染，避免出现没有信息量的解析块 */
  function isOnlyChoiceLetter(detail, choice) {
    if (!detail || !choice) return false;
    const compact = String(detail).trim()
      .replace(/\s+/g, "")
      .replace(/^\d+/, "")
      .replace(/^[．.、]/, "")
      .replace(/[．.]$/, "");
    return compact === String(choice).trim();
  }

  function hasAnalysisMarker(detail) {
    return /【(?:解析|分析|详解|解答)】|【小问\s*\d+\s*详解】/.test(String(detail || ""));
  }

  function fileExt(name) {
    const m = String(name || "").match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toUpperCase() : "";
  }

  /* 大题中的跨模块小问：详情展开时显示拆出内容、目标模块、分值与口径 */
  function splitHTML(it) {
    if (!it.sp) return "";
    const real = it.sp.k === "实值";
    const target = it.sp.m || "物质结构与性质";
    const label = target === "物质结构与性质" ? "结构小问" : target + "小问";
    return '<span class="item-split">' +
      '<span class="is-label">' + esc(label) + "</span>" +
      '<span class="is-text">' + esc(it.sp.d || (target === "物质结构与性质" ? "结构相关填空" : target + "相关填空")) + "</span>" +
      '<span class="is-val"><b>' + fmtScore(it.sp.s) + "</b> 分 · " +
        '<em class="is-k ' + (real ? "is-real" : "is-est") + '">〔' + (real ? "实值" : "推定") + "〕</em></span>" +
    "</span>";
  }

  /* 2022—2026 的题级原题入口；优先单题精切图，无则整页图，整题未公开时置灰 */
  function sourceBtnHTML(it, year, state, provKey) {
    const key = provKey || (state && state.key);
    if (!key) return "";
    const qkey = U.sourceKey(key, year, it.ses, it.n);
    /* 题图索引体积较大，改为点击时载入；未载入前仍保留可用入口 */
    if (!window.QMAP) {
      return '<button class="qbtn" type="button" data-action="openSource" data-qkey="' + esc(qkey) + '" title="查看原题（首次打开需载入题图索引）" aria-label="查看第 ' + esc(it.n) + ' 题原卷" aria-haspopup="dialog">原题</button>';
    }
    const rec = U.sourceOf(key, year, it.ses, it.n);
    if (!rec) {
      return '<button class="qbtn is-off" type="button" disabled title="原卷未公开，暂无页图与参考答案">未公开</button>';
    }
    if (!rec.imgQ && !rec.img) {
      const why = rec.note || "原卷未公开，暂无页图与参考答案";
      return '<button class="qbtn is-off" type="button" data-action="openSource" data-qkey="' + esc(qkey) + '" title="' + esc(why) + '" aria-label="第 ' + esc(it.n) + ' 题原卷未公开：' + esc(why) + '" aria-haspopup="dialog">未公开</button>';
    }
    const tip = rec.imgQ ? "查看本题原卷截图（答案可展开核对）" : "查看原卷页图（答案可展开核对）";
    return '<button class="qbtn" type="button" data-action="openSource" data-qkey="' + esc(qkey) + '" title="' + tip + '" aria-label="查看第 ' + esc(it.n) + ' 题原卷，答案需展开" aria-haspopup="dialog">原题</button>';
  }

  function itemHTML(it, year, state, exam) {
    const id = year + "-" + (it.ses ? it.ses + "-" : "") + it.n;
    const open = state.open[id] || state.allOpen;
    const pending = it.m === U.PENDING;
    const color = pending ? U.colorOf(U.PENDING) : U.colorOf(it.m);
    const tagText = pending ? "题面未收录" : it.tag;
    const lv = U.levelOf(it.lv);
    const badge = pending ? "" :
      '<span class="lv lv-' + lv.cls + '" title="难度：' + esc(lv.k) + '（教学参考分级）">' + esc(lv.k) + "</span>";
    return '<div class="item' + (open ? " is-open" : "") + (pending ? " is-pending" : "") + '">' +
      '<button class="item-open" type="button" data-action="toggleItem" data-id="' + esc(id) + '" aria-expanded="' + (open ? "true" : "false") + '">' +
        itemNoHTML(it, exam, pending) +
        '<span class="item-body" style="--c:' + color + '">' +
          '<span class="item-tag"><i></i><span class="it-tag-text">' + esc(tagText) + "</span>" +
            (pending ? '<span class="pending-chip">待核</span>' : "") + badge + scoreHTML(it, exam) + "</span>" +
          '<span class="item-detail">' + esc(it.d || "暂无详细考点描述") + "</span>" +
          splitHTML(it) +
        "</span>" +
      "</button>" +
      '<span class="item-rail"><span class="item-chev">' + ICON.chev + "</span>" + sourceBtnHTML(it, year, state) + "</span>" +
    "</div>";
  }

  function itemsOfModule(p, year, m, sess) {
    const items = U.itemsFor(p, year, sess).slice();
    return items
      .filter((it) => (m ? it.m === m : true))
      .sort((a, b) => (parseInt(a.n, 10) || 0) - (parseInt(b.n, 10) || 0));
  }

  function countLabel(arr, ss) {
    return arr.length + " 题" + (ss && ss.usable ? " · " + fmtScore(U.itemsScore(ss, arr)) + " 分" : "");
  }

  function itemsHTML(arr, year, state, exam, grouped, ss) {
    if (!arr.length) return '<p class="mp-empty">该模块在这一年没有题目。</p>';
    if (!grouped) return arr.map((it) => itemHTML(it, year, state, exam)).join("");
    const groups = [
      { label: "选择题", match: (t) => t === "选择题" },
      { label: "非选择题", match: (t) => t === "非选择题" },
      { label: "综合题", match: (t) => t !== "选择题" && t !== "非选择题" }
    ];
    return groups.map((g) => {
      const arr2 = arr.filter((it) => g.match(it.t));
      if (!arr2.length) return "";
      return '<div class="group-head"><span>' + g.label + '</span><span class="gh-count">' + countLabel(arr2, ss) + "</span></div>" +
        arr2.map((it) => itemHTML(it, year, state, exam)).join("");
    }).join("");
  }

  /* 模块面板：结构模块额外列出「拆入的结构小问」来源大题 */
  function modulePanelHTML(p, year, state, sess, r, st, exam, ss) {
    const prim = itemsOfModule(p, year, r.m, sess);
    const split = st.splitByModule[r.m];
    if (!split || !split.count) {
      return panelHTML(prim, year, state, { exam, grouped: false, title: "逐题清单", ss, sess });
    }
    const parents = U.itemsFor(p, year, sess).filter((it) =>
      it.sp && (it.sp.m || "物质结构与性质") === r.m && it.m !== r.m);
    const head = '<div class="mp-head"><span>逐题清单</span><span class="mp-count">' +
      prim.length + " 题" + (ss.usable && prim.length ? " · " + fmtScore(U.itemsScore(ss, prim)) + " 分" : "") +
      (parents.length ? " ／ 拆入 " + split.count + " 题 · " + fmtScore(split.total) + " 分" : "") + "</span></div>";
    const primRows = prim.length
      ? prim.map((it) => itemHTML(it, year, state, exam)).join("")
      : '<p class="mp-empty">该年没有主考点为' + esc(r.m) + '的选择题或大题。</p>';
    const srcRows = parents.map((it) => '<div class="split-parent">' +
      '<span class="sp-from">来自 ' + esc(it.m) + "</span>" + itemHTML(it, year, state, exam) + "</div>").join("");
    return '<div class="mod-panel">' + head + primRows +
      (parents.length ? '<div class="split-src"><div class="split-src-head">拆入本模块的' + esc(r.m) + '小问（分值已从原题划出）</div>' + srcRows + "</div>" : "") +
    "</div>";
  }

  /* 就地展开的清单面板 */
  function panelHTML(arr, year, state, opts) {
    return '<div class="mod-panel">' +
      '<div class="mp-head"><span>' + esc(opts.title) + '</span><span class="mp-count">' + countLabel(arr, opts.ss) + "</span></div>" +
      itemsHTML(arr, year, state, opts.exam, opts.grouped, opts.ss) +
    "</div>";
  }

  /* 原卷与答案弹层：优先单题精准截图，缺失时回退整页图 */
  function sourceModalHTML(m) {
    const rec = m.rec;
    /* 以考点数据的真实题型为准；ans_kind 只在其与题型一致时作为截图类型依据。
       这样可避开旧裁剪批次里选择题/大题混标造成的错误展示。 */
    const itemKind = m.type === "选择题" ? "choice" : (m.type ? "big" : null);
    const answerKind = itemKind || (rec && rec.ansKind) || null;
    const shotKindOK = !itemKind || !rec || !rec.ansKind || rec.ansKind === itemKind;
    const answerShot = rec && rec.imgA && shotKindOK ? rec.imgA : "";
    const crop = !!(rec && rec.imgQ);
    const viewImg = crop ? rec.imgQ : (rec && rec.img);
    const hasImg = !!viewImg || !!answerShot;
    const pageLabel = crop
      ? "单题精准截图"
      : (rec && rec.page != null
        ? "第 " + (rec.page + 1) + " 页" + (rec.pages ? " / 共 " + rec.pages + " 页" : "")
        : "页码未定位");
    const fullPageLabel = rec && rec.page != null
      ? "第 " + (rec.page + 1) + " 页" + (rec.pages ? " / 共 " + rec.pages + " 页" : "")
      : "页码未定位";
    const title = "第 " + m.n + " 题";
    const meta = [m.tag, m.score != null ? fmtScore(m.score) + " 分" : "分值未定", m.module !== m.tag ? m.module : null]
      .filter(Boolean).join(" · ");
    const answerFile = rec && rec.answerFile ? "来源：" + rec.answerFile : "来源：公开参考答案";
    const imageTitle = (rec.paper || m.year + "年试卷") + " · " + title + (crop ? " 单题截图" : " 原卷 " + pageLabel);
    const answerImageTitle = (rec.paper || m.year + "年试卷") + " · " + title + (answerKind === "big" ? " 参考答案截图" : " 详细解析截图");

    const paperHTML = viewImg
      ? '<button class="src-paper' + (crop ? " is-crop" : "") + '" type="button" data-action="openImage" data-image-kind="paper"' +
          ' data-image-src="' + esc(viewImg) + '" data-image-title="' + esc(imageTitle) + '"' +
          ' data-image-foot="' + esc(crop ? "单题精准截图" : "原卷整页 · " + pageLabel) + '"' +
          ' title="查看大图" aria-label="放大查看' + esc(imageTitle) + '">' +
          '<img src="' + esc(viewImg) + '" alt="' + esc(imageTitle) + '" decoding="async"' +
            (crop
              ? ' data-full="' + esc(rec.img || "") + '" data-full-meta="' + esc((rec.paper || "原卷") + " · " + fullPageLabel) + '" data-full-alt="' + esc((rec.paper || m.year + "年试卷") + " " + title + " 所在原卷 " + fullPageLabel) + '"'
              : "") + ">" +
          '<span class="src-zoom">' + ICON.page + "查看大图</span>" +
        "</button>"
      : '<div class="src-missing">' + ICON.page + "<b>该题原卷页图未公开</b>" +
          "<p>" + esc((rec && rec.note) || "公开渠道未收录这一题的原卷页面，可先查看参考答案，或通过云盘核对整卷。") + "</p></div>";

    const answerChoice = rec && rec.choice ? String(rec.choice).trim() : "";
    const rawDetail = rec && rec.detail ? String(rec.detail).trim() : "";
    const answerDetail = rawDetail && !isOnlyChoiceLetter(rawDetail, answerChoice) ? rawDetail : "";
    const bigDetail = rawDetail && !hasAnalysisMarker(rawDetail) ? rawDetail : "";
    const qualityHTML = rec && rec.answerQuality === "noisy" && answerKind === "choice" && !answerShot && answerDetail
      ? '<div class="src-quality" role="note">' +
          '<span class="src-quality-tag">PDF 提取</span>' +
          '<span>公式可能乱序，完整解析请打开下方云盘解析文件。</span>' +
        "</div>"
      : "";
    const choiceHTML = answerKind === "choice" && answerChoice
      ? '<div class="src-choice"><span>选择题答案</span><b>' + esc(answerChoice) + "</b></div>"
      : "";
    const answerKindLabel = answerKind === "big"
      ? "参考答案 · 仅答案"
      : (answerKind === "choice" ? (answerShot ? "选择题 · 详细解析" : "选择题 · 参考答案") : "参考答案");
    const answerKicker = '<div class="src-answer-kicker"><span>第 ' + esc(m.n) + ' 题</span><b>' + esc(answerKindLabel) + "</b></div>";
    const answerShotHTML = answerShot
      ? '<button class="src-answer-shot" type="button" data-action="openImage" data-image-kind="answer"' +
          ' data-image-src="' + esc(answerShot) + '" data-image-title="' + esc(answerImageTitle) + '"' +
          ' data-image-foot="' + esc(answerKind === "big" ? "参考答案截图 · 仅答案" : "解析截图 · 原文件裁切") + '"' +
          ' title="查看大图" aria-label="放大查看' + esc(answerImageTitle) + '">' +
          '<span class="src-answer-shot-head"><span>' + (answerKind === "big" ? "答案截图" : "解析截图") + '</span>' +
            '<span class="is-open">' + ICON.page + "查看大图</span></span>" +
          '<img src="' + esc(answerShot) + '" alt="' + esc(answerImageTitle) + '" loading="lazy" decoding="async">' +
        "</button>"
      : "";
    const isSectionAnswer = answerKind === "big" && String(m.year) === "2026" && rec && /上海/.test(rec.paper || "");
    const answerTip = answerShot
      ? '<p class="src-answer-tip">' + (answerKind === "big"
        ? "仅保留答案段，不含分析过程；" + (isSectionAnswer
          ? "上海卷按 section 聚合展示同组答案，图中含同组其他题，请按第 " + esc(m.n) + " 题核对。"
          : "点图可放大核对。")
        : "解析按原解析文件裁切，公式、图表与排版以截图为准；点图可放大。") + "</p>"
      : "";
    let answerHTML;
    if (answerShot) {
      answerHTML = answerKicker + (answerKind === "choice" ? choiceHTML : "") +
        answerShotHTML + answerTip;
    } else if (answerKind === "big") {
      answerHTML = answerKicker + (bigDetail
        ? '<div class="src-answer-text is-big-answer">' + esc(bigDetail) + "</div>" +
          '<p class="src-answer-tip">仅保留答案，不展示分析过程。</p>'
        : '<p class="src-empty">这道题暂无可单独展示的答案文本。可打开下方解析文件核对，页面不展示分析过程。</p>');
    } else {
      answerHTML = answerKicker + choiceHTML + qualityHTML +
        (answerDetail
          ? '<div class="src-answer-text">' + esc(answerDetail) + "</div>"
          : '<p class="src-empty">这道题的解析截图暂未收录。可打开云盘中的解析文件，按题号对照核对。</p>');
    }
    const answerGateHTML =
      '<div class="src-answer-gate">' +
        '<span class="src-answer-gate-mark" aria-hidden="true">答</span>' +
        '<div class="src-answer-gate-copy">' +
          '<b data-answer-gate-title>答案默认收起</b>' +
          '<span data-answer-gate-sub>先独立作答，再展开核对</span>' +
        '</div>' +
        '<button class="src-answer-toggle" type="button" data-action="toggleAnswer" aria-expanded="false" aria-controls="src-answer-body" aria-label="显示第 ' + esc(m.n) + ' 题答案">显示答案</button>' +
      '</div>' +
      '<div class="src-answer-body" id="src-answer-body" data-answer-body hidden>' + answerHTML + "</div>";

    const paperName = rec && rec.paperName
      ? rec.paperName
      : (rec && rec.paper ? rec.paper : "试卷文件");
    const answerName = rec && rec.answerCloudName ? rec.answerCloudName : "";
    const paperExt = fileExt(paperName);
    const answerExt = fileExt(answerName);
    const cloudHTML = '<div class="src-files">' +
      '<div class="src-files-head"><span>云盘文件</span><em>飞书云盘</em></div>' +
      (rec && rec.cloud
        ? '<a class="src-file" href="' + esc(rec.cloud) + '" target="_blank" rel="noopener"' +
            ' data-cloud-url="' + esc(rec.cloud) + '" data-cloud-label="试卷文件"' +
            ' aria-label="打开试卷文件：' + esc(paperName) + '">' +
            '<span class="src-file-icon">' + ICON.page + "</span>" +
            '<span class="src-file-main"><span class="src-file-k is-paper">试卷文件</span><b>' + esc(paperName) + "</b></span>" +
            (paperExt ? '<span class="src-file-ext">' + esc(paperExt) + "</span>" : "") +
            ICON.external +
          "</a>"
        : '<div class="src-file is-off" aria-disabled="true">' +
            '<span class="src-file-icon">' + ICON.page + "</span>" +
            '<span class="src-file-main"><span class="src-file-k is-paper">试卷文件</span><b>暂无试卷文件</b></span>' +
          "</div>") +
      (rec && rec.answerUrl
        ? '<a class="src-file" href="' + esc(rec.answerUrl) + '" target="_blank" rel="noopener"' +
            ' data-cloud-url="' + esc(rec.answerUrl) + '" data-cloud-label="解析文件"' +
            ' aria-label="打开解析文件：' + esc(answerName || "解析文件") + '">' +
            '<span class="src-file-icon">' + ICON.page + "</span>" +
            '<span class="src-file-main"><span class="src-file-k is-answer">解析文件</span><b>' + esc(answerName || "解析文件") + "</b></span>" +
            (answerExt ? '<span class="src-file-ext">' + esc(answerExt) + "</span>" : "") +
            ICON.external +
          "</a>"
        : '<div class="src-file is-off" aria-disabled="true">' +
            '<span class="src-file-icon">' + ICON.page + "</span>" +
            '<span class="src-file-main"><span class="src-file-k is-answer">解析文件</span><b>暂无解析文件</b></span>' +
          "</div>") +
      "</div>" +
      '<div class="src-external-fallback" data-cloud-fallback hidden>' +
        '<p><b data-fallback-label>链接</b>被浏览器拦截。请复制链接，在浏览器地址栏中打开。</p>' +
        '<div class="src-external-row">' +
          '<input type="text" readonly value="" aria-label="云盘文件链接">' +
          '<button type="button" data-action="copyCloud" data-copy-url="">复制链接</button>' +
        "</div>" +
      "</div>";

    return '<div class="src-overlay" data-action="closeSource">' +
      '<section class="src-modal" role="dialog" aria-modal="true" aria-labelledby="src-title" tabindex="-1">' +
        '<header class="src-head">' +
          '<div class="src-head-main">' +
            '<div class="src-eyebrow">原卷与答案 · ' + esc(m.year) + (m.sess ? " · " + esc(m.sess) : "") + "</div>" +
            '<h2 class="src-title" id="src-title">' + esc(title) + "</h2>" +
            '<p class="src-meta">' + esc(meta) + "</p>" +
          '</div>' +
          '<button class="src-close" type="button" data-action="closeSource" aria-label="关闭原卷弹层">' + ICON.close + "</button>" +
        "</header>" +
        '<div class="src-body">' +
          '<div class="src-grid' + (answerShot ? " has-answer-shot" : "") + '">' +
            '<div class="src-main">' +
              '<div class="src-label"><span>' + (crop ? "本题截图" : "原卷整页") + '</span><em>' + esc((rec && rec.paper) || "原卷") + " · " + esc(pageLabel) + "</em></div>" +
              paperHTML +
              '<p class="src-hint">' + (crop
                ? "已按题目精准裁切，仅保留本题题面；点图或「查看大图」可全屏放大。"
                : "该题暂未生成单题裁切图，先回退展示整页原卷；点图可全屏放大，对照页眉题号定位。") + "</p>" +
            "</div>" +
            '<aside class="src-side">' +
              '<div class="src-label"><span>' + (answerShot && answerKind === "choice" ? "详细解析" : "参考答案") + '</span><em>' + esc(answerFile) + "</em></div>" +
              '<div class="src-answer' + (answerShot ? " has-shot" : "") + '" data-answer-panel>' + answerGateHTML + "</div>" +
              cloudHTML +
              (rec && rec.note ? '<p class="src-note"><b>核对说明</b>' + esc(rec.note) + "</p>" : "") +
              '<p class="src-foot">答案来自公开真题解析，仅供复习核对；与官方评分细则不一致时，以原卷和评分细则为准。</p>' +
            "</aside>" +
          "</div>" +
        "</div>" +
      "</section>" +
    "</div>" +
    (hasImg
      ? '<div class="src-lightbox" role="dialog" aria-modal="true" aria-label="图片大图查看器" hidden>' +
          '<div class="src-lightbox-bar">' +
            '<div class="src-lightbox-heading"><span>原卷大图 · 全屏查看</span><b>' + esc(imageTitle) + "</b></div>" +
            '<button class="src-lightbox-close" type="button" data-action="closeImage" aria-label="关闭大图">' + ICON.close + "</button>" +
          "</div>" +
          '<div class="src-lightbox-stage" aria-label="图片预览，可缩放和拖动">' +
            '<img src="' + esc(viewImg || answerShot) + '" alt="' + esc((viewImg ? imageTitle : answerImageTitle) + ' 大图') + '" draggable="false">' +
          "</div>" +
          '<div class="src-lightbox-tools" role="group" aria-label="图片缩放控制">' +
            '<button class="src-zoom-btn" type="button" data-zoom-act="out" aria-label="缩小图片" title="缩小（-）"><span aria-hidden="true">−</span></button>' +
            '<button class="src-zoom-value" type="button" data-zoom-act="reset" aria-label="当前 100%，重置为适合屏幕" title="重置为适合屏幕（0）"><span data-zoom-value>100%</span></button>' +
            '<button class="src-zoom-btn" type="button" data-zoom-act="in" aria-label="放大图片" title="放大（+）"><span aria-hidden="true">+</span></button>' +
          "</div>" +
          '<div class="src-lightbox-foot"><span>' + esc(crop ? "单题精准截图" : "原卷整页 · " + pageLabel) + '</span><span>双指或滚轮缩放 · 拖动查看 · 双击放大 · Esc 关闭</span></div>' +
        "</div>"
      : "");
  }

  function resultView(state) {
    const p = U.D.provinces[state.key];
    const year = state.year;
    /* 一年两场（浙江）：场次是年份内的二级视图，统计与清单各自独立 */
    const sessLabels = U.sessionsOf(p, year);
    const sess = sessLabels.length ? (sessLabels.indexOf(state.sess) >= 0 ? state.sess : sessLabels[0]) : null;
    const st = U.moduleStats(p, year, sess);
    const ds = U.diffStats(p, year, sess);
    const sessMeta = sess ? " · " + sess : "";
    const trendScore = state.basis !== "count" && U.ALL_YEARS.some((y) => U.scoreStats(p, y, sess).usable);

    return '<main class="shell result view-enter" data-screen-label="省份详情">' +
      '<header class="topbar">' +
        '<button class="tb-back" type="button" data-action="home">' + ICON.back + "<span>返回</span></button>" +
        '<span class="tb-title">考点分布</span>' +
        '<div class="tb-actions"><button class="icon-btn" type="button" data-action="mockref" aria-label="打开模考参考库" title="模考参考库">' + ICON.lib + '</button>' +
          '<button class="icon-btn" type="button" data-action="fufen" aria-label="打开赋分速查" title="赋分速查">' + ICON.calc + '</button>' +
          '<button class="icon-btn" type="button" data-action="copy" aria-label="复制本页链接">' + ICON.copy + "</button></div>" +
      "</header>" +
      profileHTML(p) +

      '<section class="sec scope">' +
        '<div class="sec-head scope-head"><h2 class="sec-title">考试范围</h2>' +
          (window.KD ? window.KD.searchHTML(p, state) : "") +
          '<span class="sec-meta">' + year + sessMeta + "</span></div>" +
        yearBarHTML(p, year) +
        '<div class="kd-results-slot" id="kd-results-slot" aria-live="polite">' +
          (window.KD ? window.KD.resultsHTML(p, state) : "") +
        '</div>' +
        (sessLabels.length ? '<div class="session-head"><span>本年两场考试</span><span class="sh-note">独立命题，分别统计</span></div>' + sessionCardsHTML(p, year, state) : "") +
        '<p class="sec-note scope-note">下方模块占比、难度分布、五年趋势与逐题清单，都按所选' + (sessLabels.length ? "年份与场次" : "年份") + '单独统计。' +
          (window.KD ? ' 考点检索固定覆盖 ' + U.YEAR_RANGE + '，不受年份切换影响；支持同义词组扩展，关联命中可单独筛选。' : '') + '</p>' +
      "</section>" +

      '<section class="sec">' +
        '<div class="sec-head"><h2 class="sec-title">模块占比</h2>' +
          '<span class="sec-meta">' + year + sessMeta + " · " + (st.scoreUsable ? "计入 " + fmtScore(st.scoreTotal) + " 分" : st.total + " 题") + "</span></div>" +
        barsHTML(p, year, state, sess) +
      "</section>" +

      '<section class="sec">' +
        '<div class="sec-head"><h2 class="sec-title">难度与分值</h2>' +
          '<span class="sec-meta">' + year + sessMeta + " · " + (ds.byScore ? "按分值" : "按题量") + "</span></div>" +
        difficultyHTML(p, year, sess) +
      "</section>" +

      '<section class="sec">' +
        '<div class="sec-head"><h2 class="sec-title">五年趋势</h2><span class="sec-meta">' +
          (sess ? sess + " · " : "") + (trendScore ? "分值 / 年" : "题量 / 年") + "</span></div>" +
        trendHTML(p, year, state, sess) +
      "</section>" +

      '<section class="sec notes">' +
        '<div class="sec-head"><h2 class="sec-title">数据说明</h2><span class="sec-meta">更新 ' + esc(U.D.meta.updated) + "</span></div>" +
        '<div class="notes-list">' +
          "<details open><summary>这份数据从哪里来</summary><div class=\"notes-body\">" +
            "<p>" + esc(U.D.meta.note) + "</p>" +
            (U.D.meta.zjNote ? "<p><b>浙江两场次</b>：" + esc(U.D.meta.zjNote) + "</p>" : "") +
            "<p>本页共收录 " + U.D.order.length + " 个省份、近五年逐题记录。<b>标注「待核」</b>的题目未取得原卷核验，不计入模块占比，仅在逐题清单中列出。</p>" +
            (U.D.meta.auditNote ? "<p><b>本轮考点复核</b>：" + esc(U.D.meta.auditNote) + "</p>" : "") +
            "<p>部分 2026 年试卷为网络收集版（卷面结构中带 ※），个别题号或有缺失，来源与缺项见下方原始核对记录。</p>" +
          "</div></details>" +
          "<details><summary>难度分级与分值口径</summary><div class=\"notes-body\">" +
            "<p>" + esc(U.D.meta.diffNote || "") + "</p>" +
            "<p><b>分值</b>：取自卷面标注；若公开来源只给出大题合计、未逐题拆分，清单中显示「—」，合计分见上方卷面档案。个别年份的分值按卷面结构推定，已在「原始核对记录」中注明。</p>" +
            "<p><b>模块占比口径</b>：默认按分值（模块分值合计 ÷ 该年卷面分值合计），可切换为按题数。按分值统计时，未逐题标分的非选择题按该卷非选择题合计均分估算（逐题清单仍显示「—」）；整卷都没有逐题分值的年份（如上海回忆版）不参与分值口径，自动回落为按题数。五年趋势的单元格跟随同一口径。</p>" +
            "<p><b>跨模块小问拆分</b>：有机、工艺流程、实验、反应原理等大题中考查物质结构或电化学的小问，已按「实值 + 推定」混合口径拆出——能取得评分细则／阅卷报告的用逐空实值（标〔实值〕），否则按「小问空数 ÷ 总空数 × 题总分」均分（标〔推定〕）。按分值统计时，拆出分值从原题模块划入拆分目标模块（物质结构与性质、电化学等）；按题数统计仍按整题主考点计。展开题目详情可查看拆分内容、目标模块与口径。</p>" +
            "<p><b>考试时长</b>：选考/等级考独立卷为化学本科目时长；老高考理综卷（150 分钟）为整卷时长，化学仅占其中一部分，满分 100 分按理综 300 分中的化学部分计。</p>" +
          "</div></details>" +
          "<details><summary>模块是怎么归并的</summary><div class=\"notes-body\">" +
            "<p>真题原始的考点标签多达两百余种，现已按统一命名规范归并为 28 种标准考点（「大类」或「大类——子类」），再按语义归并为 10 个模块（化学基本概念与用语、元素化合物、物质结构与性质、元素周期律、化学反应原理、水溶液中的离子平衡、电化学、化学实验、有机化学、工艺流程）。</p>" +
            "<p>这是<b>编辑整理的复习口径，不是官方分类</b>；一道题涉及多个模块时，只计入其主考点。复合标签中明确以「电化学」开头时优先归入电化学，避免被「资源化 / 工艺」等流程词误吞；若电解只是流程大题中的小问，则保留原主模块并补拆分。占比用于判断复习重心，不宜当作命题规律。</p>" +
          "</div></details>" +
          "<details><summary>分数线口径</summary><div class=\"notes-body\">" +
            "<p><b>本科线</b>：" + esc(CUT.meta.koujing_ben || "") + "；<b>特控线</b>：" + esc(CUT.meta.koujing_tek || "") + "。</p>" +
            "<p><b>211 线</b>：" + esc(CUT.meta.koujing_211 || "") + "。</p>" +
            "<p>上海满分 660、海南满分 900，其余省份满分 750；黑吉辽蒙与陕晋青宁虽同卷，但四省各自划线，已在对应省份页按省分行展示。某年标「—」表示该年数据尚未取得，不做估算。</p>" +
            "<p>分数线来自阳光高考、各省考试院与高校招生网公开投档数据；211 线为锚点校参考值，不是官方批次线。</p>" +
          "</div></details>" +
          "<details><summary>原题与参考答案</summary><div class=\"notes-body\">" +
            "<p>2022—2026 年试卷的题目卡片右下角提供「原题」入口，可查看<b>该题截图</b>、参考答案，以及云盘中的试卷文件与解析文件；答案默认收起，点「显示答案」后再核对，避免一打开就看见答案。无独立解析文件的卷会标注「暂无解析文件」。选择题解析栏展示详细解析截图，保留答案字母；大题只展示答案段，不展示分析过程。解析截图可在栏内点开放大；截图缺失或未通过来源校验时回退为文字答案与云盘核对入口。</p>" +
            "<p>整题原卷未公开的题目（上海 2022 年第 18—24 题、福建 2023 年第 3 题，以及部分天津、贵州、安徽等卷）置灰为「未公开」，悬停或点开可查看未公开说明。页图仅为卷面定位，答案来自公开解析，个别题目可能暂未收录参考答案。</p>" +
          "</div></details>" +
          "<details><summary>原始核对记录（教师整理）</summary><div class=\"notes-body\"><div class=\"raw-note\">" + esc(p.rawNote || "暂无") + "</div></div></details>" +
        "</div>" +
      "</section>" +

      '<div class="end">' +
        '<button class="btn-ghost" type="button" data-action="home">' + ICON.refresh + "<span>查看其他省份</span></button>" +
        '<p class="colophon">高考化学考点分布 · ' + U.YEAR_RANGE + '<br>数据整理自公开真题与解析，仅供复习参考</p>' +
      "</div>" +
    "</main>";
  }

  function mockrefView() {
    const M = window.MOCKREF || { meta: {}, exams: [] };
    const exams = M.exams || [];
    const dates = exams.map((exam) => String(exam.date || "")).filter(Boolean).sort();
    const range = dates.length ? dates[0].slice(0, 4) + "—" + dates[dates.length - 1].slice(0, 4) : "";
    const mappingCount = exams.filter((exam) => exam.chem && exam.chem.type === "mapping").length;
    const noneCount = exams.filter((exam) => !exam.chem).length;
    return '<main class="shell mk-shell view-enter" data-screen-label="模考参考库">' +
      '<header class="topbar">' +
        '<button class="tb-back" type="button" data-action="home">' + ICON.back + "<span>返回</span></button>" +
        '<span class="tb-title">模考参考库</span>' +
        '<span class="tb-asof">' + exams.length + " 场 · " + esc(range) + "</span>" +
      "</header>" +
      '<section class="mk-hero">' +
        '<p class="eyebrow">联考化学 · 有效分与赋分参考</p>' +
        '<h1 class="display">联考划到多少，<br>化学才算有效</h1>' +
        '<p class="lede">把各地联考的赋分对照、单科有效分线、学科等级线与均分放在一起，按考试和口径快速查阅。所有数字保留发布方原口径，不做跨场次换算。</p>' +
        '<div class="mk-hero-facts"><span><b>' + exams.length + '</b> 场联考</span><span><b>' + mappingCount + '</b> 场赋分对照</span><span><b>4</b> 类化学口径</span><span><b>' + noneCount + '</b> 场仅总分线</span></div>' +
      "</section>" +
      '<aside class="mk-disclaimer" aria-label="数据口径声明">' +
        '<div class="mk-disc-head"><span>口径声明</span><em>非官方数据</em></div>' +
        '<p>' + esc((M.meta && M.meta.disclaimer) || "") + "</p>" +
      "</aside>" +
      '<div id="mockref-root" class="mk-app"></div>' +
    "</main>";
  }

  function fufenView() {
    const fufenData = window.FUFEN || { provinces: {} };
    const fufenProvinceCount = Object.keys(fufenData.provinces).length;
    const fufenRuleCount = new Set(Object.keys(fufenData.provinces).map((key) => fufenData.provinces[key].rule)).size;
    const fufenStdCount = Object.keys(fufenData.provinces).filter((key) => fufenData.provinces[key].rule === "std").length;
    return '<main class="shell fufen-shell view-enter" data-screen-label="赋分速查">' +
      '<header class="topbar">' +
        '<button class="tb-back" type="button" data-action="home">' + ICON.back + "<span>返回</span></button>" +
        '<span class="tb-title">赋分速查</span>' +
        '<span class="tb-asof">' + fufenProvinceCount + ' 省 · 2026</span>' +
      "</header>" +
      '<section class="fu-hero">' +
        '<p class="eyebrow">再选科目 · 位次 ↔ 赋分</p>' +
        '<h1 class="display">排在前多少，<br>化学能赋多少分</h1>' +
        '<p class="lede">按各省等级赋分规则，把单科位次百分比折算为赋分。区间制给出估算分，京津沪的单值制直接给出固定档位；也可以反查目标赋分需要排进前多少。覆盖 ' + fufenStdCount + ' 个标准五等级省份，广东单独一表，以及浙江、山东、北京、天津、上海、新疆。规则按各省官方文件核验，实际等级边界以当年成绩分布为准。</p>' +
        '<div class="fu-hero-facts"><span><b>' + fufenProvinceCount + '</b> 个省级单位可查</span><span><b>' + fufenRuleCount + '</b> 套赋分规则</span><span>上海等级考满分 70 分</span></div>' +
      "</section>" +
      '<div id="fufen-root" class="fu-app"></div>' +
    "</main>";
  }

  window.VIEWS = { homeView, resultView, fufenView, mockrefView, suggestionList, sourceModalHTML, sourceBtnHTML, ICON };
})();
