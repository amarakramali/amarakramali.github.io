/* =======================================================================
   Amar Akram — Portfolio · GRID//OPS telemetry console
   Vanilla, no dependencies. Progressive enhancement.
   ======================================================================= */
(function () {
  "use strict";

  var docEl = document.documentElement;
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var reduce = reduceMQ.matches;

  /* ---------------------------------------------------------------
     1) Theme toggle (initial theme already applied by inline <head>)
  --------------------------------------------------------------- */
  var toggle = document.querySelector(".theme-toggle");
  function currentTheme() { return docEl.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function syncToggle() {
    if (!toggle) return;
    var light = currentTheme() === "light";
    toggle.setAttribute("aria-pressed", light ? "true" : "false");
    toggle.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
  }
  syncToggle();
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      docEl.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncToggle();
      if (window.__heroRefresh) window.__heroRefresh();   // recolor canvas
    });
  }

  /* ---------------------------------------------------------------
     2) Sticky-nav border on scroll + scroll-progress bar
  --------------------------------------------------------------- */
  var nav = document.querySelector(".nav");
  var progress = document.querySelector(".scroll-progress");
  var maxScroll = 0;
  function recalcMax() { maxScroll = document.documentElement.scrollHeight - window.innerHeight; }
  recalcMax();
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("scrolled", y > 8);
    if (progress && !reduce) {
      progress.style.width = (maxScroll > 0 ? (y / maxScroll) * 100 : 0) + "%";
    }
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  var maxRT;
  window.addEventListener("resize", function () { clearTimeout(maxRT); maxRT = setTimeout(recalcMax, 200); }, { passive: true });

  /* ---------------------------------------------------------------
     3) Current year + live clock
  --------------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
  var clocks = document.querySelectorAll("[data-clock]");
  if (clocks.length) {
    var tick = function () {
      var t;
      try { t = new Date().toLocaleTimeString("de-DE", { hour12: false }); }
      catch (e) { t = new Date().toTimeString().slice(0, 8); }
      clocks.forEach(function (el) { el.textContent = t; });
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------
     4) Reveal-on-scroll + KPI count-up (shared IntersectionObserver)
  --------------------------------------------------------------- */
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function runCount(el) {
    if (el.__done) return; el.__done = true;
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    var pad = parseInt(el.getAttribute("data-pad") || "0", 10);
    if (isNaN(target)) return;
    var fmt = function (v) {
      var s = v.toFixed(dec);
      if (pad > 0) {
        var neg = s.charAt(0) === "-";
        var body = neg ? s.slice(1) : s;
        var intLen = body.split(".")[0].length;
        while (intLen < pad) { body = "0" + body; intLen++; }
        s = (neg ? "-" : "") + body;
      }
      return s;
    };
    if (reduce) { el.textContent = fmt(target); return; }
    var dur = 1100, t0 = null;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      el.textContent = fmt(target * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target);
    };
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll("[data-count]");
  var revealItems = document.querySelectorAll(".reveal");

  if (reduce || !("IntersectionObserver" in window)) {
    revealItems.forEach(function (el) { el.classList.add("in"); });
    counters.forEach(runCount);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          if (e.target.classList.contains("reveal")) e.target.classList.add("in");
          e.target.querySelectorAll && e.target.querySelectorAll("[data-count]").forEach(runCount);
          if (e.target.hasAttribute && e.target.hasAttribute("data-count")) runCount(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealItems.forEach(function (el) { io.observe(el); });
    counters.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------
     5) Active nav link (scroll spy) — index page only
  --------------------------------------------------------------- */
  var spyLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));
  if (spyLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    spyLinks.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      if (id) byId[id] = a;
    });
    var order = ["work", "about", "thesis", "contact"];
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var activeId = null;
      order.forEach(function (id) { if (!activeId && visible[id]) activeId = id; });
      spyLinks.forEach(function (l) { l.classList.remove("active"); });
      if (activeId && byId[activeId]) byId[activeId].classList.add("active");
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    order.forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }

  /* ---------------------------------------------------------------
     6) Project-panel cursor sheen (pointer:fine only)
  --------------------------------------------------------------- */
  if (finePointer && !reduce) {
    document.querySelectorAll(".project").forEach(function (card) {
      card.addEventListener("mousemove", function (ev) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((ev.clientX - r.left) / r.width) * 100 + "%");
        card.style.setProperty("--my", ((ev.clientY - r.top) / r.height) * 100 + "%");
      }, { passive: true });
    });
  }

  /* ---------------------------------------------------------------
     7) Hero energy-telemetry canvas
        — honest, deterministic day-ahead load curve + P10/P90 band
        — sweeping "now" playhead + cursor-reactive local energize
        — pauses off-screen, ~30fps, DPR capped, reduced-motion -> static SVG
  --------------------------------------------------------------- */
  var canvas = document.querySelector(".hero__canvas");
  var heroSvg = document.querySelector(".hero__svg");
  var heroCtx = null;
  if (canvas && !reduce && canvas.getContext) {
    // Brave's strict fingerprint shields can block 2D canvas — fall back to the static SVG.
    try { heroCtx = canvas.getContext("2d"); } catch (e) { heroCtx = null; }
  }
  if (heroCtx) {
    var ctx = heroCtx;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var N = 96;

    // Deterministic normalised daily load shape (0..1), morning + evening peaks.
    var load = new Float32Array(N), sig = new Float32Array(N);
    (function build() {
      var min = Infinity, max = -Infinity, i, h, v;
      for (i = 0; i < N; i++) {
        h = (i / N) * 24;
        var nightBase = 0.40 + 0.07 * Math.sin(((h - 9) / 24) * Math.PI * 2);
        var morning = Math.exp(-Math.pow((h - 8) / 2.5, 2)) * 0.40;
        var evening = Math.exp(-Math.pow((h - 19.5) / 2.8, 2)) * 0.62;
        v = nightBase + morning + evening;
        load[i] = v;
        if (v < min) min = v; if (v > max) max = v;
      }
      for (i = 0; i < N; i++) {
        load[i] = (load[i] - min) / (max - min);        // 0..1
        sig[i] = 0.045 + 0.05 * load[i];                // band half-width grows with load
      }
    })();

    var colors = {}, doGlow = false;
    function refresh() {
      var cs = getComputedStyle(docEl);
      colors.trace = cs.getPropertyValue("--canvas-trace").trim() || "#2FB7C9";
      colors.band = cs.getPropertyValue("--canvas-band").trim() || "rgba(47,183,201,.13)";
      colors.grid = cs.getPropertyValue("--canvas-grid").trim() || "rgba(120,140,170,.10)";
      colors.glow = parseFloat(cs.getPropertyValue("--canvas-glow")) ? true : false;
      colors.faint = cs.getPropertyValue("--faint").trim() || "#828D9D";
      doGlow = colors.glow && !/Mobi|Android/i.test(navigator.userAgent);
    }
    refresh();
    window.__heroRefresh = refresh;

    function px(i) { return (i / (N - 1)) * W; }
    function py(v) { var top = H * 0.16, bot = H * 0.90; return bot - v * (bot - top); }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();

    var mouseX = -9999, useCursor = finePointer;
    var heroArea = canvas.closest(".hero") || canvas.parentElement;   // .hero__bg has pointer-events:none
    heroArea.addEventListener("mousemove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouseX = e.clientX - r.left;
    }, { passive: true });
    heroArea.addEventListener("mouseleave", function () { mouseX = -9999; }, { passive: true });

    var sweep = 0;                 // 0..1 playhead position
    var last = 0, running = false, rafId = null;

    function localBoost(x) {
      // extra brightness/band-swell near the sweep playhead and near the cursor
      var sx = sweep * W;
      var dSweep = Math.abs(x - sx);
      var b = Math.max(0, 1 - dSweep / 70) * 0.9;
      if (useCursor && mouseX > -9990) {
        var dM = Math.abs(x - mouseX);
        b = Math.max(b, Math.max(0, 1 - dM / 150));
      }
      return b;
    }

    function showStatic() {
      stop();
      canvas.classList.remove("live");
      if (heroSvg) heroSvg.style.opacity = "";
    }

    function draw(ts) {
      if (!running) return;
      var dt = ts - last;
      if (dt < 33) { rafId = requestAnimationFrame(draw); return; }   // ~30fps
      last = ts;
      try { paint(ts, dt); }
      catch (e) { showStatic(); return; }      // any canvas failure -> static SVG
      rafId = requestAnimationFrame(draw);
    }

    function paint(ts, dt) {
      sweep += dt / 6400;            // full sweep ≈ 6.4s
      if (sweep > 1.08) sweep = -0.08;

      ctx.clearRect(0, 0, W, H);

      // graticule
      ctx.strokeStyle = colors.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var g = 1; g <= 3; g++) { var gy = (H * 0.16) + (g / 4) * (H * 0.74); ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
      ctx.stroke();
      ctx.fillStyle = colors.faint;
      ctx.font = "10px ui-monospace, monospace";
      ctx.globalAlpha = 0.7;
      ctx.fillText("P90", 6, py(0.96) + 3);
      ctx.fillText("P50", 6, py(0.52) + 3);
      ctx.fillText("P10", 6, py(0.06) + 3);
      ctx.globalAlpha = 1;

      // uncertainty band (P10..P90), swelling locally near sweep/cursor
      ctx.beginPath();
      var i, x, boost;
      for (i = 0; i < N; i++) {
        x = px(i); boost = localBoost(x);
        ctx.lineTo(x, py(Math.min(1, load[i] + sig[i] * (1 + boost * 1.4))));
      }
      for (i = N - 1; i >= 0; i--) {
        x = px(i); boost = localBoost(x);
        ctx.lineTo(x, py(Math.max(0, load[i] - sig[i] * (1 + boost * 1.4))));
      }
      ctx.closePath();
      ctx.fillStyle = colors.band;
      ctx.fill();

      // main trace (P50)
      if (doGlow) { ctx.shadowBlur = 12; ctx.shadowColor = colors.trace; }
      ctx.strokeStyle = colors.trace; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath();
      for (i = 0; i < N; i++) { x = px(i); (i ? ctx.lineTo : ctx.moveTo).call(ctx, x, py(load[i])); }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // sweep playhead + "now" dot riding the curve
      var sx = sweep * W;
      if (sx >= 0 && sx <= W) {
        var fi = (sx / W) * (N - 1);
        var i0 = Math.floor(fi), frac = fi - i0;
        var vy = load[i0] + (load[Math.min(N - 1, i0 + 1)] - load[i0]) * frac;
        var dotY = py(vy);
        // faint vertical sweep line
        var grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "rgba(127,215,227,0)");
        grad.addColorStop(0.5, colors.trace);
        grad.addColorStop(1, "rgba(127,215,227,0)");
        ctx.globalAlpha = 0.18; ctx.strokeStyle = grad; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx, H * 0.1); ctx.lineTo(sx, H * 0.94); ctx.stroke();
        ctx.globalAlpha = 1;
        // pulsing dot
        var pr = 4 + Math.sin(ts / 320) * 1.2;
        if (doGlow) { ctx.shadowBlur = 16; ctx.shadowColor = colors.trace; }
        ctx.fillStyle = colors.trace;
        ctx.beginPath(); ctx.arc(sx, dotY, pr, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(sx, dotY, pr + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    function start() { if (running) return; running = true; last = performance.now(); rafId = requestAnimationFrame(draw); }
    function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }

    // activate: reveal canvas over the static SVG, then size it while visible —
    // the first resize() ran while the canvas was still display:none (0×0 rect)
    canvas.classList.add("live");
    if (heroSvg) heroSvg.style.opacity = "0";
    resize();
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { resize(); }).observe(canvas);
    }

    // pause when hero scrolls off-screen
    if ("IntersectionObserver" in window) {
      var hio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0 });
      hio.observe(canvas);
    } else { start(); }

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { DPR = Math.min(window.devicePixelRatio || 1, 2); resize(); }, 150);
    }, { passive: true });

    // respect a live change to reduced-motion preference
    if (reduceMQ.addEventListener) {
      reduceMQ.addEventListener("change", function (e) {
        if (e.matches) { stop(); canvas.classList.remove("live"); if (heroSvg) heroSvg.style.opacity = ""; }
        else { resize(); canvas.classList.add("live"); if (heroSvg) heroSvg.style.opacity = "0"; start(); }
      });
    }
  }
})();
