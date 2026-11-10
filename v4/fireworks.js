// v3 (round 5): a short celebration burst for the first welcome, drawn in code on a canvas (no image, no library).
// Our greens plus a little sunflower, at most 2.4 s, a tap anywhere stops it, and it never starts when the device asks
// for reduced motion (the caller checks that and shows a still card instead). Loaded only when the welcome scene opens.

const COLOURS = ['#17754A', '#2E9A66', '#0F5C39', '#7CC9A0', '#B8E3CB', '#F4B740'];
export const MAX_MS = 2400;

// host: where the burst is drawn. Inside the welcome card (v3 fresh eyes review) the canvas sits BEHIND the text,
// so the words stay readable during the burst; with document.body it covers the screen.
export function fireworks(host = document.body) {
  const c = document.createElement('canvas');
  const inBox = host !== document.body;
  c.className = 'fw-canvas' + (inBox ? ' in-box' : '');
  const W = () => (inBox ? host.clientWidth : innerWidth), Hh = () => (inBox ? host.clientHeight : innerHeight);
  c.setAttribute('aria-hidden', 'true');
  host.appendChild(c);
  const ctx = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => { c.width = W() * dpr; c.height = Hh() * dpr; c.style.width = W() + 'px'; c.style.height = Hh() + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size();
  const parts = [];
  // Three bursts, a short time apart, around the top half of the screen.
  const bursts = inBox ? [[0.5, 0.16, 0], [0.18, 0.12, 260], [0.82, 0.14, 480]] : [[0.5, 0.32, 0], [0.24, 0.24, 260], [0.76, 0.26, 480]];
  const t0 = performance.now();
  const fired = new Set();
  let raf = 0, done = false;
  function fire(fx, fy) {
    const x = W() * fx, y = Hh() * fy, n = 46;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.2, v = 2.2 + Math.random() * 3.2;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, r: 2 + Math.random() * 2.5, col: COLOURS[(Math.random() * COLOURS.length) | 0], leaf: Math.random() < 0.3, rot: Math.random() * 6 });
    }
  }
  function frame(now) {
    const el = now - t0;
    bursts.forEach(([fx, fy, at], i) => { if (el >= at && !fired.has(i)) { fired.add(i); fire(fx, fy); } });
    ctx.clearRect(0, 0, W(), Hh());
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.985; p.vy *= 0.985; p.life -= 0.012; p.rot += 0.08;
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
      ctx.fillStyle = p.col;
      if (p.leaf) { // a small leaf: an ellipse turned as it falls
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.r * 2, p.r, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    if (el < MAX_MS) raf = requestAnimationFrame(frame); else stop();
  }
  function stop() {
    if (done) return;
    done = true; cancelAnimationFrame(raf);
    c.classList.add('out');
    setTimeout(() => c.remove(), 220);
    removeEventListener('pointerdown', stop, true);
    removeEventListener('keydown', stop, true);
    removeEventListener('resize', size);
  }
  addEventListener('pointerdown', stop, true); // a tap skips it
  addEventListener('keydown', stop, true);
  addEventListener('resize', size);
  raf = requestAnimationFrame(frame);
  return { stop, canvas: c };
}
