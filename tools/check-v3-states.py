"""v3 bars on the new round 5 states AND every main screen, in English and Czech, at 320, 390 and 1280 px:
  contrast (text 4.5:1, the JS of check-contrast.py), readable (text 12 px or more, field outlines 3:1, check-readable.py),
  taps (46 px at rest on phones, check-taps.py, measured again after 600 ms), sideways overflow (must be 0 px),
  icons and outlines of the new parts 3:1 (open badge, label card, map pins, route card, swap, best stand, welcome cards).
Always on the stand-in database. Prints problems and a final count (must be 0).
Run: python tools/check-v3-states.py [base url]"""
import os, sys, re, json, time, pathlib
os.environ['HD_FAKE'] = '1'
sys.stdout.reconfigure(encoding='utf-8')
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from playwright.sync_api import sync_playwright
from browser import launch, prepare

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/v3/'
def js_of(name):
    return re.search(r'JS = r"""(.*?)"""', (HERE / name).read_text(encoding='utf-8'), re.S).group(1)
CONTRAST, READABLE, TAPS = js_of('check-contrast.py'), js_of('check-readable.py'), js_of('check-taps.py')
TAPS46 = TAPS.replace('r.width < 44 || r.height < 44', 'r.width < 45.5 || r.height < 45.5')
# Non text contrast of the new v3 parts: icon colour (stroke) and outline colour against the surface behind them.
NONTEXT = r"""
() => {
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bg = (el) => { for (let e = el; e; e = e.parentElement) { const g = getComputedStyle(e).backgroundImage.match(/gradient.*?(rgba?\([^)]+\))/); if (g) return rgb(g[1]).slice(0, 3); const c = rgb(getComputedStyle(e).backgroundColor); if (c.length && (c.length < 4 || c[3] > 0.9)) return c.slice(0, 3); } return [255, 255, 255]; };
  const out = [];
  document.querySelectorAll('.open-badge .ic, .label-tile .lt-ic .ic, .route-res > .ic, .swap .ic, .best-stand .ic, .ws-card .ic, .wb-row .ic, .demo-strip > .ic, .map-hint .ic').forEach((el) => {
    const r = el.getBoundingClientRect(); if (!r.width) return;
    const v = ratio(rgb(getComputedStyle(el).color), bg(el.parentElement));
    if (v < 3) out.push(`icon ${v.toFixed(2)}:1 in .${el.parentElement.className}`);
  });
  // A pin is found by its ring or by its filled disc (my dorm: dark ink disc), whichever stands out more from a light map.
  document.querySelectorAll('.lpin').forEach((el) => {
    const sh = getComputedStyle(el).boxShadow.match(/rgba?\([^)]+\)/); if (!sh) return;
    const v = Math.max(ratio(rgb(sh[0]), [255, 255, 255]), ratio(rgb(getComputedStyle(el).backgroundColor), [255, 255, 255]));
    if (v < 3) out.push(`map pin ring ${v.toFixed(2)}:1`);
  });
  return out;
}
"""
OVERFLOW = "() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)"

fails = 0
def report(label, kind, items):
    global fails
    for x in items:
        fails += 1
        print(f'FAIL {label} {kind}: {json.dumps(x, ensure_ascii=False) if not isinstance(x, str) else x}')

def check(p, label, w):
    p.wait_for_timeout(250)
    report(label, 'contrast', p.evaluate(CONTRAST))
    report(label, 'nontext', p.evaluate(NONTEXT))
    ov = p.evaluate(OVERFLOW)
    if ov: report(label, 'overflow', [f'{ov} px sideways'])
    if w < 600:
        report(label, 'readable', p.evaluate(READABLE, 12))
        t = p.evaluate(TAPS46)
        if t: p.wait_for_timeout(600); t = p.evaluate(TAPS46)
        report(label, 'tap', [f"<{x['tag']} .{x['cls']}> '{x['text']}' {x['w']}x{x['h']}" for x in t])

