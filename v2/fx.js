// HelloDorm motion helpers (Part 2): layered background with parallax, scroll reveal, leaf burst,
// fly-to-cart, leaf confetti and screen transitions. Everything animates transform and opacity only.
// When the user prefers reduced motion, every helper here becomes a no-op and the page stays usable.

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LEAF = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5C13 3.5 6.8 7.2 4.6 13.4c-.9 2.6-.6 5.3.6 7.1l.9-.1c.3-3.8 2.1-7.3 5.3-10.3-2.4 3.2-3.6 6.6-3.6 10.1 6.4.7 11.6-3.2 12.9-9.9.4-2.1.3-4.6-.2-6.8z"/></svg>';
const SVG_LEAF_BG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5C13 3.5 6.8 7.2 4.6 13.4c-.9 2.6-.6 5.3.6 7.1l.9-.1c.3-3.8 2.1-7.3 5.3-10.3-2.4 3.2-3.6 6.6-3.6 10.1 6.4.7 11.6-3.2 12.9-9.9.4-2.1.3-4.6-.2-6.8z"/></svg>';
const rnd = (a, b) => a + Math.random() * (b - a);

let fxLayer, bgLayer, px = 0, py = 0, tx = 0, ty = 0, raf = 0;

function ensureLayers() {
  if (!bgLayer) {
    bgLayer = document.getElementById('bg') || Object.assign(document.createElement('div'), { id: 'bg' });
    if (!bgLayer.parentNode) document.body.prepend(bgLayer);
    bgLayer.innerHTML = `<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
      <div class="leaf l1">${SVG_LEAF_BG}</div><div class="leaf l2">${SVG_LEAF_BG}</div><div class="leaf l3">${SVG_LEAF_BG}</div>`;
  }
  if (!fxLayer) {
    fxLayer = document.getElementById('fx') || Object.assign(document.createElement('div'), { id: 'fx' });
    if (!fxLayer.parentNode) document.body.append(fxLayer);
  }
}

// Pointer and scroll parallax: writes --px, --py (-1 to 1) and --scroll (px) on :root, eased each frame.
function parallax() {
  if (reduced()) return;
  const root = document.documentElement;
  const tick = () => {
    px += (tx - px) * 0.06; py += (ty - py) * 0.06;
    root.style.setProperty('--px', px.toFixed(3)); root.style.setProperty('--py', py.toFixed(3));
    raf = (Math.abs(tx - px) > 0.002 || Math.abs(ty - py) > 0.002) ? requestAnimationFrame(tick) : 0;
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  let sraf = 0;
  window.addEventListener('scroll', () => {
    if (sraf) return;
    sraf = requestAnimationFrame(() => { root.style.setProperty('--scroll', String(Math.min(window.scrollY, 1200))); sraf = 0; });
  }, { passive: true });
}

// Scroll reveal with stagger: top-level blocks of the current screen and every card in a grid.
let io;
function reveal(root = document.getElementById('view')) {
  if (!root) return;
  if (reduced()) { root.querySelectorAll('.reveal').forEach((el) => el.classList.add('in')); return; }
  if (!io) io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  const section = root.querySelector('section');
  if (!section) return;
  const blocks = [...section.children].filter((el) => !el.matches('.hello, form, .grid, .list, .progress'));
  blocks.forEach((el, i) => { el.classList.add('reveal'); el.style.setProperty('--i', String(Math.min(i, 8))); });
  section.querySelectorAll('.grid > .card, .list > *, .how-steps > li, .cat-pick > .pick, .stat-grid > .stat').forEach((el, i) => {
    el.classList.add('reveal'); el.style.setProperty('--i', String(i % 8));
  });
  // Anything already in view appears on the next frame; the rest waits for the observer.
  requestAnimationFrame(() => root.querySelectorAll('.reveal:not(.in)').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.95 && r.bottom > 0) el.classList.add('in'); else io.observe(el);
  }));
}

