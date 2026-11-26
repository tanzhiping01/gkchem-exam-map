/* 模考参考库：联考化学有效分、赋分对照与单科线的资料索引 */
(function () {
  const DATA = window.MOCKREF || { meta: {}, exams: [] };
  const esc = window.U.esc;

  const TYPE = {
    mapping: { label: "赋分对照", desc: "赋分 → 原始分" },
    lines: { label: "单科有效分", desc: "按批次折算的单科线" },
    grade_lines: { label: "学科等级线", desc: "A / C 等级参考线" },
    avg: { label: "单科均分", desc: "该场化学平均分" },
    none: { label: "仅总分线", desc: "未公布化学单科" }
  };

  const FILTERS = [
    { key: "all", label: "全部" },
    { key: "mapping", label: "赋分对照" },
    { key: "lines", label: "有效分线" },
    { key: "grade_lines", label: "等级线" },
    { key: "avg", label: "均分" },
    { key: "none", label: "仅总分" }
  ];

  const sortedExams = DATA.exams.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  let state = { filter: "all", province: "all" };
  let rootEl = null;

  function provinceOf(exam) {
    const region = String(exam.region || "").trim();
    return region.split(/[·（(]/)[0].trim() || "未标注";
  }

  const PROVINCES = (function () {
    const seen = {};
    sortedExams.forEach(function (exam) {
      const province = provinceOf(exam);
      seen[province] = (seen[province] || 0) + 1;
    });
    return Object.keys(seen).sort(function (a, b) {
      return a.localeCompare(b, "zh-Hans-CN");
    }).map(function (name) {
      return { name: name, count: seen[name] };
    });
  })();

  function typeOf(exam) {
    return exam.chem && exam.chem.type ? exam.chem.type : "none";
  }

  function typeMeta(exam) {
    return TYPE[typeOf(exam)] || TYPE.none;
  }

  function fmt(value) {
    return value == null || value === "" ? "—" : String(value);
  }

  function fmtDate(date) {
    return String(date || "").replace("-", ".");
  }

  function linkify(text) {
    return esc(text).replace(/(https?:\/\/[^\s；]+)/g, function (url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + "</a>";
    });
  }

  function sparkHTML(mapping) {
    if (!mapping || mapping.length < 2) return "";
    const sorted = mapping.slice().sort((a, b) => b[0] - a[0]);
    const grades = sorted.map((pt) => Number(pt[0]));
    const raws = sorted.map((pt) => Number(pt[1]));
    const gMin = Math.min.apply(null, grades);
    const gMax = Math.max.apply(null, grades);
    const rMin = Math.min.apply(null, raws);
    const rMax = Math.max.apply(null, raws);
    const gSpan = gMax - gMin || 1;
    const rSpan = rMax - rMin || 1;
    const points = sorted.map((pt) => {
      const x = 4 + ((gMax - Number(pt[0])) / gSpan) * 292;
      const y = 5 + ((rMax - Number(pt[1])) / rSpan) * 44;
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    const area = "M4,49 L" + points.join(" L") + " L296,49 Z";
    return '<svg class="mk-spark" viewBox="0 0 300 54" preserveAspectRatio="none" aria-hidden="true">' +
      '<line x1="4" y1="5" x2="296" y2="5"></line>' +
      '<line x1="4" y1="27" x2="296" y2="27"></line>' +
      '<line x1="4" y1="49" x2="296" y2="49"></line>' +
      '<path d="' + area + '" class="mk-spark-area"></path>' +
      '<polyline points="' + points.join(" ") + '" class="mk-spark-line" vector-effect="non-scaling-stroke"></polyline>' +
    "</svg>";
  }

  function mappingHTML(chem) {
    const sorted = chem.mapping.slice().sort((a, b) => b[0] - a[0]);
    const first = sorted[0];
    const mid = sorted[Math.floor(sorted.length / 2)];
    const last = sorted[sorted.length - 1];
    const anchors = [
      ["最高档", first],
      ["中位档", mid],
      ["最低档", last]
    ].map((item) => '<div class="mk-pt"><span class="mk-pt-k">' + item[0] + "</span>" +
      '<span class="mk-pt-v">赋 <b>' + esc(item[1][0]) + "</b><i>→</i>原 <b>" + esc(item[1][1]) + "</b></span></div>"
    ).join("");

    const rows = sorted.map((pt) =>
      "<tr><td>" + esc(pt[0]) + '</td><td class="mk-raw">' + esc(pt[1]) + "</td></tr>"
    ).join("");

    return '<div class="mk-map">' +
        '<div class="mk-map-top"><div class="mk-map-pts">' + anchors + "</div>" + sparkHTML(sorted) + "</div>" +
        '<details class="mk-details">' +
          "<summary><span>完整赋分对照</span><span>" + sorted.length + " 档</span></summary>" +
          '<div class="mk-table-scroll" tabindex="0">' +
            '<table class="mk-map-table"><caption class="sr-only">' + esc(typeMeta({ chem: chem }).label) + "完整对照表</caption>" +
              '<thead><tr><th scope="col">赋分</th><th scope="col">原始分</th></tr></thead>' +
              "<tbody>" + rows + "</tbody>" +
            "</table>" +
          "</div>" +
        "</details>" +
      "</div>";
  }

  function isRawGrade(value) {
    return value && typeof value === "object" && !Array.isArray(value) &&
      ("原始分" in value || "赋分" in value);
  }

  function linesHTML(exam) {
    const chem = exam.chem;
    const totals = exam.lines || {};
    const dirs = Object.keys(chem).filter((key) => key !== "type");
    const flat = dirs.every(function (key) {
      return typeof chem[key] !== "object" || chem[key] === null || isRawGrade(chem[key]);
    });

    if (flat) {
      const totalValues = totals["总分"] || {};
      const rawMode = dirs.some(function (key) { return isRawGrade(chem[key]); });
      const rows = dirs.map(function (key) {
        const value = chem[key];
        const raw = isRawGrade(value) ? value["原始分"] : value;
        const grade = isRawGrade(value) ? value["赋分"] : value;
        return "<tr><th scope=\"row\">" + esc(key) + "</th>" +
          (rawMode ? '<td class="mk-line-raw">' + esc(fmt(raw)) + "</td>" : "") +
          '<td class="mk-line-score"><b>' + esc(fmt(grade)) + "</b></td>" +
          '<td class="mk-line-total">' + esc(fmt(totalValues[key])) + "</td></tr>";
      }).join("");
      return '<div class="mk-line-grid mk-line-grid--flat">' +
        '<section class="mk-line-col" aria-label="化学单科有效分">' +
          "<h4>化学单科有效分</h4>" +
          '<table class="mk-line-table"><thead><tr><th scope="col">批次</th>' +
            (rawMode ? '<th scope="col">原始分</th><th scope="col">赋分</th>' : '<th scope="col">化学</th>') +
            '<th scope="col">总分</th></tr></thead>' +
            "<tbody>" + rows + "</tbody></table>" +
        "</section>" +
      "</div>";
    }

    return '<div class="mk-line-grid">' + dirs.map(function (dir) {
      const values = chem[dir] || {};
      const totalValues = totals[dir] || {};
      const rows = Object.keys(values).map((key) =>
        "<tr><th scope=\"row\">" + esc(key) + "</th>" +
          '<td class="mk-line-score"><b>' + esc(fmt(values[key])) + "</b></td>" +
          '<td class="mk-line-total">' + esc(fmt(totalValues[key])) + "</td></tr>"
      ).join("");
      return '<section class="mk-line-col" aria-label="' + esc(dir) + '">' +
        "<h4>" + esc(dir) + "</h4>" +
        '<table class="mk-line-table"><thead><tr><th scope="col">批次</th><th scope="col">化学</th><th scope="col">总分</th></tr></thead>' +
        "<tbody>" + rows + "</tbody></table>" +
      "</section>";
    }).join("") + "</div>";
  }

  function gradeHTML(chem) {
    const keys = Object.keys(chem).filter((key) => key !== "type");
    return '<div class="mk-grade-grid">' + keys.map((key) =>
      '<div class="mk-grade"><span>' + esc(key) + "</span><b>" + esc(fmt(chem[key])) + "</b><em>分</em></div>"
    ).join("") + "</div>";
  }

  function avgHTML(chem) {
    return '<div class="mk-avg"><div class="mk-avg-main"><b>' + esc(fmt(chem["均分"])) +
      '</b><span>分</span></div><p>该场化学单科平均分</p></div>';
  }

  function noneHTML(exam) {
    const lines = exam.lines || {};
    const dirs = Object.keys(lines).filter(function (key) {
      return lines[key] && typeof lines[key] === "object" && key !== "总分" && key !== "位次参考";
    });
    if (!dirs.length && lines["总分"] && typeof lines["总分"] === "object") dirs.push("总分");
    const totals = dirs.map(function (dir) {
      const values = lines[dir] || {};
      const parts = Object.keys(values).map((key) =>
        '<span><em>' + esc(key) + "</em><b>" + esc(fmt(values[key])) + "</b></span>"
      ).join("");
      return '<div class="mk-total-line"><span class="mk-total-dir">' + esc(dir) + "</span>" + parts + "</div>";
    }).join("");
    return '<div class="mk-none">' +
      '<div class="mk-none-head"><b>化学单科数据未公布</b><span>本场仅公布总分线</span></div>' +
      (totals ? '<div class="mk-total-lines">' + totals + "</div>" : "") +
    "</div>";
  }

  function bodyHTML(exam) {
    const type = typeOf(exam);
    if (type === "mapping") return mappingHTML(exam.chem);
    if (type === "lines") return linesHTML(exam);
    if (type === "grade_lines") return gradeHTML(exam.chem);
    if (type === "avg") return avgHTML(exam.chem);
    return noneHTML(exam);
  }

  function sourcesHTML(exam) {
    const sources = exam.sources || [];
    if (!sources.length) return "";
    return '<details class="mk-sources">' +
      "<summary><span>数据来源</span><span>" + sources.length + " 条</span></summary>" +
      "<ul>" + sources.map((source) => "<li>" + linkify(source) + "</li>").join("") + "</ul>" +
    "</details>";
  }

  function noteHTML(exam) {
    if (!exam.note) return "";
    return '<p class="mk-note"><span>说明</span>' + esc(exam.note) + "</p>";
  }

  function cardHTML(exam, index) {
    const type = typeOf(exam);
    const meta = typeMeta(exam);
    return '<article class="mk-card mk-card--' + type + '">' +
      '<div class="mk-no" aria-hidden="true">' + String(index + 1).padStart(2, "0") + "</div>" +
      '<div class="mk-card-main">' +
        '<div class="mk-card-top">' +
          '<span class="mk-badge">' + esc(meta.label) + "</span>" +
          '<span class="mk-origin">' + esc(exam.region) + " · " + esc(exam.cohort) + " · " + esc(fmtDate(exam.date)) + "</span>" +
        "</div>" +
        '<h3 class="mk-title">' + esc(exam.name) + "</h3>" +
        '<p class="mk-scope"><span>口径</span>' + esc(exam.scope) + "</p>" +
        '<div class="mk-body">' + bodyHTML(exam) + "</div>" +
        noteHTML(exam) +
        sourcesHTML(exam) +
      "</div>" +
    "</article>";
  }

  function counts() {
    const result = { all: sortedExams.length };
    sortedExams.forEach(function (exam) {
      const type = typeOf(exam);
      result[type] = (result[type] || 0) + 1;
    });
    return result;
  }

  function toolbarHTML() {
    const numbers = counts();
    return '<div class="mk-filter-stack">' +
      '<div class="mk-filter-row">' +
        '<span class="mk-filter-label">口径</span>' +
        '<div class="mk-filters" role="group" aria-label="按化学数据口径筛选">' +
          FILTERS.map(function (item) {
            const count = item.key === "all" ? numbers.all : (numbers[item.key] || 0);
            return '<button type="button" class="mk-filter" data-mk-filter="' + item.key + '"' +
              ' aria-pressed="' + (state.filter === item.key) + '">' +
              item.label + "<span>" + count + "</span></button>";
          }).join("") +
        "</div>" +
      "</div>" +
      '<div class="mk-filter-row">' +
        '<span class="mk-filter-label">省份</span>' +
        '<div class="mk-filters mk-province-filters" role="group" aria-label="按省份筛选">' +
          '<button type="button" class="mk-filter" data-mk-province="all"' +
            ' aria-pressed="' + (state.province === "all") + '">全部<span>' + sortedExams.length + "</span></button>" +
          PROVINCES.map(function (item) {
            return '<button type="button" class="mk-filter" data-mk-province="' + esc(item.name) + '"' +
              ' aria-pressed="' + (state.province === item.name) + '">' +
              esc(item.name) + "<span>" + item.count + "</span></button>";
          }).join("") +
        "</div>" +
      "</div>" +
    "</div>" +
    '<p class="mk-sort">按考试时间由近及远</p>';
  }

  function listHTML() {
    const filtered = sortedExams.filter(function (exam) {
      const typeMatch = state.filter === "all" || typeOf(exam) === state.filter;
      const provinceMatch = state.province === "all" || provinceOf(exam) === state.province;
      return typeMatch && provinceMatch;
    });
    const typeLabel = state.filter === "all" ? "" : (FILTERS.filter(function (item) {
      return item.key === state.filter;
    })[0] || {}).label;
    const activeLabels = [state.province !== "all" ? state.province : "", typeLabel || ""].filter(Boolean);
    const hasFilter = activeLabels.length > 0;
    return '<div class="mk-list-head" aria-live="polite"><span>' +
      (hasFilter ? "筛选出 " + filtered.length + " 场" : "全部 " + filtered.length + " 场") +
      "</span><span>" + (hasFilter ? esc(activeLabels.join(" · ")) : "化学单科 · 100 分制") + "</span></div>" +
      (filtered.length
        ? filtered.map(function (exam) {
            return cardHTML(exam, sortedExams.indexOf(exam));
          }).join("")
        : '<div class="mk-empty"><b>该组合暂无条目</b><p>试试切换省份或口径，或清除筛选查看全部 ' + sortedExams.length + ' 场。</p>' +
          '<button class="mk-reset" type="button" data-mk-reset>清除筛选</button></div>');
  }

  function paint() {
    const toolbar = rootEl.querySelector("#mockref-toolbar");
    const list = rootEl.querySelector("#mockref-list");
    if (toolbar) toolbar.innerHTML = toolbarHTML();
    if (list) list.innerHTML = listHTML();
  }

  function mount(el) {
    if (!el) return;
    rootEl = el;
    rootEl.innerHTML = '<div class="mk-toolbar" id="mockref-toolbar"></div>' +
      '<div class="mk-list" id="mockref-list"></div>';
    rootEl.addEventListener("click", function (event) {
      const typeButton = event.target.closest("[data-mk-filter]");
      if (typeButton) {
        const next = typeButton.getAttribute("data-mk-filter");
        if (!next || next === state.filter) return;
        state.filter = next;
        paint();
        const active = rootEl.querySelector('[data-mk-filter="' + next + '"]');
        if (active && active.focus) active.focus();
        return;
      }

      const provinceButton = event.target.closest("[data-mk-province]");
      if (provinceButton) {
        const next = provinceButton.getAttribute("data-mk-province");
        if (!next || next === state.province) return;
        state.province = next;
        paint();
        const active = rootEl.querySelector('[data-mk-province="' + next + '"]');
        if (active && active.focus) active.focus();
        return;
      }

      const reset = event.target.closest("[data-mk-reset]");
      if (!reset) return;
      state.filter = "all";
      state.province = "all";
      paint();
      const allTypes = rootEl.querySelector('[data-mk-filter="all"]');
      if (allTypes && allTypes.focus) allTypes.focus();
    });
    paint();
  }

  window.MOCKREF_VIEW = { mount: mount };
})();