GUEST = ['home', 'browse', 'item/k1', 'item/k4', 'cart', 'saved', 'stands/map', 'stands/list', 'profile', 'about', 'signin', 'signup', 'orders', 'notes', 'myitems', 'feedback', 'waitlist']
DEMO = ['home', 'cart', 'myitems', 'orders', 'sell', 'profile', 'notes', 'checkout/k5', 'saved']
with sync_playwright() as pw:
    b = launch(pw)
    for lang in ('en', 'cs'):
        for w in (320, 390, 1280):
            tag = f'[{lang} {w}]'
            ctx = prepare(b.new_context(viewport={'width': w, 'height': 844 if w < 600 else 900}, locale='cs-CZ' if lang == 'cs' else 'en-GB', timezone_id='Europe/Prague'))
            p = ctx.new_page(); errs = []
            p.on('pageerror', lambda e: errs.append(str(e)))
            p.goto(BASE); p.wait_for_selector('html[data-app=ready]', timeout=20000); p.wait_for_timeout(500)
            st = json.loads(p.evaluate('localStorage.getItem("fakefs") || "{}"'))
            st['listings/Lcheck'] = {'title': {'en': 'Big soft reading cushion with removable washable cover', 'cs': 'Velký měkký polštář na čtení s pratelným potahem'}, 'desc': {'en': '', 'cs': ''}, 'cat': 'textiles', 'cond': 'good', 'dorm': 'thaler', 'price': 190, 'newPrice': 800, 'photo': '', 'listedAt': int(time.time() * 1000)}
            st['shop/k1'] = {'status': 'sold', 'by': 'someone_else', 'until': 9e15}
            p.evaluate('s => localStorage.setItem("fakefs", s)', json.dumps(st))
            p.reload(); p.wait_for_selector('html[data-app=ready]'); p.wait_for_timeout(400)
            p.goto(BASE + '#/stands/list'); p.wait_for_timeout(400); p.click('#stand-thaler [data-act=pick-dorm]'); p.wait_for_timeout(400)
            for id_ in ['k1', 'k4', 'f3', 'Lcheck']:
                p.goto(BASE + '#/item/' + id_); p.wait_for_timeout(350)
                if p.locator('.cta-row [data-act=cart-add]').count(): p.click('.cta-row [data-act=cart-add]'); p.wait_for_timeout(250)
            p.goto(BASE + '#/item/k1'); p.wait_for_timeout(300); p.click('.detail-cta .heart'); p.wait_for_timeout(200)
            for s in GUEST:
                p.goto(BASE + '#/' + s); p.wait_for_timeout(900 if s.startswith('stands') else 500); check(p, f'{tag} guest {s}', w)
            p.goto(BASE + '#/browse'); p.wait_for_timeout(300); p.fill('#qInput', 'lamp xyzzy'); p.wait_for_timeout(900); check(p, f'{tag} closest matches', w)
            p.goto(BASE + '#/stands/map'); p.wait_for_timeout(3000)
            p.click('#stand-strahov [data-act=route]'); p.wait_for_selector('.route-res', timeout=15000); p.wait_for_timeout(500); check(p, f'{tag} route panel', w)
            p.evaluate('(() => { const m = document.querySelector("#standsMap").hdMap; let k = 0; m.eachLayer((l) => { if (l.getPopup && l.getPopup() && l.getLatLng && k++ === 13) l.openPopup(); }); })()'); p.wait_for_timeout(600)
            check(p, f'{tag} map popup', w)
            p.goto(BASE + '#/item/k4'); p.wait_for_timeout(500); p.click('[data-act=pbox-route]'); p.wait_for_selector('.pmap .route-res', timeout=15000); p.wait_for_timeout(500); check(p, f'{tag} pickup box route', w)
            # account: welcome scene, then welcome back
            email = f'tester-chk-{lang}-{w}-{int(time.time())}@hellodorm-demo.test'
            p.goto(BASE + '#/signup'); p.wait_for_timeout(400)
            p.fill('#fSignup input[name=name]', 'Jana'); p.fill('#fSignup input[name=email]', email); p.fill('#fSignup input[name=password]', 'madeup123')
            p.click('#fSignup button[type=submit]'); p.wait_for_timeout(3200); check(p, f'{tag} welcome scene', w)
            p.keyboard.press('Escape'); p.wait_for_timeout(300)
            p.goto(BASE + '#/profile'); p.wait_for_timeout(500); check(p, f'{tag} user profile', w)
            p.click('#signOutBtn'); p.wait_for_timeout(400); check(p, f'{tag} sign out dialog', w); p.click('#signoutYes'); p.wait_for_timeout(900)
            p.goto(BASE + '#/signin'); p.wait_for_timeout(400); p.fill('#fSignin input[name=email]', email); p.fill('#fSignin input[name=password]', 'madeup123'); p.click('#fSignin button[type=submit]'); p.wait_for_timeout(1500)
            p.goto(BASE + '#/home'); p.wait_for_timeout(700); check(p, f'{tag} welcome back', w)
            p.goto(BASE + '#/cart'); p.wait_for_timeout(600); check(p, f'{tag} user cart (best stand, swap)', w)
            p.goto(BASE + '#/saved'); p.wait_for_timeout(500); check(p, f'{tag} user saved (swap)', w)
            p.goto(BASE + '#/profile'); p.wait_for_timeout(400); p.click('#signOutBtn'); p.wait_for_timeout(300); p.click('#signoutYes'); p.wait_for_timeout(900)
            p.goto(BASE + '#/home'); p.wait_for_timeout(400); p.click('.acct [data-act=demo]'); p.wait_for_timeout(2500)
            for s in DEMO:
                p.goto(BASE + '#/' + s); p.wait_for_timeout(600); check(p, f'{tag} demo {s}', w)
            p.goto(BASE + '#/orders'); p.wait_for_timeout(400); p.click('.row-card >> nth=0'); p.wait_for_timeout(700); check(p, f'{tag} demo pickup code', w)
            if errs: report(tag, 'page error', errs)
            ctx.close()
    b.close()
print(fails)
