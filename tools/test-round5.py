"""Round 5 tests for v3 (search, real map and route, best stand, swap, open now, photo label, welcome and coming back).
Always runs on the stand-in database (HD_FAKE=1 is forced): no real account is created and nothing reaches Firebase.
Test accounts use the reserved name tester-...@hellodorm-demo.test and live only in the test browser's memory.
Run (local server in the hellodorm folder first: python -m http.server 8080):
    python tools/test-round5.py [base url]          default http://localhost:8080/v3/
Writes review/round5/results.json and review/round5/results.md, and the professor flow screenshots to review/round5/.
Set HD_ROUTE=recorded to answer the route service with a recorded reply instead of the live FOSSGIS service."""
import os, sys, json, time, pathlib
os.environ['HD_FAKE'] = '1'
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from browser import launch, prepare

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/v3/'
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'review' / 'round5'; OUT.mkdir(parents=True, exist_ok=True)
RECORDED = os.environ.get('HD_ROUTE') == 'recorded'
# Recorded answer of the FOSSGIS foot route Thalerova to Strahov (live reply of 7 Nov 2026: 7,895.8 m, 6,316.4 s), line shortened.
REC = {"code": "Ok", "routes": [{"distance": 7895.8, "duration": 6316.4, "geometry": {"type": "LineString", "coordinates": [[14.48304, 50.09143], [14.4600, 50.0880], [14.4300, 50.0830], [14.4100, 50.0800], [14.39014, 50.07980]]}}]}
rows = []
def rec(test, expected, result, ok):
    rows.append({'test': test, 'expected': expected, 'result': str(result), 'pass': bool(ok)})
    print(('PASS ' if ok else 'FAIL ') + test + ' | ' + str(result))

