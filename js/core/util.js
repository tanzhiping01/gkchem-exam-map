/* 数据访问与派生计算 */
(function () {
  const D = window.EXAM_DATA;
  const PENDING = "待核";

  const MODULE_COLORS = {
    "化学实验": "#B2453A",
    "有机化学": "#8A3F5C",
    "物质结构与性质": "#2C6E70",
    "化学反应原理": "#4E4F86",
    "化学基本概念与用语": "#3B566B",
    "工艺流程": "#6A6650",
    "电化学": "#A2763F",
    "水溶液中的离子平衡": "#7A659A",
    "元素周期律": "#7C8F4E",
    "元素化合物": "#5B7B5E",
    "待核": "#9AA299"
  };

  /* 难度三级：颜色沿用整页色系（元素化合物绿 / 电化学赭 / 批注红） */
  const LEVELS = [
    { k: "简易", cls: "easy", color: "#5B7B5E" },
    { k: "中档", cls: "mid", color: "#A2763F" },
    { k: "难点", cls: "hard", color: "#AF3A2C" },
    { k: "未定级", cls: "none", color: "#9AA299" }
  ];

  const ALL_YEARS = (D && D.years && D.years.length ? D.years : ["2022", "2023", "2024", "2025", "2026"]).slice();
  const YEAR_RANGE = ALL_YEARS[0] + "—" + ALL_YEARS[ALL_YEARS.length - 1];
  const SHARED_SUB = { "黑吉辽蒙": "黑 / 吉 / 辽 / 蒙", "陕晋青宁": "陕 / 晋 / 青 / 宁" };

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function hexToRgba(hex, a) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[\s·.]/g, "")
      .replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/, "");
  }

  function colorOf(m) { return MODULE_COLORS[m] || "#6A6650"; }

  function yearsOf(prov) { return ALL_YEARS.filter((y) => prov.years[y]); }

  /* 年份考试信息；一年两场（浙江）时按 sess 取该场次，sess 为空则返回场次列表 */
  function examOf(prov, year, sess) {
    const e = (prov.examAll && prov.examAll[year]) || null;
    if (!e || !sess || !e.sessions) return e;
    for (let i = 0; i < e.sessions.length; i++) {
      if (e.sessions[i].label === sess) return e.sessions[i];
    }
    return e;
  }

  /* 一年的题量口径：是否分场次、场次名称 */
  function sessionsOf(prov, year) {
    const e = examOf(prov, year);
    return e && e.sessions ? e.sessions.map((x) => x.label) : [];
  }

  function itemsFor(prov, year, sess) {
    const y = prov.years[year];
    if (!y) return [];
    return sess ? y.items.filter((it) => it.ses === sess) : y.items;
  }

  function levelOf(k) {
    for (let i = 0; i < LEVELS.length; i++) if (LEVELS[i].k === k) return LEVELS[i];
    return LEVELS[LEVELS.length - 1];
  }

  /* 按难度汇总题量与分值；known=0 时（上海等未标分值的卷）只能按题量看 */
  function diffStats(prov, year, sess) {
    const items = itemsFor(prov, year, sess);
    const rows = LEVELS.map((l) => ({ k: l.k, cls: l.cls, color: l.color, count: 0, score: 0 }));
    let known = 0;
    let missing = 0;
    items.forEach((it) => {
      const row = rows[LEVELS.indexOf(levelOf(it.lv))];
      row.count += 1;
      if (it.s == null) missing += 1;
      else {
        row.score += it.s;
        known += it.s;
      }
    });
    return { rows, total: items.length, known, missing, byScore: known > 0 };
  }

  function scoreSum(items) {
    return items.reduce((s, it) => s + (it.s == null ? 0 : it.s), 0);
  }

  function itemCount(prov, year, sess) {
    const y = prov.years[year];
    return y ? itemsFor(prov, year, sess).length : 0;
  }

  function pendingCount(prov, year, sess) {
    const y = prov.years[year];
    return y ? itemsFor(prov, year, sess).filter((i) => i.m === PENDING).length : 0;
  }

  function verifiedCount(prov, year) { return itemCount(prov, year) - pendingCount(prov, year); }

  function defaultYear(prov) {
    const ys = yearsOf(prov);
    for (let i = ys.length - 1; i >= 0; i--) {
      if (verifiedCount(prov, ys[i]) > 0) return ys[i];
    }
    return ys[ys.length - 1] || null;
  }

  function totalItems(prov) {
    return yearsOf(prov).reduce((s, y) => s + itemCount(prov, y), 0);
  }

  function totalPending(prov) {
    return yearsOf(prov).reduce((s, y) => s + pendingCount(prov, y), 0);
  }

  /* 模块在该省的总题量排序，保证同一省内横条、趋势表、筛选顺序一致 */
  const orderCache = {};
  function moduleOrder(prov) {
    if (orderCache[prov.key]) return orderCache[prov.key];
    const totals = {};
    yearsOf(prov).forEach((y) => {
      prov.years[y].items.forEach((it) => {
        if (it.m === PENDING) return;
        totals[it.m] = (totals[it.m] || 0) + 1;
      });
    });
    const order = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
    orderCache[prov.key] = order;
    return order;
  }

  /* 分值口径：
     单题分值缺失时，若这些题同属非选择题、且该卷有非选择题合计，则按大题合计均分估算；
     估算值只用于占比统计，不回写题目记录（题目仍显示「分值未拆分」）。
     若整卷都无逐题分值（如上海回忆版），则该年不可按分值统计，调用方回落题量口径。 */
  function scoreStats(prov, year, sess) {
    const y = prov.years[year];
    if (!y) return { usable: false, scores: {}, total: 0, byModule: {}, splitByModule: {}, estimated: 0, splitTotal: 0, splitReal: 0, splitEst: 0, splitCount: 0 };
    const exam = examOf(prov, year, sess);
    const items = itemsFor(prov, year, sess).filter((it) => it.m !== PENDING);
    const nulls = items.filter((it) => it.s == null);
    const scores = {};
    items.forEach((it) => { if (it.s != null) scores[it.n] = it.s; });
    let estimated = 0;
    if (nulls.length) {
      const ncTotal = (exam && exam.nonChoice) || 0;
      const knownNC = items
        .filter((it) => it.t !== "选择题" && it.s != null)
        .reduce((s, it) => s + it.s, 0);
      const rest = ncTotal - knownNC;
      const allNonChoice = nulls.every((it) => it.t !== "选择题");
      if (!allNonChoice || nulls.length === items.length || !(rest > 0)) {
        return { usable: false, scores: {}, total: 0, byModule: {}, splitByModule: {}, estimated: 0, splitTotal: 0, splitReal: 0, splitEst: 0, splitCount: 0 };
      }
      const each = rest / nulls.length;
      nulls.forEach((it) => { scores[it.n] = each; });
      estimated = nulls.length;
    }
    const byModule = {};
    const splitByModule = {};
    let total = 0;
    let splitTotal = 0, splitReal = 0, splitEst = 0, splitCount = 0;
    items.forEach((it) => {
      const v = scores[it.n] || 0;
      total += v;
      // 大题中的跨模块小问：分值从原考点模块划入拆分目标模块
      // sp.m 由数据层显式给出（结构 / 电化学等）；旧数据缺省为结构
      const target = (it.sp && it.sp.m) || "物质结构与性质";
      let cut = 0;
      // 主考点已是目标模块的题无需划转，避免重复
      if (it.sp && it.sp.s && v > 0 && it.m !== target) {
        cut = Math.min(it.sp.s, v);
        splitTotal += cut;
        splitCount += 1;
        if (it.sp.k === "实值") splitReal += cut;
        else splitEst += cut;
        const sm = splitByModule[target] || (splitByModule[target] = { total: 0, real: 0, est: 0, count: 0 });
        sm.total += cut;
        sm.count += 1;
        if (it.sp.k === "实值") sm.real += cut;
        else sm.est += cut;
      }
      byModule[it.m] = (byModule[it.m] || 0) + (v - cut);
      if (cut) byModule[target] = (byModule[target] || 0) + cut;
    });
    if (!(total > 0)) return { usable: false, scores: {}, total: 0, byModule: {}, splitByModule: {}, estimated: 0, splitTotal: 0, splitReal: 0, splitEst: 0, splitCount: 0 };
    return { usable: true, scores, total, byModule, splitByModule, estimated, splitTotal, splitReal, splitEst, splitCount };
  }

  function moduleStats(prov, year, sess) {
    const order = moduleOrder(prov);
    const counts = {};
    order.forEach((m) => (counts[m] = 0));
    itemsFor(prov, year, sess).forEach((it) => { if (it.m !== PENDING) counts[it.m] = (counts[it.m] || 0) + 1; });
    const total = order.reduce((s, m) => s + counts[m], 0);
    const sc = scoreStats(prov, year, sess);
    const rows = order.map((m, i) => ({
      m,
      c: counts[m],
      s: sc.usable ? (sc.byModule[m] || 0) : 0,
      i,
      pctCount: total ? Math.round((counts[m] / total) * 100) : 0,
      pctScore: sc.usable && sc.total ? Math.round(((sc.byModule[m] || 0) / sc.total) * 100) : 0
    }));
    return {
      rows, total, pending: pendingCount(prov, year, sess),
      scoreUsable: sc.usable, scoreTotal: sc.total, scoreEstimated: sc.estimated,
      splitTotal: sc.splitTotal || 0, splitReal: sc.splitReal || 0,
      splitEst: sc.splitEst || 0, splitCount: sc.splitCount || 0,
      splitByModule: sc.splitByModule || {}
    };
  }

  /* 某组题目的统计用分值合计 */
  function itemsScore(ss, arr) {
    if (!ss.usable) return 0;
    return arr.reduce((s, it) => s + (ss.scores[it.n] || 0), 0);
  }

  function searchProvinces(q) {
    const raw = String(q || "").trim();
    if (!raw) return [];
    const nq = normalize(raw);
    const out = [];
    D.order.forEach((key) => {
      const p = D.provinces[key];
      let score = 0;
      p.aliases.forEach((a) => {
        const na = normalize(a);
        if (!na) return;
        if (na === nq) score = Math.max(score, 4);
        else if (na.startsWith(nq)) score = Math.max(score, 3);
        else if (nq.length >= 2 && na.includes(nq)) score = Math.max(score, 2);
        else if (nq.length >= 2 && nq.includes(na) && na.length >= 2) score = Math.max(score, 1);
      });
      if (score) out.push({ key, score });
    });
    out.sort((a, b) => b.score - a.score || D.order.indexOf(a.key) - D.order.indexOf(b.key));
    return out.map((o) => D.provinces[o.key]);
  }

  /* 2022—2026 题级原卷索引：省|年|场次|题号；imgQ 为单题精切，img 为整页回退 */
  function sourceKey(provKey, year, sess, n) {
    return [provKey, year, sess || "", String(n)].join("|");
  }

  function sourceOf(provKey, year, sess, n) {
    const map = window.QMAP || {};
    return map[sourceKey(provKey, year, sess, n)] || null;
  }

  function sourceHas(rec) {
    return !!(rec && (rec.imgQ || rec.img || rec.page != null || rec.cloud || rec.detail || rec.choice));
  }

  /* 原卷图片根地址可外部化：config.js 里设置 window.ASSET_BASE，
     则所有 assets/y2426/*.webp 改写为「ASSET_BASE + 相对路径」。
     幂等：同一 base 只改写一次。 */
  function applyAssetBase() {
    const base = window.ASSET_BASE;
    if (!base || !window.QMAP || window.__assetBaseApplied === base) return;
    const prefix = String(base).replace(/\/?$/, "/");
    const fix = (p) => (typeof p === "string" && p.indexOf("assets/") === 0 ? prefix + p : p);
    Object.keys(window.QMAP).forEach((k) => {
      const r = window.QMAP[k];
      if (!r || typeof r !== "object") return;
      if (r.img) r.img = fix(r.img);
      if (r.imgQ) r.imgQ = fix(r.imgQ);
      if (r.imgA) r.imgA = fix(r.imgA);
    });
    window.__assetBaseApplied = base;
  }

  function sharedMembers(prov) {
    const m = /[（(]([^）)]+)[）)]/.exec(prov.overviewName || "");
    if (!m) return null;
    return m[1].split("/").filter(Boolean);
  }

  const SHORT_NAME = { "辽": "辽宁", "吉": "吉林", "黑": "黑龙江", "蒙": "内蒙古", "陕": "陕西", "晋": "山西", "青": "青海", "宁": "宁夏" };

  function subtitleOf(prov) {
    const members = sharedMembers(prov);
    if (members) return members.map((m) => SHORT_NAME[m] || m).join(" / ") + " 共用卷";
    if ((prov.mode || "").indexOf("旧高考") >= 0) return "理综卷中的化学部分";
    return "化学独立命题卷";
  }

  function chipSub(prov) {
    if (SHARED_SUB[prov.key]) return SHARED_SUB[prov.key];
    if ((prov.mode || "").indexOf("旧高考") >= 0) return "旧高考";
    return prov.mode || "";
  }

  function modeLabel(prov) {
    return (prov.mode || "").replace("（理综）", "").replace("(理综)", "") || "未标注";
  }

  window.U = {
    D, PENDING, ALL_YEARS, YEAR_RANGE, MODULE_COLORS, LEVELS,
    esc, hexToRgba, normalize, colorOf, levelOf,
    examOf, sessionsOf, itemsFor, diffStats, scoreSum,
    yearsOf, itemCount, pendingCount, verifiedCount, defaultYear, totalItems, totalPending,
    moduleOrder, moduleStats, scoreStats, itemsScore, searchProvinces, sharedMembers, subtitleOf, chipSub, modeLabel,
    sourceKey, sourceOf, sourceHas, applyAssetBase
  };
})();