// Leaves fly out from a point (used when Donate is picked).
function burst(x, y, n = 16) {
  if (reduced()) return; ensureLayers();
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span'); el.className = 'leafp'; el.innerHTML = LEAF;
    el.style.color = ['#17754A', '#2E9A66', '#9FD2B6', '#F4B740'][i % 4];
    fxLayer.append(el);
    const a = -Math.PI / 2 + rnd(-1.1, 1.1), d = rnd(90, 200), s = rnd(.9, 1.5);
    el.style.width = el.style.height = '22px';
    el.animate([
      { transform: `translate(${x - 11}px, ${y - 11}px) scale(.5) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${x - 11 + Math.cos(a) * d}px, ${y - 11 + Math.sin(a) * d}px) scale(${s}) rotate(${rnd(-160, 160)}deg)`, opacity: 1, offset: .55 },
      { transform: `translate(${x - 11 + Math.cos(a) * d * 1.1}px, ${y - 11 + Math.sin(a) * d + 90}px) scale(${s * .9}) rotate(${rnd(-300, 300)}deg)`, opacity: 0 },
    ], { duration: rnd(900, 1400), easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'forwards' }).onfinish = () => el.remove();
  }
}

// Leaf confetti falling from the top (success screens).
function celebrate(n = 36) {
  if (reduced()) return; ensureLayers();
  const w = innerWidth;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span'); el.className = 'leafp'; el.innerHTML = LEAF;
    el.style.color = ['#17754A', '#2E9A66', '#9FD2B6', '#F4B740', '#FDE7B0'][i % 5];
    el.style.width = el.style.height = `${rnd(12, 22)}px`;
    fxLayer.append(el);
    const x = rnd(0, w), drift = rnd(-80, 80), delay = rnd(0, 500);
    el.animate([
      { transform: `translate(${x}px, -30px) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${x + drift * .3}px, ${innerHeight * .25}px) rotate(${rnd(90, 200)}deg)`, opacity: 1, offset: .25 },
      { transform: `translate(${x + drift}px, ${innerHeight + 40}px) rotate(${rnd(300, 720)}deg)`, opacity: .9 },
    ], { duration: rnd(1600, 2600), delay, easing: 'cubic-bezier(.3, .2, .6, 1)', fill: 'forwards' }).onfinish = () => el.remove();
  }
}

// A thumbnail flies from the pressed button to the cart icon, then the count bumps.
function flyToCart(btn) {
  const target = document.getElementById('cartLink');
  const bump = () => { const c = document.getElementById('cartCount'); if (c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } };
  if (reduced() || !target || !btn) { setTimeout(bump, 50); return; }
  ensureLayers();
  const host = btn.closest('.card, .detail, .cart-row') || btn.parentElement;
  const img = host && host.querySelector('img, .tile');
  const from = (img || btn).getBoundingClientRect(), to = target.getBoundingClientRect();
  const el = img && img.tagName === 'IMG' ? Object.assign(document.createElement('img'), { src: img.currentSrc || img.src, alt: '' }) : Object.assign(document.createElement('span'), { style: 'background:var(--mint-2)' });
  el.className = 'fly'; fxLayer.append(el);
  const sx = from.left + from.width / 2 - 28, sy = from.top + from.height / 2 - 28;
  const ex = to.left + to.width / 2 - 28, ey = to.top + to.height / 2 - 28;
  el.animate([
    { transform: `translate(${sx}px, ${sy}px) scale(1)`, opacity: 1 },
    { transform: `translate(${(sx + ex) / 2}px, ${Math.min(sy, ey) - 80}px) scale(.8)`, opacity: 1, offset: .5 },
    { transform: `translate(${ex}px, ${ey}px) scale(.2)`, opacity: .2 },
  ], { duration: 650, easing: 'cubic-bezier(.3, 0, .2, 1)', fill: 'forwards' }).onfinish = () => { el.remove(); setTimeout(bump, 60); };
}

// Screen change: View Transitions where supported, a short fade and rise otherwise.
function transition(paint) {
  const view = document.getElementById('view');
  if (reduced() || document.hidden) { paint(); return; }
  if (document.startViewTransition) {
    // The update callback normally runs on the next frame; if the tab is throttled it may not, so paint after 250 ms regardless.
    let done = false; const run = () => { if (!done) { done = true; paint(); } };
    const vt = document.startViewTransition(run); vt.ready.catch(() => {}); vt.updateCallbackDone.catch(() => {}); vt.finished.catch(() => {});
    setTimeout(run, 250);
    return;
  }
  view.classList.remove('enter'); void view.offsetWidth; paint(); view.classList.add('enter');
}

function init() {
  ensureLayers(); parallax();
}

window.HD_FX = { init, reveal, burst, celebrate, flyToCart, transition, reduced };
export default window.HD_FX;
