// ---------- Background: meteor shower + rising sparkles ----------
(function backgroundFX() {
  const canvas = document.getElementById("fx");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0,
    H = 0,
    dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  // --- static stars ---
  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.1 + 0.3,
    p: Math.random() * Math.PI * 2,
  }));

  // --- rising sparkles ---
  const COLORS = ["#38bdf8", "#a855f7", "#ffffff", "#c4b5fd", "#67e8f9"];
  const sparkles = [];
  function newSparkle(randomY) {
    return {
      x: Math.random() * W,
      y: randomY ? Math.random() * H : H + 10,
      r: Math.random() * 1.8 + 0.6,
      vy: -(Math.random() * 0.45 + 0.2),
      sway: Math.random() * 1.2 + 0.4,
      ph: Math.random() * Math.PI * 2,
      tw: Math.random() * 0.05 + 0.02,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    };
  }
  const SPARKLE_COUNT = Math.round(
    Math.min(120, Math.max(50, (W * H) / 14000)),
  );
  for (let i = 0; i < SPARKLE_COUNT; i++) sparkles.push(newSparkle(true));

  // --- meteors ---
  const meteors = [];
  let nextMeteor = 0;
  function spawnMeteor() {
    const speed = Math.random() * 9 + 9;
    const angle = (Math.PI / 180) * (Math.random() * 10 + 30); // ~30-40deg down-left
    meteors.push({
      x: Math.random() * (W * 1.3) - W * 0.1 + W * 0.3,
      y: -40 - Math.random() * H * 0.3,
      vx: -Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: Math.random() * 160 + 120,
      w: Math.random() * 1.4 + 0.8,
      life: 1,
      hue: Math.random() < 0.7 ? "56,189,248" : "196,181,253",
    });
  }

  let t = 0,
    last = performance.now();
  function draw(now) {
    const dt = Math.min((now - last) / (1000 / 60), 3);
    last = now;
    t += dt;
    ctx.clearRect(0, 0, W, H);

    // stars
    for (const s of stars) {
      const a = 0.35 + 0.35 * Math.sin(t * 0.03 + s.p);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduce) {
      // sparkles
      for (let i = 0; i < sparkles.length; i++) {
        const p = sparkles[i];
        p.y += p.vy * dt;
        p.x += Math.sin(t * 0.02 + p.ph) * p.sway * 0.3 * dt;
        p.ph += p.tw * dt;
        if (p.y < -10) sparkles[i] = newSparkle(false);
        const a = 0.35 + 0.65 * Math.abs(Math.sin(p.ph * 1.7));
        ctx.globalAlpha = a;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.c;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // meteors
      if (now > nextMeteor) {
        spawnMeteor();
        if (Math.random() < 0.3) spawnMeteor(); // occasional pair
        nextMeteor = now + 500 + Math.random() * 1400;
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y > H + m.len || m.x < -m.len) {
          meteors.splice(i, 1);
          continue;
        }
        const n = Math.hypot(m.vx, m.vy);
        const tx = m.x - (m.vx / n) * m.len,
          ty = m.y - (m.vy / n) * m.len;
        const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
        g.addColorStop(0, `rgba(255,255,255,0.95)`);
        g.addColorStop(0.15, `rgba(${m.hue},0.8)`);
        g.addColorStop(1, `rgba(${m.hue},0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = m.w;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // bright head
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgb(${m.hue})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.w * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      requestAnimationFrame(draw);
    }
  }
  requestAnimationFrame(draw);
})();
