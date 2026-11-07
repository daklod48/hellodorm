// v3 (round 5): real street map (Leaflet 1.9.4, copied from npm into vendor/leaflet, no CDN) with OpenStreetMap tiles,
// and walking routes from the FOSSGIS OSRM service. This file and Leaflet load only when a map opens (Stands screen,
// or "Walking route" in a pickup box), so Home stays as fast as before.
// If Leaflet or the tiles cannot load, the caller falls back to the drawn map, so Stands never goes blank.

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_CREDIT = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
// Machine address for code (the app fills in the curly brackets). Human page: https://routing.openstreetmap.de/about.html
const ROUTE_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/{fromLon},{fromLat};{toLon},{toLat}?overview=full&geometries=geojson';

let leafletP = null;
// Load Leaflet's style sheet and code once. Rejects after 8 s, so a blocked file never leaves an empty box.
export function loadLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (leafletP) return leafletP;
  leafletP = new Promise((resolve, reject) => {
    const base = new URL('./vendor/leaflet/', import.meta.url).href;
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = base + 'leaflet.css'; css.dataset.leaflet = '1';
      document.head.appendChild(css);
    }
    const s = document.createElement('script'); s.src = base + 'leaflet.js'; s.async = true;
    const timer = setTimeout(() => reject(new Error('leaflet timeout')), 8000);
    s.onload = () => { clearTimeout(timer); window.L && window.L.map ? resolve(window.L) : reject(new Error('leaflet missing')); };
    s.onerror = () => { clearTimeout(timer); reject(new Error('leaflet failed')); };
    document.head.appendChild(s);
  }).catch((e) => { leafletP = null; throw e; });
  return leafletP;
}

// Make a map in `el`. The mouse wheel and (on touch screens) one finger dragging start only after the map is clicked or
// tapped once, so scrolling the page never gets caught by the map. onFail() is called if no tile loads within 7 s.
export async function makeMap(el, { center, zoom = 12, onFail, hint } = {}) {
  const L = await loadLeaflet();
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const map = L.map(el, { scrollWheelZoom: false, dragging: !touch, zoomControl: true, attributionControl: true, center: [center.lat, center.lon], zoom, keyboard: true });
  map.attributionControl.setPrefix(false);
  const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: OSM_CREDIT, crossOrigin: false });
  let loaded = 0, failed = false;
  tiles.on('tileload', () => { loaded += 1; el.dataset.tiles = String(loaded); });
  tiles.addTo(map);
  const failTimer = setTimeout(() => { if (!loaded && !failed) { failed = true; if (onFail) onFail(); } }, 7000);
  map.on('unload', () => clearTimeout(failTimer));
  const wake = () => {
    if (el.dataset.awake) return;
    el.dataset.awake = '1';
    map.scrollWheelZoom.enable(); map.dragging.enable();
    const h = el.parentElement && el.parentElement.querySelector('.map-hint'); if (h) h.hidden = true;
  };
  map.on('click', wake); map.on('focus', wake); // a tap that does not move counts as a click in Leaflet
  // Leaving the map with the mouse puts the wheel back to page scrolling.
  el.addEventListener('mouseleave', () => { if (!touch) { map.scrollWheelZoom.disable(); delete el.dataset.awake; const h = el.parentElement && el.parentElement.querySelector('.map-hint'); if (h) h.hidden = false; } });
  if (hint) el.setAttribute('aria-label', hint);
  return { L, map };
}

// A stand pin: a round label with the number of items waiting there; the user's own dorm is larger and dark.
export function pinIcon(L, { n, me, label }) {
  return L.divIcon({
    className: 'lpin-wrap',
    html: `<span class="lpin ${me ? 'me' : ''}"><b>${n}</b></span><span class="lpin-l">${label}</span>`,
    iconSize: [46, 46], iconAnchor: [23, 23], popupAnchor: [0, -24],
  });
}

// ---------- Walking route (FOSSGIS OSRM, foot profile) ----------
// At most 1 request per second (the service's usage policy), only after a tap, results kept for the session.
let lastAt = 0;
const cache = new Map();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function walkRoute(from, to) {
  const key = [from.lat, from.lon, to.lat, to.lon].map((v) => v.toFixed(5)).join(',');
  if (cache.has(key)) return cache.get(key);
  const gap = Date.now() - lastAt;
  if (gap < 1000) await wait(1000 - gap);
  lastAt = Date.now();
  const url = ROUTE_URL.replace('{fromLon}', from.lon).replace('{fromLat}', from.lat).replace('{toLon}', to.lon).replace('{toLat}', to.lat);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error('route http ' + r.status);
    const j = await r.json();
    const rt = j && j.code === 'Ok' && j.routes && j.routes[0];
    if (!rt) throw new Error('no route');
    const out = { m: rt.distance, s: rt.duration, line: rt.geometry.coordinates.map(([lon, lat]) => [lat, lon]) };
    cache.set(key, out);
    return out;
  } finally { clearTimeout(timer); }
}

export function googleWalkLink(from, to) {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=walking`;
}