def new_ctx(b, w=390, h=844, **kw):
    ctx = prepare(b.new_context(viewport={'width': w, 'height': h}, timezone_id=kw.pop('tz', 'Europe/Prague'), **kw))
    if RECORDED:
        ctx.route('https://routing.openstreetmap.de/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(REC)))
    return ctx

def open_app(ctx, hash_='', store=None):
    p = ctx.new_page()
    if store is not None:  # copy the stand-in database into this browser (stands in for the shared online database)
        p.add_init_script('if (!sessionStorage.getItem("hd_seeded")) { localStorage.setItem("fakefs", ' + json.dumps(store) + '); sessionStorage.setItem("hd_seeded", "1"); }')
    p.errs = []
    p.on('pageerror', lambda e: p.errs.append(str(e)))
    p.goto(BASE + hash_); p.wait_for_selector('html[data-app=ready]', timeout=20000); p.wait_for_timeout(600)
    return p

def store_of(p): return p.evaluate('localStorage.getItem("fakefs") || "{}"')
def go(p, h, ms=600): p.goto(BASE + '#/' + h); p.wait_for_timeout(ms)
def pick_dorm(p, dorm):
    go(p, 'stands/list'); p.click(f'#stand-{dorm} [data-act=pick-dorm]'); p.wait_for_timeout(400)

def signup(p, email, name):
    go(p, 'signup')
    p.fill('#fSignup input[name=name]', name); p.fill('#fSignup input[name=email]', email); p.fill('#fSignup input[name=password]', 'madeup123')
    p.click('#fSignup button[type=submit]'); p.wait_for_timeout(1500)
def signin(p, email):
    go(p, 'signin')
    p.fill('#fSignin input[name=email]', email); p.fill('#fSignin input[name=password]', 'madeup123')
    p.click('#fSignin button[type=submit]'); p.wait_for_timeout(1500)
def signout(p):
    go(p, 'profile'); p.click('#signOutBtn'); p.wait_for_timeout(400)
    asked = p.locator('#signoutYes').count() == 1
    p.click('#signoutYes'); p.wait_for_timeout(1000)
    return asked
def close_modal(p):
    if p.locator('#modal.show').count(): p.keyboard.press('Escape'); p.wait_for_timeout(300)

with sync_playwright() as pw:
    b = launch(pw)

    # ---------- 1. Search ----------
    ctx = new_ctx(b); p = open_app(ctx)
    pick_dorm(p, 'thaler')
    def search(q):
        go(p, 'browse', 300); p.fill('#qInput', q); p.wait_for_timeout(900)
        h = p.locator('#resultsH').inner_text() if p.locator('#resultsH').count() else ''
        return h, p.locator('.grid .card h3').all_inner_texts(), p.locator('.empty').count() > 0
    for q, want in [('lamp desk', 'LED desk lamp'), ('desk lamp', 'LED desk lamp'), ('rychlovarna konvice', 'Electric kettle, 1.7 L'), ('konvice', 'Electric kettle, 1.7 L'), ('kettle', 'Electric kettle, 1.7 L')]:
        h, ts, e = search(q)
        rec(f'Search "{q}"', f'finds {want}', f'{h}: {ts}', ts[:1] == [want] and 'Closest' not in h)
    h, ts, e = search('xyzzy'); rec('Search "xyzzy"', 'empty page, no items', f'{len(ts)} items, empty page {e}', not ts and e)
    h, ts, e = search('lamp xyzzy'); rec('Search "lamp xyzzy" (one wrong word)', 'Closest matches, lamps first', f'{h}: {ts[:3]}', h == 'Closest matches' and ts[:2] and all('lamp' in x.lower() for x in ts[:2]))
    h, ts, e = search('Rychlovarná-konvice'); rec('Search with accents and a hyphen', 'same item as without', f'{ts[:1]}', ts[:1] == ['Electric kettle, 1.7 L'])
    go(p, 'home'); p.fill('#fHomeSearch input[name=q]', 'kettle'); p.click('#fHomeSearch button[type=submit]'); p.wait_for_timeout(1000)
    rec('Home search text arrives in Browse', 'Browse shows "kettle" and the kettle', f"{p.url.split('#')[1]}, box '{p.input_value('#qInput')}', {p.locator('.grid .card h3').all_inner_texts()[:1]}",
        p.url.endswith('#/browse') and p.input_value('#qInput') == 'kettle' and p.locator('.grid .card h3').all_inner_texts()[:1] == ['Electric kettle, 1.7 L'])
    ctx.close()

    # ---------- 2. Map code not on Home ----------
    ctx = new_ctx(b); reqs = []
    ctx.on('request', lambda r: reqs.append(r.url))
    p = open_app(ctx); p.wait_for_timeout(1500)
    mapreq = [u for u in reqs if 'leaflet' in u or u.endswith('/map.js') or 'tile.openstreetmap' in u or 'routing.openstreetmap' in u]
    rec('Map code not loaded on Home (network list)', '0 requests for map.js, Leaflet, tiles or routes', f'{len(reqs)} requests on Home, {len(mapreq)} map requests', not mapreq)
    go(p, 'stands', 3500)
    mapreq2 = [u for u in reqs if 'leaflet' in u or u.endswith('/map.js')]
    rec('Map code loads when Stands opens', 'map.js, leaflet.js, leaflet.css requested', f'{len(mapreq2)} files', len(mapreq2) >= 3)
    ctx.close()

    # ---------- 3. Stands: real map, pins, route, wheel, popup ----------
    ctx = new_ctx(b, 1280, 900); p = open_app(ctx)
    pick_dorm(p, 'thaler'); go(p, 'stands', 4500)
    tiles = p.eval_on_selector('#standsMap', 'e => +(e.dataset.tiles || 0)')
    pins = sum(int(x) for x in p.eval_on_selector_all('#standsMap .lpin', 'els => els.map((e) => e.dataset.stands)')); bubbles = p.locator('#standsMap .lpin').count(); me = p.locator('#standsMap .lpin.me').count()
    nums = p.locator('#standsMap .lpin b').all_inner_texts()
    rec('Stands shows a real street map with all pins', '16 stands on pins (nearby stands grouped in one bubble), my dorm highlighted, item numbers, tiles loaded', f'{pins} stands on {bubbles} pins, {me} highlighted, numbers {",".join(nums)}, {tiles} tiles', pins == 16 and me == 1 and tiles > 0 and all(n.isdigit() for n in nums))
    # pins and their names must not overlap each other at the starting zoom
    ov = p.evaluate('''() => { const r = [...document.querySelectorAll('#standsMap .lpin, #standsMap .lpin-l')].map((e) => e.getBoundingClientRect()); let n = 0;
      for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j]; if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) n++; } return n; }''')
    pin_pairs = p.evaluate('''() => { const ws = [...document.querySelectorAll('#standsMap .lpin-wrap')]; let n = 0; ws.forEach((w) => { const a = w.querySelector('.lpin').getBoundingClientRect(), l = w.querySelector('.lpin-l').getBoundingClientRect(); if (a.bottom > l.top + 1) n++; }); return n; }''')
    rec('Map pins and names do not overlap', '0 overlapping pins or names (own label below its pin)', f'{ov - 0} overlapping boxes', ov == 0)
    # Round 6: all credits moved to About us; only the OpenStreetMap credit stays in the map's corner.
    credit = p.locator('#standsMap .leaflet-control-attribution').inner_text()
    rec('Map credits', '"© OpenStreetMap contributors" in the map corner (FOSSGIS credit in About since round 6)', credit.replace('\n', ' '), '© OpenStreetMap contributors' in credit)
    z0 = p.evaluate('document.querySelector("#standsMap").hdMap.getZoom()')
    box = p.locator('#standsMap').bounding_box(); cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    p.mouse.move(cx, cy); p.mouse.wheel(0, -400); p.wait_for_timeout(700)
    z1 = p.evaluate('document.querySelector("#standsMap").hdMap.getZoom()')
    p.mouse.click(cx + 3, cy + 120); p.wait_for_timeout(300); p.mouse.wheel(0, -400); p.wait_for_timeout(900)
    z2 = p.evaluate('document.querySelector("#standsMap").hdMap.getZoom()')
    rec('Mouse wheel zooms only after a click', 'zoom same before the click, changes after', f'zoom {z0} -> {z1} before click, {z2} after', z0 == z1 and z2 != z1)
    p.evaluate('document.querySelector("#standsMap").hdMap.setZoom(16)'); p.wait_for_timeout(900)
    # open a popup on every pin in turn; no button or link of the map may overlap the open popup
    worst = 0
    for i in range(16):
        p.evaluate(f'(() => {{ const m = document.querySelector("#standsMap").hdMap; let k = 0; m.eachLayer((l) => {{ if (l.getPopup && l.getPopup() && l.getLatLng) {{ if (k++ === {i}) l.openPopup(); }} }}); }})()')
        p.wait_for_timeout(450)
        worst = max(worst, p.evaluate('''() => { const pop = document.querySelector('.leaflet-popup'); if (!pop) return 0; const a = pop.getBoundingClientRect(); let n = 0;
          document.querySelectorAll('#standsMapBox a, #standsMapBox button').forEach((el) => { if (pop.contains(el)) return; const r = el.getBoundingClientRect(); if (!r.width) return;
            if (r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top) n++; }); return n; }'''))
    rec('No button on top of an open popup', '0 overlaps over 16 popups', f'{worst} overlaps (worst popup)', worst == 0)
    p.keyboard.press('Escape')
    t0 = time.time()
    p.click('#stand-strahov [data-act=route]'); p.wait_for_selector('.route-res', timeout=15000)
    km = p.get_attribute('.route-res', 'data-km'); mins = p.get_attribute('.route-res', 'data-min')
    line = p.locator('#standsMap .leaflet-overlay-pane path').count()
    rec('Walking route Thalerova to Strahov' + (' (recorded answer)' if RECORDED else ' (live FOSSGIS service)'), 'line on the map with km and minutes', f'{km} km, {mins} min, {line} line drawn, {time.time() - t0:.1f} s, text "{p.locator(".route-num").inner_text()}"', km and mins and line >= 1)
    p.screenshot(path=str(OUT / 'route-1280.png'))
    # 1 request per second: two quick taps on different stands
    stamps = []
    p.on('request', lambda r: stamps.append(time.time()) if 'routing.openstreetmap.de' in r.url else None)
    p.click('#stand-podoli [data-act=route]'); p.click('#stand-hvezda [data-act=route]'); p.wait_for_timeout(3500)
    gaps = [round(stamps[i + 1] - stamps[i], 2) for i in range(len(stamps) - 1)]
    rec('At most 1 route request per second', 'gap between requests at least 1 s', f'{len(stamps)} requests, gaps {gaps}', all(g >= 0.95 for g in gaps))
    ctx.close()

    # route service down: message and Google Maps link
    ctx = new_ctx(b); ctx.route('https://routing.openstreetmap.de/**', lambda r: r.abort())
    p = open_app(ctx); pick_dorm(p, 'thaler'); go(p, 'stands', 3000)
    p.click('#stand-strahov [data-act=route]'); p.wait_for_selector('.route-res', timeout=15000)
    txt = p.locator('.route-res').inner_text(); gm = p.get_attribute('.route-res .gm-link', 'href') or ''
    rec('Route service does not answer', '"Route not available right now" and an Open in Google Maps link', f'{txt.splitlines()[0]} | {gm[:60]}', 'Route not available right now' in txt and gm.startswith('https://www.google.com/maps/dir/'))
    # pickup box route on the item page
    go(p, 'item/k4', 800); p.click('[data-act=pbox-route]'); p.wait_for_selector('.pmap .route-res', timeout=15000)
    rec('Walking route in the item pickup box', 'map and route panel open inside the pickup box', f"map {p.locator('.pmap .real-map').count()}, panel {p.locator('.pmap .route-res').count()}", p.locator('.pmap .real-map').count() == 1)
    ctx.close()

    # fallback: Leaflet blocked, then tiles blocked
    ctx = new_ctx(b); ctx.route('**/vendor/leaflet/leaflet.js', lambda r: r.abort())
    p = open_app(ctx); go(p, 'stands', 2500)
    rec('Fallback when Leaflet cannot load', 'drawn map shown, Stands not blank', f"drawn map {p.locator('svg.map').count()}, note {p.locator('#mapFallback').count()}", p.locator('svg.map').count() == 1 and p.locator('#mapFallback').count() == 1)
    ctx.close()
    ctx = new_ctx(b); ctx.route('https://tile.openstreetmap.org/**', lambda r: r.abort())
    p = open_app(ctx); go(p, 'stands', 9000)
    rec('Fallback when map tiles cannot load', 'drawn map after 7 s', f"drawn map {p.locator('svg.map').count()}", p.locator('svg.map').count() == 1)
    ctx.close()

    # ---------- 4. Best stand ----------
    ctx = new_ctx(b); p = open_app(ctx); pick_dorm(p, 'thaler')
    for id_ in ['k1', 'k4', 'e5', 'f3']:
        go(p, 'item/' + id_, 400); p.click('.cta-row [data-act=cart-add]'); p.wait_for_timeout(300)
    go(p, 'cart', 700)
    lis = p.locator('#bestStand li')
    got = [(lis.nth(i).get_attribute('data-stand'), lis.nth(i).get_attribute('data-n')) for i in range(lis.count())]
    tip = p.locator('#bestTip').inner_text()
    rec('Cart at 2 stands: best stand card', 'Strahov 3, Thalerova 1; tip "Pick up at Strahov: 3 of 4 items in one trip"', f"{p.locator('#bestStand h3').inner_text()} {got} | {tip}",
        got == [('strahov', '3'), ('thaler', '1')] and tip == 'Pick up at Strahov: 3 of 4 items in one trip')
    p.screenshot(path=str(OUT / 'cart-best-stand-390.png'), full_page=True)
    # ---------- 5. Swap ----------
    st = json.loads(store_of(p)); st['shop/k1'] = {'status': 'sold', 'by': 'someone_else', 'until': 9e15}
    p.evaluate('s => localStorage.setItem("fakefs", s)', json.dumps(st)); p.reload(); p.wait_for_selector('html[data-app=ready]'); go(p, 'cart', 900)
    sw = p.locator('.swap[data-swap-for=k1]')
    to = sw.get_attribute('data-swap-to') if sw.count() else None
    rec('Sold cart item shows Swap', 'row of k1 shows a similar available kitchen item', f'swap to {to}', sw.count() == 1 and to)
    p.click('[data-act=swap][data-from=k1]'); p.wait_for_timeout(600)
    cart = p.evaluate('JSON.parse(localStorage.getItem("hd_guest")).cart.map(c => c.id)')
    rec('One tap Swap replaces it', f'cart has {to} instead of k1', str(cart), 'k1' not in cart and to in cart and len(cart) == 4)
    go(p, 'item/k1', 300); p.click('.detail-cta .heart'); p.wait_for_timeout(300); go(p, 'saved', 700)
    ok = p.locator('.swap[data-swap-for=k1]').count() == 1
    p.click('[data-act=swap][data-from=k1]'); p.wait_for_timeout(500)
    hearts = p.evaluate('JSON.parse(localStorage.getItem("hd_guest")).hearts')
    rec('Sold saved item shows Swap and replaces it', 'Saved row offers Swap, k1 replaced', f'{ok}, hearts {hearts}', ok and 'k1' not in hearts and len(hearts) == 1)
    ctx.close()

    # ---------- 6. Open now (Prague time; the test browser is set to New York to prove the zone is used) ----------
    # Round 7 hours: open 24 hours except Strahov 05:00 to 06:00 (and Thalerova 01:00 to 03:00, see test-round7.py).
    for clock, want in [('2026-11-11T05:30:00+01:00', 'Closed, opens at 06:00'), ('2026-11-11T06:10:00+01:00', 'Open now, until 05:00'), ('2026-11-11T17:30:00+01:00', 'Open now, until 05:00')]:
        ctx = new_ctx(b, tz='America/New_York'); pg = ctx.new_page(); pg.clock.install(time=clock)
        pg.goto(BASE + '#/stands/list'); pg.wait_for_selector('html[data-app=ready]', timeout=20000); pg.wait_for_timeout(700)
        txt = pg.locator('#stand-strahov .open-badge').inner_text(); icon = pg.locator('#stand-strahov .open-badge svg').count()
        rec(f'Open now at {clock[11:16]} Prague (Strahov, closed 05:00 to 06:00)', want, f'"{txt}", icon {icon}', txt == want and icon == 1)
        ctx.close()

    # ---------- 7. Listing without a photo: label inside its box ----------
    long_title = 'Big soft reading cushion with removable washable cover and side pockets for books'
    for w in (320, 390, 1280):
        ctx = new_ctx(b, w, 900); p = open_app(ctx)
        st = json.loads(store_of(p))
        st['listings/Ltest1'] = {'title': {'en': long_title, 'cs': long_title}, 'desc': {'en': '', 'cs': ''}, 'cat': 'textiles', 'cond': 'good', 'dorm': 'thaler', 'price': 190, 'newPrice': 800, 'photo': '', 'listedAt': int(time.time() * 1000)}
        st['listings/Ltest2'] = {'title': {'en': 'Mug', 'cs': 'Hrnek'}, 'desc': {'en': '', 'cs': ''}, 'cat': 'kitchen', 'cond': 'good', 'dorm': 'thaler', 'price': 50, 'newPrice': 700, 'photo': '', 'listedAt': int(time.time() * 1000)}
        p.evaluate('s => localStorage.setItem("fakefs", s)', json.dumps(st)); p.reload(); p.wait_for_selector('html[data-app=ready]')
        bad = []
        for h in ['browse', 'item/Ltest1', 'item/Ltest2']:
            go(p, h, 700)
            bad += p.evaluate('''(h) => [...document.querySelectorAll('.label-tile')].flatMap((tile) => {
              const b = tile.getBoundingClientRect(), l = tile.querySelector('.lt-label').getBoundingClientRect(), i = tile.querySelector('.lt-ic').getBoundingClientRect();
              const tx = tile.querySelector('.lt-text'), cs = getComputedStyle(tx), fs = parseFloat(cs.fontSize), lines = Math.round(tx.getBoundingClientRect().height / parseFloat(cs.lineHeight));
              const out = [];
              if (l.left < b.left - 0.5 || l.right > b.right + 0.5 || l.top < b.top - 0.5 || l.bottom > b.bottom + 0.5) out.push(h + ' label outside box');
              if (l.height > 0.85 * b.height + 0.5) out.push(h + ' label taller than 85 %');
              if (i.bottom > l.top + 0.5 && i.top < l.bottom && i.right > l.left && i.left < l.right) out.push(h + ' icon overlaps label');
              if (fs < 12) out.push(h + ' text ' + fs + ' px');
              if (lines > 3) out.push(h + ' ' + lines + ' lines');
              if (cs.hyphens === 'auto') out.push(h + ' hyphens auto');
              return out; })''', h)
        n = p.evaluate('document.querySelectorAll(".label-tile").length')
        rec(f'Photo label inside its box at {w} px', 'overlaps 0, label at most 85 %, 3 lines, 12 px or more', f'{n} label cards on the last page, problems {len(bad)} {bad[:3]}', not bad)
        if w == 390:
            go(p, 'browse', 700); p.locator('.label-tile').first.scroll_into_view_if_needed(); p.wait_for_timeout(300)
            p.screenshot(path=str(OUT / 'photo-label-390.png'))
        ctx.close()

    # ---------- 8. The professor's test ----------
    email = f'tester-r5-{int(time.time())}@hellodorm-demo.test'
    shots = []
    def shot(p, name):
        f = OUT / name; p.screenshot(path=str(f)); shots.append(name)
    for W, H in ((390, 844), (1280, 860)):
        email = f'tester-r5-{W}-{int(time.time())}@hellodorm-demo.test'
        ctx = new_ctx(b, W, H); p = open_app(ctx)
        rec(f'[{W}] Link opens logged out on Home', 'Home, account choices with Demo account', f"screen {p.eval_on_selector('#view', 'e => e.dataset.screen')}, demo button {p.locator('.acct [data-act=demo]').count()}",
            p.eval_on_selector('#view', 'e => e.dataset.screen') == 'home' and p.locator('.acct [data-act=demo]').count() == 1)
        shot(p, f'prof-{W}-1-home-logged-out.png')
        # demo: try it, sign out, again = fresh
        p.click('.acct [data-act=demo]'); p.wait_for_timeout(2500)
        strip = p.locator('#demoStrip').inner_text() if p.locator('#demoStrip').count() else ''
        uid1 = p.evaluate('JSON.parse(localStorage.getItem("firebase:authUser:fake")).uid')
        go(p, 'cart', 500); p.click('[data-act=cart-remove] >> nth=0'); p.wait_for_timeout(500)
        p.locator('[data-act=demo-reset]').count() or go(p, 'home', 500)
        go(p, 'home', 500); p.click('[data-act=demo-reset]'); p.wait_for_timeout(1500)
        reset_cart = p.evaluate('() => document.querySelector("#cartCount") ? document.querySelector("#cartCount").textContent : "0"')
        shot(p, f'prof-{W}-2-demo.png')
        rec(f'[{W}] Demo strip and Reset demo', 'strip says fresh for every tester; Reset brings back the 2 demo cart items', f'"{strip[:70]}", cart after reset {reset_cart}', 'fresh for every tester' in strip and reset_cart == '2')
        asked = signout(p)
        p.click('.acct [data-act=demo]'); p.wait_for_timeout(2500)
        uid2 = p.evaluate('JSON.parse(localStorage.getItem("firebase:authUser:fake")).uid')
        rec(f'[{W}] Demo: sign out and back in starts fresh', 'new demo copy (other id), sign out asked to confirm', f'confirm {asked}, same copy {uid1 == uid2}', asked and uid1 != uid2)
        signout(p)
        # sign up: welcome scene once, with the burst
        pick_dorm(p, 'thaler'); go(p, 'home')
        signup(p, email, 'Jana Novakova')
        scene = p.locator('#welcomeScene').count(); title = p.locator('#wsTitle').inner_text() if scene else ''
        canvas = p.locator('.fw-canvas').count()
        shot(p, f'prof-{W}-3-welcome-scene.png')
        p.wait_for_timeout(2700); canvas_after = p.locator('.fw-canvas').count()
        welcomed = json.loads(store_of(p)).get('users/u_' + email.replace('@', '_').replace('.', '_').replace('-', '_'), {}).get('welcomed')
        rec(f'[{W}] Sign up shows the welcome scene', 'Pip, "Welcome to HelloDorm, Jana", 3 start cards, burst gone within 2.5 s, welcomed stored', f'"{title}", cards {p.locator(".ws-card").count()}, burst {canvas} then {canvas_after}, welcomed {welcomed}',
            scene and title == 'Welcome to HelloDorm, Jana' and p.locator('.ws-card').count() == 3 and canvas == 1 and canvas_after == 0 and welcomed is True)
        p.click('[data-act=ws-go][data-to=home]'); p.wait_for_timeout(500)
        # add 2 items to the cart and save 1
        for id_ in ['k1', 'e3']:
            go(p, 'item/' + id_, 400); p.click('.cta-row [data-act=cart-add]'); p.wait_for_timeout(300)
        go(p, 'item/t2', 400); p.click('.detail-cta .heart'); p.wait_for_timeout(1200)
        signout(p)
        # second sign in: Welcome back, no scene, correct counts
        signin(p, email); go(p, 'home', 900)
        n = lambda k: p.get_attribute(f'[data-wb={k}]', 'data-n') if p.locator(f'[data-wb={k}]').count() else None
        rec(f'[{W}] Second sign in: Welcome back, no scene', 'no scene; card: 1 of 1 saved available, 2 in cart, 0 new', f"scene {p.locator('#welcomeScene').count()}, card {p.locator('#welcomeBack').count()}, saved {n('saved')}, cart {n('cart')}, new {n('new')}",
            p.locator('#welcomeScene').count() == 0 and p.locator('#welcomeBack').count() == 1 and n('saved') == '1' and n('cart') == '2' and n('new') == '0')
        shot(p, f'prof-{W}-4-welcome-back.png')
        signout(p)
        # another device: same account in a second browser context, cart still 2, no welcome scene
        store = store_of(p)
        ctx2 = new_ctx(b, W, H); p2 = open_app(ctx2, store=store)
        signin(p2, email); go(p2, 'cart', 900)
        c2 = p2.locator('.cart-row').count(); dorm2 = p2.evaluate('document.querySelector(".dorm-line") ? 1 : 0')
        go(p2, 'home', 600)
        rec(f'[{W}] Second device: cart and dorm come back', '2 cart items, dorm kept, no welcome scene', f'cart rows {c2}, scene {p2.locator("#welcomeScene").count()}, dorm line {p2.locator(".dorm-line").count()}',
            c2 == 2 and p2.locator('#welcomeScene').count() == 0 and p2.locator('.dorm-line').count() == 1)
        signout(p2)
        store = store_of(p2); ctx2.close()
        # a manager puts 1 new item on sale at Thalerova, then the third sign in
        st = json.loads(store); st['listings/Lnew1'] = {'title': {'en': 'Desk lamp with clamp', 'cs': 'Lampa se svorkou'}, 'desc': {'en': '', 'cs': ''}, 'cat': 'electronics', 'cond': 'good', 'dorm': 'thaler', 'price': 150, 'newPrice': 900, 'photo': '', 'listedAt': int(time.time() * 1000)}
        p.evaluate('s => localStorage.setItem("fakefs", s)', json.dumps(st)); p.reload(); p.wait_for_selector('html[data-app=ready]')
        signin(p, email); go(p, 'home', 900)
        newtxt = p.locator('[data-wb=new]').inner_text() if p.locator('[data-wb=new]').count() else ''
        rec(f'[{W}] Third sign in after 1 new item at my dorm', '"1 new item" shown, still no scene', f'"{newtxt}", new {n("new")}, scene {p.locator("#welcomeScene").count()}', n('new') == '1' and '1 new item' in newtxt and p.locator('#welcomeScene').count() == 0)
        shot(p, f'prof-{W}-5-third-sign-in.png')
        go(p, 'profile', 600); p.click('#signOutBtn'); p.wait_for_timeout(400); shot(p, f'prof-{W}-6-sign-out-confirm.png'); p.click('#signoutYes'); p.wait_for_timeout(800)
        errs = p.errs + [e for e in p2.errs]
        rec(f'[{W}] Page errors in the professor flow', '0', len(errs), not errs)
        ctx.close()

    # reduced motion: still card, no animation
    ctx = new_ctx(b, reduced_motion='reduce'); p = open_app(ctx)
    signup(p, f'tester-r5-rm-{int(time.time())}@hellodorm-demo.test', 'Petr')
    rec('Reduced motion: welcome scene without animation', 'still card, no burst canvas, no Pip animation', f"motion {p.get_attribute('#welcomeScene', 'data-motion')}, canvas {p.locator('.fw-canvas').count()}, pip anim {p.eval_on_selector('.ws-pip', 'e => getComputedStyle(e).animationName')}",
        p.get_attribute('#welcomeScene', 'data-motion') == 'reduced' and p.locator('.fw-canvas').count() == 0 and p.eval_on_selector('.ws-pip', 'e => getComputedStyle(e).animationName') == 'none')
    ctx.close()
    # a tap skips the burst
    ctx = new_ctx(b); p = open_app(ctx)
    signup(p, f'tester-r5-tap-{int(time.time())}@hellodorm-demo.test', 'Eva')
    before = p.locator('.fw-canvas').count(); p.mouse.click(20, 20); p.wait_for_timeout(350)
    rec('A tap skips the celebration', 'burst canvas removed at once', f'{before} then {p.locator(".fw-canvas").count()}', before == 1 and p.locator('.fw-canvas').count() == 0)
    ctx.close()
    # manager puts a donated item on sale: it appears in the shop (Manager mode loads on first use)
    ctx = new_ctx(b); p = open_app(ctx)
    p.click('.acct [data-act=demo]'); p.wait_for_timeout(2500); signout(p)
    signin(p, 'manager1@hellodorm-demo.test'); go(p, 'manager', 1800)
    p.click('[data-act=mgr-tab][data-v=offers]'); p.wait_for_timeout(800)
    forms = p.locator('form[data-form=list]').count()
    if forms: p.locator('form[data-form=list] button[type=submit]').first.click(); p.wait_for_timeout(1200)
    listed = [k for k in json.loads(store_of(p)) if k.startswith('listings/')]
    go(p, 'browse', 300); p.fill('#qInput', 'denim jacket'); p.wait_for_timeout(900)
    rec('Manager puts a donated item on sale', 'listing created, found by search in Browse', f'{forms} ready to sell, {len(listed)} listing, search finds {p.locator(".grid .card h3").all_inner_texts()[:1]}', forms >= 1 and len(listed) == 1 and p.locator('.grid .card').count() >= 1)
    rec('Page errors (manager)', '0', len(p.errs), not p.errs)
    ctx.close()
    b.close()

passed = sum(r['pass'] for r in rows)
(OUT / 'results.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding='utf-8')
md = ['| Test | Expected | Result | PASS or FAIL |', '|---|---|---|---|'] + [f"| {r['test']} | {r['expected']} | {r['result'].replace('|', '/')} | {'PASS' if r['pass'] else 'FAIL'} |" for r in rows]
(OUT / 'results.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
print(f'{passed} of {len(rows)} passed')
print(len(rows) - passed)
