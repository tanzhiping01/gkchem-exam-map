/* 省份详情页：考点关键词检索（固定近五年，支持同义词组 / 关联词） */
(function () {
  const U = window.U;
  if (!U) return;
  const V = window.VIEWS || {};

  const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.4"></circle><path d="M15.6 15.6 20 20"></path></svg>';
  const CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';

  /* 同义组来自 kd_data/syn_groups.json，构建时写入 js/syn-groups.js。 */
  const SYN = window.SYN_GROUPS || {};
  const SYN_GROUPS = Array.isArray(SYN.groups) ? SYN.groups : [];

  /* 字面搜索之外的常见语义近邻。同义组候选会优先于这里。 */
  const RELATED_TERMS = {
    "离子共存": ["离子反应", "离子方程式", "离子检验", "水溶液中的离子平衡"],
    "离子方程式": ["离子反应", "离子共存", "离子检验", "水溶液中的离子平衡"],
    "离子检验": ["离子反应", "离子方程式", "离子共存", "物质的检验"],
    "氧化还原": ["氧化还原反应", "氧化剂", "还原剂", "电子转移", "氧化还原滴定"],
    "化学平衡": ["化学反应速率", "平衡移动", "电离平衡", "水解平衡", "沉淀溶解平衡"],
    "电化学": ["原电池", "电解池", "电极反应", "电化学计算"],
    "有机": ["有机化学基础", "有机合成", "同分异构体", "官能团", "有机推断"],
    "物质结构": ["物质结构与性质", "原子结构", "分子结构", "晶体结构", "晶胞计算", "杂化轨道"],
    "化学实验": ["化学实验基础", "实验方案设计", "实验探究", "物质的分离与提纯", "滴定实验"],
    "化学工艺流程": ["工艺流程", "物质制备", "除杂", "条件控制"],
    "元素周期律": ["元素周期表", "原子半径", "电离能", "电负性"],
    "元素化合物": ["钠及其化合物", "铁及其化合物", "氮及其化合物", "硫及其化合物", "氯及其化合物"]
  };

  const cache = new Map();
  const PENDING = U.PENDING;

  function textOf(value) {
    return String(value == null ? "" : value)
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();
  }

  function fold(value) {
    return textOf(value).toLowerCase();
  }

  function hasLatin(value) {
    return /[A-Za-z]/.test(textOf(value));
  }

  function hasMixedLatinCase(value) {
    const text = textOf(value);
    return /[A-Z]/.test(text) && /[a-z]/.test(text);
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function numericNo(item) {
    return parseInt(item.n, 10) || 0;
  }

  function itemsOfYear(provKey, year) {
    const p = U.D.provinces[provKey];
    const y = p && p.years[year];
    if (!y) return [];
    return y.items.filter((it) => !(provKey === "浙江" && it.ses !== "6月选考"));
  }

  function allRecords(provKey, scope) {
    const keys = scope === "nation" ? U.D.order : [provKey];
    const out = [];
    keys.forEach((key) => {
      const p = U.D.provinces[key];
      if (!p) return;
      U.ALL_YEARS.forEach((year) => {
        itemsOfYear(key, year).forEach((it) => {
          out.push({ key, province: p.display, year, sess: it.ses || "", it });
        });
      });
    });
    return out;
  }

  /* 全国卷会在多个省份页重复收录同一道题，按题面内容合并，保留所有所属省份。 */
  function dedupe(records) {
    if (!records.length) return [];
    const seen = new Map();
    const out = [];
    records.forEach((r) => {
      const it = r.it;
      const id = [r.year, r.sess, it.t, it.n, it.tag, it.d].join("|");
      const hit = seen.get(id);
      if (hit) {
        if (hit.provinceNames.indexOf(r.province) < 0) hit.provinceNames.push(r.province);
        if (r.matchKind === "direct") hit.matchKind = "direct";
        r.relatedLabels.forEach((label) => {
          if (hit.relatedLabels.indexOf(label) < 0) hit.relatedLabels.push(label);
        });
        return;
      }
      const row = Object.assign({}, r, {
        provinceNames: [r.province],
        primaryKey: r.key,
        relatedLabels: (r.relatedLabels || []).slice()
      });
      seen.set(id, row);
      out.push(row);
    });
    out.sort((a, b) => String(b.year).localeCompare(String(a.year)) || numericNo(a.it) - numericNo(b.it));
    return out;
  }

  /*
   * 进组判定：中文保留原有的前缀 / 子串宽松匹配；拉丁词形按整词忽略大小写。
   * 化学式大小写有语义，混写（Na）不并入全大写缩写组（NA）。
   */
  function groupEntryScore(rawQuery, rawTerm) {
    const q = textOf(rawQuery);
    const term = textOf(rawTerm);
    if (!q || !term) return 0;
    if (hasLatin(q)) {
      if (fold(q) !== fold(term)) return 0;
      if (hasMixedLatinCase(q) && q !== term) return 0;
      return 1000 + Array.from(q).length + (q === term ? 20 : 0);
    }
    if (q === term) return 1000 + Array.from(term).length;
    if (term.indexOf(q) === 0) return 800 + Array.from(q).length * 4;
    if (term.indexOf(q) > 0) return 600 + Array.from(q).length * 3;
    if (q.indexOf(term) >= 0) return 400 + Array.from(term).length * 5;
    return 0;
  }

  /* 查询命中组名或 direct 词形时启用整组；优先精确、词首和较长词形。 */
  function pickSynGroup(normalizedQuery) {
    const q = textOf(normalizedQuery);
    if (Array.from(q).length < 2) return null;
    let best = null;
    SYN_GROUPS.forEach((group, index) => {
      if (!group || !Array.isArray(group.direct)) return;
      const forms = [{ term: group.label, kind: "label" }].concat(
        group.direct.map((term) => ({ term, kind: "direct" }))
      );
      forms.forEach((form) => {
        let score = groupEntryScore(q, form.term);
        if (!score) return;
        if (form.kind === "direct") score += 2;
        if (!best || score > best.score) best = { group, score, index };
      });
    });
    return best ? best.group : null;
  }

  function makeMatcher(query) {
    const normalized = textOf(query);
    const tokens = normalized.split(" ").filter(Boolean);
    const group = pickSynGroup(normalized);
    if (!group) {
      return {
        group: null,
        direct: unique(tokens),
        related: [],
        relatedLabels: [],
        tokens,
        highlight: unique(tokens)
      };
    }
    const direct = unique([normalized].concat(group.direct.map(textOf)));
    const relatedGroups = Array.isArray(group.related) ? group.related : [];
    const related = [];
    const relatedLabels = [];
    relatedGroups.forEach((rel) => {
      const label = String(rel && rel.label || "").trim();
      if (label) relatedLabels.push(label);
      (Array.isArray(rel && rel.terms) ? rel.terms : []).forEach((term) => related.push(textOf(term)));
    });
    return {
      group,
      direct: unique(direct),
      related: unique(related),
      relatedLabels: unique(relatedLabels),
      tokens,
      highlight: unique(direct.concat(related, tokens))
    };
  }

  /* 全大写缩写按独立词形匹配：NA 可命中“NA个”，但不能从 DNA / RNA 中被截出。 */
  function termHit(haystack, term) {
    if (!term) return false;
    if (/^[A-Z]{2,}$/.test(term)) {
      return new RegExp("(?<![A-Za-z])" + escapeRegExp(term) + "(?![A-Za-z])").test(haystack);
    }
    return haystack.indexOf(term) >= 0;
  }

  function relatedLabelsFor(item, matcher) {
    if (!matcher.group || !matcher.related.length) return [];
    const haystack = textOf((item.tag || "") + " " + (item.d || ""));
    const out = [];
    (matcher.group.related || []).forEach((rel) => {
      const terms = (Array.isArray(rel && rel.terms) ? rel.terms : []).map(textOf);
      if (terms.some((term) => termHit(haystack, term))) out.push(rel.label);
    });
    return unique(out);
  }

  function matchRecord(item, matcher) {
    const haystack = textOf((item.tag || "") + " " + (item.d || ""));
    if (!matcher.group) {
      if (!matcher.tokens.length || !matcher.tokens.every((token) => termHit(haystack, token))) return null;
      return { matchKind: "direct", relatedLabels: [] };
    }
    const directHit = matcher.direct.some((term) => termHit(haystack, term));
    if (directHit) return { matchKind: "direct", relatedLabels: relatedLabelsFor(item, matcher) };
    const relatedHit = matcher.related.some((term) => termHit(haystack, term));
    if (!relatedHit) return null;
    return { matchKind: "related", relatedLabels: relatedLabelsFor(item, matcher) };
  }

  function search(provKey, query, scope) {
    const q = textOf(query);
    if (!q) return [];
    const mode = scope === "nation" ? "nation" : "province";
    const matcher = makeMatcher(query);
    const cacheKey = [provKey, mode, q, matcher.group ? matcher.group.id : "literal"].join("::");
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const rows = [];
    allRecords(provKey, mode).forEach((record) => {
      const hit = matchRecord(record.it, matcher);
      if (!hit) return;
      rows.push(Object.assign({}, record, hit));
    });
    const result = dedupe(rows);
    cache.set(cacheKey, result);
    return result;
  }

  function bigrams(value) {
    const chars = Array.from(value);
    const out = [];
    for (let i = 0; i < chars.length - 1; i++) out.push(chars[i] + chars[i + 1]);
    return out;
  }

  function relationScore(term, normalizedQuery) {
    const t = textOf(term);
    const q = textOf(normalizedQuery);
    if (!t || !q || t === q || t.length < 2) return 0;
    if (t.indexOf(q) >= 0 || q.indexOf(t) >= 0) return 80;
    const qGrams = bigrams(q);
    const tSet = new Set(bigrams(t));
    const shared = qGrams.filter((g) => tSet.has(g)).length;
    if (!shared) return 0;
    return 24 + shared * 8 + Math.min(16, Math.round((shared / Math.max(qGrams.length, 1)) * 16));
  }

  /* 同义组词形作为高优先级相近词候选；0 命中时可按实际命中数直接进入。 */
  function synCandidates(normalizedQuery, matcher) {
    const q = fold(normalizedQuery);
    const rawQuery = textOf(normalizedQuery);
    const terms = new Map();
    const add = (term, score) => {
      const raw = String(term || "").trim();
      const key = fold(raw);
      if (!key || key === q || raw.length < 2) return;
      const prev = terms.get(key);
      if (!prev || score > prev.score) terms.set(key, { term: raw, score });
    };
    if (matcher.group) {
      matcher.group.direct.forEach((term, i) => add(term, 360 - i * 3));
      (matcher.group.related || []).forEach((rel) => {
        (Array.isArray(rel && rel.terms) ? rel.terms : []).forEach((term, i) => add(term, 330 - i * 3));
      });
      return terms;
    }
    SYN_GROUPS.forEach((group) => {
      const allForms = [group.label].concat(group.direct || [], (group.related || []).reduce((acc, rel) => acc.concat(rel.terms || []), []));
      const touched = allForms.some((term) => groupEntryScore(rawQuery, term) > 0);
      if (!touched) return;
      const sharesQuery = (term) => groupEntryScore(rawQuery, term) > 0;
      (group.direct || []).forEach((term, i) => add(term, (sharesQuery(term) ? 360 : 300) - i * 2));
      (group.related || []).forEach((rel) => {
        (Array.isArray(rel && rel.terms) ? rel.terms : []).forEach((term, i) => add(term, (sharesQuery(term) ? 350 : 290) - i * 2));
      });
    });
    return terms;
  }

  function relatedTerms(provKey, query, scope) {
    const q = fold(query);
    if (!q) return [];
    const mode = scope === "nation" ? "nation" : "province";
    const matcher = makeMatcher(query);
    const scores = new Map();
    const add = (term, score, syn) => {
      const raw = String(term || "").trim();
      if (!raw) return;
      const prev = scores.get(raw);
      if (!prev || score > prev.score) scores.set(raw, { score, syn: !!syn });
    };

    synCandidates(query, matcher).forEach((entry) => add(entry.term, entry.score, true));
    Object.keys(RELATED_TERMS).forEach((key) => {
      const k = fold(key);
      if (k.indexOf(q) < 0 && q.indexOf(k) < 0) return;
      RELATED_TERMS[key].forEach((term, i) => add(term, 200 - i * 4, false));
    });

    const keys = mode === "nation" ? U.D.order : [provKey];
    keys.forEach((key) => {
      U.ALL_YEARS.forEach((year) => {
        itemsOfYear(key, year).forEach((it) => {
          const term = String(it.tag || "").trim();
          if (!term || term.length > 12 || /[—\/／]/.test(term) || scores.has(term)) return;
          const score = relationScore(term, query);
          if (score > 0) add(term, score, false);
        });
      });
    });

    const rows = [];
    scores.forEach((meta, term) => {
      const count = search(provKey, term, mode).length;
      if (count > 0) rows.push({ term, count, score: meta.score, syn: meta.syn });
    });
    rows.sort((a, b) => b.score - a.score || b.count - a.count || a.term.localeCompare(b.term, "zh-CN"));
    return rows.slice(0, 6);
  }

  function searchHTML(p, state) {
    const scope = state.kdScope === "nation" ? "nation" : "province";
    const query = state.kdQuery || "";
    return '<div class="kd-tools">' +
      '<form class="kd-search" id="kd-search-form" role="search" autocomplete="off">' +
        '<span class="kd-search-icon" aria-hidden="true">' + SEARCH_ICON + '</span>' +
        '<input id="kd-input" type="text" inputmode="search" enterkeyhint="search" spellcheck="false"' +
          ' value="' + U.esc(query) + '" placeholder="搜索关键字，如配位"' +
          ' aria-label="搜索考点关键词" aria-controls="kd-results-slot">' +
        '<button class="kd-clear" type="button" data-action="kdClear" aria-label="清除考点搜索"' +
          (query.trim() ? "" : " hidden") + '>' + CLOSE_ICON + '</button>' +
        '<span class="kd-scope" role="group" aria-label="搜索范围">' +
          '<button type="button" data-action="kdScope" data-scope="province" aria-pressed="' + (scope === "province") + '"' +
            ' class="' + (scope === "province" ? "is-active" : "") + '">本省</button>' +
          '<button type="button" data-action="kdScope" data-scope="nation" aria-pressed="' + (scope === "nation") + '"' +
            ' class="' + (scope === "nation" ? "is-active" : "") + '">全国</button>' +
        '</span>' +
      '</form>' +
    '</div>';
  }

  function sourceButton(row) {
    if (!V.sourceBtnHTML) {
      return '<button class="qbtn" type="button" data-action="openSource" data-qkey="' +
        U.esc(U.sourceKey(row.primaryKey, row.year, row.it.ses, row.it.n)) + '" aria-haspopup="dialog">原题</button>';
    }
    return V.sourceBtnHTML(row.it, row.year, { key: row.primaryKey }, row.primaryKey);
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightHTML(value, terms) {
    const text = String(value == null ? "" : value);
    const words = unique((terms || []).map((term) => String(term || "").trim()).filter((term) => term.length > 0))
      .sort((a, b) => b.length - a.length);
    if (!text || !words.length) return U.esc(text);
    const pattern = words.map((term) => /^[A-Z]{2,}$/.test(term)
      ? "(?<![A-Za-z])" + escapeRegExp(term) + "(?![A-Za-z])"
      : escapeRegExp(term)).join("|");
    const re = new RegExp(pattern, "g");
    let out = "";
    let last = 0;
    let match;
    while ((match = re.exec(text))) {
      if (!match[0]) {
        re.lastIndex += 1;
        continue;
      }
      out += U.esc(text.slice(last, match.index)) +
        '<mark class="kd-hl">' + U.esc(match[0]) + '</mark>';
      last = match.index + match[0].length;
    }
    return out + U.esc(text.slice(last));
  }

  function entryHTML(row, scope, matcher) {
    const it = row.it;
    const pending = it.m === PENDING;
    const lv = U.levelOf(it.lv);
    const color = pending ? U.colorOf(PENDING) : U.colorOf(it.m);
    const province = row.provinceNames.join(" / ");
    const score = it.s == null ? "分值未拆" : it.s + " 分";
    const relBadge = row.matchKind === "related"
      ? '<span class="kd-rel-badge" title="由同义组的关联词命中">关联</span>'
      : "";
    return '<article class="kd-entry' + (pending ? " is-pending" : "") + (row.matchKind === "related" ? " is-related" : "") + '">' +
      '<div class="kd-entry-no" aria-hidden="true"><span>Q</span><b>' + U.esc(it.n) + '</b></div>' +
      '<div class="kd-entry-main">' +
        '<div class="kd-entry-meta">' +
          '<span class="kd-prov' + (scope === "nation" ? " is-nation" : "") + '">' + U.esc(province) + '</span>' +
          (it.ses ? '<span class="kd-ses">' + U.esc(it.ses) + '</span>' : "") +
          '<span>' + U.esc(it.t || "题型未标") + '</span>' +
          '<span class="kd-score">' + U.esc(score) + '</span>' +
          '<span class="lv lv-' + (pending ? "none" : lv.cls) + '">' + U.esc(pending ? "未定级" : lv.k) + '</span>' +
          relBadge +
        '</div>' +
        '<div class="kd-tagrow" style="--c:' + color + '"><i></i><span class="kd-k">考点</span>' +
          '<b>' + (pending ? "题面未收录" : highlightHTML(it.tag || "未标注", matcher.highlight)) + '</b></div>' +
        '<p class="kd-detail"><span class="kd-k">详细考点</span>' +
          highlightHTML(it.d || "暂无详细考点描述", matcher.highlight) + '</p>' +
      '</div>' +
      '<div class="kd-entry-rail">' + sourceButton(row) + '</div>' +
    '</article>';
  }

  function relatedHTML(rows, scope) {
    if (!rows.length) return "";
    return '<div class="kd-related">' +
      '<div class="kd-related-head"><span>相近考点</span><span>' +
        (scope === "nation" ? "全国命中" : "本省命中") + '</span></div>' +
      '<div class="kd-related-list">' +
        rows.map((row) =>
          '<button class="kd-related-chip' + (row.syn ? " is-syn" : "") + '" type="button" data-action="kdSearchTerm"' +
            ' data-term="' + U.esc(row.term) + '" data-scope="' + scope + '">' +
            U.esc(row.term) + '<b>' + row.count + '</b>' +
            (row.syn ? '<span class="kd-chip-syn">同义</span>' : "") +
          '</button>'
        ).join("") +
      '</div>' +
    '</div>';
  }

  function synHTML(matcher, directCount, relatedCount, filterActive) {
    if (!matcher.group) return "";
    const relatedLabels = (matcher.group.related || []).map((rel) => rel.label).filter(Boolean);
    const meta = matcher.group.direct.length + ' 个直接词形' +
      (relatedLabels.length ? ' · 关联 ' + relatedLabels.join(" / ") : '');
    const canFilter = directCount > 0 && relatedCount > 0;
    return '<div class="kd-syn">' +
      '<span class="kd-syn-tag">同义组</span>' +
      '<b>' + U.esc(matcher.group.label) + '</b>' +
      '<span class="kd-syn-meta">' + U.esc(meta) + '</span>' +
      (relatedCount ? '<span class="kd-syn-related">关联命中 ' + relatedCount + '</span>' : "") +
      (canFilter
        ? '<button class="kd-syn-filter' + (filterActive ? " is-active" : "") + '" type="button" data-action="kdDirectOnly"' +
            ' aria-pressed="' + filterActive + '">' +
            (filterActive ? "显示全部" : "只看直接命中") + '</button>'
        : "") +
    '</div>';
  }

  function resultsHTML(p, state) {
    const query = String(state.kdQuery || "").trim();
    if (!query) return "";
    const scope = state.kdScope === "nation" ? "nation" : "province";
    const matcher = makeMatcher(query);
    const localRows = search(p.key, query, "province");
    const nationRows = search(p.key, query, "nation");
    const activeRows = scope === "nation" ? nationRows : localRows;
    const relatedCount = activeRows.filter((row) => row.matchKind === "related").length;
    const directCount = activeRows.length - relatedCount;
    const filterActive = !!state.kdDirectOnly && directCount > 0 && relatedCount > 0;
    const activeShown = filterActive ? activeRows.filter((row) => row.matchKind === "direct") : activeRows;
    const nationShown = filterActive ? nationRows.filter((row) => row.matchKind === "direct") : nationRows;

    let relatedScope = scope;
    let related = relatedTerms(p.key, query, scope);
    if (!related.length && scope === "province") {
      related = relatedTerms(p.key, query, "nation");
      relatedScope = "nation";
    }

    const years = U.ALL_YEARS.slice().reverse();
    const groups = years.map((year) => ({
      year,
      rows: activeShown.filter((row) => row.year === year)
    })).filter((group) => group.rows.length);

    const scopeLabel = scope === "nation" ? "全国 · 近五年" : p.display + " · 近五年";
    const alternate = scope === "province" && nationShown.length > activeShown.length
      ? '<span class="kd-alt">全国 ' + nationShown.length + '</span>'
      : "";

    let body = "";
    if (!activeShown.length) {
      const jump = scope === "province" && nationShown.length
        ? '<button class="kd-jump" type="button" data-action="kdScope" data-scope="nation">' +
            '全国有 <b>' + nationShown.length + '</b> 条，查看全国结果' +
            '<span aria-hidden="true">→</span></button>'
        : '<p class="kd-empty-note">换个更短的关键词试试，或从下面的相近考点进入。</p>';
      const caseHint = hasLatin(query)
        ? '<p class="kd-empty-note kd-case-note">尝试调整大小写（如 Na 是钠、NA 是阿伏加德罗常数）</p>'
        : "";
      body = '<div class="kd-empty">' +
        '<p class="kd-empty-title">' +
          (scope === "nation" ? "全国近五年没有命中“" : "本省近五年没有命中“") + U.esc(query) + '”' +
        '</p>' + jump + caseHint +
      '</div>' + relatedHTML(related, relatedScope);
    } else {
      body = groups.map((group) =>
        '<section class="kd-group" aria-label="' + group.year + ' 年">' +
          '<div class="kd-group-head"><b>' + group.year + '</b><span>' + group.rows.length + ' 题</span></div>' +
          group.rows.map((row) => entryHTML(row, scope, matcher)).join("") +
        '</section>'
      ).join("") +
      '<p class="kd-foot">在「考点 / 详细考点」原文中匹配，拉丁字母区分大小写，中文不受影响；' +
        (matcher.group
          ? '已启用「' + U.esc(matcher.group.label) + '」同义组，直接词形互为同义召回，关联词命中标「关联」并可只看直接命中；'
          : '支持常见考点同义词组与关联词扩展；') +
        (scope === "nation" ? "同一道共用卷题目已合并" : "浙江仅检索 6 月选考") +
        '。搜索固定覆盖 ' + U.YEAR_RANGE + '，不受上方年份切换影响。</p>';
    }

    return '<section class="kd-results" id="kd-results" aria-labelledby="kd-res-title">' +
      '<div class="kd-res-head">' +
        '<div class="kd-res-heading">' +
          '<p class="kd-res-kicker">考点检索</p>' +
          '<h3 class="kd-res-title" id="kd-res-title">“' + U.esc(query) + '”' +
            '<span class="kd-res-count"><b>' + activeShown.length + '</b> 条' +
              (filterActive ? ' · 仅直接' : "") + '</span></h3>' +
        '</div>' +
        '<div class="kd-res-meta"><span>' + U.esc(scopeLabel) + '</span>' + alternate + '</div>' +
      '</div>' +
      synHTML(matcher, directCount, relatedCount, filterActive) +
      '<div class="kd-res-body">' + body + '</div>' +
    '</section>';
  }

  window.KD = {
    searchHTML,
    resultsHTML,
    search,
    relatedTerms,
    pickSynGroup
  };
})();
