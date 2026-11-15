/*
 * The page around the pond: the greeting, the clock and the day (or your own words) in
 * character cells, the date and search bar under them, the three waters, and the controls.
 */
(() => {
  "use strict";
  const { createPond, AsciiMark } = window.AsciiKoi;
  const root = document.documentElement;
  const q = new URLSearchParams(location.search);
  const THEMES = ["pond", "black", "light"];
  const KEY = "ascii-koi-theme";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private window: not remembered */ } }
  };

  /* the water: the URL, then a page that fixes it (light.html …), then the last one chosen, then the pond */
  const fixed = root.dataset.lock;
  const first = [q.get("theme"), fixed, store.get(), "pond"].find(v => THEMES.includes(v));
  root.dataset.theme = first;

  const pondCanvas = document.getElementById("pond");
  const box = document.getElementById("intro-box");
  const greetingCanvas = document.getElementById("wordmark-greeting");
  const titleCanvas = document.getElementById("wordmark");
  const tagCanvas = document.getElementById("wordmark-tag");
  const srTitle = document.getElementById("sr-title");
  const dateLine = document.getElementById("intro-date");
  const ui = document.getElementById("ui");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");

  if (q.get("ui") === "0") {
    ui.hidden = true;
    searchForm.hidden = true;
  }
  if (location.protocol === "chrome-extension:") document.getElementById("gh")?.remove();

  /* Barra buscadora */
  searchForm.addEventListener("submit", e => {
    e.preventDefault();
    const raw = searchInput.value.trim();
    if (!raw) return;
    const isUrl = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(raw);
    if (isUrl) {
      location.href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    } else {
      location.href = `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
    }
  });

  const cssVar = n => getComputedStyle(root).getPropertyValue(n).trim();
  const palette = () => ({
    water: cssVar("--pond"), ink: cssVar("--ink"), accent: cssVar("--accent"),
    koiLight: cssVar("--koi-light"), koiDark: cssVar("--koi-dark"),
    dark: cssVar("color-scheme").includes("dark")
  });

  const pond = createPond({
    canvas: pondCanvas, palette, reduce,
    /* the title's box in pond pixels: the koi fade under it, so the letters can wear their colour */
    dim: () => { const r = box.getBoundingClientRect(); return r.width ? r : null; }
  });
  pond.size(innerWidth, innerHeight);
  window.AsciiKoi.pond = pond;

  /* ── the words: greeting on top, time as title, day under it, then date ── */
  const own = q.get("title");
  const ownGreeting = q.get("greeting");
  const narrow = () => innerWidth < 720;

  const greetingForHour = h => {
    if (h >= 0 && h < 5) return "Still up, Ámbar?";
    if (h >= 5 && h < 12) return "Good morning, Ámbar";
    if (h >= 12 && h < 18) return "Good afternoon, Ámbar";
    return "Good evening, Ámbar";
  };

  const words = () => {
    const now = new Date();
    const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const greeting = ownGreeting !== null ? ownGreeting : greetingForHour(now.getHours());
    if (own) return { greeting, title: own, tag: q.get("tag") || "", date };
    const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    return { greeting, title: time, tag: now.toLocaleDateString("en-GB", { weekday: "long" }), date };
  };

  let current = words();
  const serif = `"Noto Serif Display", "Iowan Old Style", Georgia, serif`;
  /* the words take on the koi colour and the water's light in the pond under them */
  const look = { tint: pond.tint, light: pond.light };

  const greetingMark = AsciiMark(greetingCanvas, () => ({
    text: current.greeting || " ",
    font: `700 ${narrow() ? 46 : 64}px ${serif}`,
    cw: narrow() ? 3 : 4,
    ch: narrow() ? 4 : 5,
    maxW: Math.min(innerWidth * (narrow() ? 0.9 : 0.78), 760),
    tone: 0.85,
    edge: !narrow(),
    glow: 0.65
  }), look);

  const title = AsciiMark(titleCanvas, () => ({
    text: current.title, font: `700 ${narrow() ? 120 : own ? 170 : 230}px ${serif}`,
    cw: narrow() ? 4 : 7, ch: narrow() ? 5 : 9, maxW: Math.min(innerWidth * (narrow() ? 0.9 : 0.8), own ? 700 : 820), edge: true, glow: 1
  }), look);

  /* the day, drawn the same way as the clock, smaller and a little fainter */
  const tag = AsciiMark(tagCanvas, () => ({
    text: current.tag || " ", font: `700 ${narrow() ? 64 : 84}px ${serif}`,
    cw: narrow() ? 3 : 4, ch: narrow() ? 4 : 5, maxW: Math.min(innerWidth * (narrow() ? 0.66 : 0.42), 420), tone: 0.88, edge: !narrow(), glow: 0.7
  }), look);

  const clock = () => performance.now() / 1000;
  const buildWords = () => {
    dateLine.textContent = current.date;
    return Promise.all([
      greetingMark.build(clock()),
      title.build(clock() + 0.18),
      tag.build(clock() + 0.35)
    ]);
  };
  srTitle.textContent = own ? `${current.title} ${current.tag}` : "ASCII Koi";

  let lastWords = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    /* the words redraw at about 15 fps, like a sign; the koi under them move at full rate */
    if (now - lastWords < 66) return;
    lastWords = now;
    const s = now / 1000;
    greetingMark.draw(s);
    title.draw(s);
    tag.draw(s);
    if (!own) {
      const w = words();
      if (w.greeting !== current.greeting || w.title !== current.title || w.tag !== current.tag || w.date !== current.date) {
        current = w;
        buildWords();
      }
    }
  }

  /* ── the waters ── */
  const snap = document.getElementById("snap");
  const picks = [...document.querySelectorAll("[data-theme-pick]")];
  function mark() {
    for (const b of picks) b.setAttribute("aria-checked", String(b.dataset.themePick === root.dataset.theme));
  }

  function setTheme(name, at) {
    if (!THEMES.includes(name) || name === root.dataset.theme) return;
    const dpr = pondCanvas.width / innerWidth;
    if (!reduce) {
      snap.width = pondCanvas.width; snap.height = pondCanvas.height;
      const s = snap.getContext("2d");
      s.drawImage(pondCanvas, 0, 0);
      const marks = [
        [greetingMark, greetingCanvas],
        [title, titleCanvas],
        [tag, tagCanvas]
      ];
      for (const [m, canvasEl] of marks) {
        for (const c of [m.glow, canvasEl]) {
          const r = c && c.getBoundingClientRect();
          if (!r || !r.width || !c.width) continue;
          s.filter = c === m.glow ? `blur(${14 * dpr}px)` : "none";
          s.drawImage(c, r.left * dpr, r.top * dpr, r.width * dpr, r.height * dpr);
        }
      }
      s.filter = "none";
      const r = dateLine.getBoundingClientRect(), ds = getComputedStyle(dateLine);
      s.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.font = `${ds.fontWeight} ${ds.fontSize} ${ds.fontFamily}`; s.letterSpacing = ds.letterSpacing;
      s.fillStyle = ds.color; s.globalAlpha = +ds.opacity; s.textBaseline = "middle";
      s.fillText(dateLine.textContent.toUpperCase(), r.left, r.top + r.height / 2);
      s.setTransform(1, 0, 0, 1, 0, 0); s.globalAlpha = 1;
      const x = at ? at.x : innerWidth / 2, y = at ? at.y : innerHeight / 2;
      snap.style.setProperty("--x", x + "px");
      snap.style.setProperty("--y", y + "px");
      snap.classList.remove("wipe");
      snap.classList.add("show");
      void snap.offsetWidth;
      snap.classList.add("wipe");
    }
    root.dataset.theme = name;
    if (!fixed) store.set(name);
    pond.colors();
    mark();
  }
  snap.addEventListener("transitionend", () => snap.classList.remove("show", "wipe"));
  for (const b of picks) b.addEventListener("click", e => {
    const r = b.getBoundingClientRect();
    setTheme(b.dataset.themePick, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    e.stopPropagation();
  });
  mark();

  /* ── the hands ── */
  const onUi = e => e.target.closest && e.target.closest(".ui, .search-form");
  let held = null, fedAt = 0;
  const feedAt = (x, y) => { const now = performance.now(); if (now - fedAt < 500) return; fedAt = now; pond.feed(x, y); };
  addEventListener("pointerdown", e => {
    if (e.button !== 0 || onUi(e)) return;
    /* a tap is a paw, a long press is food */
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      clearTimeout(held?.timer);
      held = { x: e.clientX, y: e.clientY, at: performance.now(), timer: setTimeout(() => { if (held) { feedAt(held.x, held.y); held = null; } }, 450) };
      return;
    }
    pond.paw(e.clientX, e.clientY);
  });
  addEventListener("pointermove", e => { if (held && Math.hypot(e.clientX - held.x, e.clientY - held.y) > 14) { clearTimeout(held.timer); held = null; } });
  addEventListener("pointerup", () => { if (held) { clearTimeout(held.timer); pond.paw(held.x, held.y); held = null; } });
  addEventListener("pointercancel", () => { if (held) { clearTimeout(held.timer); held = null; } });
  addEventListener("contextmenu", e => {
    if (onUi(e)) return;
    e.preventDefault();
    if (held) { clearTimeout(held.timer); held = null; }
    feedAt(e.clientX, e.clientY);
  });
  addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea")) return;
    const n = "123".indexOf(e.key);
    if (n >= 0) setTheme(THEMES[n]);
    else if (e.key === "t" || e.key === "T") setTheme(THEMES[(THEMES.indexOf(root.dataset.theme) + 1) % 3]);
    else if (e.key === " ") { e.preventDefault(); const p = pond.pause(); document.getElementById("pause-state").textContent = p ? "paused" : ""; }
  });

  /* the controls fade out while you leave the mouse alone */
  let idle = 0;
  const wake = () => { ui.classList.remove("idle"); clearTimeout(idle); idle = setTimeout(() => ui.classList.add("idle"), 3500); };
  addEventListener("pointermove", wake);
  addEventListener("keydown", wake);
  wake();

  let resizeTimer = 0;
  addEventListener("resize", () => {
    pond.size(innerWidth, innerHeight);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => buildWords(), 120);
  });

  pond.start();
  buildWords().then(() => { box.classList.add("go"); requestAnimationFrame(frame); });
  /* canvas text cannot trigger a webfont load; redraw once the mono face is in */
  document.fonts?.load(`600 12px "Geist Mono"`).then(() => pond.colors());
})();