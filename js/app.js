/* 应用状态、路由与交互 */
(function () {
  const U = window.U;
  const V = window.VIEWS;
  const D = U.D;
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const modalEl = document.getElementById("source-modal");
  const LS_KEY = "chem-exam:last-province";

  const state = {
    view: "home",
    key: null,
    year: null,
    sess: null,
    basis: "score",
    expanded: {},
    showAll: false,
    open: {},
    allOpen: false,
    q: "",
    activeIdx: -1,
    matches: [],
    kdQuery: "",
    kdScope: "province",
    kdDirectOnly: false,
    modal: null
  };

  let modalReturnFocus = null;
  let lightboxReturnFocus = null;
  let lightboxViewer = null;
  let kdInputTimer = null;

  let toastTimer = null;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), 2200);
  }

  function defaultSession(p, year) {
    const labels = U.sessionsOf(p, year);
    return labels.length ? labels[0] : null;
  }

  function setMeta(p) {
    document.title = p
      ? p.display + " 高考化学考点分布 · " + U.YEAR_RANGE
      : "高考化学考点分布 · 各省独立命题卷 " + U.YEAR_RANGE;
  }

  function render(opts) {
    const keepScroll = opts && opts.keepScroll;
    const y = keepScroll ? window.scrollY : 0;
    if (state.view === "result") {
      app.innerHTML = V.resultView(state);
    } else if (state.view === "fufen") {
      app.innerHTML = V.fufenView();
      if (window.FUFEN_VIEW) window.FUFEN_VIEW.mount(document.getElementById("fufen-root"));
    } else if (state.view === "mockref") {
      app.innerHTML = V.mockrefView();
      if (window.MOCKREF_VIEW) window.MOCKREF_VIEW.mount(document.getElementById("mockref-root"));
    } else {
      app.innerHTML = V.homeView();
      bindHome();
    }
    if (keepScroll) window.scrollTo(0, y);
    else window.scrollTo(0, 0);
  }

  /* ---------- 首页搜索 ---------- */
  function updateSuggest() {
    const box = document.getElementById("suggest");
    if (!box) return;
    const q = state.q.trim();
    if (!q) {
      box.hidden = true;
      box.innerHTML = "";
      state.matches = [];
      state.activeIdx = -1;
      return;
    }
    state.matches = U.searchProvinces(q).slice(0, 6);
    box.innerHTML = V.suggestionList(state.matches);
    box.hidden = false;
    state.activeIdx = state.matches.length ? 0 : -1;
    paintActive();
  }

  function paintActive() {
    const box = document.getElementById("suggest");
    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll("button"), (b, i) => {
      b.classList.toggle("is-active", i === state.activeIdx);
    });
  }

  function bindHome() {
    const input = document.getElementById("province-input");
    const form = document.getElementById("search-form");
    const slot = document.getElementById("last-visit-slot");
    if (!input || !form) return;

    if (state.q) input.value = state.q;

    const last = readLast();
    if (last && D.provinces[last] && slot) {
      const p = D.provinces[last];
      slot.innerHTML = '<button class="last-visit" type="button" data-action="openProvince" data-key="' +
        U.esc(last) + '">上次查看 ' + U.esc(p.display) + " →</button>";
    }

    input.addEventListener("input", () => {
      state.q = input.value;
      updateSuggest();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!state.matches.length) return;
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        const n = state.matches.length;
        state.activeIdx = (state.activeIdx + step + n) % n;
        paintActive();
      } else if (e.key === "Escape") {
        const box = document.getElementById("suggest");
        if (box) box.hidden = true;
      }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) {
        input.focus();
        return;
      }
      const matches = U.searchProvinces(q);
      state.matches = matches.slice(0, 6);
      if (state.activeIdx >= 0 && state.matches[state.activeIdx] && q === state.q) {
        openProvince(state.matches[state.activeIdx].key);
      } else if (matches.length) {
        openProvince(matches[0].key);
      } else {
        state.q = q;
        updateSuggest();
        toast("没有匹配的省份，试试输入「浙江」或「粤」");
      }
    });

    if (state.q) {
      updateSuggest();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  /* ---------- 省份详情页：考点检索 ---------- */
  function syncKdResults() {
    const p = state.key ? D.provinces[state.key] : null;
    const slot = document.getElementById("kd-results-slot");
    if (!slot || !p || !window.KD) return;
    slot.innerHTML = window.KD.resultsHTML(p, state);
    const clear = document.querySelector('[data-action="kdClear"]');
    if (clear) clear.hidden = !String(state.kdQuery || "").trim();
  }

  app.addEventListener("input", (e) => {
    if (!e.target || e.target.id !== "kd-input") return;
    state.kdQuery = e.target.value;
    state.kdDirectOnly = false;
    const clear = document.querySelector('[data-action="kdClear"]');
    if (clear) clear.hidden = !String(state.kdQuery || "").trim();
    clearTimeout(kdInputTimer);
    kdInputTimer = setTimeout(syncKdResults, 140);
  });

  app.addEventListener("submit", (e) => {
    if (!e.target || e.target.id !== "kd-search-form") return;
    e.preventDefault();
    const input = e.target.querySelector("#kd-input");
    if (input) state.kdQuery = input.value;
    clearTimeout(kdInputTimer);
    syncKdResults();
  });

  app.addEventListener("keydown", (e) => {
    if (!e.target || e.target.id !== "kd-input" || e.key !== "Escape") return;
    state.kdQuery = "";
    state.kdDirectOnly = false;
    e.target.value = "";
    syncKdResults();
    e.target.focus({ preventScroll: true });
  });

  document.addEventListener("click", (e) => {
    const form = document.getElementById("search-form");
    if (form && !form.contains(e.target)) {
      const box = document.getElementById("suggest");
      if (box) box.hidden = true;
    }
    const bulletin = document.querySelector(".bulletin[open]");
    if (bulletin && !bulletin.contains(e.target)) bulletin.open = false;
  });

  /* ---------- 路由 ---------- */
  function hashValue() {
    let raw = (location.hash || "").replace(/^#\/?/, "");
    try { raw = decodeURIComponent(raw); } catch (err) { /* 保留原始值 */ }
    return raw;
  }

  function keyFromHash() {
    const raw = hashValue();
    return D.provinces[raw] ? raw : null;
  }

  function openFufen(push) {
    closeSource({ restore: false });
    state.view = "fufen";
    state.key = null;
    state.q = "";
    document.title = "赋分速查 · 高考化学考点分布";
    if (push !== false && location.hash !== "#fufen") {
      history.pushState({ view: "fufen" }, "", "#fufen");
    }
    render();
  }

  function openMockref(push) {
    closeSource({ restore: false });
    state.view = "mockref";
    state.key = null;
    state.q = "";
    document.title = "模考参考库 · 高考化学考点分布";
    if (push !== false && location.hash !== "#mock") {
      history.pushState({ view: "mockref" }, "", "#mock");
    }
    render();
  }

  function openProvince(key, push) {
    const p = D.provinces[key];
    if (!p) return;
    closeSource({ restore: false });
    state.view = "result";
    state.key = key;
    state.year = U.defaultYear(p);
    state.sess = defaultSession(p, state.year);
    state.basis = "score";
    state.expanded = {};
    state.showAll = false;
    state.open = {};
    state.allOpen = false;
    state.q = "";
    state.kdQuery = "";
    state.kdScope = "province";
    state.kdDirectOnly = false;
    writeLast(key);
    setMeta(p);
    if (push !== false && location.hash !== "#" + encodeURIComponent(key)) {
      history.pushState({ key }, "", "#" + encodeURIComponent(key));
    }
    render();
  }

  function goHome(push) {
    closeSource({ restore: false });
    state.view = "home";
    state.key = null;
    state.year = null;
    state.sess = null;
    state.basis = "score";
    state.expanded = {};
    state.showAll = false;
    state.open = {};
    state.allOpen = false;
    state.q = "";
    state.kdQuery = "";
    state.kdScope = "province";
    state.kdDirectOnly = false;
    setMeta(null);
    if (push !== false && location.hash) {
      history.pushState({ key: null }, "", location.pathname + location.search);
    }
    render();
  }

  function readLast() {
    try { return localStorage.getItem(LS_KEY); } catch (err) { return null; }
  }
  function writeLast(key) {
    try { localStorage.setItem(LS_KEY, key); } catch (err) { /* 忽略隐私模式限制 */ }
  }

  /* ---------- 原卷弹层 ---------- */
  function parseSourceKey(qk) {
    const parts = String(qk).split("|");
    const n = parts.pop();
    const sess = parts.pop();
    const year = parts.pop();
    return { key: parts.join("|"), year: year, sess: sess || null, n: n };
  }

  let sourceDataPromise = null;
  let sourceOpenSequence = 0;
  function ensureSourceData() {
    if (window.QMAP) {
      if (window.U && U.applyAssetBase) U.applyAssetBase();
      return Promise.resolve(window.QMAP);
    }
    if (sourceDataPromise) return sourceDataPromise;
    sourceDataPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = window.QMAP_URL || "assets/qmap/qmap.js";
      script.async = true;
      script.onload = () => {
        if (window.QMAP) {
          if (window.U && U.applyAssetBase) U.applyAssetBase();
          resolve(window.QMAP);
        }
        else reject(new Error("QMAP missing"));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("QMAP load failed"));
      };
      document.head.appendChild(script);
    }).catch((err) => {
      sourceDataPromise = null;
      throw err;
    });
    return sourceDataPromise;
  }

  function refreshSourceButtons() {
    if (!window.QMAP) return;
    Array.prototype.forEach.call(document.querySelectorAll(".qbtn[data-qkey]"), (btn) => {
      const meta = parseSourceKey(btn.getAttribute("data-qkey"));
      const rec = U.sourceOf(meta.key, meta.year, meta.sess, meta.n);
      if (!rec) {
        btn.classList.add("is-off");
        btn.disabled = true;
        btn.textContent = "未公开";
        btn.title = "原卷未公开，暂无页图与参考答案";
        btn.setAttribute("aria-label", "第 " + meta.n + " 题原卷未公开：暂无页图与参考答案");
        return;
      }
      if (!rec.imgQ && !rec.img) {
        const why = rec.note || "原卷未公开，暂无页图与参考答案";
        btn.classList.add("is-off");
        btn.disabled = false;
        btn.textContent = "未公开";
        btn.title = why;
        btn.setAttribute("aria-label", "第 " + meta.n + " 题原卷未公开：" + why);
        return;
      }
      btn.classList.remove("is-off");
      btn.disabled = false;
      btn.textContent = "原题";
      btn.title = rec.imgQ ? "查看本题原卷截图（答案可展开核对）" : "查看原卷页图（答案可展开核对）";
      btn.setAttribute("aria-label", "查看第 " + meta.n + " 题原卷，答案需展开");
    });
  }

  function setSourceTriggerLoading(trigger, loading) {
    if (!trigger || !trigger.classList || !trigger.classList.contains("qbtn")) return;
    if (loading) {
      trigger.dataset.sourceLabel = trigger.textContent;
      trigger.disabled = true;
      trigger.setAttribute("aria-busy", "true");
      trigger.textContent = "载入…";
      return;
    }
    if (trigger.dataset.sourceLabel) trigger.textContent = trigger.dataset.sourceLabel;
    delete trigger.dataset.sourceLabel;
    trigger.disabled = false;
    trigger.removeAttribute("aria-busy");
  }

  async function openSource(qk, trigger) {
    const meta = parseSourceKey(qk);
    const p = D.provinces[meta.key];
    if (!p) return;
    const item = U.itemsFor(p, meta.year, meta.sess).find((it) => String(it.n) === meta.n);
    if (!item) return;
    const contextToken = [state.view, state.key, state.year, state.sess].join("|");
    const openSequence = ++sourceOpenSequence;

    if (!window.QMAP) {
      setSourceTriggerLoading(trigger, true);
      const notice = setTimeout(() => toast("正在载入原题…"), 350);
      try {
        await ensureSourceData();
      } catch (err) {
        toast("原题数据加载失败，请检查网络后重试");
        return;
      } finally {
        clearTimeout(notice);
        setSourceTriggerLoading(trigger, false);
      }
      refreshSourceButtons();
    }

    /* 等待题图索引期间若已切换页面或又点了其他题，不再弹出过期题目 */
    if (openSequence !== sourceOpenSequence) return;
    if (contextToken !== [state.view, state.key, state.year, state.sess].join("|")) return;
    const rec = U.sourceOf(meta.key, meta.year, meta.sess, meta.n);
    if (!rec) {
      toast("这道题原卷未公开，暂无页图与参考答案");
      return;
    }
    modalReturnFocus = trigger || document.activeElement;
    state.modal = {
      key: meta.key, year: meta.year, sess: meta.sess, n: meta.n, type: item.t,
      tag: item.tag, module: item.m, score: item.s, rec: rec, answerOpen: false
    };
    renderSourceModal();
  }

  function toggleAnswer() {
    if (!state.modal) return;
    const panel = modalEl && modalEl.querySelector("[data-answer-panel]");
    const body = modalEl && modalEl.querySelector("[data-answer-body]");
    const button = modalEl && modalEl.querySelector("[data-action='toggleAnswer']");
    if (!panel || !body || !button) return;
    const open = !state.modal.answerOpen;
    state.modal.answerOpen = open;
    body.hidden = !open;
    panel.classList.toggle("is-open", open);
    button.textContent = open ? "收起答案" : "显示答案";
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-label", (open ? "收起第 " : "显示第 ") + state.modal.n + " 题答案");
    const title = panel.querySelector("[data-answer-gate-title]");
    const sub = panel.querySelector("[data-answer-gate-sub]");
    if (title) title.textContent = open ? "答案已展开" : "答案默认收起";
    if (sub) sub.textContent = open ? "核对后可收起，继续作答" : "先独立作答，再展开核对";
  }

  function closeSource(opts) {
    if (!state.modal) return;
    const restore = !opts || opts.restore !== false;
    if (lightboxViewer) {
      lightboxViewer.destroy();
      lightboxViewer = null;
    }
    state.modal = null;
    lightboxReturnFocus = null;
    renderSourceModal();
    if (restore && modalReturnFocus && document.contains(modalReturnFocus)) {
      try { modalReturnFocus.focus({ preventScroll: true }); } catch (err) { modalReturnFocus.focus(); }
    }
    modalReturnFocus = null;
  }

  function lightboxEl() {
    return modalEl && modalEl.querySelector(".src-lightbox");
  }

  function lightboxIsOpen() {
    const el = lightboxEl();
    return !!(el && !el.hidden);
  }

  function setModalInert(inert) {
    const overlay = modalEl && modalEl.querySelector(".src-overlay");
    if (!overlay) return;
    if (inert) {
      overlay.setAttribute("aria-hidden", "true");
      overlay.inert = true;
    } else {
      overlay.removeAttribute("aria-hidden");
      overlay.inert = false;
    }
  }

  /* 全屏大图：以“适合屏幕”为 100%，支持滚轮/双指连续缩放、拖动平移、
     双击（或双击触屏）放大，并在边界内约束平移，避免图片被拖出视野。 */
  function createLightboxViewer(box) {
    const stage = box.querySelector(".src-lightbox-stage");
    const img = stage && stage.querySelector("img");
    if (!stage || !img) return null;

    const MAX_SCALE = 6;
    const inButton = box.querySelector("[data-zoom-act='in']");
    const outButton = box.querySelector("[data-zoom-act='out']");
    const valueButton = box.querySelector("[data-zoom-act='reset']");
    const valueLabel = box.querySelector("[data-zoom-value]");
    const pointers = new Map();
    const state = {
      scale: 1, tx: 0, ty: 0, baseW: 0, baseH: 0,
      drag: null, pinch: null, pinched: false,
      lastTapAt: 0, lastTapX: 0, lastTapY: 0, lastTouchToggle: 0,
      destroyed: false, smoothTimer: null, raf: 0
    };

    function stageViewport() {
      const rect = stage.getBoundingClientRect();
      const cs = getComputedStyle(stage);
      return {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        w: Math.max(0, rect.width - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0)),
        h: Math.max(0, rect.height - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0))
      };
    }

    function clampScale(value) {
      return Math.min(MAX_SCALE, Math.max(1, value));
    }

    function clampPan() {
      const view = stageViewport();
      const maxX = Math.max(0, (state.baseW * state.scale - view.w) / 2);
      const maxY = Math.max(0, (state.baseH * state.scale - view.h) / 2);
      state.tx = Math.min(maxX, Math.max(-maxX, state.tx));
      state.ty = Math.min(maxY, Math.max(-maxY, state.ty));
    }

    function updateControls() {
      const pct = Math.round(state.scale * 100);
      if (valueLabel) valueLabel.textContent = pct + "%";
      if (valueButton) valueButton.setAttribute("aria-label", "当前 " + pct + "%，重置为适合屏幕");
      if (outButton) outButton.setAttribute("aria-disabled", state.scale <= 1.001 ? "true" : "false");
      if (inButton) inButton.setAttribute("aria-disabled", state.scale >= MAX_SCALE - 0.001 ? "true" : "false");
      stage.classList.toggle("is-zoomed", state.scale > 1.01);
    }

    function applyTransform(animate) {
      img.classList.toggle("is-smooth", !!animate);
      clearTimeout(state.smoothTimer);
      if (animate) {
        state.smoothTimer = setTimeout(() => img.classList.remove("is-smooth"), 190);
      }
      img.style.transform = "translate3d(" + state.tx.toFixed(2) + "px," + state.ty.toFixed(2) + "px,0) scale(" + state.scale.toFixed(4) + ")";
      updateControls();
    }

    function measure() {
      if (state.destroyed) return;
      state.baseW = img.offsetWidth || img.naturalWidth || 0;
      state.baseH = img.offsetHeight || img.naturalHeight || 0;
      clampPan();
      applyTransform(false);
    }

    function zoomTo(next, anchorX, anchorY, animate) {
      const target = clampScale(next);
      if (Math.abs(target - state.scale) < 0.0001) return;
      const view = stageViewport();
      const ax = (anchorX == null ? view.cx : anchorX) - view.cx;
      const ay = (anchorY == null ? view.cy : anchorY) - view.cy;
      const ratio = target / state.scale;
      state.tx = ax - (ax - state.tx) * ratio;
      state.ty = ay - (ay - state.ty) * ratio;
      state.scale = target;
      if (target <= 1.001) {
        state.scale = 1;
        state.tx = 0;
        state.ty = 0;
      }
      clampPan();
      applyTransform(!!animate);
    }

    function reset(animate) {
      state.scale = 1;
      state.tx = 0;
      state.ty = 0;
      applyTransform(animate !== false);
    }

    function toggleZoomAt(x, y) {
      if (state.scale > 1.35) reset(true);
      else zoomTo(2.5, x, y, true);
    }

    function panBy(dx, dy) {
      state.tx += dx;
      state.ty += dy;
      clampPan();
      applyTransform(true);
    }

    function distance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function midpoint(a, b) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function beginPinch() {
      const pts = Array.from(pointers.values());
      if (pts.length < 2) return;
      state.pinched = true;
      state.drag = null;
      state.pinch = {
        dist: Math.max(1, distance(pts[0], pts[1])),
        mid: midpoint(pts[0], pts[1]),
        scale: state.scale,
        tx: state.tx,
        ty: state.ty
      };
      stage.classList.add("is-dragging");
    }

    function onPointerDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 忽略不支持捕获的浏览器 */ }
      img.classList.remove("is-smooth");
      if (pointers.size === 1) {
        state.drag = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty, moved: false };
        state.pinched = false;
        if (state.scale > 1.01) stage.classList.add("is-dragging");
      } else {
        beginPinch();
      }
    }

    function onPointerMove(e) {
      if (!pointers.has(e.pointerId)) return;
      e.preventDefault();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2 && state.pinch) {
        const pts = Array.from(pointers.values());
        const currentDist = Math.max(1, distance(pts[0], pts[1]));
        const currentMid = midpoint(pts[0], pts[1]);
        const nextScale = clampScale(state.pinch.scale * currentDist / state.pinch.dist);
        const view = stageViewport();
        const localX = (state.pinch.mid.x - view.cx - state.pinch.tx) / state.pinch.scale;
        const localY = (state.pinch.mid.y - view.cy - state.pinch.ty) / state.pinch.scale;
        state.scale = nextScale;
        state.tx = currentMid.x - view.cx - localX * nextScale;
        state.ty = currentMid.y - view.cy - localY * nextScale;
        if (nextScale <= 1.001) {
          state.scale = 1;
          state.tx = 0;
          state.ty = 0;
        }
        clampPan();
        applyTransform(false);
        return;
      }

      if (pointers.size === 1 && state.drag) {
        const dx = e.clientX - state.drag.x;
        const dy = e.clientY - state.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) state.drag.moved = true;
        if (state.scale > 1.01) {
          state.tx = state.drag.tx + dx;
          state.ty = state.drag.ty + dy;
          clampPan();
          applyTransform(false);
        }
      }
    }

    function finishPointer(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* 已释放 */ }

      if (pointers.size === 1) {
        const remaining = Array.from(pointers.values())[0];
        state.pinch = null;
        state.drag = { x: remaining.x, y: remaining.y, tx: state.tx, ty: state.ty, moved: false };
        return;
      }

      if (pointers.size > 0) return;
      const drag = state.drag;
      state.drag = null;
      state.pinch = null;
      stage.classList.remove("is-dragging");

      if (e.type === "pointerup" && e.pointerType === "touch" && drag && !drag.moved && !state.pinched) {
        const now = performance.now();
        const isDouble = now - state.lastTapAt < 320 &&
          Math.hypot(e.clientX - state.lastTapX, e.clientY - state.lastTapY) < 32;
        if (isDouble) {
          state.lastTapAt = 0;
          state.lastTouchToggle = performance.now();
          toggleZoomAt(e.clientX, e.clientY);
        } else {
          state.lastTapAt = now;
          state.lastTapX = e.clientX;
          state.lastTapY = e.clientY;
        }
      }
      state.pinched = false;
    }

    function onWheel(e) {
      e.preventDefault();
      const y = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 320 : e.deltaY;
      const factor = Math.exp(-y * (e.ctrlKey ? 0.008 : 0.0018));
      zoomTo(state.scale * factor, e.clientX, e.clientY, false);
    }

    function onDoubleClick(e) {
      e.preventDefault();
      /* 触摸双击已由 pointerup 判定；忽略浏览器随后合成的 dblclick，避免放大后立即还原 */
      if (performance.now() - state.lastTouchToggle < 600) return;
      toggleZoomAt(e.clientX, e.clientY);
    }

    function onDragStart(e) { e.preventDefault(); }

    function onResize() { measure(); }

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", finishPointer);
    stage.addEventListener("pointercancel", finishPointer);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("dblclick", onDoubleClick);
    stage.addEventListener("dragstart", onDragStart);
    window.addEventListener("resize", onResize);
    if (!img.complete) img.addEventListener("load", measure);

    function open() {
      reset(false);
      state.raf = requestAnimationFrame(() => {
        measure();
        state.raf = requestAnimationFrame(measure);
      });
    }

    function destroy() {
      state.destroyed = true;
      cancelAnimationFrame(state.raf);
      clearTimeout(state.smoothTimer);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", finishPointer);
      stage.removeEventListener("pointercancel", finishPointer);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("dblclick", onDoubleClick);
      stage.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("resize", onResize);
      img.removeEventListener("load", measure);
    }

    return {
      open: open,
      destroy: destroy,
      reset: reset,
      zoomIn: function () { zoomTo(state.scale * 1.35, null, null, true); },
      zoomOut: function () { zoomTo(state.scale / 1.35, null, null, true); },
      panBy: panBy,
      getScale: function () { return state.scale; }
    };
  }

  function openImageLightbox(trigger) {
    const box = lightboxEl();
    if (!box) return;
    if (lightboxViewer) lightboxViewer.destroy();
    lightboxReturnFocus = trigger || document.activeElement;
    box.hidden = false;
    const source = trigger && trigger.getAttribute("data-image-src");
    const title = trigger && trigger.getAttribute("data-image-title");
    const kind = trigger && trigger.getAttribute("data-image-kind");
    const foot = trigger && trigger.getAttribute("data-image-foot");
    const lightboxImg = box.querySelector(".src-lightbox-stage img");
    if (source && lightboxImg) {
      lightboxImg.src = source;
      lightboxImg.alt = title || "图片大图";
    }
    const heading = box.querySelector(".src-lightbox-heading span");
    if (heading) heading.textContent = kind === "answer" ? "解析大图 · 全屏查看" : "原卷大图 · 全屏查看";
    const headingTitle = box.querySelector(".src-lightbox-heading b");
    if (headingTitle && title) headingTitle.textContent = title;
    const footLabel = box.querySelector(".src-lightbox-foot span:first-child");
    if (footLabel) footLabel.textContent = foot || (kind === "answer" ? "解析截图" : "原卷截图");
    setModalInert(true);
    lightboxViewer = createLightboxViewer(box);
    if (lightboxViewer) lightboxViewer.open();
    const close = box.querySelector(".src-lightbox-close");
    if (close) {
      try { close.focus({ preventScroll: true }); } catch (err) { close.focus(); }
    }
  }

  function closeImageLightbox() {
    const box = lightboxEl();
    if (!box || box.hidden) return;
    if (lightboxViewer) {
      lightboxViewer.destroy();
      lightboxViewer = null;
    }
    box.hidden = true;
    setModalInert(false);
    if (lightboxReturnFocus && document.contains(lightboxReturnFocus)) {
      try { lightboxReturnFocus.focus({ preventScroll: true }); } catch (err) { lightboxReturnFocus.focus(); }
    }
    lightboxReturnFocus = null;
  }

  function openCloudLink(link) {
    const url = link.getAttribute("data-cloud-url");
    if (!url) return;
    let win = null;
    const box = modalEl && modalEl.querySelector("[data-cloud-fallback]");
    try { win = window.open(url, "_blank"); } catch (err) { win = null; }
    if (win) {
      if (box) box.hidden = true;
      try { win.opener = null; } catch (err) { /* 忽略跨域限制 */ }
      return;
    }
    if (!box) return;
    const label = box.querySelector("[data-fallback-label]");
    if (label) label.textContent = link.getAttribute("data-cloud-label") || "链接";
    const input = box.querySelector("input");
    if (input) {
      input.value = url;
      input.focus();
      input.select();
    }
    const copyButton = box.querySelector("[data-action='copyCloud']");
    if (copyButton) copyButton.setAttribute("data-copy-url", url);
    box.hidden = false;
    toast("新标签页被拦截，请复制链接后在浏览器中打开");
  }

  function copyCloudLink(button) {
    const url = button.getAttribute("data-copy-url");
    if (!url) return;
    copyText(url).then(function (ok) {
      toast(ok ? "云盘链接已复制" : "复制失败，请手动选择链接复制");
    });
  }

  /* 逐题裁切图尚未上传或加载失败时，静默回退到整页图，并同步页签文案 */
  function wireCropFallback(root) {
    const img = root.querySelector(".src-paper img[data-full]");
    if (!img) return;
    const apply = () => {
      if (img.dataset.fallback === "1") return;
      const full = img.getAttribute("data-full");
      if (!full) return;
      img.dataset.fallback = "1";
      img.src = full;
      if (img.dataset.fullAlt) img.alt = img.dataset.fullAlt;
      const paper = img.closest(".src-paper");
      if (paper) {
        paper.setAttribute("data-image-src", full);
        paper.classList.remove("is-crop");
        paper.title = "查看大图";
      }
      const lightboxImg = root.querySelector(".src-lightbox-stage img");
      if (lightboxImg) lightboxImg.src = full;
      const lightboxTitle = root.querySelector(".src-lightbox-heading b");
      if (lightboxTitle && img.dataset.fullMeta) lightboxTitle.textContent = img.dataset.fullMeta;
      const main = img.closest(".src-main");
      if (!main) return;
      const label = main.querySelector(".src-label span");
      if (label) label.textContent = "原卷整页";
      const meta = main.querySelector(".src-label em");
      if (meta && img.dataset.fullMeta) meta.textContent = img.dataset.fullMeta;
      const hint = main.querySelector(".src-hint");
      if (hint) hint.textContent = "该题暂未生成单题裁切图，先回退展示整页原卷；可对照页眉题号定位。";
    };
    img.addEventListener("error", apply);
  }

  function renderSourceModal() {
    if (!modalEl) return;
    if (!state.modal) {
      modalEl.hidden = true;
      modalEl.innerHTML = "";
      document.body.classList.remove("has-modal");
      return;
    }
    modalEl.hidden = false;
    modalEl.innerHTML = V.sourceModalHTML(state.modal);
    wireCropFallback(modalEl);
    document.body.classList.add("has-modal");
    const dialog = modalEl.querySelector(".src-modal");
    if (dialog) {
      try { dialog.focus({ preventScroll: true }); } catch (err) { dialog.focus(); }
    }
  }

  if (modalEl) {
    modalEl.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='closeImage']")) {
        closeImageLightbox();
        return;
      }
      if (lightboxIsOpen()) {
        const zoomButton = e.target.closest("[data-zoom-act]");
        if (zoomButton && lightboxViewer) {
          const act = zoomButton.getAttribute("data-zoom-act");
          if (act === "in") lightboxViewer.zoomIn();
          else if (act === "out") lightboxViewer.zoomOut();
          else lightboxViewer.reset(true);
        }
        return;
      }

      const answerButton = e.target.closest("[data-action='toggleAnswer']");
      if (answerButton) {
        toggleAnswer();
        return;
      }

      const imageButton = e.target.closest("[data-action='openImage']");
      if (imageButton) {
        openImageLightbox(imageButton);
        return;
      }

      const copyButton = e.target.closest("[data-action='copyCloud']");
      if (copyButton) {
        copyCloudLink(copyButton);
        return;
      }

      const cloudLink = e.target.closest("[data-cloud-url]");
      if (cloudLink) {
        e.preventDefault();
        openCloudLink(cloudLink);
        return;
      }

      if (e.target.classList.contains("src-overlay") || e.target.closest(".src-close")) {
        closeSource();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const bulletin = document.querySelector(".bulletin[open]");
      if (bulletin) {
        const summary = bulletin.querySelector("summary");
        bulletin.open = false;
        if (summary) summary.focus();
        return;
      }
    }
    if (!state.modal) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (lightboxIsOpen()) closeImageLightbox();
      else closeSource();
      return;
    }
    if (lightboxViewer) {
      const zoomKey = e.key === "+" || e.key === "=" || e.key === "-" || e.key === "_" || e.key === "0";
      const arrowKey = e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown";
      if (zoomKey || arrowKey) {
        e.preventDefault();
        if (e.key === "+" || e.key === "=") lightboxViewer.zoomIn();
        else if (e.key === "-" || e.key === "_") lightboxViewer.zoomOut();
        else if (e.key === "0") lightboxViewer.reset(true);
        else {
          const step = e.shiftKey ? 120 : 56;
          lightboxViewer.panBy(
            e.key === "ArrowLeft" ? step : e.key === "ArrowRight" ? -step : 0,
            e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0
          );
        }
        return;
      }
    }
    if (e.key !== "Tab" || !modalEl) return;
    const scope = lightboxIsOpen() ? modalEl.querySelector(".src-lightbox") : modalEl;
    if (!scope) return;
    const focusable = Array.prototype.slice.call(scope.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && (document.activeElement === first || document.activeElement === modalEl.querySelector(".src-modal"))) {
      e.preventDefault();
      last.focus();
    }
  });

  /* ---------- 交互 ---------- */
  app.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) {
      const card = e.target.closest(".item");
      const opener = card && card.querySelector(".item-open");
      if (opener) opener.click();
      return;
    }
    const action = el.getAttribute("data-action");
    const p = state.key ? D.provinces[state.key] : null;

    if (action === "fufen") { openFufen(); return; }
    if (action === "mockref") { openMockref(); return; }
    if (action === "openProvince" || action === "pickSuggest") {
      openProvince(el.getAttribute("data-key"));
      return;
    }
    if (action === "openSource") {
      openSource(el.getAttribute("data-qkey"), el);
      return;
    }
    if (action === "exportPdf") {
      /* 与五年趋势表格同口径：当前省份 + 当前场次（浙江两场次各自独立导出） */
      if (!p) return;
      const sessLabels = U.sessionsOf(p, state.year);
      const sess = sessLabels.length ? (sessLabels.indexOf(state.sess) >= 0 ? state.sess : sessLabels[0]) : null;
      if (window.PDFExport) window.PDFExport.start(el.getAttribute("data-module"), state.key, sess);
      return;
    }
    if (action === "home") { goHome(); return; }
    if (action === "kdScope") {
      const scope = el.getAttribute("data-scope");
      if ((scope !== "province" && scope !== "nation") || state.kdScope === scope) return;
      state.kdScope = scope;
      state.kdDirectOnly = false;
      render({ keepScroll: true });
      return;
    }
    if (action === "kdClear") {
      clearTimeout(kdInputTimer);
      state.kdQuery = "";
      state.kdDirectOnly = false;
      const input = document.getElementById("kd-input");
      if (input) {
        input.value = "";
        input.focus({ preventScroll: true });
      }
      syncKdResults();
      return;
    }
    if (action === "kdSearchTerm") {
      const term = el.getAttribute("data-term") || "";
      if (!term) return;
      clearTimeout(kdInputTimer);
      state.kdQuery = term;
      state.kdDirectOnly = false;
      const scope = el.getAttribute("data-scope");
      if (scope === "province" || scope === "nation") state.kdScope = scope;
      render({ keepScroll: true });
      requestAnimationFrame(() => {
        const input = document.getElementById("kd-input");
        if (input) input.focus({ preventScroll: true });
      });
      return;
    }
    if (action === "kdDirectOnly") {
      state.kdDirectOnly = !state.kdDirectOnly;
      syncKdResults();
      const btn = document.querySelector('[data-action="kdDirectOnly"]');
      if (btn) btn.focus({ preventScroll: true });
      return;
    }
    if (action === "copy") {
      const key = state.key;
      if (!key) return;
      const url = location.origin + location.pathname + "#" + encodeURIComponent(key);
      copyText(url).then((ok) => toast(ok ? "链接已复制，可直接转发到微信" : "复制失败，请手动复制地址栏链接"));
      return;
    }
    if (action === "year") {
      const y = el.getAttribute("data-year");
      if (!p || !p.years[y] || state.year === y) return;
      state.year = y;
      state.sess = defaultSession(p, y);
      state.expanded = {};
      state.showAll = false;
      render({ keepScroll: true });
      return;
    }
    if (action === "session") {
      const label = el.getAttribute("data-session");
      if (!p || !label || state.sess === label) return;
      state.sess = label;
      state.expanded = {};
      state.showAll = false;
      render({ keepScroll: true });
      return;
    }
    if (action === "basis") {
      const b = el.getAttribute("data-basis");
      if (b !== "score" && b !== "count") return;
      if (state.basis === b) return;
      state.basis = b;
      render({ keepScroll: true });
      return;
    }
    if (action === "toggleModule") {
      const m = el.getAttribute("data-module");
      const sess = el.getAttribute("data-session") || state.sess;
      const key = (sess ? sess + "|" : "") + m;
      const open = !state.expanded[key];
      /* 就地展开与「全部题目」是两种视图，互斥，避免同屏两套清单 */
      state.expanded = {};
      state.showAll = false;
      if (open) state.expanded[key] = true;
      render({ keepScroll: true });
      return;
    }
    if (action === "toggleAllItems") {
      state.showAll = !state.showAll;
      state.expanded = {};
      render({ keepScroll: true });
      return;
    }
    if (action === "toggleItem") {
      const id = el.getAttribute("data-id");
      if (state.allOpen) {
        /* 从“全部展开”回到逐题控制：先把当前清单全部记成展开，再折叠被点的这条 */
        state.allOpen = false;
        const items = U.itemsFor(p, state.year, state.sess);
        items.forEach((it) => {
          state.open[state.year + "-" + (it.ses ? it.ses + "-" : "") + it.n] = true;
        });
      }
      state.open[id] = !state.open[id];
      render({ keepScroll: true });
      return;
    }
    if (action === "toggleAll") {
      state.allOpen = !state.allOpen;
      state.open = {};
      render({ keepScroll: true });
      return;
    }
  });

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  /* hash 变化 / 前进后退 */
  window.addEventListener("popstate", boot);
  window.addEventListener("hashchange", boot);

  function renderBootError(err) {
    if (window.console && console.error) console.error("页面初始化失败", err);
    app.innerHTML = '<main class="shell" style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:12px">' +
      '<p style="margin:0;font-size:11px;letter-spacing:.12em;color:#AF3A2C">页面载入失败</p>' +
      '<h1 style="margin:0;font-family:var(--serif);font-size:30px;line-height:1.3">请检查网络后重试</h1>' +
      '<p style="margin:0 0 8px;max-width:30em;font-size:13px;line-height:1.7;color:#78817A">页面资源未能完整载入，可能是网络暂时不稳定。已加载的数据不会丢失，重新加载即可继续。</p>' +
      '<button id="boot-retry" type="button" style="min-height:44px;padding:0 18px;border:1px solid #17211E;background:#17211E;color:#FCFDF9;font-weight:600">重新加载</button>' +
    "</main>";
    const retry = document.getElementById("boot-retry");
    if (retry) retry.addEventListener("click", () => location.reload());
  }

  let booting = false;
  function boot() {
    if (booting) return;
    booting = true;
    setTimeout(() => { booting = false; }, 0);
    try {
      if (hashValue() === "fufen") { openFufen(false); return; }
      if (hashValue() === "mock") { openMockref(false); return; }
      const key = keyFromHash();
      if (key) openProvince(key, false);
      else {
        state.view = "home";
        state.key = null;
        setMeta(null);
        render();
      }
    } catch (err) {
      renderBootError(err);
    }
  }

  boot();
  window.addEventListener("load", () => {
    if (!location.hash && window.scrollY > 0) window.scrollTo(0, 0);
  });
})();
