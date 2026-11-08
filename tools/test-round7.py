"""Round 7 tests for v3 (8 Nov 2026): stand hours (24 hours, Thalerova closed 01:00 to 03:00, Strahov 05:00 to 06:00,
Prague time), the pickup hold, Sell's drop off days, and the public link forwarding to v3.
Stand-in database only (HD_FAKE=1 is forced). Run: python tools/test-round7.py [base url of the repository root]
Writes review/round7/results.md and results.json; prints a final failure count (must be 0)."""
import os, sys, json, pathlib, re
os.environ['HD_FAKE'] = '1'
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from browser import launch, prepare

ROOT_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/'
BASE = ROOT_URL + 'v3/'
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'review' / 'round7'; OUT.mkdir(parents=True, exist_ok=True)
rows = []
def rec(test, expected, result, ok):
    rows.append({'test': test, 'expected': expected, 'result': str(result), 'pass': bool(ok)})
    print(('PASS ' if ok else 'FAIL ') + test + ' | ' + str(result))

with sync_playwright() as pw:
    b = launch(pw)
    def open_at(clock, tz='Europe/Prague', w=390, h='#/stands/list'):
        c = prepare(b.new_context(viewport={'width': w, 'height': 844}, timezone_id=tz))
        p = c.new_page(); p.errs = []; p.on('pageerror', lambda e: p.errs.append(str(e)))
        if clock: p.clock.install(time=clock)
        p.goto(BASE + h); p.wait_for_selector('html[data-app=ready]', timeout=20000); p.wait_for_timeout(700)
        return c, p
    badge = lambda p, d: p.locator(f'#stand-{d} .open-badge').inner_text()
    hours = lambda p, d: p.locator(f'#stand-{d} .meta.small').first.inner_text()
    # ---------- 1. Open now, in Prague time, also from a browser set to New York ----------
    cases = [('thaler', '2026-11-11T02:00:00+01:00', 'Closed, opens at 03:00', False), ('thaler', '2026-11-11T04:00:00+01:00', 'Open now, until 01:00', True),
             ('strahov', '2026-11-11T05:30:00+01:00', 'Closed, opens at 06:00', False), ('strahov', '2026-11-11T06:10:00+01:00', 'Open now, until 05:00', True),
             ('blanice', '2026-11-11T03:00:00+01:00', 'Open now, 24 hours', True)]
    for tz in ('Europe/Prague', 'America/New_York'):
        for d, clock, want, opened in cases:
            c, p = open_at(clock, tz)
            got = badge(p, d); op = p.get_attribute(f'#stand-{d} .open-badge', 'data-open')
            rec(f'{d} at {clock[11:16]} Prague, browser in {tz}', want, f'"{got}", open {op}', got == want and op == ('1' if opened else '0'))
            c.close()
    # ---------- hours lines (EN and CZ) ----------
    for loc, w24, wth, wst in (('en-GB', 'Open 24 hours, every day', 'Open every day, closed 01:00 to 03:00', 'Open every day, closed 05:00 to 06:00'),
                               ('cs-CZ', 'Otevřeno nonstop, každý den', 'Otevřeno každý den, zavřeno 01:00 až 03:00', 'Otevřeno každý den, zavřeno 05:00 až 06:00')):
        c = prepare(b.new_context(viewport={'width': 390, 'height': 844}, locale=loc)); p = c.new_page()
        p.goto(BASE + '#/stands/list'); p.wait_for_selector('html[data-app=ready]'); p.wait_for_timeout(700)
        got = (hours(p, 'blanice'), hours(p, 'thaler'), hours(p, 'strahov'))
        rec(f'Hours lines on stand cards ({loc})', f'{w24} / {wth} / {wst}', got, got[0].startswith(w24) and got[1].startswith(wth) and got[2].startswith(wst))
        p.goto(BASE + '#/item/k1'); p.wait_for_timeout(700)
        box = p.locator('.pickup-place').inner_text()
        rec(f'Item pickup box names Thalerova\'s hours ({loc})', wth, box.replace('\n', ' ')[:120], wth in box)
        c.close()
    # ---------- the hold: 48 h, running on past a closed period ----------
    c, p = open_at('2026-11-11T01:30:00+01:00', h='')
    p.click('.acct [data-act=demo]'); p.wait_for_timeout(2500)
    if p.locator('#modal.show').count(): p.keyboard.press('Escape')
    res = p.evaluate('''async () => { const st = JSON.parse(localStorage.getItem('fakefs')); return 1; }''')
    p.goto(BASE + '#/checkout/k1'); p.wait_for_timeout(700); p.click('.confirm-pick'); p.click('#payBtn'); p.wait_for_timeout(1500)
    st = json.loads(p.evaluate('localStorage.getItem("fakefs")'))
    o = [v for k, v in st.items() if '/orders/' in k and v.get('dorm') == 'thaler' and any(x.get('id') == 'k1' for x in v.get('items', []))][0]
    held_h = (o['expiresAt'] - o['reservedAt']) / 3600000
    rec('Hold at Thalerova from 01:30 runs on to 03:00 two days later', '49.5 hours (48 h would end at 01:30, inside 01:00 to 03:00)', f'{held_h} hours', abs(held_h - 49.5) < 0.02)
    p.goto(BASE + '#/checkout/k4'); p.wait_for_timeout(700); p.click('.confirm-pick'); p.click('#payBtn'); p.wait_for_timeout(1500)
    st = json.loads(p.evaluate('localStorage.getItem("fakefs")'))
    o = [v for k, v in st.items() if '/orders/' in k and any(x.get('id') == 'k4' for x in v.get('items', []))][0]
    rec('Hold at Strahov from 01:30 is 48 hours', '48 hours (01:30 is outside 05:00 to 06:00)', f"{(o['expiresAt'] - o['reservedAt']) / 3600000} hours", abs((o['expiresAt'] - o['reservedAt']) / 3600000 - 48) < 0.02)
    p.goto(BASE + '#/orders'); p.wait_for_timeout(500)
    p.locator('.row-card', has_text='Electric kettle').first.click(); p.wait_for_timeout(800)
    rec('Pickup code at 01:30 at Thalerova: closed, opens at 03:00, no slider yet', '"Closed, opens at 03:00" and "Pickup opens in 1 h 30 min"', f"{p.locator('.code-open').inner_text()} / {p.locator('.wait-bar').inner_text()[:40] if p.locator('.wait-bar').count() else ''}",
        'Closed, opens at 03:00' in p.locator('.code-open').inner_text() and p.locator('.wait-bar').count() == 1 and re.search('1\\u00a0h (29|30)\\u00a0min', p.locator('.wait-bar').inner_text()))
    # ---------- Sell drop off: today and the next 6 days, any time, closed period named ----------
    p.goto(BASE + '#/sell'); p.wait_for_timeout(600)
    p.click('[data-act=d-set][data-k=cat][data-v=kitchen]'); p.fill('[data-in=d-title]', 'Mug'); p.click('[data-act=d-next]'); p.wait_for_timeout(300)
    p.click('[data-act=d-set][data-k=cond][data-v=good]'); p.click('[data-act=d-next]'); p.wait_for_timeout(300); p.click('[data-act=d-next]'); p.wait_for_timeout(300)
    p.click('[data-act=d-set][data-k=mode][data-v=sell]'); p.click('[data-act=d-next]'); p.wait_for_timeout(500)
    p.click('[data-act=d-set][data-k=stand][data-v=thaler]'); p.wait_for_timeout(400)
    days = p.locator('.day-pick .pick'); first = days.first.inner_text(); intro = p.locator('.muted').first.inner_text()
    rec('Sell: 7 days (today and 6 more), Thalerova names its closed hours', '7 choices, "Any time, except 01:00 to 03:00", no "2 hours" text', f'{days.count()} days, first "{first.replace(chr(10), " ")}", intro "{intro[:60]}"',
        days.count() == 7 and 'Any time, except 01:00 to 03:00' in first and '2 hours' not in intro)
    p.click('[data-act=d-set][data-k=stand][data-v=palach]'); p.wait_for_timeout(400)
    rec('Sell: a 24 hour stand says any time that day', '"Any time that day"', p.locator('.day-pick .pick').first.inner_text().replace('\n', ' '), 'Any time that day' in p.locator('.day-pick .pick').first.inner_text())
    rec('Page errors (hours, hold, sell)', '0', p.errs, not p.errs)
    c.close()
    # ---------- 2. the public link opens v3, keeping the invite query and the screen ----------
    c = prepare(b.new_context(viewport={'width': 390, 'height': 844})); p = c.new_page()
    p.goto(ROOT_URL + '?dorm=thaler&ref=invite#/about'); p.wait_for_selector('html[data-app=ready]', timeout=20000); p.wait_for_timeout(1200)
    url = p.url; scr = p.eval_on_selector('#view', 'e => e.dataset.screen')
    g = p.evaluate('JSON.parse(localStorage.getItem("hd_guest") || "{}").dorm')
    rec('Public link forwards to v3 with the invite and the screen', '/v3/, screen about, dorm thaler chosen from the invite', f'{url.replace(ROOT_URL, "/")}, screen {scr}, dorm {g}', '/v3/' in url and scr == 'about' and g == 'thaler')
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    rec('index.html points at v3 in all three places', "script, noscript and link use 'v3/'", f"v3/ x{html.count('v3/')}, url=v2 {html.count('url=v2')}, 'v2/' + {html.count(chr(39) + 'v2/' + chr(39))}", "location.replace('v3/'" in html and 'url=v3/' in html and 'href="v3/"' in html and "'v2/'" not in html and 'url=v2' not in html)
    c.close()
    b.close()

scan = [str(f.relative_to(ROOT)) for f in (ROOT / 'v3').rglob('*') if f.suffix in ('.js', '.html', '.css', '.json') and 'vendor' not in f.parts and re.search(r'16:00 to 19:00|10:00 to 13:00|16:00 až 19:00|10:00 až 13:00', f.read_text(encoding='utf-8', errors='ignore'))]
rec('No old hours left in v3', '0 files with "16:00 to 19:00" or "10:00 to 13:00" (EN or CZ)', scan, not scan)
passed = sum(r['pass'] for r in rows)
(OUT / 'results.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding='utf-8')
(OUT / 'results.md').write_text('\n'.join(['| Test | Expected | Result | PASS or FAIL |', '|---|---|---|---|'] + [f"| {r['test']} | {r['expected']} | {r['result'].replace('|', '/')} | {'PASS' if r['pass'] else 'FAIL'} |" for r in rows]) + '\n', encoding='utf-8')
print(f'{passed} of {len(rows)} passed')
print(len(rows) - passed)
