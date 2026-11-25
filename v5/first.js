// The two screens a visitor can see before the app and Firebase have loaded: onboarding cards and welcome.
// boot.js paints one of them at once (fast first paint); app.js renders the same markup again when it is ready,
// so there is one source of truth for both.
import { pipPose } from './pip.js';

export function onboardingHtml(t, ic, photoIds) {
  const cards = [['o1', 'circle-plus', 'ob1_t', 'ob1_b'], ['o2', 'sparkles', 'ob2_t', 'ob2_b'], ['o3', 'store', 'ob3_t', 'ob3_b']];
  return `<section class="onb">
    <div class="onb-top"><span class="brand">${ic('recycle')}<span>HelloDorm</span></span><button class="linkbtn" data-act="ob-skip">${t('skip')}</button></div>
    <div class="onb-track" id="onbTrack">${cards.map(([img, i, tk, bk], n) => `
      <div class="onb-card" data-n="${n}">
        <div class="onb-pic">${photoIds.has(img) ? `<img src="img/${img}${n ? '' : '-first'}.webp" alt="" width="${n ? 600 : 480}" height="${n ? 600 : 480}" ${n ? 'loading="lazy"' : 'fetchpriority="high" decoding="sync"'}>` : ''}<span class="onb-ic">${ic(i)}</span></div>
        <p class="step-no">${n + 1} / 3</p><h2>${t(tk)}</h2><p>${t(bk)}</p>
      </div>`).join('')}</div>
    <div class="dots" id="onbDots">${cards.map((_, n) => `<span class="${n === 0 ? 'on' : ''}"></span>`).join('')}</div>
    <button class="btn primary wide" data-act="ob-next" id="obNext">${t('next')}${ic('chevron-right')}</button>
  </section>`;
}

export function welcomeHtml(t, ic) {
  return `<section class="welcome">
    <div class="welcome-hero">
      ${pipPose('wave', 'welcome-pip bob', 150)}
      <h1>HelloDorm</h1>
      <p class="lead">${t('tagline')}</p>
      <p>${t('welcome_body')}</p>
    </div>
    <div class="welcome-actions">
      <button class="btn primary wide big v4-demo" data-act="demo">${ic('sparkles')}<span>${t('v4_demo_big')}<small>${t('v4_demo_small')}</small></span></button>
      <div class="divider"><span>${t('v4_have_account')}</span></div>
      <div class="row2">
        <a class="btn outline" href="#/signup">${ic('user')}${t('sign_up')}</a>
        <a class="btn outline" href="#/signin">${ic('lock')}${t('sign_in')}</a>
      </div>
      <button class="linkbtn center" data-act="guest">${ic('eye')}<span>${t('try_guest')}</span></button>
      <div class="small-links"><a class="linkbtn" href="#/about">${ic('info')}<span>${t('about_link')}</span></a></div>
      <p class="proto-note">${t('proto_note')}</p>
    </div>
  </section>`;
}
