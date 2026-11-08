// v3 round 6 (8 Nov 2026, owner's professor test): screens loaded on first use, so Home downloads nothing extra.
//  - card payment page (fake, checks only that fields are filled) and the saved card
//  - payout page fakes: Add card, Transfer, Change bank
//  - leaderboard of kg kept out of the bin
//  - "Other" dorm: search OpenStreetMap's Nominatim, or tap the map, or save the name alone
//  - profile photo: choose or take a photo, crop to a circle, WebP at most 50 KB
// app.js hands over its helpers in H (see HOST and the Object.assign at the end of app.js).

export function install(H) {
  const { S, SCREENS, t, ic, esc, $, czk, fmtNum, fmtDate, now, go, render, toast, fail, savePrefs, openModal, closeModal,
    signedIn, uid, db, doc, collection, getDocs, addDoc, checkoutLines, doCheckout, myDorm, maskIban, bump, needAccount,
    empty, pipPose, firstName, DORMS, distanceM, fmtDist } = H;

  // ---------- Card form (checkout and payout) ----------
  // Brand from the first digit, shown as a word in a small box (no brand logos).
  const brandOf = (num) => { const d = String(num).replace(/\D/g, '')[0]; return { 4: 'Visa', 5: 'Mastercard', 2: 'Mastercard', 3: 'Amex', 6: 'Discover' }[d] || ''; };
  const group4 = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
  const expFmt = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
  const savedCard = () => (S.prof.card && S.prof.card.last4 ? S.prof.card : null);
  const brandBox = (b) => `<span class="brand-box ${b ? '' : 'none'}" id="cardBrand" aria-live="polite">${ic('credit-card')}<span>${b || t('card_brand_none')}</span></span>`;

  function cardFields(withSaved) {
    const sc = withSaved ? savedCard() : null;
    return `${sc ? `<fieldset class="saved-card"><legend class="sr">${t('card_choose')}</legend>
        <label class="pay-opt"><input type="radio" name="use" value="saved" checked><span class="box">${ic('check')}</span><span><b>${ic('credit-card')}${t('card_saved', { n: esc(sc.last4) })}</b><small>${esc(sc.brand || '')} · ${esc(sc.exp)} · ${esc(sc.name)}</small></span></label>
        <label class="pay-opt"><input type="radio" name="use" value="new"><span class="box">${ic('check')}</span><span><b>${ic('plus')}${t('card_other')}</b></span></label></fieldset>` : ''}
      <div class="card-fields" id="cardFields" ${sc ? 'hidden' : ''}>
        <label>${t('card_number')}<span class="num-row"><input name="number" inputmode="numeric" autocomplete="off" placeholder="1234 5678 9012 3456" maxlength="23">${brandBox('')}</span></label>
        <label>${t('card_name')}<input name="name" autocomplete="off" maxlength="40" value="${esc(S.prof.name || '')}"></label>
        <div class="row2"><label>${t('card_exp')}<input name="exp" inputmode="numeric" autocomplete="off" placeholder="MM/YY" maxlength="5"></label>
        <label>${t('card_cvc')}<input name="cvc" inputmode="numeric" autocomplete="off" placeholder="123" maxlength="4"></label></div>
      </div>
      <p class="note demo-line">${ic('info')}<span>${t('card_demo_line')}</span></p>`;
  }
  function wireCard(form) {
    const num = form.querySelector('[name=number]'), exp = form.querySelector('[name=exp]'), cvc = form.querySelector('[name=cvc]');
    num.addEventListener('input', () => { num.value = group4(num.value); const b = brandOf(num.value); $('#cardBrand').outerHTML = brandBox(b); });
    exp.addEventListener('input', () => { exp.value = expFmt(exp.value); });
    cvc.addEventListener('input', () => { cvc.value = cvc.value.replace(/\D/g, '').slice(0, 4); });
    form.addEventListener('change', (e) => { if (e.target.name === 'use') $('#cardFields').hidden = e.target.value === 'saved'; });
  }
  // Returns the card to keep (name, expiry, last 4 digits, brand) or an error key. Any made-up value works.
  function readCard(form) {
    const f = new FormData(form);
    if (f.get('use') === 'saved' && savedCard()) return { card: savedCard() };
    const digits = String(f.get('number') || '').replace(/\D/g, ''), name = String(f.get('name') || '').trim();
    const exp = String(f.get('exp') || '').trim(), cvc = String(f.get('cvc') || '').trim();
    if (!digits || !name || !exp || !cvc) return { err: t('card_err_empty') };
    // Kept for next time: name, expiry and ONLY the last 4 digits. Never the full number, never the CVC.
    return { card: { name, exp, last4: digits.slice(-4), brand: brandOf(digits) } };
  }

  SCREENS.card = (arg) => {
    if (!signedIn()) { setTimeout(() => needAccount('checkout/' + arg), 50); return { title: t('card_page_t'), html: '' }; }
    const lines = checkoutLines(arg);
    if (!lines.length) { setTimeout(() => go('cart', true), 0); return { title: t('card_page_t'), html: '' }; }
    const total = lines.reduce((s, x) => s + x.price, 0);
    return {
      title: t('card_page_t'),
      html: `<section class="narrow">
        <ol class="steps" aria-label="${t('checkout')}"><li class="done"><b>1</b>${t('co_step1')}</li><li class="now"><b>2</b>${t('co_step2')}</li><li><b>3</b>${t('co_step3')}</li></ol>
        <div class="pay-page">
          <div class="pay-head">${ic('lock')}<div><h2>${t('card_page_t')}</h2><p class="muted">${t('card_page_b')}</p></div></div>
          <form id="fCard" class="form card-form" novalidate>
            ${cardFields(true)}
            <label class="tickline"><input type="checkbox" name="keep" checked> ${t('card_keep')}</label>
            <div class="total"><span>${t('total')}</span><b>${czk(total)}</b></div>
            <p class="form-err" id="fErr" role="alert"></p>
            <button class="btn primary wide big" type="submit" id="cardPay">${ic('lock')}${t('card_pay', { p: czk(total) })}</button>
            <a class="btn ghost wide" href="#/checkout/${esc(arg)}">${t('back')}</a>
          </form>
        </div>
      </section>`,
      after() {
        const form = $('#fCard'); wireCard(form);
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const r = readCard(form);
          if (r.err) { $('#fErr').textContent = r.err; return; }
          if (new FormData(form).get('keep')) savePrefs({ card: r.card });
          doCheckout(arg, form, 'card');
        });
      },
    };
  };

  // ---------- Payout page fakes ----------
  SCREENS.addcard = () => ({
    title: t('add_card'),
    html: `<section class="narrow">
      <h2 class="screen-h">${t('add_card')}</h2>
      <p class="muted">${t('add_card_b')}</p>
      ${savedCard() ? `<div class="callout">${ic('credit-card')}<div><b>${t('card_saved', { n: esc(savedCard().last4) })}</b><p>${esc(savedCard().brand || '')} · ${esc(savedCard().exp)}</p></div><button class="btn outline sm" data-act="card-remove">${ic('x')}${t('remove')}</button></div>` : ''}
      <form id="fAddCard" class="form card-form" novalidate>${cardFields(false)}
        <p class="form-err" id="fErr" role="alert"></p>
        <button class="btn primary wide big" type="submit">${ic('check')}${t('card_save_btn')}</button>
        <a class="btn ghost wide" href="#/bank">${t('back')}</a></form>
    </section>`,
    after() {
      const form = $('#fAddCard'); wireCard(form);
      form.addEventListener('submit', (e) => { e.preventDefault(); const r = readCard(form); if (r.err) { $('#fErr').textContent = r.err; return; } savePrefs({ card: r.card }); toast(t('card_saved_ok', { n: r.card.last4 })); go('bank'); });
    },
  });

  SCREENS.transfer = (done) => {
    const b = S.prof.bank || {}, list = (S.prof.transfers || []).slice(0, 8);
    const hasIban = (b.iban || '').replace(/\s/g, '').length >= 10;
    const last = done && list[0];
    return {
      title: t('transfer'),
      html: `<section class="narrow">
        <h2 class="screen-h">${t('transfer')}</h2>
        ${last ? `<div class="done-card" id="transferDone">${ic('circle-check')}<h2>${t('tr_done_t')}</h2><p>${t('tr_done_b', { p: czk(last.amount), iban: esc(maskIban(last.to)) })}</p></div>` : ''}
        ${!hasIban ? `<div class="callout">${ic('landmark')}<div><b>${t('tr_need_iban')}</b></div><a class="btn primary sm" href="#/bank">${t('bank_t')}</a></div>` : `
        <form id="fTransfer" class="form" novalidate>
          <label>${t('tr_amount')}<input name="amount" inputmode="decimal" placeholder="250" autocomplete="off"></label>
          <p class="meta">${ic('landmark')}<span>${t('tr_to', { iban: esc(maskIban(b.iban)), bank: esc(b.bankName || '') })}</span></p>
          <p class="note demo-line">${ic('info')}<span>${t('card_demo_line')}</span></p>
          <p class="form-err" id="fErr" role="alert"></p>
          <button class="btn primary wide big" type="submit">${ic('send')}${t('tr_go')}</button>
        </form>`}
        <h3>${t('tr_past')}</h3>
        ${list.length ? `<div class="list" id="trList">${list.map((x) => `<div class="row-card plain">${ic('send')}<div><b>${czk(x.amount)}</b><p class="meta small"><span>${fmtDate(x.at)} · ${esc(maskIban(x.to))}</span></p></div><span class="pill green">${ic('check')}${t('tr_sent')}</span></div>`).join('')}</div>` : `<p class="muted">${t('tr_none')}</p>`}
        <a class="btn ghost wide" href="#/bank">${t('back')}</a>
      </section>`,
      after() {
        const f = $('#fTransfer'); if (!f) return;
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          const a = Math.round(parseFloat(String(new FormData(f).get('amount')).replace(',', '.')) || 0);
          if (!(a > 0)) { $('#fErr').textContent = t('tr_err'); return; }
          openModal(`<div class="center-col">${ic('send')}<h2>${t('tr_confirm_t')}</h2><p>${t('tr_confirm_b', { p: czk(a), iban: esc(maskIban(b.iban)) })}</p></div>
            <div class="row2"><button class="btn outline" data-act="close">${t('back')}</button><button class="btn primary" id="trYes">${ic('check')}${t('tr_confirm_btn')}</button></div>`);
          $('#trYes').addEventListener('click', () => {
            closeModal();
            savePrefs({ transfers: [{ amount: a, to: b.iban, at: now() }, ...(S.prof.transfers || [])].slice(0, 10) });
            go('transfer/done', true);
          });
        });
      },
    };
  };

  // Czech banks (names only, for the picker); anything else can be typed.
  const BANKS = ['Air Bank', 'Česká spořitelna', 'ČSOB', 'Fio banka', 'Komerční banka', 'mBank', 'Moneta Money Bank', 'Raiffeisenbank', 'Revolut', 'UniCredit Bank'];
  function changeBank() {
    const cur = (S.prof.bank || {}).bankName || '';
    openModal(`<h2>${t('change_bank')}</h2><p class="muted">${t('bank_pick_b')}</p>
      <div class="dorm-list" id="bankList">${BANKS.map((n) => `<button class="dorm-opt ${n === cur ? 'on' : ''}" data-bank="${esc(n)}" aria-pressed="${n === cur}">${ic('landmark')}<div><b>${esc(n)}</b></div></button>`).join('')}</div>
      <form id="fBankName" class="form" novalidate><label>${t('bank_type')}<input name="bn" maxlength="60" value="${BANKS.includes(cur) ? '' : esc(cur)}"></label>
        <button class="btn primary wide" type="submit">${ic('check')}${t('save')}</button></form>
      <p class="note demo-line">${ic('info')}<span>${t('card_demo_line')}</span></p>`);
    const save = (name) => { if (!name) return; savePrefs({ bank: { ...(S.prof.bank || {}), bankName: name } }); closeModal(); toast(t('bank_saved', { b: name })); render(); };
    $('#bankList').addEventListener('click', (e) => { const b = e.target.closest('[data-bank]'); if (b) save(b.dataset.bank); });
    $('#fBankName').addEventListener('submit', (e) => { e.preventDefault(); save(String(new FormData(e.target).get('bn')).trim()); });
  }

  // ---------- Leaderboard ----------
  let board = null;
  async function loadBoard() {
    try {
      const [qs, hs] = await Promise.all([getDocs(collection(db, 'leaderboard')), getDocs(collection(db, 'lbHide'))]);
      const hidden = new Set(hs.docs.map((d) => d.id));
      board = qs.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => (x.items || 0) >= 1)
        .map((x) => ({ ...x, avatar: hidden.has(x.id) ? '' : x.avatar }))
        .sort((a, b) => (b.kg || 0) - (a.kg || 0) || (b.items || 0) - (a.items || 0));
    } catch (e) { board = []; }
    if (H.cur() === 'board') render();
  }
  const avatarHtml = (x, cls = '') => (x.avatar ? `<img class="av ${cls}" src="${esc(x.avatar)}" alt="" width="46" height="46">` : `<span class="av ini ${cls}" aria-hidden="true">${esc(((x.name || '?').trim()[0] || '?').toUpperCase())}</span>`);
  SCREENS.board = () => {
    if (!board) { loadBoard(); return { title: t('lb_t'), html: `<section class="narrow">${empty('trophy', t('loading'), '')}</section>` }; }
    const me = uid();
    return {
      title: t('lb_t'),
      html: `<section class="narrow board-page">
        <h2 class="screen-h">${t('lb_t')}</h2>
        <p class="lb-count" id="lbCount">${t('lb_count', { n: board.length })}</p>
        <p class="muted">${t('lb_b')}</p>
        ${board.length ? `<ol class="lb" id="lbList">${board.map((x, i) => `<li class="${x.id === me ? 'me' : ''}" data-uid="${esc(x.id)}"><span class="rank">${i + 1}</span>${avatarHtml(x)}<span class="who"><b>${esc(x.name || '')}</b>${x.id === me ? ` <span class="pill green">${t('lb_you')}</span>` : ''}<small>${t('n_items', { n: x.items || 0 })}</small></span><b class="kg">${fmtNum(Math.round((x.kg || 0) * 10) / 10)} kg</b></li>`).join('')}</ol>`
          : empty('trophy', t('lb_empty_t'), t('lb_empty_b'))}
        <p class="meta small">${ic('info')}<span>${t('lb_note')}</span></p>
        ${S.mode === 'user' ? `<a class="btn outline wide" href="#/profile">${ic('user')}${t('lb_toggle_where')}</a>` : ''}
      </section>`,
      after() { board = null; }, // fresh numbers next time the page opens
    };
  };

  // ---------- "Other" dorm: Nominatim search (only on Search, at most 1 request a second), map pin, or name alone ----------
  // Machine address for code: https://nominatim.openstreetmap.org/search?q=...&format=jsonv2 ; usage policy:
  // https://operations.osmfoundation.org/policies/nominatim/ (at most 1 request per second, no search per keystroke).
  let lastSearch = 0;
  async function nominatim(q) {
    const gap = Date.now() - lastSearch; if (gap < 1000) await new Promise((r) => setTimeout(r, 1000 - gap));
    lastSearch = Date.now();
    const u = new URL('https://nominatim.openstreetmap.org/search');
    u.searchParams.set('q', q); u.searchParams.set('format', 'jsonv2'); u.searchParams.set('limit', '6');
    u.searchParams.set('countrycodes', 'cz'); u.searchParams.set('accept-language', S.prof.lang === 'cs' ? 'cs' : 'en');
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await fetch(u, { signal: ctl.signal, headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('nominatim ' + r.status);
      const j = await r.json();
      return (Array.isArray(j) ? j : []).filter((x) => x.lat && x.lon).map((x) => ({ name: x.name || String(x.display_name || '').split(',')[0], address: x.display_name || '', lat: +x.lat, lon: +x.lon }));
    } finally { clearTimeout(tm); }
  }
  function otherDorm() {
    let pick = null, map = null, L = null, pin = null;
    openModal(`<h2>${t('od_t')}</h2><p class="muted">${t('od_b')}</p>
      <form id="fOd" class="searchbar" role="search">${ic('search')}<input name="q" id="odQ" placeholder="${t('od_ph')}" aria-label="${t('od_ph')}" maxlength="120"><button class="btn primary sm" type="submit">${t('search')}</button></form>
      <div id="odRes" aria-live="polite"></div>
      <div class="real-map small" id="odMap" role="region" aria-label="${t('od_map')}"></div>
      <p class="map-hint">${ic('info')}<span>${t('od_tap')}</span></p>
      <div id="odPick" aria-live="polite"></div>
      <button class="btn primary wide" id="odSave" disabled>${ic('check')}${t('od_save')}</button>
      <button class="btn ghost wide" data-act="close">${t('later')}</button>`, 'dorm-sheet');
    const q = $('#odQ');
    const show = () => {
      $('#odPick').innerHTML = pick ? `<div class="nearest">${ic('map-pin')}<div><b>${esc(pick.name)}</b><span>${esc(pick.address || t('od_no_address'))}</span>${pick.lat != null ? `<span>${t('od_nearest', { d: nearestStand(pick).short, dist: fmtDist(distanceM(pick, nearestStand(pick))) })}</span>` : ''}</div></div>` : '';
      $('#odSave').disabled = !pick; $('#odSave').setAttribute('aria-disabled', String(!pick));
      if (map && pick && pick.lat != null) { if (pin) pin.setLatLng([pick.lat, pick.lon]); else pin = L.marker([pick.lat, pick.lon], { title: pick.name, interactive: false, keyboard: false, icon: L.divIcon({ className: 'lpin-wrap', html: `<span class="lpin me">${ic('map-pin')}</span>`, iconSize: [46, 46], iconAnchor: [23, 46] }) }).addTo(map); map.setView([pick.lat, pick.lon], 15); }
    };
    import('./map.js').then(async (M) => {
      const r = await M.makeMap($('#odMap'), { center: myDorm() || { lat: 50.0755, lon: 14.4378 }, zoom: 12, hint: t('od_map'), onFail: () => { const m = $('#odMap'); if (m) m.hidden = true; } });
      map = r.map; L = r.L;
      // Tapping the map places the pin there (works even when the search service is down).
      map.on('click', (e) => { pick = { name: (pick && pick.name) || q.value.trim() || t('od_my_place'), address: (pick && pick.address && pick.lat === e.latlng.lat) ? pick.address : '', lat: +e.latlng.lat.toFixed(5), lon: +e.latlng.lng.toFixed(5) }; show(); });
    }).catch(() => { const m = $('#odMap'); if (m) m.hidden = true; });
    $('#fOd').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = q.value.trim(); if (!v) return;
      const box = $('#odRes'); box.innerHTML = `<p class="meta">${ic('search')}<span>${t('od_searching')}</span></p>`;
      try {
        const res = await nominatim(v);
        box.innerHTML = res.length ? `<div class="dorm-list" id="odList">${res.map((x, i) => `<button class="dorm-opt" data-i="${i}">${ic('map-pin')}<div><b>${esc(x.name)}</b><span>${esc(x.address)}</span></div></button>`).join('')}</div>`
          : `<p class="meta" id="odNone">${ic('info')}<span>${t('od_none')}</span></p>`;
        box.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { pick = res[+b.dataset.i]; show(); }));
      } catch (x) { box.innerHTML = `<p class="meta" id="odFail">${ic('triangle-alert')}<span>${t('od_fail')}</span></p>`; }
      if (!pick) { pick = { name: v, address: '', lat: null, lon: null }; show(); } // the name alone can always be saved
    });
    $('#odSave').addEventListener('click', async () => {
      if (!pick) return;
      const c = { name: pick.name.slice(0, 80), address: (pick.address || '').slice(0, 200), lat: pick.lat, lon: pick.lon };
      savePrefs({ dorm: 'custom', customDorm: c });
      // Counts as an "Ask for a stand" request (the same waitlist entry, with the typed dorm name; no email needed).
      try { await addDoc(collection(db, 'waitlist'), { email: S.prof.email || '', dorm: '', dormName: (c.address && c.address.startsWith(c.name) ? c.address : c.name + (c.address ? ', ' + c.address : '')).slice(0, 120), lang: S.prof.lang, at: Date.now() }); bump('ask_custom'); } catch (x) { /* saved locally all the same */ }
      closeModal(); toast(t('od_saved', { d: c.name })); render();
    });
  }
  const nearestStand = (p) => [...DORMS].sort((a, b) => distanceM(p, a) - distanceM(p, b))[0];

  // ---------- Profile photo: choose or take, crop to a circle, WebP at most 50 KB ----------
  function avatarDialog() {
    openModal(`<h2>${t('av_t')}</h2><p class="muted">${t('av_b')}</p>
      <div class="row2"><label class="btn outline file">${ic('image')}${t('av_choose')}<input type="file" accept="image/*" id="avFile" hidden></label>
      <label class="btn outline file">${ic('camera')}${t('av_take')}<input type="file" accept="image/*" capture="user" id="avCam" hidden></label></div>
      <div class="crop" id="avCrop" hidden><canvas id="avCanvas" width="240" height="240" aria-label="${t('av_preview')}"></canvas>
        <label class="zoom">${t('av_zoom')}<input type="range" id="avZoom" min="100" max="300" value="100"></label>
        <p class="meta small">${ic('info')}<span>${t('av_drag')}</span></p></div>
      <p class="form-err" id="avErr" role="alert"></p>
      <button class="btn primary wide" id="avSave" disabled aria-disabled="true">${ic('check')}${t('save')}</button>
      ${S.prof.avatar ? `<button class="btn outline wide danger" id="avRemove">${ic('x')}${t('av_remove')}</button>` : ''}`);
    const cv = $('#avCanvas'), ctx = cv.getContext('2d');
    let img = null, zoom = 1, ox = 0, oy = 0;
    const draw = () => {
      if (!img) return;
      const base = Math.max(240 / img.width, 240 / img.height) * zoom, w = img.width * base, h = img.height * base;
      ox = Math.min(0, Math.max(240 - w, ox)); oy = Math.min(0, Math.max(240 - h, oy));
      ctx.clearRect(0, 0, 240, 240); ctx.save(); ctx.beginPath(); ctx.arc(120, 120, 120, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(img, ox, oy, w, h); ctx.restore();
    };
    const load = (file) => {
      if (!file) return;
      const u = URL.createObjectURL(file), i = new Image();
      i.onload = () => { img = i; zoom = 1; const base = Math.max(240 / i.width, 240 / i.height); ox = (240 - i.width * base) / 2; oy = (240 - i.height * base) / 2; $('#avCrop').hidden = false; $('#avSave').disabled = false; $('#avSave').setAttribute('aria-disabled', 'false'); draw(); };
      i.onerror = () => { $('#avErr').textContent = t('err_photo'); };
      i.src = u;
    };
    $('#avFile').addEventListener('change', (e) => load(e.target.files[0]));
    $('#avCam').addEventListener('change', (e) => load(e.target.files[0]));
    $('#avZoom').addEventListener('input', (e) => { const c = 120, z0 = zoom; zoom = +e.target.value / 100; ox = c - (c - ox) * (zoom / z0); oy = c - (c - oy) * (zoom / z0); draw(); });
    let drag = null;
    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, ox, oy }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; ox = drag.ox + (e.clientX - drag.x); oy = drag.oy + (e.clientY - drag.y); draw(); });
    cv.addEventListener('pointerup', () => { drag = null; });
    $('#avSave').addEventListener('click', () => {
      if (!img) return;
      const out = document.createElement('canvas'); out.width = 192; out.height = 192;
      const o = out.getContext('2d'); o.beginPath(); o.arc(96, 96, 96, 0, Math.PI * 2); o.clip(); o.drawImage(cv, 0, 0, 240, 240, 0, 0, 192, 192);
      const data = H.toWebp(out, 50 * 1024);
      if (!data) { $('#avErr').textContent = t('av_too_big'); return; }
      savePrefs({ avatar: data }); H.syncBoard(true); closeModal(); toast(t('av_saved')); render();
    });
    const rm = $('#avRemove'); if (rm) rm.addEventListener('click', () => { savePrefs({ avatar: '' }); H.syncBoard(true); closeModal(); toast(t('av_removed')); render(); });
  }

  return { changeBank, otherDorm, avatarDialog, avatarHtml };
}
