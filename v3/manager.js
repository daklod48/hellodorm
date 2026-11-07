// v3 (round 5): Manager mode, moved out of app.js so Home downloads less (loaded on first use; see lazy() in app.js).
// The code is unchanged; app.js hands over the helpers it uses in H.
export function install(H) {
  const { $, ANSWER_DAYS, AUTO_OFFER_MINUTES, CATEGORIES, COLLECT_DAYS, CONDITIONS, DAY, FB_CHOICE, FB_OPTS, FB_SCALE, HOUR, ITEMS, MIN, S, SCREENS, TEXTS, addDoc, allItems, catById, catName, closeModal, collection, collectionGroup, czk, db, deleteDoc, distShort, distTo, doc, dormById, empty, esc, fail, fmtAgo, fmtDate, fmtDateLong, fmtDist, fmtLeft, fmtNum, getDoc, getDocs, go, grid, ic, itemById, now, openModal, photo, pipPose, render, savePrefs, setDoc, shopState, signedIn, standardOffer, standardResale, statusPill, t, toast, uid, updateDoc } = H;
// ---------- Manager mode ----------
async function loadManager() {
  try {
    const qs = await getDocs(collectionGroup(db, 'items'));
    S.mgr.items = qs.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
    // Apply the 10-minute automatic offer for items nobody priced.
    const n = now();
    for (const it of S.mgr.items) {
      if (it.status === 'examining' && !it.hold && it.droppedAt && n - it.droppedAt > AUTO_OFFER_MINUTES * MIN) {
        const offer = standardOffer(it.cat, it.cond);
        await updateDoc(it.ref, { status: 'offer', offer, offerBy: 'auto', offerAt: n, answerBy: n + ANSWER_DAYS * DAY }).catch(() => {});
        Object.assign(it, { status: 'offer', offer, offerBy: 'auto', offerAt: n, answerBy: n + ANSWER_DAYS * DAY });
      }
    }
    const fbNames = [...FB_SCALE.flatMap((q) => [1, 2, 3, 4, 5].map((v) => `fb_${q}_${v}`)), ...FB_CHOICE.flatMap((q) => FB_OPTS.map((v) => `fb_${q}_${v}`))];
    const names = ['visits', 'sell', 'reserve', 'waitlist', 'signup', 'users', 'demo', 'orders_guest', 'fb_sent', 'invite_share', 'invite_visit', 'alert_set', ...fbNames];
    const snaps = await Promise.all(names.map((k) => getDoc(doc(db, 'stats', k)).catch(() => null)));
    S.mgr.stats = {}; names.forEach((k, i) => (S.mgr.stats[k] = (snaps[i] && snaps[i].exists() && snaps[i].data().n) || 0));
    const wl = await getDocs(collection(db, 'waitlist'));
    S.mgr.waitlist = wl.docs.map((d) => d.data()).sort((a, b) => b.at - a.at);
    S.mgr.loaded = true;
  } catch (e) { fail(e); S.mgr.loaded = true; }
  if (H.cur() === 'manager') render();
}
SCREENS.manager = () => {
  if (!S.mgr.loaded) { loadManager(); return { title: t('nav_manager'), html: empty('shield-check', t('loading'), '') }; }
  const tab = S.mgr.tab, n = now();
  const items = S.mgr.items;
  const queue = items.filter((i) => i.status === 'examining').sort((a, b) => a.droppedAt - b.droppedAt);
  const waiting = items.filter((i) => i.status === 'waiting');
  const offers = items.filter((i) => ['offer', 'accepted', 'declined', 'donated', 'rejected', 'disposed', 'collected'].includes(i.status) && i.mode === 'sell').sort((a, b) => (b.offerAt || b.createdAt) - (a.offerAt || a.createdAt));
  const tabs = [['queue', 'list', t('m_queue', { n: queue.length })], ['offers', 'banknote', t('m_offers')], ['totals', 'chart-column', t('m_totals')], ['controls', 'fast-forward', t('m_controls')]];
  let body = '';
  if (tab === 'queue') {
    body = `${queue.length ? `<div class="mgr-grid">${queue.map((i) => `<article class="mgr-card">
      ${photo(i, 'thumb lg')}
      <div class="mgr-info"><b>${esc(i.title)}</b>
        <p class="meta"><span>${esc(catName(i))} · ${t('cond_' + i.cond)}</span></p>
        <p class="meta">${ic('store')}<span>${t('stand_of', { d: dormById(i.stand).short })} · ${t(i.droppedBy === 'staff' ? 'confirmed_staff' : 'confirmed_you')}</span></p>
        <p class="meta">${ic('timer')}<span>${t('m_waiting', { t: fmtAgo(n - i.droppedAt) })}${i.hold ? '' : ' · ' + t('m_auto_in', { m: Math.max(0, Math.ceil((i.droppedAt + AUTO_OFFER_MINUTES * MIN - n) / MIN)) })}</span></p>
        ${i.desc ? `<p class="small">${esc(i.desc)}</p>` : ''}
      </div>
      <form class="mgr-form" data-form="price" data-path="${i.ref.path}">
        <label>${t('m_price')}<input name="price" type="number" min="0" step="10" value="${standardOffer(i.cat, i.cond)}"></label>
        <button class="btn primary sm" type="submit">${ic('check')}${t('m_set_price')}</button>
      </form>
      <form class="mgr-form" data-form="reject" data-path="${i.ref.path}">
        <label>${t('m_reason')}<input name="reason" placeholder="${t('m_reason_ph')}" maxlength="80"></label>
        <button class="btn outline sm danger" type="submit">${ic('ban')}${t('m_reject')}</button>
      </form>
    </article>`).join('')}</div>` : empty('circle-check', t('m_empty_t'), t('m_empty_b'))}
    <div class="confirm-box">
      <h3>${ic('scan-line')}${t('m_confirm_t')}</h3>
      <p class="muted">${t('m_confirm_b')}</p>
      <label class="searchbar">${ic('search')}<input id="mgrCode" placeholder="${t('m_confirm_ph')}" aria-label="${t('m_confirm_ph')}" autocomplete="off"></label>
      ${waiting.length ? `<div class="list" id="waitList">${waiting.map((i) => `<div class="row-card" data-code="${esc((i.dropCode || '').toLowerCase())}" data-title="${esc((i.title || '').toLowerCase())}">${photo(i, 'thumb')}<div><b>${esc(i.title)}</b><p class="meta"><span>${t('m_code')}: <b>${esc(i.dropCode || '')}</b> · ${t('stand_of', { d: dormById(i.stand).short })} · ${i.dropDay ? fmtDate(i.dropDay) : ''} · ${t(i.mode === 'sell' ? 'mode_sell' : 'mode_donate')}</span></p></div><button class="btn primary sm" data-act="staff-drop" data-path="${i.ref.path}">${ic('check')}${t('m_confirm_btn')}</button></div>`).join('')}</div>
      <p class="muted" id="noMatch" hidden>${t('m_no_match')}</p>` : `<p class="muted">${t('m_no_match')}</p>`}
    </div>`;
  } else if (tab === 'offers') {
    // v3: items bought from students (accepted) or donated can be put on sale; they appear in the shop for everyone
    // (collection 'listings') and count as "new at your dorm" in the Welcome back card.
    const resell = items.filter((i) => ['accepted', 'donated'].includes(i.status) && !i.listed && i.cat !== 'other' && catById(i.cat));
    body = `${resell.length ? `<h3>${ic('store')}${t('m_resell_h')}</h3><p class="muted">${t('m_resell_b')}</p><div class="list">${resell.map((i) => `<div class="row-card">${photo(i, 'thumb')}<div><b>${esc(i.title)}</b>
        <p class="meta"><span>${esc(catName(i))} · ${t('cond_' + i.cond)} · ${t('stand_of', { d: dormById(i.stand).short })}</span></p>
        <form class="mgr-form inline" data-form="list" data-path="${i.ref.path}"><input name="price" type="number" min="10" step="10" value="${standardResale(i.cat, i.cond)}" aria-label="${t('m_resell_price')}"><button class="btn primary sm" type="submit">${ic('store')}${t('m_resell_btn')}</button></form></div></div>`).join('')}</div>` : ''}
      ${S.listings.length ? `<p class="meta small">${ic('info')}<span>${t('m_listed_n', { n: S.listings.length })}</span></p>` : ''}` + (offers.length ? `<div class="list">${offers.map((i) => `<div class="row-card">${photo(i, 'thumb')}<div><b>${esc(i.title)}</b>
        <p class="meta"><span>${i.offer ? czk(i.offer) : ''} · ${i.offerBy === 'auto' ? t('m_by_auto') : i.offerBy === 'manager' ? t('m_by_manager') : ''}${i.rejectReason ? esc(i.rejectReason) : ''}</span></p>
        ${i.status === 'offer' ? `<form class="mgr-form inline" data-form="price" data-path="${i.ref.path}"><label class="sr">${t('m_price')}</label><input name="price" type="number" min="0" step="10" value="${i.offer}" aria-label="${t('m_price')}"><button class="btn outline sm" type="submit">${t('m_change')}</button></form>` : ''}</div>
        ${statusPill(i.status)}</div>`).join('')}</div>` : empty('banknote', t('m_no_offers'), ''));
  } else if (tab === 'totals') {
    const s = S.mgr.stats;
    const tiles = [['users', t('m_t_users'), s.users], ['demo', t('m_t_demo'), s.demo], ['package', t('m_t_items'), items.length], ['mail', t('m_t_waitlist'), S.mgr.waitlist.length],
      ['eye', t('m_t_visits'), s.visits], ['circle-plus', t('m_t_sell'), s.sell], ['ticket', t('m_t_reserve'), s.reserve], ['user', t('m_t_signup'), s.signup]];
    body = `<div class="stat-grid">${tiles.map(([i, l, v]) => `<div class="stat">${ic(i === 'demo' ? 'sparkles' : i)}<b>${fmtNum(v || 0)}</b><span>${l}</span></div>`).join('')}</div>
      <p class="meta small">${ic('info')}<span>${t('m_counts_note')}</span></p>
      <h3>${t('m_comm_h')}</h3>
      <div class="stat-grid">${[['ticket', t('m_t_guest_orders'), s.orders_guest], ['message-square-text', t('m_t_fb'), s.fb_sent], ['share-2', t('m_t_inv_share'), s.invite_share], ['user-plus', t('m_t_inv_visit'), s.invite_visit], ['bell-plus', t('m_t_alerts'), s.alert_set]].map(([i, l, v]) => `<div class="stat">${ic(i)}<b>${fmtNum(v || 0)}</b><span>${l}</span></div>`).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th>${t('m_fb_q')}</th><th>${t('m_fb_answers')}</th></tr></thead><tbody>
        ${FB_SCALE.map((q) => { const c = [1, 2, 3, 4, 5].map((v) => s[`fb_${q}_${v}`] || 0); const n = c.reduce((a, b) => a + b, 0); const avg = n ? (c.reduce((a, b, i) => a + b * (i + 1), 0) / n).toFixed(1) : '0'; return `<tr><td>${t('fb_' + q)}</td><td>${t('m_fb_avg', { a: avg, n })} (${c.map((x, i) => `${i + 1}: ${x}`).join(', ')})</td></tr>`; }).join('')}
        ${FB_CHOICE.map((q) => `<tr><td>${t('fb_' + q)}</td><td>${FB_OPTS.map((v) => `${t('fb_' + v)}: ${s[`fb_${q}_${v}`] || 0}`).join(', ')}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="meta small">${ic('info')}<span>${t('m_fb_note')}</span></p>
      <h3>${t('m_waitlist_h')}</h3>
      ${S.mgr.waitlist.length ? `<div class="table-wrap"><table><thead><tr><th>${t('f_email')}</th><th>${t('your_dorm')}</th><th>${t('m_date')}</th></tr></thead><tbody>${S.mgr.waitlist.map((w) => `<tr><td>${esc(w.email)}</td><td>${w.dormName ? `${esc(w.dormName)} <span class="pill sun">${t('m_requested')}</span>` : esc((dormById(w.dorm) || {}).short || '')}</td><td>${fmtDate(w.at)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${t('m_no_wl')}</p>`}`;
  } else {
    body = `<div class="callout warn">${ic('fast-forward')}<div><b>${t('m_ctrl_t')}</b><p>${t('m_ctrl_b')}</p><p class="meta"><span>${t('m_clock', { d: S.offsetDays, date: fmtDateLong(now()) })}</span></p></div></div>
      <div class="stack">
        <button class="btn primary" data-act="skip15">${ic('fast-forward')}${t('m_skip')}</button>
        <button class="btn outline" data-act="clock0">${ic('rotate-ccw')}${t('m_clock0')}</button>
        <button class="btn outline" data-act="shop-reset">${ic('refresh-cw')}${t('m_shop_reset')}</button>
      </div>`;
  }
  return {
    title: t('nav_manager'),
    html: `<section class="manager">
      <div class="sec-head"><h2 class="screen-h">${ic('shield-check')}${t('nav_manager')}</h2><button class="btn outline sm" data-act="mgr-refresh">${ic('refresh-cw')}${t('refresh')}</button></div>
      <div class="tabs" role="tablist">${tabs.map(([k, i, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-act="mgr-tab" data-v="${k}">${ic(i)}<span>${l}</span></button>`).join('')}</div>
      ${body}
    </section>`,
    after() {
      const q = $('#mgrCode');
      if (q) q.addEventListener('input', () => {
        const v = q.value.trim().toLowerCase(); let shown = 0;
        document.querySelectorAll('#waitList .row-card').forEach((r) => { const ok = !v || r.dataset.code.includes(v) || r.dataset.title.includes(v); r.hidden = !ok; if (ok) shown++; });
        const nm = $('#noMatch'); if (nm) nm.hidden = shown > 0;
      });
      document.querySelectorAll('.mgr-form').forEach((f) => f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ref = doc(db, f.dataset.path), fd = new FormData(f), n2 = now();
        try {
          if (f.dataset.form === 'price') {
            const price = Math.round(+fd.get('price'));
            if (!(price >= 0)) return;
            await updateDoc(ref, { status: 'offer', offer: price, offerBy: 'manager', offerAt: n2, answerBy: n2 + ANSWER_DAYS * DAY, n_offer: false });
            toast(t('m_priced', { p: czk(price) }));
          } else if (f.dataset.form === 'list') {
            const it = S.mgr.items.find((x) => x.ref.path === f.dataset.path), price = Math.round(+fd.get('price'));
            if (!it || !(price > 0)) return;
            const title = String(it.title || '').slice(0, 80), desc = String(it.desc || '').slice(0, 200);
            // No personal data in a listing: what the item is, where it waits and the price.
            await addDoc(collection(db, 'listings'), { title: { en: title, cs: title }, desc: { en: desc, cs: desc }, cat: it.cat, cond: it.cond,
              dorm: it.stand, price, newPrice: catById(it.cat).newPrice, photo: it.photo || '', listedAt: n2 });
            await updateDoc(ref, { listed: true });
            toast(t('m_resell_done', { d: dormById(it.stand).short }));
          } else {
            const reason = (fd.get('reason') || '').trim() || t('m_reason_default');
            await updateDoc(ref, { status: 'rejected', rejectReason: reason, collectBy: n2 + COLLECT_DAYS * DAY });
            toast(t('m_rejected'));
          }
          loadManager();
        } catch (x) { fail(x); }
      }));
    },
  };
};


  return { loadManager };
}
