/* ============================================================
   AeroVision — interactivity
   ============================================================ */
(function () {
  "use strict";

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    setYear();
    initHeader();
    initMobileNav();
    initReveal();
    initScrollSpy();
    initCounters();
    initGallery();
    initLightbox();
    initCompare();
    initForm();
    initBackToTop();
    initScrollProgress();
    initAuroraShader();
    initTilt();
    initMagnetic();
  });

  /* ---------- Small helpers ---------- */
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function debounce(fn, ms) {
    let t;
    return function () { clearTimeout(t); t = setTimeout(() => fn.apply(null, arguments), ms); };
  }

  /* ---------- Footer year ---------- */
  function setYear() {
    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Header scroll state ---------- */
  function initHeader() {
    const header = $("#siteHeader");
    if (!header) return;
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile navigation ---------- */
  function initMobileNav() {
    const toggle = $("#navToggle");
    const links = $("#navLinks");
    if (!toggle || !links) return;

    const setOpen = (open) => {
      links.classList.toggle("open", open);
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open && window.innerWidth <= 920 ? "hidden" : "";
    };

    toggle.addEventListener("click", () => setOpen(!links.classList.contains("open")));

    links.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    document.addEventListener("click", (e) => {
      if (links.classList.contains("open") &&
          !links.contains(e.target) && !toggle.contains(e.target)) {
        setOpen(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 920) setOpen(false);
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const items = $$("[data-reveal]");
    items.forEach((el) => {
      const d = el.getAttribute("data-reveal-delay");
      if (d) el.style.setProperty("--reveal-delay", d);
    });

    if (prefersReduced || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    items.forEach((el) => obs.observe(el));
  }

  /* ---------- Scroll spy (active nav link) ---------- */
  function initScrollSpy() {
    const sections = $$("section[id]");
    const links = $$(".nav-link");
    if (!sections.length || !links.length) return;

    const map = new Map();
    links.forEach((l) => {
      const id = l.getAttribute("href");
      if (id && id.startsWith("#")) map.set(id.slice(1), l);
    });

    const setActive = (id) => {
      links.forEach((l) => l.classList.remove("is-active"));
      const link = map.get(id);
      if (link) link.classList.add("is-active");
    };

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    sections.forEach((s) => obs.observe(s));
  }

  /* ---------- Animated counters ---------- */
  function initCounters() {
    const nums = $$("[data-counter]");
    if (!nums.length) return;

    const run = (el) => {
      const target = parseFloat(el.getAttribute("data-counter")) || 0;
      const suffix = el.parentElement?.getAttribute("data-suffix") || el.getAttribute("data-suffix") || "";
      if (prefersReduced) { el.textContent = target + suffix; return; }
      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { run(entry.target); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });

    nums.forEach((n) => obs.observe(n));
  }

  /* ---------- Gallery filtering ---------- */
  function initGallery() {
    const grid = $("#galleryGrid");
    const buttons = $$(".filter-btn");
    if (!grid || !buttons.length) return;
    const items = $$(".gallery-item", grid);

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        const filter = btn.getAttribute("data-filter");
        grid.classList.toggle("is-uniform", filter !== "all");

        items.forEach((item) => {
          const match = filter === "all" || item.getAttribute("data-category") === filter;
          item.classList.toggle("is-hidden", !match);
        });
        // refresh lightbox set
        window.__galleryRefresh && window.__galleryRefresh();
      });
    });
  }

  /* ---------- Lightbox ---------- */
  function initLightbox() {
    const lb = $("#lightbox");
    const img = $("#lbImg");
    const cap = $("#lbCaption");
    const counter = $("#lbCounter");
    const btnClose = $("#lbClose");
    const btnPrev = $("#lbPrev");
    const btnNext = $("#lbNext");
    if (!lb || !img) return;

    let visible = [];
    let index = 0;

    const collect = () => $$(".gallery-item:not(.is-hidden)");
    window.__galleryRefresh = () => { visible = collect(); };

    const render = () => {
      const el = visible[index];
      if (!el) return;
      const full = el.getAttribute("data-full");
      const title = el.getAttribute("data-title") || "";
      const caption = el.getAttribute("data-caption") || "";
      img.src = full;
      img.alt = title;
      cap.innerHTML = `<strong>${title}</strong>${caption}`;
      counter.textContent = `${index + 1} / ${visible.length}`;
    };

    const open = (el) => {
      visible = collect();
      index = visible.indexOf(el);
      if (index < 0) index = 0;
      render();
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };

    const close = () => {
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    const step = (dir) => {
      if (!visible.length) return;
      index = (index + dir + visible.length) % visible.length;
      render();
    };

    $$(".gallery-item").forEach((el) => {
      el.addEventListener("click", () => open(el));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(el); }
      });
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
    });

    btnClose.addEventListener("click", close);
    btnPrev.addEventListener("click", () => step(-1));
    btnNext.addEventListener("click", () => step(1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });

    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    });
  }

  /* ---------- Day / Night comparison slider ---------- */
  function initCompare() {
    const slider = $("#compareSlider");
    const before = $("#compareBefore");
    const handle = $("#compareHandle");
    if (!slider || !before || !handle) return;
    const beforeImg = $("img", before);

    const sizeImg = () => { if (beforeImg) beforeImg.style.width = slider.clientWidth + "px"; };
    sizeImg();
    window.addEventListener("resize", sizeImg);

    const setPos = (pct) => {
      pct = Math.max(0, Math.min(100, pct));
      before.style.width = pct + "%";
      handle.style.left = pct + "%";
      handle.setAttribute("aria-valuenow", String(Math.round(pct)));
    };

    const fromEvent = (clientX) => {
      const rect = slider.getBoundingClientRect();
      setPos(((clientX - rect.left) / rect.width) * 100);
    };

    let dragging = false;
    const start = (e) => { dragging = true; slider.setPointerCapture?.(e.pointerId); fromEvent(e.clientX); };
    const move  = (e) => { if (dragging) fromEvent(e.clientX); };
    const end   = () => { dragging = false; };

    slider.addEventListener("pointerdown", start);
    slider.addEventListener("pointermove", move);
    slider.addEventListener("pointerup", end);
    slider.addEventListener("pointercancel", end);

    handle.addEventListener("keydown", (e) => {
      const cur = parseFloat(handle.getAttribute("aria-valuenow")) || 50;
      if (e.key === "ArrowLeft")  { e.preventDefault(); setPos(cur - 3); }
      if (e.key === "ArrowRight") { e.preventDefault(); setPos(cur + 3); }
      if (e.key === "Home")  { e.preventDefault(); setPos(0); }
      if (e.key === "End")   { e.preventDefault(); setPos(100); }
    });

    setPos(50);
  }

  /* ---------- Contact form ---------- */
  function initForm() {
    const form = $("#quoteForm");
    if (!form) return;
    const success = $("#formSuccess");
    const submitBtn = $("#submitBtn");

    const validators = {
      name: (v) => v.trim().length >= 2 || "Please enter your name.",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Please enter a valid email address.",
      phone: (v) => v.trim() === "" || /^[\d\s()+\-]{7,}$/.test(v.trim()) || "Please enter a valid phone number.",
      service: (v) => v !== "" || "Please choose a service.",
      message: (v) => v.trim().length >= 10 || "Please add a little more detail (10+ characters)."
    };

    const setError = (field, msg) => {
      const wrap = field.closest(".field");
      const err = wrap?.querySelector(".field-error");
      const ok = msg === true;
      wrap?.classList.toggle("invalid", !ok);
      if (err) err.textContent = ok ? "" : msg;
      return ok;
    };

    const validateField = (field) => {
      const fn = validators[field.name];
      if (!fn) return true;
      return setError(field, fn(field.value));
    };

    form.querySelectorAll("input, select, textarea").forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
      field.addEventListener("input", () => {
        if (field.closest(".field")?.classList.contains("invalid")) validateField(field);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;
      let firstBad = null;
      form.querySelectorAll("input, select, textarea").forEach((field) => {
        const ok = validateField(field);
        if (!ok && !firstBad) firstBad = field;
        valid = valid && ok;
      });

      if (!valid) { firstBad?.focus(); return; }

      const original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Sending&hellip;";

      // No backend — simulate a successful submission.
      setTimeout(() => {
        form.querySelectorAll(".field").forEach((f) => f.style.display = "none");
        submitBtn.style.display = "none";
        if (success) { success.hidden = false; success.scrollIntoView({ behavior: "smooth", block: "center" }); }
        // reset for potential reuse
        form.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
      }, 850);
    });
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    const btn = $("#toTop");
    if (!btn) return;
    const onScroll = () => btn.classList.toggle("show", window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    });
  }

  /* ---------- Scroll progress bar ---------- */
  function initScrollProgress() {
    const bar = $("#scrollProgress");
    if (!bar) return;
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const p = docH > 0 ? window.scrollY / docH : 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  /* ---------- Aurora flow background (WebGL) ---------- */
  function initAuroraShader() {
    const canvas = $("#bgShader");
    if (!canvas) return;

    const fail = () => { canvas.style.display = "none"; }; // html gradient fallback shows

    let gl = null;
    try {
      const opts = { antialias: false, depth: false, stencil: false, alpha: false, powerPreference: "low-power" };
      gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
    } catch (e) { gl = null; }
    if (!gl) { fail(); return; }

    const vertSrc =
      "attribute vec2 a_pos;" +
      "void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }";

    const fragSrc = [
      "precision highp float;",
      "uniform float u_time;",
      "uniform vec2 u_res;",
      "float hash(vec2 p){ p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 34.5); return fract(p.x * p.y); }",
      "float noise(vec2 p){",
      "  vec2 i = floor(p), f = fract(p);",
      "  float a = hash(i);",
      "  float b = hash(i + vec2(1.0, 0.0));",
      "  float c = hash(i + vec2(0.0, 1.0));",
      "  float d = hash(i + vec2(1.0, 1.0));",
      "  vec2 u = f * f * (3.0 - 2.0 * f);",
      "  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);",
      "}",
      "float fbm(vec2 p){",
      "  float v = 0.0, a = 0.5;",
      "  for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }",
      "  return v;",
      "}",
      "void main(){",
      "  vec2 uv = gl_FragCoord.xy / u_res.xy;",
      "  float aspect = u_res.x / max(u_res.y, 1.0);",
      "  vec2 p = vec2(uv.x * aspect, uv.y);",
      "  float t = u_time * 0.045;",
      "  float w = fbm(p * 1.5 + vec2(t * 0.6, t * 0.25));",
      "  vec2 q = p + vec2(w * 0.7, w * 0.35);",
      "  float r1 = fbm(q * 1.6 + vec2(t, -t * 0.5));",
      "  float r2 = fbm(q * 2.7 + vec2(-t * 0.7, t * 0.3));",
      "  float f  = fbm(q * 3.6 - vec2(t * 0.3, t * 0.45));",
      "  float ribbon = smoothstep(0.45, 0.95, r1) + 0.55 * smoothstep(0.55, 1.0, r2);",
      "  float glow = ribbon * (0.55 + 0.45 * f);",
      "  vec3 base = vec3(0.015, 0.032, 0.072);",
      "  vec3 cSky = vec3(0.10, 0.52, 0.92);",
      "  vec3 cCyan = vec3(0.12, 0.85, 0.80);",
      "  vec3 cViolet = vec3(0.40, 0.32, 0.86);",
      "  vec3 col = base;",
      "  col += cSky * glow * 0.55;",
      "  col += cCyan * smoothstep(0.75, 1.05, ribbon) * 0.40;",
      "  col += cViolet * pow(f, 2.2) * 0.22;",
      "  col += cSky * 0.05 * smoothstep(0.2, 1.0, uv.y);",
      "  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));",
      "  col *= 0.82 + 0.18 * vig;",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"
    ].join("\n");

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) { fail(); return; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fail(); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_res");

    const RENDER_SCALE = 0.6;
    function resize() {
      // The canvas is fixed/inset:0, so its client box tracks the viewport reliably.
      const vw = canvas.clientWidth || window.innerWidth || document.documentElement.clientWidth || 1;
      const vh = canvas.clientHeight || window.innerHeight || document.documentElement.clientHeight || 1;
      const w = Math.max(2, Math.floor(vw * RENDER_SCALE));
      const h = Math.max(2, Math.floor(vh * RENDER_SCALE));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
    resize();
    window.addEventListener("resize", debounce(resize, 200));
    window.addEventListener("load", resize);
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(debounce(resize, 100)).observe(canvas);
    }

    const drawAt = (seconds) => { gl.uniform1f(uTime, seconds); gl.drawArrays(gl.TRIANGLES, 0, 3); };

    if (prefersReduced) { drawAt(14.0); return; } // single calm static frame

    let raf = null;
    const start = performance.now();
    const render = (now) => { drawAt((now - start) / 1000); raf = requestAnimationFrame(render); };
    const play = () => { if (raf == null) raf = requestAnimationFrame(render); };
    const pause = () => { if (raf != null) { cancelAnimationFrame(raf); raf = null; } };

    document.addEventListener("visibilitychange", () => { document.hidden ? pause() : play(); });
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); pause(); }, false);
    canvas.addEventListener("webglcontextrestored", () => { resize(); play(); }, false);

    drawAt(0);
    play();
  }

  /* ---------- Service card 3D tilt + glow ---------- */
  function initTilt() {
    if (prefersReduced) return;
    $$(".service-card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch") return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (py - 0.5) * -7;
        const ry = (px - 0.5) * 9;
        card.style.setProperty("--mx", (px * 100) + "%");
        card.style.setProperty("--my", (py * 100) + "%");
        card.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-8px)`;
        card.classList.add("is-tilting");
      });
      const reset = () => { card.style.transform = ""; card.classList.remove("is-tilting"); };
      card.addEventListener("pointerleave", reset);
      card.addEventListener("pointercancel", reset);
    });
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagnetic() {
    if (prefersReduced) return;
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch") return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.3;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.3;
        el.style.transform = `translate(${x.toFixed(1)}px, ${(y - 3).toFixed(1)}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }
})();
