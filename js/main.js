/* ==========================================================================
   AMMAR ARIEF · main.js
   Plain JavaScript + GSAP (ScrollTrigger) + Lenis. WebGL lives in gl.js.

   Motion rules (keep to these so it stays polished, not chaotic):
   · One entrance per element, never repeated on the same element.
   · Eases: expo.out for entrances, expo.inOut for wipes/reveals,
     power3.out for hovers, sine.inOut for ambient loops.
   · Ambient loops are slow (arc 80s, sheen 7s, arrows 2.4s) and small.
   · Reduced motion: no loader, no scroll scenes, content shown at rest.
   ========================================================================== */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const html = document.documentElement;
  const curtain = document.querySelector(".curtain");
  const GL = window.GL || { enabled: false };

  if (typeof window.gsap === "undefined") {
    // Libraries failed to load: show the static page.
    html.classList.add("no-curtain");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "expo.out" });

  /* -----------------------------------------------------------------------
     UTILITIES
     --------------------------------------------------------------------- */
  // Wrap each character of an element in <span class="char">. Keeps spaces.
  function splitChars(el) {
    if (el.dataset.splitDone) return el.querySelectorAll(".char");
    const text = el.textContent;
    el.setAttribute("aria-label", text.trim());
    el.innerHTML = "";
    [...text].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "char";
      s.setAttribute("aria-hidden", "true");
      s.textContent = ch === " " ? " " : ch;
      el.appendChild(s);
    });
    el.dataset.splitDone = "1";
    return el.querySelectorAll(".char");
  }
  // Wrap each word in <span class="word">.
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => '<span class="word">' + w + "</span>").join(" ");
    return el.querySelectorAll(".word");
  }
  // Scramble text into place (mono labels only).
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·—";
  function scramble(el, duration = 0.8, delay = 0) {
    const final = el.dataset.text || (el.dataset.text = el.textContent);
    const obj = { p: 0 };
    return gsap.to(obj, {
      p: 1, duration, delay, ease: "none",
      onUpdate: () => {
        const n = Math.floor(obj.p * final.length);
        let out = final.slice(0, n);
        for (let i = n; i < final.length; i++) out += final[i] === " " || final[i] === "\n" ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        el.textContent = out;
      },
      onComplete: () => { el.textContent = final; }
    });
  }

  /* -----------------------------------------------------------------------
     1. SMOOTH SCROLL + RENDER LOOP
        Lenis, ScrollTrigger and the WebGL layer all run on GSAP's ticker so
        the images never lag behind the page.
     --------------------------------------------------------------------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== "undefined") {
    // syncTouch keeps WebGL images locked to the page on phones too
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, syncTouch: GL.enabled, syncTouchLerp: 0.08 });
    lenis.on("scroll", (e) => { ScrollTrigger.update(); GL.velocity = e.velocity; });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  if (GL.enabled) {
    gsap.ticker.add((t) => { if (!lenis) GL.velocity *= 0.9; GL.render(t); });
  }

  /* -----------------------------------------------------------------------
     2. SMALL BUILDERS: barcode, clock, menu state
     --------------------------------------------------------------------- */
  // Barcode bars generated from the text in data-code (decorative).
  document.querySelectorAll("[data-barcode]").forEach((bc) => {
    const code = bc.dataset.barcode;
    let htmlBars = "";
    for (let i = 0; i < code.length * 3; i++) {
      const c = code.charCodeAt(i % code.length) + i;
      htmlBars += '<i style="width:' + (1 + (c % 3)) + 'px"></i>';
    }
    bc.innerHTML = htmlBars;
    bc.setAttribute("aria-hidden", "true");
  });

  // Local time in Selangor (MYT)
  document.querySelectorAll("[data-clock]").forEach((el) => {
    const tick = () => {
      el.textContent = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }).format(new Date()) + " MYT";
    };
    tick(); setInterval(tick, 30000);
  });

  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* -----------------------------------------------------------------------
     3. CURSOR + MAGNETIC BUTTONS (fine pointers only)
     --------------------------------------------------------------------- */
  if (fine && !reduce) {
    const cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = "<span></span>";
    document.body.appendChild(cursor);
    const label = cursor.firstChild;
    const cx = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3.out" });
    const cy = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3.out" });
    window.addEventListener("pointermove", (e) => { cx(e.clientX); cy(e.clientY); gsap.to(cursor, { opacity: 1, duration: 0.3, overwrite: "auto" }); }, { passive: true });
    document.addEventListener("pointerleave", () => gsap.to(cursor, { opacity: 0, duration: 0.3 }));

    const grow = (size, text) => {
      label.textContent = text || "";
      gsap.to(cursor, { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, duration: 0.5, ease: "power3.out" });
      gsap.to(label, { opacity: text ? 1 : 0, duration: 0.25 });
    };
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor], a, button");
      if (!t) return;
      t.dataset.cursor ? grow(88, t.dataset.cursor) : grow(34);
    });
    document.addEventListener("pointerout", (e) => {
      const t = e.target.closest("[data-cursor], a, button");
      if (t && !t.contains(e.relatedTarget)) grow(10);
    });

    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const mx = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
      const my = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.3);
        my((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener("pointerleave", () => { mx(0); my(0); });
    });
  }

  // Scramble mono labels on hover
  document.querySelectorAll("[data-hover-scramble]").forEach((el) => {
    const host = el.closest("a, button") || el;
    host.addEventListener("pointerenter", () => scramble(el, 0.45));
  });

  /* -----------------------------------------------------------------------
     4. HEADER: draws in, hides on scroll down, solid after the first screen
     --------------------------------------------------------------------- */
  const header = document.querySelector(".header");
  if (header) {
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (self) => {
        const y = self.scroll();
        header.classList.toggle("is-solid", y > window.innerHeight * 0.6);
        header.classList.toggle("is-hidden", self.direction === 1 && y > window.innerHeight * 1.2);
      }
    });
  }
  function headerIn(tl, at) {
    tl.from(".header .brand > *", { y: 20, autoAlpha: 0, duration: 0.9, stagger: 0.06 }, at)
      .from(".header__rule", { scaleX: 0, duration: 1.4, ease: "expo.inOut" }, at)
      .from(".nav a", { y: 20, autoAlpha: 0, duration: 0.9, stagger: 0.06 }, at + 0.1);
  }

  /* -----------------------------------------------------------------------
     5. HOME HERO
     --------------------------------------------------------------------- */
  const hero = document.querySelector("[data-hero]");
  function heroIntro(tl, at) {
    if (!hero) return;
    const nameChars = [];
    hero.querySelectorAll(".hero__name .split").forEach((el) => nameChars.push(...splitChars(el)));
    const media = hero.querySelectorAll(".media");
    const ghosts = hero.querySelectorAll(".ghost .c-inner");
    const arcPath = hero.querySelector(".arc path");

    tl.from(nameChars, { yPercent: 115, rotate: 7, duration: 1.3, stagger: 0.04 }, at)
      .fromTo(".hero__name .accent .char", { backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", duration: 2, ease: "power2.inOut" }, at + 0.5)
      .from(ghosts, { scaleY: 0, transformOrigin: "50% 100%", duration: 1.2, stagger: 0.07, ease: "expo.inOut" }, at + 0.15)
      .fromTo(media, { "--reveal": 0 }, { "--reveal": 1, duration: 1.5, stagger: 0.12, ease: "expo.inOut" }, at + 0.3)
      .fromTo(arcPath, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut" }, at + 0.9)
      .from(".hero .arrow", { x: -24, autoAlpha: 0, duration: 1, stagger: 0.08 }, at + 1.2)
      .from(".projects li", { x: 40, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, at + 0.7)
      .from(".hero__roles .line > span", { yPercent: 110, duration: 1, stagger: 0.08 }, at + 0.9)
      .from(".hero__ctas > *", { y: 24, autoAlpha: 0, duration: 1, stagger: 0.08 }, at + 1.1)
      .from(".barcode i", { scaleY: 0, duration: 0.6, stagger: { each: 0.012, from: "random" }, ease: "power3.out" }, at + 1.1)
      .from(".hero__stamp p, .scroll-cue", { autoAlpha: 0, duration: 1 }, at + 1.3)
      .from(".counter, .stack-list", { autoAlpha: 0, x: -12, duration: 1, stagger: 0.1 }, at + 1.3);
    hero.querySelectorAll("[data-scramble]").forEach((el, i) => tl.add(scramble(el, 1.1), at + 0.8 + i * 0.1));
  }

  function heroAmbient() {
    if (!hero || reduce) return;
    // arc: slow constant rotation
    const arc = hero.querySelector(".arc");
    gsap.set(arc, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
    gsap.to(arc.querySelector("svg"), { rotation: 360, duration: 80, repeat: -1, ease: "none", transformOrigin: "50% 50%" });
    // arrows: gentle nudge
    gsap.to(".hero .arrow svg", { x: 7, duration: 1.2, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.3, repeat: -1, yoyo: true } });
    // name accent sheen
    gsap.fromTo(".hero__name .accent .char", { backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", duration: 2.2, ease: "power2.inOut", repeat: -1, repeatDelay: 7, delay: 6 });

    // counter cycles through the stack list
    const items = hero.querySelectorAll(".stack-list li");
    const num = hero.querySelector(".counter b");
    let i = 0;
    const show = () => {
      items.forEach((li, j) => gsap.to(li, { opacity: j === i ? 1 : 0.35, x: j === i ? 6 : 0, duration: 0.6, ease: "power3.out" }));
      if (num) num.textContent = String(i + 1).padStart(2, "0");
      i = (i + 1) % items.length;
    };
    if (items.length) { show(); setInterval(show, 2400); }

    if (fine) {
      // mouse parallax: each layer moves by its data-depth (px)
      const layers = [...hero.querySelectorAll("[data-depth]")].map((el) => ({
        d: parseFloat(el.dataset.depth),
        x: gsap.quickTo(el, "x", { duration: 1.2, ease: "power3.out" }),
        y: gsap.quickTo(el, "y", { duration: 1.2, ease: "power3.out" })
      }));
      hero.addEventListener("pointermove", (e) => {
        const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
        layers.forEach((l) => { l.x(-nx * l.d * 2); l.y(-ny * l.d * 2); });
      });

      // variable-width name: letters widen near the cursor
      const chars = [...hero.querySelectorAll(".hero__name .char")];
      const setters = chars.map((c) => gsap.quickTo(c, "--w", { duration: 0.7, ease: "power3.out" }));
      const name = hero.querySelector(".hero__name");
      name.addEventListener("pointermove", (e) => {
        chars.forEach((c, k) => {
          const r = c.getBoundingClientRect();
          const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
          setters[k](58 + Math.max(0, 1 - dist / 260) * 34);
        });
      });
      name.addEventListener("pointerleave", () => setters.forEach((s) => s(58)));
    }
  }

  function heroScroll() {
    if (!hero || reduce) return;
    // Desktop: pin the hero; type and menu stay, the images drift right at
    // different speeds and fade over each other.
    gsap.matchMedia().add("(min-width: 1101px)", () => {
      const items = [...hero.querySelectorAll(".c-item")];
      const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "+=95%", scrub: 1, pin: true, anticipatePin: 1 } });
      items.forEach((it) => {
        const s = parseFloat(it.dataset.speed || 1);
        tl.to(it, { xPercent: 40 * s, yPercent: -12 * s + 6, ease: "none" }, 0);
        const m = it.querySelector(".media");
        tl.to(m || it, { opacity: 0, ease: "power1.in" }, 0.15 + (1 - Math.min(s, 1.2) / 1.2) * 0.3);
      });
      tl.to(hero.querySelector(".arc"), { rotation: 70, opacity: 0, ease: "none" }, 0)
        .to(".hero .arrow, .tagline, .counter, .stack-list", { x: 80, opacity: 0, ease: "none" }, 0)
        .to(".hero__name", { yPercent: -6, ease: "none" }, 0);
    });
  }

  /* -----------------------------------------------------------------------
     6. GENERIC PAGE INTROS (work / about / case study)
     --------------------------------------------------------------------- */
  function pageIntro(tl, at) {
    document.querySelectorAll("[data-intro-chars]").forEach((el) => {
      tl.from(splitChars(el), { yPercent: 115, rotate: 6, duration: 1.3, stagger: 0.04 }, at);
    });
    const ins = document.querySelectorAll("[data-intro]");
    if (ins.length) tl.from(ins, { y: 30, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, at + 0.4);
    document.querySelectorAll("[data-intro-media]").forEach((m) => tl.fromTo(m, { "--reveal": 0 }, { "--reveal": 1, duration: 1.5, ease: "expo.inOut" }, at + 0.3));
  }

  /* -----------------------------------------------------------------------
     7. SCROLL REVEALS (all pages)
     --------------------------------------------------------------------- */
  function scrollReveals() {
    if (reduce) return;

    // headings: characters rise
    document.querySelectorAll("[data-split]").forEach((el) => {
      const chars = splitChars(el);
      gsap.from(chars, { yPercent: 115, rotate: 6, duration: 1.2, stagger: 0.03, scrollTrigger: { trigger: el, start: "top 85%" } });
    });

    // blocks: fade up, batched
    const ups = gsap.utils.toArray("[data-reveal]");
    gsap.set(ups, { y: 40, autoAlpha: 0 });
    ScrollTrigger.batch(ups, { start: "top 88%", once: true, onEnter: (b) => gsap.to(b, { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.08 }) });

    // images: wipe in from the left
    gsap.utils.toArray("[data-media-reveal]").forEach((m) => {
      gsap.fromTo(m, { "--reveal": 0 }, { "--reveal": 1, duration: 1.6, ease: "expo.inOut", scrollTrigger: { trigger: m, start: "top 85%" } });
    });

    // parallax: element drifts by data-speed while it crosses the viewport
    gsap.matchMedia().add("(min-width: 1101px)", () => {
      gsap.utils.toArray("[data-speed-y]").forEach((el) => {
        const s = parseFloat(el.dataset.speedY);
        gsap.fromTo(el, { y: -60 * s }, { y: 60 * s, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      });
    });

    // intro paragraph: words fill in as you read
    document.querySelectorAll("[data-fill]").forEach((el) => {
      gsap.fromTo(splitWords(el), { opacity: 0.14 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 50%", scrub: true } });
    });
  }

  /* -----------------------------------------------------------------------
     8. MARQUEE: speed and direction follow the scroll
     --------------------------------------------------------------------- */
  function marquee() {
    document.querySelectorAll("[data-marquee]").forEach((m) => {
      const track = m.querySelector(".marquee__track");
      track.appendChild(track.firstElementChild.cloneNode(true)).setAttribute("aria-hidden", "true");
      if (reduce) return;
      const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
      const skew = gsap.quickTo(track, "skewX", { duration: 0.6, ease: "power3.out" });
      ScrollTrigger.create({
        trigger: m, start: "top bottom", end: "bottom top",
        onUpdate: (self) => {
          const v = self.getVelocity();
          gsap.to(loop, { timeScale: (self.direction === 1 ? 1 : -1) * (1 + Math.min(Math.abs(v) / 400, 4)), duration: 0.4, overwrite: true });
          skew(gsap.utils.clamp(-8, 8, v / -300));
        }
      });
    });
  }

  /* -----------------------------------------------------------------------
     9. WORK PAGE: floating WebGL preview follows the cursor
     --------------------------------------------------------------------- */
  function workPreview() {
    const preview = document.querySelector(".preview");
    const rows = document.querySelectorAll("[data-preview-kind]");
    if (!preview || !rows.length || !fine) return;
    const media = preview.querySelector(".media");
    const label = preview.querySelector(".media__label");
    const px = gsap.quickTo(preview, "x", { duration: 0.7, ease: "power3.out" });
    const py = gsap.quickTo(preview, "y", { duration: 0.7, ease: "power3.out" });
    const rot = gsap.quickTo(preview, "rotation", { duration: 0.9, ease: "power3.out" });
    let lastX = 0;
    window.addEventListener("pointermove", (e) => {
      px(e.clientX + 30); py(e.clientY - preview.offsetHeight / 2);
      rot(gsap.utils.clamp(-8, 8, (e.clientX - lastX) * 0.4)); lastX = e.clientX;
    }, { passive: true });
    rows.forEach((row) => {
      row.addEventListener("pointerenter", () => {
        media.dataset.kind = row.dataset.previewKind;
        media.dataset.seed = row.dataset.previewSeed;
        label.textContent = row.dataset.previewLabel;
        gsap.to(media, { opacity: 1, duration: 0.4, ease: "power3.out" }); gsap.to(preview, { scale: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(media, { "--reveal": 0.2 }, { "--reveal": 1, duration: 0.7, ease: "expo.out" });
      });
      row.addEventListener("pointerleave", () => { gsap.to(media, { opacity: 0, duration: 0.35, ease: "power3.out" }); gsap.to(preview, { scale: 0.9, duration: 0.4, ease: "power3.out" }); });
    });
  }

  /* -----------------------------------------------------------------------
     10. CASE STUDY: expanding image + horizontal gallery
     --------------------------------------------------------------------- */
  function caseScenes() {
    if (reduce) return;
    const expand = document.querySelector("[data-expand]");
    if (expand) {
      gsap.to(expand.querySelector(".expand__media"), {
        width: "100vw", height: "100svh", ease: "none",
        scrollTrigger: { trigger: expand, start: "top top", end: "+=110%", scrub: 1, pin: true }
      });
    }
    const hs = document.querySelector("[data-hscroll]");
    if (hs) {
      const track = hs.querySelector(".hscroll__track");
      gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth), ease: "none",
        scrollTrigger: { trigger: hs, start: "top top", end: () => "+=" + (track.scrollWidth - window.innerWidth), scrub: 1, pin: true, invalidateOnRefresh: true }
      });
    }
  }

  /* -----------------------------------------------------------------------
     11. CURTAIN: first-visit loader, page-to-page transitions
     --------------------------------------------------------------------- */
  function intro() {
    const tl = gsap.timeline({ paused: true });
    headerIn(tl, 0);
    heroIntro(tl, 0.05);
    pageIntro(tl, 0.05);
    return tl;
  }

  function start() {
    const tl = intro();
    heroAmbient();
    heroScroll();
    scrollReveals();
    marquee();
    workPreview();
    caseScenes();
    if (GL.enabled) GL.refresh();
    ScrollTrigger.refresh();

    if (reduce || !curtain) { html.classList.add("no-curtain"); tl.progress(1); return; }

    let seen = false;
    try { seen = sessionStorage.getItem("aa-seen") === "1"; sessionStorage.setItem("aa-seen", "1"); } catch (e) {}

    const lift = () => gsap.timeline()
      .to(curtain, { yPercent: -100, duration: 1.1, ease: "expo.inOut", onComplete: () => html.classList.add("no-curtain") })
      .add(() => tl.play(), 0.45);

    if (seen) { lift(); return; }

    // first visit: count up while fonts load (min 1.2s)
    const count = curtain.querySelector(".curtain__count");
    const bar = curtain.querySelector(".curtain__bar");
    const obj = { v: 0 };
    const loading = gsap.timeline()
      .from(".curtain__mark", { yPercent: 40, autoAlpha: 0, duration: 1 })
      .to(obj, { v: 100, duration: 1.3, ease: "power2.inOut", onUpdate: () => { count.textContent = String(Math.round(obj.v)).padStart(3, "0"); } }, 0)
      .to(bar, { scaleX: 1, duration: 1.3, ease: "power2.inOut" }, 0);
    Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => loading.eventCallback("onComplete", r))]).then(lift);
  }

  // leave: curtain rises from the bottom, then navigate
  if (!reduce && curtain) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.getAttribute("href"), location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      e.preventDefault();
      html.classList.remove("no-curtain");
      gsap.fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.9, ease: "expo.inOut", onComplete: () => { location.href = url.href; } });
    });
    // back/forward cache: page restored with the curtain down
    window.addEventListener("pageshow", (e) => { if (e.persisted) { gsap.set(curtain, { yPercent: -100 }); html.classList.add("no-curtain"); } });
  }

  // smooth anchor links (e.g. #contact)
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis ? lenis.scrollTo(target, { duration: 1.6 }) : target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  });

  start();
})();
