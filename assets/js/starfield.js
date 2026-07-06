/* Night-sky starfield behind the page content: ice-blue stars drift and
   twinkle; on fine pointers they gently repel from the cursor and a soft
   aurora glow trails it. Static single frame under reduced motion; paused
   while the tab is hidden. The hero's opaque shader covers it up top, so
   it only reads once you scroll past the aurora. */
(function () {
  const canvas = document.getElementById('bg-stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  const GLOW_R = 320;    // cursor glow radius
  const PUSH_R = 200;    // star repel radius
  const SKY = 'rgba(125,211,252,';   // #7dd3fc
  const PERI = 'rgba(165,180,252,';  // #a5b4fc

  let W, H, stars = [];
  let mx = -9999, my = -9999;  // raw cursor
  let gx = -9999, gy = -9999;  // eased glow position
  let rafId = null;
  let last = performance.now();

  function seed() {
    const count = Math.round(Math.min(240, Math.max(100, (W * H) / 8500)));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.5 + Math.random() * 1.5,
        a: 0.2 + Math.random() * 0.55,
        tw: 0.4 + Math.random() * 1.6,        // twinkle speed
        ph: Math.random() * Math.PI * 2,      // twinkle phase
        vx: -(2 + Math.random() * 5),         // slow drift, px/s
        vy: -(0.5 + Math.random() * 2),
        sky: Math.random() < 0.55,
      });
    }
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function draw(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);

    // aurora-tinted glow trailing the cursor
    if (finePointer && mx > -999) {
      gx += (mx - gx) * 0.08;
      gy += (my - gy) * 0.08;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, GLOW_R);
      g.addColorStop(0, SKY + '0.11)');
      g.addColorStop(0.5, PERI + '0.055)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(gx - GLOW_R, gy - GLOW_R, GLOW_R * 2, GLOW_R * 2);
    }

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < -4) s.x += W + 8;
      if (s.y < -4) s.y += H + 8;

      let alpha = s.a * (0.6 + 0.4 * Math.sin(t * s.tw + s.ph));
      let px = s.x, py = s.y;

      // stars near the cursor brighten and drift away from it
      if (finePointer && mx > -999) {
        const dx = s.x - gx, dy = s.y - gy;
        const d2 = dx * dx + dy * dy;
        if (d2 < PUSH_R * PUSH_R) {
          const d = Math.sqrt(d2) || 1;
          const f = 1 - d / PUSH_R;
          px += (dx / d) * f * 30;
          py += (dy / d) * f * 30;
          alpha = Math.min(1, alpha + f * 0.6);
        }
      }

      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, 6.2832);
      ctx.fillStyle = (s.sky ? SKY : PERI) + alpha.toFixed(3) + ')';
      ctx.fill();
    }
  }

  function frame(now) {
    draw(now);
    rafId = requestAnimationFrame(frame);
  }
  function play() { if (rafId === null && !reducedMotion) rafId = requestAnimationFrame(frame); }
  function pause() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

  resize();
  window.addEventListener('resize', function () { resize(); draw(performance.now()); });

  if (reducedMotion) {
    draw(performance.now()); // static sprinkle of stars, no motion, no glow
    return;
  }

  if (finePointer) {
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (gx < -999) { gx = mx; gy = my; }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () {
      mx = -9999; my = -9999; gx = -9999; gy = -9999;
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else { last = performance.now(); play(); }
  });

  play();
})();
