/* 「赋分速查」交互模块：位次 ↔ 赋分 */
(function () {
  const F = window.FUFEN || { meta: {}, rules: {}, provinces: {}, not_supported: {} };

  const PROVINCE_ORDER = [
    "安徽", "北京", "重庆", "福建", "甘肃", "广东", "广西", "贵州",
    "河北", "黑龙江", "河南", "湖北", "湖南", "江苏", "江西", "吉林",
    "辽宁", "内蒙古", "宁夏", "青海", "山东", "山西", "陕西", "上海",
    "四川", "天津", "新疆", "云南", "浙江"
  ];
  const SINGLE_RULES = new Set(["bj", "tj", "sh"]);
  const INTERVAL_RULES = new Set(["zj", "sd", "xj"]);
  const RULE_LABEL = {
    std: "标准五等级赋分",
    gd: "广东五等级赋分",
    zj: "20 区间赋分",
    sd: "8 等级赋分",
    bj: "21 级单值赋分",
    tj: "21 级单值赋分",
    sh: "11 级单值赋分",
    xj: "10 子等级赋分"
  };
  const RULE_UNIT = { std: "等级", gd: "等级", zj: "区间", sd: "等级", bj: "等级", tj: "等级", sh: "等级", xj: "区间" };
  const RULE_VALUE_HEAD = { std: "等级", gd: "等级", zj: "区间", sd: "等级", bj: "等级", tj: "等级", sh: "等级", xj: "子等级" };
  const RULE_BADGE = { std: "5 等级", gd: "广东独表", zj: "20 区间", sd: "8 等级", bj: "21 级", tj: "21 级", sh: "11 级", xj: "10 子级" };

  const rowsCache = new Map();

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function defaultProvince() {
    try {
      const last = localStorage.getItem("chem-exam:last-province");
      if (last && F.provinces[last]) return last;
    } catch (err) { /* 隐私模式忽略 */ }
    return "河北";
  }

  const state = {
    province: defaultProvince(),
    mode: "forward",
    fwMode: "pct",
    pct: 10,
    rankN: "",
    rankM: "",
    score: 90
  };
  const initialBounds = scoreBounds(rowsFor(state.province));
  state.score = clamp(90, initialBounds.min, initialBounds.max);

  let rootEl = null;

  function gradeName(grade, index, single) {
    if (!grade) return "第 " + (index + 1) + " 区间";
    if (single) return grade;
    return grade.indexOf("·") !== -1 ? grade : grade + " 等";
  }

  function rowsFor(province) {
    const meta = F.provinces[province];
    if (!meta) return [];
    const ruleKey = meta.rule;
    if (rowsCache.has(ruleKey)) return rowsCache.get(ruleKey);
    const rule = F.rules[ruleKey] || {};
    const raw = rule.levels || rule.intervals || [];
    let cumulative = 0;
    const rows = raw.map((item, index) => {
      const single = typeof item.score === "number";
      const lo = single ? item.score : Math.min(item.score[0], item.score[1]);
      const hi = single ? item.score : Math.max(item.score[0], item.score[1]);
      const row = {
        name: gradeName(item.grade, index, single),
        grade: item.grade || "",
        pct: item.pct,
        lo: lo,
        hi: hi,
        single: single,
        start: cumulative,
        end: cumulative + item.pct,
        index: index
      };
      cumulative += item.pct;
      return row;
    });
    rowsCache.set(ruleKey, rows);
    return rows;
  }

  function ruleMeta(province) {
    return F.provinces[province] || { rule: "std", since: 2021 };
  }

  function ruleShort(province) {
    return RULE_LABEL[ruleMeta(province).rule] || "等级赋分";
  }

  function scoreBounds(rows) {
    if (!rows.length) return { min: 0, max: 100 };
    return { min: rows[rows.length - 1].lo, max: rows[0].hi };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function fmtPct(value) {
    if (value == null || !isFinite(value)) return "—";
    if (value > 0 && value < 0.1) return value.toFixed(2);
    return value.toFixed(1).replace(/\.0$/, "");
  }

  function rowForPct(rows, pct) {
    for (let i = 0; i < rows.length; i += 1) {
      if (pct <= rows[i].end + 1e-9) return rows[i];
    }
    return rows[rows.length - 1];
  }

  function rowForScore(rows, score) {
    for (let i = 0; i < rows.length; i += 1) {
      if (score >= rows[i].lo && score <= rows[i].hi) return rows[i];
    }
    return null;
  }

  function forwardContext() {
    const rows = rowsFor(state.province);
    const meta = ruleMeta(state.province);
    let pct = null;
    let error = "";

    if (state.fwMode === "pct") {
      if (state.pct == null || !isFinite(state.pct) || state.pct < 0 || state.pct > 100) {
        error = "输入 0–100 之间的单科位次百分比。";
      } else {
        pct = state.pct;
      }
    } else {
      const nText = String(state.rankN).trim();
      const mText = String(state.rankM).trim();
      if (!nText || !mText) {
        error = "填写排名 N 和总人数 M，自动换算位次百分比。";
      } else {
        const n = Number(nText);
        const m = Number(mText);
        if (!isFinite(n) || !isFinite(m) || !Number.isInteger(n) || !Number.isInteger(m) || n < 1 || m < 1) {
          error = "排名与总人数请输入不小于 1 的整数。";
        } else if (n > m) {
          error = "排名不能大于总人数。";
        } else {
          pct = (n / m) * 100;
        }
      }
    }

    if (error) {
      return { kind: "forward", rows: rows, meta: meta, error: error, pct: null, row: null, score: null, activeIndex: -1 };
    }

    const row = rowForPct(rows, pct);
    const single = row.single;
    const within = row.pct ? (pct - row.start) / row.pct : 0;
    const score = single ? row.lo : Math.round(row.hi - within * (row.hi - row.lo));
    return {
      kind: "forward", rows: rows, meta: meta, error: "", single: single,
      pct: pct, row: row, score: single ? row.lo : clamp(score, row.lo, row.hi),
      activeIndex: row.index
    };
  }

  function reverseContext() {
    const rows = rowsFor(state.province);
    const meta = ruleMeta(state.province);
    const bounds = scoreBounds(rows);
    const text = String(state.score).trim();
    let score = null;
    let error = "";

    if (!text) {
      error = "输入 " + bounds.min + "–" + bounds.max + " 之间的目标赋分。";
    } else if (!/^\d+$/.test(text)) {
      error = "目标赋分请填写整数。";
    } else {
      score = Number(text);
      if (score < bounds.min || score > bounds.max) {
        error = "该省规则可查 " + bounds.min + "–" + bounds.max + " 分，请输入范围内的整数。";
      }
    }

    if (error) {
      return { kind: "reverse", rows: rows, meta: meta, error: error, score: null, row: null, pct: null, activeIndex: -1, bounds: bounds };
    }

    if (rows.length && rows[0].single) {
      let row = rows[0];
      rows.forEach((candidate) => {
        if (Math.abs(candidate.hi - score) < Math.abs(row.hi - score)) row = candidate;
      });
      return {
        kind: "reverse", rows: rows, meta: meta, error: "", single: true,
        score: row.hi, requestedScore: score, aligned: row.hi !== score,
        row: row, pct: row.end, activeIndex: row.index, bounds: bounds
      };
    }

    const row = rowForScore(rows, score);
    const span = row.hi - row.lo;
    const pct = row.start + (span ? ((row.hi - score) / span) * row.pct : 0);
    return {
      kind: "reverse", rows: rows, meta: meta, error: "", single: false, score: score,
      row: row, pct: pct, activeIndex: row.index, bounds: bounds
    };
  }

  function context() {
    return state.mode === "reverse" ? reverseContext() : forwardContext();
  }

  function resultHTML(ctx) {
    if (ctx.error) {
      return '<div class="fu-result-empty"><span>待换算</span><p>' + esc(ctx.error) + "</p></div>";
    }

    const markPct = clamp(ctx.pct, 0, 100);
    const scale = scaleHTML(ctx.rows, ctx.activeIndex, markPct);
    const since = ctx.meta.since + " 年起";
    const shFlag = ctx.meta.rule === "sh"
      ? '<div class="fu-shanghai-flag"><b>满分 70 分制</b><span>等级考每门 70 分 · 高考总分 660</span></div>'
      : "";

    if (ctx.kind === "forward") {
      const label = ctx.single ? "对应赋分" : "估算赋分";
      const prefix = ctx.single ? "单值" : "约";
      const range = ctx.single ? "固定 " + ctx.score + " 分" : ctx.row.lo + " — " + ctx.row.hi + " 分";
      const line = ctx.single
        ? "单科位次前 <b>" + fmtPct(ctx.pct) + "%</b> · " + esc(ctx.row.name) + "（位次 " + ctx.row.start + "–" + ctx.row.end + "%）"
        : "单科位次前 <b>" + fmtPct(ctx.pct) + "%</b> · " + esc(ctx.row.name) + "占 " + ctx.row.pct + "%";
      const note = ctx.single
        ? "每级单值：位次进入该等级区间即对应固定赋分，不做区间内估算。实际边界以当年成绩分布为准。"
        : "估算值按区间内位次线性折算，实际赋分以当年成绩分布划定的等级边界为准。";
      return '<article class="fu-result-card">' +
        '<div class="fu-result-top"><span>' + label + '</span><span>' + esc(since) + '</span></div>' +
        shFlag +
        '<div class="fu-result-main">' +
          '<div class="fu-score"><span class="fu-approx">' + prefix + '</span><b>' + ctx.score + '</b><span class="fu-unit">分</span></div>' +
          '<div class="fu-hit"><span class="fu-grade">' + esc(ctx.row.name) + '</span>' +
            '<span class="fu-range">' + range + '</span></div>' +
        "</div>" +
        '<p class="fu-result-line">' + line + "</p>" +
        scale +
        '<p class="fu-result-note">' + esc(note) + "</p>" +
        "</article>";
    }

    if (ctx.single) {
      const target = ctx.aligned
        ? "目标 <b>" + ctx.requestedScore + " 分</b> · 对齐至 " + ctx.score + " 分（" + esc(ctx.row.name) + "）"
        : "目标 <b>" + ctx.score + " 分</b> · " + esc(ctx.row.name);
      const note = ctx.aligned
        ? "输入分不在该省的单值档位，已按级差 3 分对齐到最近级；所需位次按该等级上限计。"
        : "每级单值，无区间内插值；所需位次按该等级上限计。";
      return '<article class="fu-result-card">' +
        '<div class="fu-result-top"><span>所需位次上限</span><span>' + esc(since) + '</span></div>' +
        shFlag +
        '<div class="fu-result-main">' +
          '<div class="fu-score"><span class="fu-approx">前</span><b>' + fmtPct(ctx.pct) + '</b><span class="fu-unit">%</span></div>' +
          '<div class="fu-hit"><span class="fu-grade">' + esc(ctx.row.name) + '</span>' +
            '<span class="fu-range">固定 ' + ctx.score + ' 分</span></div>' +
        "</div>" +
        '<p class="fu-result-line">' + target + " · 需排进该科目前 " + fmtPct(ctx.pct) + "%</p>" +
        scale +
        '<p class="fu-result-note">' + esc(note) + "</p>" +
        "</article>";
    }

    const isFloor = ctx.score === ctx.row.lo;
    const isTop = ctx.score === ctx.row.hi;
    let note = "把目标分在该区间内按比例折算为位次上限；实际边界随当年成绩分布浮动。";
    if (isTop && ctx.score === ctx.bounds.max) note = "这是该规则的最高赋分，对应转换基数内最靠前的位次。";
    else if (isTop) note = "这是该等级/区间的上限分；再高 1 分进入上一等级。";
    else if (isFloor && ctx.row.index === ctx.rows.length - 1) note = "这是该规则的最低赋分，对应转换基数内的末位。";
    else if (isFloor) note = "这是该等级/区间的下限分；再低 1 分进入下一等级。";

    return '<article class="fu-result-card">' +
      '<div class="fu-result-top"><span>所需位次上限</span><span>' + esc(since) + '</span></div>' +
      '<div class="fu-result-main">' +
        '<div class="fu-score"><span class="fu-approx">前</span><b>' + fmtPct(ctx.pct) + '</b><span class="fu-unit">%</span></div>' +
        '<div class="fu-hit"><span class="fu-grade">' + esc(ctx.row.name) + '</span>' +
          '<span class="fu-range">' + ctx.row.lo + " — " + ctx.row.hi + ' 分</span></div>' +
      "</div>" +
      '<p class="fu-result-line">目标 <b>' + ctx.score + ' 分</b> · 需排进该科目前 ' + fmtPct(ctx.pct) + "%</p>" +
      scale +
      '<p class="fu-result-note">' + esc(note) + "</p>" +
      "</article>";
  }

  function scaleHTML(rows, activeIndex, markPct) {
    const segments = rows.map((row, index) =>
      '<i class="' + (index === activeIndex ? "is-hit" : "") + '" style="flex:' + row.pct +
        '" title="' + esc(row.name + " · 前 " + row.start + "–" + row.end + "%") + '"></i>'
    ).join("");
    return '<div class="fu-scale-wrap">' +
      '<div class="fu-scale" role="img" aria-label="等级人数比例尺，当前位于前 ' + fmtPct(markPct) + '%">' + segments + "</div>" +
      '<span class="fu-scale-mark" style="left:' + markPct + '%"></span>' +
      "</div>" +
      '<div class="fu-scale-ticks"><span>前 0%</span><span>50%</span><span>100%</span></div>';
  }

  function tableRowsHTML(ctx) {
    const single = ctx.rows.length && ctx.rows[0].single;
    return ctx.rows.map((row, index) => {
      const active = index === ctx.activeIndex;
      if (single) {
        return "<tr" + (active ? ' class="is-hit" aria-current="true"' : "") + ">" +
          '<th scope="row">' + esc(row.name) + "</th>" +
          "<td>" + row.start + "–" + row.end + "%</td>" +
          '<td class="fu-score-cell"><b>' + row.lo + "</b></td>" +
          "</tr>";
      }
      return "<tr" + (active ? ' class="is-hit" aria-current="true"' : "") + ">" +
        '<th scope="row">' + esc(gradeName(row.grade, index, false)) + "</th>" +
        "<td>" + row.pct + "%</td>" +
        "<td>" + row.start + "–" + row.end + "%</td>" +
        '<td class="fu-score-cell"><b>' + row.lo + "</b> — <b>" + row.hi + "</b></td>" +
        "</tr>";
    }).join("");
  }

  function tableHTML(ctx) {
    const unit = RULE_UNIT[ctx.meta.rule] || "等级";
    const single = ctx.rows.length && ctx.rows[0].single;
    const head = single
      ? '<th scope="col">等级</th><th scope="col">位次区间</th><th scope="col">赋分</th>'
      : '<th scope="col">' + esc(RULE_VALUE_HEAD[ctx.meta.rule] || "等级") + '</th>' +
        '<th scope="col">人数比例</th><th scope="col">累计位次</th><th scope="col">赋分区间</th>';
    const foot = single
      ? "高亮行是当前输入命中的等级。每级单值、同一等级内不再按位次插值；位次区间按累计比例给出，实际边界以当年成绩分布为准。"
      : "高亮行是当前输入命中的" + unit + "。累计位次按“前 x%”理解，实际边界按当年成绩分布最接近的累计比例划定。";
    return '<section class="fu-rules" aria-labelledby="fu-rules-title">' +
      '<div class="fu-rule-head"><h2 id="fu-rules-title">' + esc(state.province) + " · 完整对照</h2>" +
        '<span>' + ctx.rows.length + " 个" + unit + " · 合计 100%</span></div>" +
      '<div class="fu-table-wrap"><table class="fu-table' + (single ? " is-single" : "") + '">' +
        "<caption class=\"sr-only\">" + esc(state.province) + "赋分规则完整对照表</caption>" +
        "<thead><tr>" + head + "</tr></thead>" +
        '<tbody id="fu-rule-body">' + tableRowsHTML(ctx) + "</tbody>" +
      "</table></div>" +
      '<p class="fu-rule-foot">' + foot + "</p>" +
      (F.rules[ctx.meta.rule] && F.rules[ctx.meta.rule].note
        ? '<p class="fu-rule-note">' + esc(F.rules[ctx.meta.rule].note) + "</p>"
        : "") +
      "</section>";
  }

  function mobileSelectHTML() {
    const std = PROVINCE_ORDER.filter((key) => F.provinces[key] && F.provinces[key].rule === "std");
    const gd = PROVINCE_ORDER.filter((key) => F.provinces[key] && F.provinces[key].rule === "gd");
    const interval = PROVINCE_ORDER.filter((key) => F.provinces[key] && INTERVAL_RULES.has(F.provinces[key].rule));
    const single = PROVINCE_ORDER.filter((key) => F.provinces[key] && SINGLE_RULES.has(F.provinces[key].rule));
    const unsupported = Object.keys(F.not_supported);
    return '<div class="fu-mobile-pick">' +
      '<label for="fu-province-select">考试省份</label>' +
      '<div class="fu-select-wrap"><select id="fu-province-select" aria-describedby="fu-mobile-prov-note">' +
        '<optgroup label="五等级 · ' + std.length + ' 省">' + std.map((key) =>
          '<option value="' + esc(key) + '"' + (key === state.province ? " selected" : "") + ">" + esc(key) + "</option>"
        ).join("") + "</optgroup>" +
        '<optgroup label="广东独表 · ' + gd.length + ' 省">' + gd.map((key) =>
          '<option value="' + esc(key) + '"' + (key === state.province ? " selected" : "") + ">" +
            esc(key) + " · " + esc(RULE_LABEL[F.provinces[key].rule]) + "</option>"
        ).join("") + "</optgroup>" +
        '<optgroup label="区间制 · ' + interval.join(" / ") + '">' + interval.map((key) =>
          '<option value="' + esc(key) + '"' + (key === state.province ? " selected" : "") + ">" +
            esc(key) + " · " + esc(RULE_LABEL[F.provinces[key].rule]) + "</option>"
        ).join("") + "</optgroup>" +
        '<optgroup label="单值制 · 京津沪">' + single.map((key) =>
          '<option value="' + esc(key) + '"' + (key === state.province ? " selected" : "") + ">" +
            esc(key) + " · " + esc(RULE_LABEL[F.provinces[key].rule]) + "</option>"
        ).join("") + "</optgroup>" +
        '<optgroup label="暂不支持">' + unsupported.map((key) =>
          '<option disabled title="' + esc(F.not_supported[key]) + '">' + esc(key) + " · " + esc(F.not_supported[key]) + "</option>"
        ).join("") + "</optgroup>" +
      "</select></div>" +
      '<p id="fu-mobile-prov-note" class="fu-mobile-note">暂不支持的地区已置灰；展开选项可查看原因。</p>' +
    "</div>";
  }

  function provinceChip(key) {
    const active = key === state.province;
    return '<button type="button" class="fu-prov" data-prov="' + esc(key) + '"' +
      (active ? ' aria-pressed="true"' : ' aria-pressed="false"') + ">" + esc(key) + "</button>";
  }

  function pickerHTML() {
    const std = PROVINCE_ORDER.filter((key) => F.provinces[key] && F.provinces[key].rule === "std");
    const gd = PROVINCE_ORDER.filter((key) => F.provinces[key] && F.provinces[key].rule === "gd");
    const interval = PROVINCE_ORDER.filter((key) => F.provinces[key] && INTERVAL_RULES.has(F.provinces[key].rule));
    const single = PROVINCE_ORDER.filter((key) => F.provinces[key] && SINGLE_RULES.has(F.provinces[key].rule));
    const unsupported = Object.keys(F.not_supported);
    return '<aside class="fu-picker" aria-labelledby="fu-picker-title">' +
      '<div class="fu-pick-head"><h2 id="fu-picker-title">考试省份</h2><span>' +
        Object.keys(F.provinces).length + " / " + (Object.keys(F.provinces).length + unsupported.length) + ' 可查</span></div>' +
      mobileSelectHTML() +
      '<div class="fu-desktop-prov">' +
        '<div class="fu-prov-group"><p class="fu-group-label">五等级 · ' + std.length + ' 省</p>' +
          '<div class="fu-prov-grid">' + std.map(provinceChip).join("") + "</div></div>" +
        '<div class="fu-prov-group"><p class="fu-group-label">广东独表 · ' + gd.length + ' 省</p>' +
          '<div class="fu-prov-grid">' + gd.map(provinceChip).join("") + "</div></div>" +
        '<div class="fu-prov-group"><p class="fu-group-label">区间制 · ' + interval.join(" / ") + '</p>' +
          '<div class="fu-prov-grid">' + interval.map(provinceChip).join("") + "</div></div>" +
        '<div class="fu-prov-group"><p class="fu-group-label">单值制 · 京津沪</p>' +
          '<div class="fu-prov-grid">' + single.map(provinceChip).join("") + "</div></div>" +
        '<div class="fu-prov-group fu-prov-group-off"><p class="fu-group-label">暂不支持 · ' + unsupported.length + '</p>' +
          '<div class="fu-prov-grid">' + unsupported.map((key) =>
            '<button type="button" class="fu-prov is-off" data-off-prov="' + esc(key) + '"' +
              ' aria-disabled="true" aria-describedby="fu-prov-note" title="' + esc(F.not_supported[key]) + '">' +
              esc(key) + "</button>"
          ).join("") + "</div>" +
          '<p class="fu-prov-note" id="fu-prov-note" role="status">灰色地区暂不支持，点击查看原因。</p>' +
        "</div>" +
      "</div>" +
    "</aside>";
  }

  function forwardFormHTML() {
    if (state.fwMode === "pct") {
      const pctValue = state.pct == null ? "" : state.pct;
      return '<div class="fu-subseg" role="group" aria-label="位次输入方式">' +
          '<button type="button" data-fw="pct" aria-pressed="true">按百分比</button>' +
          '<button type="button" data-fw="rank" aria-pressed="false">按排名</button>' +
        "</div>" +
        '<div class="fu-field-block">' +
          '<label class="fu-label" for="fu-pct">单科位次百分比 <span>0 为最前，100 为最后</span></label>' +
          '<div class="fu-number-field"><input id="fu-pct" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="' + esc(pctValue) + '" aria-describedby="fu-pct-scale"><span>%</span></div>' +
          '<input id="fu-pct-range" class="fu-range" type="range" min="0" max="100" step="0.1" value="' +
            (state.pct == null ? 10 : clamp(state.pct, 0, 100)) + '" aria-label="单科位次百分比滑条">' +
          '<div class="fu-scale-ticks" id="fu-pct-scale"><span>前 0%</span><span>50%</span><span>100%</span></div>' +
        "</div>";
    }

    return '<div class="fu-subseg" role="group" aria-label="位次输入方式">' +
        '<button type="button" data-fw="pct" aria-pressed="false">按百分比</button>' +
        '<button type="button" data-fw="rank" aria-pressed="true">按排名</button>' +
      "</div>" +
      '<div class="fu-field-block">' +
        '<p class="fu-label">用排名折算 <span>总人数填该科目实际考生数</span></p>' +
        '<div class="fu-rank-row">' +
          '<label class="fu-rank-field" for="fu-rank-n"><span>排名 N</span>' +
            '<span class="fu-rank-input"><input id="fu-rank-n" type="number" min="1" step="1" inputmode="numeric" value="' +
              esc(state.rankN) + '" placeholder="如 120"><em>名</em></span></label>' +
          '<span class="fu-rank-slash" aria-hidden="true">/</span>' +
          '<label class="fu-rank-field" for="fu-rank-m"><span>总人数 M</span>' +
            '<span class="fu-rank-input"><input id="fu-rank-m" type="number" min="1" step="1" inputmode="numeric" value="' +
              esc(state.rankM) + '" placeholder="如 1200"><em>人</em></span></label>' +
        "</div>" +
        '<p class="fu-rank-read" id="fu-rank-read">' + rankReadHTML() + "</p>" +
      "</div>";
  }

  function rankReadHTML() {
    const n = Number(state.rankN);
    const m = Number(state.rankM);
    if (state.rankN !== "" && state.rankM !== "" && isFinite(n) && isFinite(m) && n >= 1 && m >= 1 && n <= m) {
      return "= 单科位次前 <b>" + fmtPct((n / m) * 100) + "%</b>";
    }
    return "填写后自动换算；位次越靠前，赋分越高。";
  }

  function reverseFormHTML() {
    const bounds = scoreBounds(rowsFor(state.province));
    const rule = ruleMeta(state.province).rule;
    const single = SINGLE_RULES.has(rule);
    const help = single
      ? "每级单值制：输入非档位分时，按级差 3 分对齐到最近级。" + (rule === "sh" ? " 上海等级考满分 70 分。" : "")
      : "输入目标赋分，反查需要排进该科目的前百分之多少。";
    return '<div class="fu-field-block">' +
      '<label class="fu-label" for="fu-score">目标赋分 <span>可查 ' + bounds.min + "–" + bounds.max + " 分</span></label>" +
      '<div class="fu-number-field"><input id="fu-score" type="number" min="' + bounds.min + '" max="' + bounds.max +
        '" step="1" inputmode="numeric" value="' + esc(state.score) + '" aria-describedby="fu-score-help"><span>分</span></div>' +
      '<p class="fu-help" id="fu-score-help">' + esc(help) + "</p>" +
    "</div>";
  }

  function panelHTML(ctx) {
    const meta = ruleMeta(state.province);
    return '<section class="fu-panel" aria-labelledby="fu-panel-title">' +
      '<div class="fu-panel-head">' +
        '<div><p class="fu-overline">当前规则</p>' +
          '<h2 class="fu-panel-title" id="fu-panel-title">' + esc(ruleShort(state.province)) + "</h2>" +
          '<p class="fu-since">' + esc(state.province) + " · " + meta.since + " 年起实行" +
            (meta.rule === "sh" ? " · 满分 70" : "") + "</p></div>" +
        '<span class="fu-rule-pill">' + esc(RULE_BADGE[meta.rule] || "等级") + "</span>" +
      "</div>" +
      '<div class="fu-mode" role="group" aria-label="换算方向">' +
        '<button type="button" data-mode="forward" aria-pressed="' + (state.mode === "forward") + '">位次 → 赋分</button>' +
        '<button type="button" data-mode="reverse" aria-pressed="' + (state.mode === "reverse") + '">赋分 → 位次</button>' +
      "</div>" +
      (state.mode === "forward" ? forwardFormHTML() : reverseFormHTML()) +
      '<div class="fu-result" id="fu-result" aria-live="polite">' + resultHTML(ctx) + "</div>" +
    "</section>";
  }

  function caveatsHTML() {
    const caveats = (F.meta && F.meta.caveats) || [];
    return '<section class="fu-notes" aria-labelledby="fu-notes-title">' +
      '<div class="sec-head"><h2 class="sec-title" id="fu-notes-title">口径与边界</h2>' +
        '<span class="sec-meta">' + (F.meta.verified || "").replace(/-/g, ".") + " 核验</span></div>" +
      '<ol class="fu-caveat-list">' + caveats.map((text, index) =>
        "<li><span>" + String(index + 1).padStart(2, "0") + "</span><p>" + esc(text) + "</p></li>"
      ).join("") + "</ol>" +
      sourcesHTML() +
    "</section>";
  }

  function linkify(text) {
    return esc(text).replace(/(https?:\/\/[^\s；]+)/g, function (url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + "</a>";
    });
  }

  function sourcesHTML() {
    const sources = (F.meta && F.meta.sources) || [];
    return '<details class="fu-sources"><summary>规则依据与官方来源</summary>' +
      '<div class="fu-sources-body">' + sources.map((source) =>
        "<div><h3>" + esc(source.name) + "</h3><p>" + linkify(source.source) + "</p></div>"
      ).join("") +
      '<p class="fu-source-note">规则数据核验于 ' + esc(F.meta.verified || "") +
        "，以各省考试院正式文件为准；工具只做位次与赋分区间的映射，不涉及卷面分换算。</p>" +
      "</div></details>";
  }

  function appHTML() {
    return '<div class="fu-workspace">' + pickerHTML() + panelHTML(context()) + "</div>" +
      tableHTML(context()) + caveatsHTML();
  }

  function updateOutputs() {
    if (!rootEl) return;
    const ctx = context();
    const result = rootEl.querySelector("#fu-result");
    if (result) result.innerHTML = resultHTML(ctx);
    const body = rootEl.querySelector("#fu-rule-body");
    if (body) body.innerHTML = tableRowsHTML(ctx);
    const rankRead = rootEl.querySelector("#fu-rank-read");
    if (rankRead) rankRead.innerHTML = rankReadHTML();
    const pctInput = rootEl.querySelector("#fu-pct");
    const pctRange = rootEl.querySelector("#fu-pct-range");
    if (pctInput && pctRange && ctx.kind === "forward" && state.fwMode === "pct" && ctx.pct != null) {
      const clamped = clamp(ctx.pct, 0, 100);
      if (document.activeElement !== pctInput) pctInput.value = fmtPct(clamped);
      pctRange.value = String(clamped);
    }
  }

  function render() {
    if (!rootEl) return;
    rootEl.innerHTML = appHTML();
  }

  function selectProvince(key) {
    if (!F.provinces[key] || state.province === key) return;
    state.province = key;
    const bounds = scoreBounds(rowsFor(key));
    const numericScore = Number(state.score);
    if (!isFinite(numericScore) || !Number.isInteger(numericScore) ||
        numericScore < bounds.min || numericScore > bounds.max) {
      state.score = clamp(90, bounds.min, bounds.max);
    }
    render();
    const mobileSelect = rootEl.querySelector("#fu-province-select");
    const target = (mobileSelect && mobileSelect.offsetParent !== null ? mobileSelect : null) ||
      Array.prototype.slice.call(rootEl.querySelectorAll("[data-prov]")).find((button) => button.getAttribute("data-prov") === key);
    if (target) {
      try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }
    }
  }

  function showUnsupported(key) {
    const note = rootEl.querySelector("#fu-prov-note");
    if (!note) return;
    rootEl.querySelectorAll("[data-off-prov]").forEach((button) => {
      button.classList.toggle("is-inspect", button.getAttribute("data-off-prov") === key);
    });
    note.textContent = key + " · " + (F.not_supported[key] || "暂不支持");
    note.classList.add("is-active");
  }

  function bind() {
    rootEl.addEventListener("click", function (event) {
      const off = event.target.closest("[data-off-prov]");
      if (off) {
        showUnsupported(off.getAttribute("data-off-prov"));
        return;
      }

      const provinceBtn = event.target.closest("[data-prov]");
      if (provinceBtn) {
        selectProvince(provinceBtn.getAttribute("data-prov"));
        return;
      }

      const modeBtn = event.target.closest("[data-mode]");
      if (modeBtn) {
        const mode = modeBtn.getAttribute("data-mode");
        if (mode !== state.mode) {
          state.mode = mode;
          render();
          const next = rootEl.querySelector('[data-mode="' + mode + '"]');
          if (next) next.focus({ preventScroll: true });
        }
        return;
      }

      const fwBtn = event.target.closest("[data-fw]");
      if (fwBtn) {
        const fw = fwBtn.getAttribute("data-fw");
        if (fw !== state.fwMode) {
          state.fwMode = fw;
          render();
          const next = rootEl.querySelector('[data-fw="' + fw + '"]');
          if (next) next.focus({ preventScroll: true });
        }
      }
    });

    rootEl.addEventListener("change", function (event) {
      if (event.target.id === "fu-province-select") {
        selectProvince(event.target.value);
      }
    });

    rootEl.addEventListener("input", function (event) {
      const target = event.target;
      if (target.id === "fu-pct") {
        const raw = target.value.trim();
        state.pct = raw === "" ? null : Number(raw);
        const range = rootEl.querySelector("#fu-pct-range");
        if (range && state.pct != null && isFinite(state.pct)) {
          range.value = String(clamp(state.pct, 0, 100));
        }
        updateOutputs();
        return;
      }
      if (target.id === "fu-pct-range") {
        state.pct = Number(target.value);
        const input = rootEl.querySelector("#fu-pct");
        if (input) input.value = fmtPct(state.pct);
        updateOutputs();
        return;
      }
      if (target.id === "fu-rank-n") {
        state.rankN = target.value;
        updateOutputs();
        return;
      }
      if (target.id === "fu-rank-m") {
        state.rankM = target.value;
        updateOutputs();
        return;
      }
      if (target.id === "fu-score") {
        state.score = target.value;
        updateOutputs();
      }
    });
  }

  function mount(element) {
    rootEl = element;
    if (!rootEl) return;
    render();
    bind();
  }

  window.FUFEN_VIEW = { mount: mount };
})();
