/* Interaction engine: preloader, split-text reveals, scrollspy,
   sticky stack deck, scroll-driven word highlights, count-up stats,
   magnetic buttons, parallax layers, cursor, local time. */
(function () {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vh = function () { return window.innerHeight; };
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  // declared before the preloader logic: the skip path calls initSite()
  // synchronously, so this must already be initialized by then
  let booted = false;

  /* Run a subsystem in isolation — one failure must never blank the page */
  function safe(fn) {
    try { fn(); } catch (err) { console.error('[init]', err); }
  }

  /* ════════ Preloader ════════ */
  const pre = document.getElementById('preloader');
  const preCount = pre ? pre.querySelector('.pre-count') : null;
  let seen = false;
  try { seen = !!sessionStorage.getItem('jz-seen'); } catch (e) {}

  function endPreloader(instant) {
    try { sessionStorage.setItem('jz-seen', '1'); } catch (e) {}
    document.body.classList.remove('loading');
    if (instant) {
      pre.classList.add('done', 'gone');
    } else {
      pre.classList.add('done');
      setTimeout(function () { pre.classList.add('gone'); }, 750);
    }
    initSite();
  }

  if (!pre || reducedMotion || seen) {
    if (pre) pre.classList.add('done', 'gone');
    document.body.classList.remove('loading');
    initSite();
  } else {
    // Count is driven by elapsed time (not timer ticks), so the duration is
    // exact and immune to background-tab timer throttling. ~1.1s of counting
    // + 0.2s beat + 0.75s slide-up ≈ 2s of preloader total.
    const COUNT_MS = 1100;
    const t0 = performance.now();
    (function tick() {
      const p = Math.min(1, (performance.now() - t0) / COUNT_MS);
      preCount.textContent = Math.floor(p * 100);
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(function () { endPreloader(false); }, 200);
      }
    })();
  }

  /* ════════ Split-text: wrap words of .st in masked spans ════════ */
  function splitElement(el) {
    let idx = 0;
    function makeWrap() {
      const w = document.createElement('span');
      w.className = 'w';
      const wi = document.createElement('span');
      wi.className = 'wi';
      wi.style.setProperty('--wi', String(idx++));
      w.appendChild(wi);
      return { w: w, wi: wi };
    }
    const nodes = Array.prototype.slice.call(el.childNodes);
    nodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
          } else {
            const pair = makeWrap();
            pair.wi.textContent = part;
            frag.appendChild(pair.w);
          }
        });
        el.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Swap the wrapper into place first, THEN move the element into it —
        // moving first detaches the node and replaceChild would throw.
        const pair = makeWrap();
        el.replaceChild(pair.w, node);
        pair.wi.appendChild(node);
      }
    });
  }

  /* ════════ Everything else boots after the preloader ════════ */
  function initSite() {
    if (booted) return;
    booted = true;

    const scrollWordEls = [];

    /* ── Generic reveals (staggered per section) — attach FIRST:
          if anything below fails, content must still appear ── */
    safe(function () {
      const reveals = document.querySelectorAll('.reveal');
      if (reducedMotion || !('IntersectionObserver' in window)) {
        reveals.forEach(function (el) { el.classList.add('visible'); });
        return;
      }
      document.querySelectorAll('section, header').forEach(function (sec) {
        sec.querySelectorAll('.reveal').forEach(function (el, i) {
          el.style.setProperty('--reveal-delay', Math.min(i * 0.08, 0.4) + 's');
        });
      });
      const rObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('visible'); rObs.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
      reveals.forEach(function (el) { rObs.observe(el); });
    });

    /* ── Split-text reveals ── */
    safe(function () {
      const stEls = document.querySelectorAll('.st');
      if (reducedMotion || !('IntersectionObserver' in window)) {
        stEls.forEach(function (el) { el.classList.add('st-in'); });
        return;
      }
      stEls.forEach(function (el) {
        try {
          splitElement(el);
        } catch (err) {
          console.error('[split]', err);
          el.classList.add('st-in'); // fail visible, never hidden
        }
      });
      const stObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('st-in'); stObs.unobserve(e.target); }
        });
      }, { threshold: 0.35 });
      stEls.forEach(function (el) { stObs.observe(el); });
    });

    /* ── Chart wipe: staggered left→right reveal with scan line ── */
    safe(function () {
      const wipes = document.querySelectorAll('.wipe');
      if (reducedMotion || !('IntersectionObserver' in window)) {
        wipes.forEach(function (el) { el.classList.add('wiped'); });
        return;
      }
      // stagger siblings that wipe together within the same container
      document.querySelectorAll('.project-images, .project-thumb').forEach(function (group) {
        group.querySelectorAll('.wipe').forEach(function (el, i) {
          el.style.setProperty('--wipe-delay', (i * 0.22) + 's');
        });
      });
      const wObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('wiped'); wObs.unobserve(e.target); }
        });
      }, { threshold: 0.35 });
      wipes.forEach(function (el) { wObs.observe(el); });
    });

    /* ── Scroll-words: wrap for scroll-driven highlight ── */
    safe(function () {
      if (reducedMotion) return;
      document.querySelectorAll('.scroll-words').forEach(function (el) {
        const words = el.textContent.trim().split(/\s+/);
        el.textContent = '';
        words.forEach(function (word, i) {
          const s = document.createElement('span');
          s.className = 'sw';
          s.textContent = word;
          el.appendChild(s);
          if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
        scrollWordEls.push({ el: el, words: el.querySelectorAll('.sw') });
      });
    });

    /* ── Animated GIF cursor overlay (assets/cursor/blue.gif) ── */
    safe(function () {
      if (!finePointer || reducedMotion) return;
      const fx = document.getElementById('cursor-fx');
      if (!fx) return;
      document.documentElement.classList.add('gif-cursor');
      let shown = false;
      document.addEventListener('mousemove', function (e) {
        // offset so the artwork's pointer tip (~9,4 in the 32px image) sits on the hotspot
        fx.style.transform = 'translate3d(' + (e.clientX - 9) + 'px,' + (e.clientY - 4) + 'px,0)';
        if (!shown) { fx.style.display = 'block'; shown = true; }
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', function () {
        fx.style.display = 'none'; shown = false;
      });
      // iframes (YouTube embed) paint their own cursor — hide the overlay there
      document.querySelectorAll('iframe').forEach(function (fr) {
        const host = fr.parentElement;
        if (!host) return;
        host.addEventListener('mouseenter', function () { fx.style.display = 'none'; });
        host.addEventListener('mouseleave', function () { if (shown) fx.style.display = 'block'; });
      });
    });

    /* ── Count-up stats ── */
    safe(function () {
      if (reducedMotion || !('IntersectionObserver' in window)) return;
      function formatNum(v) {
        return v >= 10000 ? Math.round(v).toLocaleString('en-US') : String(Math.round(v));
      }
      const nObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          nObs.unobserve(e.target);
          const el = e.target;
          const target = parseFloat(el.getAttribute('data-count'));
          const prefix = el.getAttribute('data-prefix') || '';
          const suffix = el.getAttribute('data-suffix') || '';
          const t0 = performance.now();
          const dur = 1300;
          (function tick(t) {
            const p = clamp((t - t0) / dur, 0, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + formatNum(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          })(t0);
        });
      }, { threshold: 0.6 });
      document.querySelectorAll('.stat-num[data-count]').forEach(function (el) { nObs.observe(el); });
    });

    /* ── Scrollspy ── */
    safe(function () {
      const spyLinks = {};
      document.querySelectorAll('.nav-links a[data-spy]').forEach(function (a) {
        spyLinks[a.getAttribute('data-spy')] = a;
      });
      const spyObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          const link = spyLinks[e.target.id];
          if (!link) return;
          if (e.isIntersecting) {
            Object.keys(spyLinks).forEach(function (k) { spyLinks[k].classList.remove('active'); });
            link.classList.add('active');
          }
        });
      }, { rootMargin: '-40% 0px -50% 0px' });
      ['about', 'projects', 'extracurriculars', 'contact'].forEach(function (id) {
        const sec = document.getElementById(id);
        if (sec) spyObs.observe(sec);
      });
    });

    /* ── Pointer-tracked glow on cards ── */
    safe(function () {
      if (!finePointer) return;
      document.querySelectorAll('.glow-card').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--gx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--gy', (e.clientY - r.top) + 'px');
        });
      });
    });

    /* ── Magnetic buttons ── */
    safe(function () {
      if (!finePointer || reducedMotion) return;
      document.querySelectorAll('.magnetic').forEach(function (el) {
        el.addEventListener('mousemove', function (e) {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * 0.28;
          const dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
          el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.04)';
        });
        el.addEventListener('mouseleave', function () {
          el.style.transform = '';
        });
      });
    });

    /* ── About photo tilt ── */
    safe(function () {
      if (!finePointer || reducedMotion) return;
      const photo = document.getElementById('about-photo');
      if (!photo) return;
      const frame = photo.querySelector('.photo-frame');
      photo.addEventListener('mousemove', function (e) {
        const r = photo.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        frame.style.transform =
          'perspective(800px) rotateY(' + (px * 9) + 'deg) rotateX(' + (-py * 9) + 'deg)';
      });
      photo.addEventListener('mouseleave', function () {
        frame.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
      });
    });

    /* ── Unified scroll loop: progress, nav, parallax, deck,
          word highlights, rail fills, photo drift, marquee skew ── */
    safe(function () {
      const nav = document.getElementById('nav');
      const progress = document.getElementById('scroll-progress');
      const heroInner = document.getElementById('hero-inner');
      const deckCards = Array.prototype.slice.call(document.querySelectorAll('.stack-card'));
      deckCards.forEach(function (c, i) { c.style.setProperty('--stack-i', String(i)); });
      const chapters = Array.prototype.slice.call(document.querySelectorAll('.chapter'));
      const chapterPhotos = Array.prototype.slice.call(document.querySelectorAll('.chapter-photo'));
      const marqueeOuters = Array.prototype.slice.call(document.querySelectorAll('.tech-track-outer, .connect-marquee'));

      let lastY = window.scrollY;
      let skew = 0;
      let ticking = false;

      function onScroll() {
        ticking = false;
        const sy = window.scrollY;
        const h = vh();

        nav.classList.toggle('scrolled', sy > 60);
        const max = document.documentElement.scrollHeight - h;
        progress.style.transform = 'scaleX(' + (max > 0 ? sy / max : 0) + ')';

        if (!reducedMotion) {
          /* Hero exit parallax */
          if (heroInner && sy < h * 1.2) {
            heroInner.style.transform = 'translateY(' + sy * 0.22 + 'px)';
            heroInner.style.opacity = clamp(1 - sy / (h * 0.85), 0, 1);
          }

          /* Stack deck: previous card recedes as next covers it */
          for (let i = 0; i < deckCards.length - 1; i++) {
            const cr = deckCards[i].getBoundingClientRect();
            const nr = deckCards[i + 1].getBoundingClientRect();
            const p = clamp((cr.bottom - nr.top) / Math.max(cr.height, 1), 0, 1);
            deckCards[i].style.transform = 'scale(' + (1 - p * 0.05) + ')';
            deckCards[i].style.filter = 'brightness(' + (1 - p * 0.35) + ')';
          }

          /* Scroll-driven word highlight */
          scrollWordEls.forEach(function (item) {
            const r = item.el.getBoundingClientRect();
            const start = h * 0.85;
            const end = h * 0.45;
            const p = clamp((start - r.top) / (start - end + r.height), 0, 1);
            const n = item.words.length;
            for (let i = 0; i < n; i++) {
              const v = clamp(p * n - i, 0, 1);
              item.words[i].style.opacity = 0.18 + 0.82 * v;
            }
          });

          /* Chapter rail progress */
          chapters.forEach(function (ch) {
            const fill = ch.querySelector('.chapter-rail-fill');
            if (!fill) return;
            const r = ch.getBoundingClientRect();
            const p = clamp((h * 0.7 - r.top) / Math.max(r.height, 1), 0, 1);
            fill.style.transform = 'scaleY(' + p + ')';
          });

          /* Chapter photos drift at different rates */
          chapterPhotos.forEach(function (ph, i) {
            const r = ph.getBoundingClientRect();
            const d = (r.top + r.height / 2 - h / 2) / h;
            const factor = ((i % 3) - 1) * 16;
            ph.style.setProperty('--drift', (d * factor).toFixed(1) + 'px');
          });

          /* Velocity-reactive marquee skew */
          const target = clamp((sy - lastY) * 0.35, -7, 7);
          skew += (target - skew) * 0.15;
          marqueeOuters.forEach(function (m) {
            m.style.transform = 'skewX(' + skew.toFixed(2) + 'deg)';
          });
        }
        lastY = sy;
      }

      window.addEventListener('scroll', function () {
        if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
      }, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    });

    /* ── Sydney local time in footer ── */
    safe(function () {
      const timeEl = document.getElementById('local-time');
      if (!timeEl) return;
      function setTime() {
        try {
          timeEl.textContent = new Intl.DateTimeFormat('en-AU', {
            timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: true
          }).format(new Date()) + ' AEST';
        } catch (e) { timeEl.textContent = ''; }
      }
      setTime();
      setInterval(setTime, 30000);
    });
  }
})();
