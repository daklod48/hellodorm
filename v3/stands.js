// v3 (round 5): the Stands screen, real map and walking routes, moved out of app.js so Home downloads less (loaded on first use; see lazy() in app.js).
// The code is unchanged; app.js hands over the helpers it uses in H.
export function install(H) {
  const { $, DORMS, RIVER, S, SCREENS, askStandCard, availableItems, distanceM, dormById, esc, fail, fmtDist, go, hoursTxt, ic, locale, locate, myDorm, openBadge, pipPose, t, toast } = H;
// ---------- Stands (v3: real street map with walking routes; the v2 drawn map stays as the fallback) ----------
const standCount = (id) => availableItems().filter((i) => i.dorm === id).length;
// The v2 drawn map (SVG from real coordinates). Shown only if Leaflet or the map tiles cannot load.
function drawnMap() {
  const lat = DORMS.map((d) => d.lat), lon = DORMS.map((d) => d.lon);
  const [la0, la1, lo0, lo1] = [Math.min(...lat) - 0.008, Math.max(...lat) + 0.008, Math.min(...lon) - 0.012, Math.max(...lon) + 0.012];
  // On a phone the map is drawn about as wide as the screen, so 1 map unit is about 1 pixel and the 12 px pin numbers stay readable.
  const phone = window.matchMedia('(max-width: 599px)').matches;
  const W = phone ? 360 : 800, HIT = phone ? 24 : 54, H = Math.round(W * ((la1 - la0) / ((lo1 - lo0) * Math.cos(50.08 * Math.PI / 180))));
  const xy = (p) => [((p.lon - lo0) / (lo1 - lo0)) * W, ((la1 - p.lat) / (la1 - la0)) * H];
  return `<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('map_aria')}">
    <rect width="${W}" height="${H}" rx="16" class="map-bg"/>
    <path class="river" d="${RIVER.map((p, i) => (i ? 'L' : 'M') + xy(p).map((v) => v.toFixed(0)).join(' ')).join(' ')}"/>
    ${DORMS.map((d) => { const [x, y] = xy(d); const me = d.id === S.prof.dorm; return `<g class="pin ${me ? 'me' : ''}" data-act="stand-pin" data-id="${d.id}" tabindex="0" role="button" aria-label="${esc(d.name)}"><circle class="hit" cx="${x}" cy="${y}" r="${HIT}"/><circle cx="${x}" cy="${y}" r="${me ? 15 : 12}"/><text x="${x}" y="${y + 4}" text-anchor="middle" class="pin-n">${standCount(d.id)}</text><text x="${x + 18}" y="${y + 5}" class="pin-l">${esc(d.short)}</text></g>`; }).join('')}
    ${S.pos ? (() => { const [x, y] = xy(S.pos); return `<g class="you"><circle cx="${x}" cy="${y}" r="7"/><text x="${x + 12}" y="${y + 18}" class="pin-l">${t('you_are_here')}</text></g>`; })() : ''}
  </svg>`;
}
const mapCredit = () => `<p class="map-credit">${t('map_credit_osm')} · <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener">${t('map_credit_route')}</a> · Leaflet</p>`;

// Lazy map code: map.js and Leaflet are fetched only here, never on Home.
let mapModP = null;
const loadMapMod = () => (mapModP ||= import('./map.js').catch((e) => { mapModP = null; throw e; }));
// Where a walk starts: the user's location if they shared it, otherwise their dorm.
function routeFrom() {
  if (S.pos) return { lat: S.pos.lat, lon: S.pos.lon, name: t('your_location'), pos: true };
  const d = myDorm();
  return d ? { lat: d.lat, lon: d.lon, name: d.short, id: d.id } : null;
}
const fmtKm = (m) => `${new Intl.NumberFormat(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(m / 1000)} km`;

// Draws the walking route to stand d on a live map (if there is one) and writes distance and minutes into the panel.
async function routeTo(d, panel, live) {
  if (!panel) return;
  panel.dataset.live = '1';
  const from = routeFrom();
  const locBtn = `<button class="btn outline sm" data-act="route-loc" data-id="${d.id}">${ic('locate-fixed')}${t('route_use_loc')}</button>`;
  if (!from) { panel.innerHTML = `<p class="meta">${ic('info')}<span>${t('route_need_from')}</span></p><div class="row-btns"><button class="btn primary sm" data-act="dorm">${t('choose_dorm')}</button>${locBtn}</div>`; return; }
  if (!from.pos && from.id === d.id) { panel.innerHTML = `<p class="meta route-same">${ic('circle-check')}<span>${t('route_same', { d: d.short })}</span></p>${locBtn}`; return; }
  const gm = (M) => M.googleWalkLink(from, d);
  panel.innerHTML = `<p class="meta">${ic('footprints')}<span>${t('route_finding', { a: esc(from.name), b: esc(d.short) })}</span></p>`;
  let M;
  try { M = await loadMapMod(); } catch (e) { panel.innerHTML = routeFail(`https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${d.lat},${d.lon}&travelmode=walking`); return; }
  try {
    const r = await M.walkRoute(from, d);
    const min = Math.max(1, Math.round(r.s / 60));
    if (live && live.map) {
      const { L, map } = live;
      if (live.line) live.line.remove();
      if (live.start) live.start.remove();
      live.line = L.polyline(r.line, { color: '#17754A', weight: 6, opacity: 0.9 }).addTo(map);
      live.start = L.circleMarker([from.lat, from.lon], { radius: 9, color: '#0B3D2E', weight: 3, fillColor: '#F4B740', fillOpacity: 1 }).addTo(map).bindTooltip(esc(from.name));
      map.fitBounds(live.line.getBounds(), { padding: [36, 36] });
      if (map.closePopup) map.closePopup();
    }
    panel.innerHTML = `<div class="route-res" data-km="${(r.m / 1000).toFixed(1)}" data-min="${min}">${ic('footprints')}<div><b>${t('route_from_to', { a: esc(from.name), b: esc(d.short) })}</b>
      <p class="route-num"><span>${fmtKm(r.m)}</span> · <span>${t('route_min', { n: min })}</span></p>
      <p class="meta small"><span>${t(from.pos ? 'route_from_pos' : 'route_from_dorm2', { a: esc(from.name) })}</span></p></div></div>
      <p class="meta small"><a class="gm-link" href="${gm(M)}" target="_blank" rel="noopener">${ic('external-link')}<span>${t('open_gmaps')}</span></a></p>
      ${from.pos ? '' : locBtn}`;
  } catch (e) { panel.innerHTML = routeFail(gm(M)); }
}
const routeFail = (href) => `<div class="route-res fail" data-fail="1">${ic('triangle-alert')}<div><b>${t('route_fail')}</b>
  <p class="meta small"><a class="gm-link" href="${href}" target="_blank" rel="noopener">${ic('external-link')}<span>${t('open_gmaps')}</span></a></p></div></div>`;

function standPopup(d) {
  const me = d.id === S.prof.dorm;
  return `<div class="map-pop"><b>${esc(d.name)}</b>${me ? ` <span class="pill green">${t('your_dorm')}</span>` : ''}
    <p class="meta small"><span>${t('n_items', { n: standCount(d.id) })}</span></p>
    <p class="meta small">${openBadge(d)}</p>
    <div class="row-btns"><button class="btn primary sm" data-act="route" data-id="${d.id}">${ic('footprints')}${t('walk_route')}</button>
    <button class="btn outline sm" data-act="stand-items" data-id="${d.id}">${t('see_items')}</button></div></div>`;
}

// The Stands map. The map element is kept across re-renders (data-keep), so live updates do not rebuild it.
async function initStandsMap() {
  const el = $('#standsMap');
  if (!el || el.dataset.live) return;
  el.dataset.live = '1';
  const fallback = () => {
    const w = $('#standsMapBox');
    if (!w || w.dataset.fallback) return;
    w.dataset.fallback = '1'; S.liveMap = null;
    w.innerHTML = `${drawnMap()}<p class="meta small" id="mapFallback">${ic('info')}<span>${t('map_fallback')}</span></p>`;
  };
  try {
    const M = await loadMapMod();
    const c = myDorm() || { lat: 50.075, lon: 14.44 };
    const { L, map } = await M.makeMap(el, { center: c, zoom: 12, onFail: fallback, hint: t('map_aria_real') });
    const live = { L, map, markers: {} };
    S.liveMap = live; el.hdMap = map; // hdMap: lets the checks read the zoom level
    DORMS.forEach((d) => {
      const me = d.id === S.prof.dorm;
      const m = L.marker([d.lat, d.lon], { icon: M.pinIcon(L, { n: standCount(d.id), me, label: esc(d.short) }), title: d.name, alt: d.name, keyboard: true, riseOnHover: true, zIndexOffset: me ? 1000 : 0 }).addTo(map);
      m.bindPopup(() => standPopup(d), { autoPanPaddingTopLeft: L.point(72, 124), autoPanPaddingBottomRight: L.point(16, 44), maxWidth: 260, minWidth: 200 });
      live.markers[d.id] = m;
    });
    if (S.pos) L.circleMarker([S.pos.lat, S.pos.lon], { radius: 9, color: '#0B3D2E', weight: 3, fillColor: '#F4B740', fillOpacity: 1 }).addTo(map).bindTooltip(t('you_are_here'));
    map.fitBounds(DORMS.map((d) => [d.lat, d.lon]), { padding: [28, 28] });
    if (S.routeTo) { const id = S.routeTo; S.routeTo = null; routeTo(dormById(id), $('#routePanel'), live); }
  } catch (e) { fallback(); }
}

// Pickup box: a small map with the stand and the walking route, opened by a tap on "Walking route" (button: mapBox in app.js).
async function openPboxRoute(d, box) {
  box.dataset.live = '1';
  box.innerHTML = `<div class="real-map small" id="pmap-${d.id}" role="region" aria-label="${t('map_aria_real')}"></div>
    <p class="map-hint">${ic('info')}<span>${t('map_hint')}</span></p>
    <div class="route-panel" aria-live="polite"></div>${mapCredit()}`;
  const panel = box.querySelector('.route-panel'), el = box.querySelector('.real-map');
  let live = null;
  try {
    const M = await loadMapMod();
    const { L, map } = await M.makeMap(el, { center: d, zoom: 14, hint: t('map_aria_real'), onFail: () => { el.hidden = true; } });
    live = { L, map };
    L.marker([d.lat, d.lon], { icon: M.pinIcon(L, { n: standCount(d.id), me: d.id === S.prof.dorm, label: esc(d.short) }), title: d.name, alt: d.name }).addTo(map);
  } catch (e) { el.hidden = true; }
  box._live = live;
  routeTo(d, panel, live);
}

SCREENS.stands = (view) => {
  view = view === 'list' ? 'list' : 'map';
  const base = S.pos || myDorm();
  const list = [...DORMS].sort((a, b) => (base ? distanceM(base, a) - distanceM(base, b) : a.name.localeCompare(b.name)));
  return {
    title: t('nav_stands'),
    html: `<section>
      <div class="sec-head"><h2 class="screen-h">${t('stands_t')}</h2>
        <div class="seg"><a href="#/stands/map" class="${view === 'map' ? 'on' : ''}">${ic('map')}${t('map')}</a><a href="#/stands/list" class="${view !== 'map' ? 'on' : ''}">${ic('list')}${t('list')}</a></div></div>
      <p class="muted">${t('stands_b')}</p>
      <button class="btn outline sm" data-act="locate">${ic('navigation')}${t('use_location')}</button>
      <div class="${view === 'map' ? 'cols wide' : ''}"><div class="main">
      ${view === 'map' ? `<div class="map-box" id="standsMapBox" data-keep="standsMapBox"><div class="real-map" id="standsMap" role="region" aria-label="${t('map_aria_real')}"></div>
        <p class="map-hint">${ic('info')}<span>${t('map_hint')}</span></p></div>
        <div class="route-panel" id="routePanel" data-keep="routePanel" aria-live="polite"><p class="meta small">${ic('footprints')}<span>${t('route_hint')}</span></p></div>
        ${mapCredit()}` : ''}
      </div><div class="${view === 'map' ? 'side scroll' : ''}">
      <div class="list stands-list ${view === 'map' ? '' : 'two'}">${list.map((d) => `<div class="row-card" id="stand-${d.id}">
        <span class="stand-ic ${d.id === S.prof.dorm ? 'me' : ''}">${ic('store')}</span>
        <div><b>${esc(d.name)} ${d.id === S.prof.dorm ? `<span class="pill green">${t('your_dorm')}</span>` : ''} ${d.full ? `<span class="pill red">${ic('ban')}${t('full_today')}</span>` : ''}</b>
          <p class="meta"><span>${esc(d.address)}${base ? ' · ' + fmtDist(distanceM(base, d)) : ''}</span></p>
          <p class="meta small">${ic('clock')}<span>${hoursTxt()} · ${t('n_items', { n: standCount(d.id) })}</span></p>
          <p class="meta small">${openBadge(d)}</p>
          <div class="row-btns">${d.id !== S.prof.dorm || S.pos ? `<button class="btn outline sm" data-act="route" data-id="${d.id}">${ic('footprints')}${t('walk_route')}</button>` : ''}
          <button class="btn outline sm" data-act="pick-dorm" data-id="${d.id}">${d.id === S.prof.dorm ? ic('check') : ''}${t(d.id === S.prof.dorm ? 'your_dorm' : 'set_mine')}</button></div></div></div>`).join('')}</div>
      ${askStandCard()}
      </div></div>
    </section>`,
    after() { if (view === 'map') initStandsMap(); },
  };
};


  return { routeTo, openPboxRoute, initStandsMap };
}
