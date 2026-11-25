"""v5 tests (25 Nov 2026): HelloDorm takes donations only. Stand-in database only (HD_FAKE=1 is forced).
Run: python tools/test-v5-donate.py [base url of the repository root]
Writes review/v5/results.md and screenshots; prints a final failure count (must be 0)."""
import os, sys, json, pathlib, re
os.environ['HD_FAKE'] = '1'
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from browser import launch, prepare

ROOT_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/'
BASE = ROOT_URL + 'v5/'
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'review' / 'v5'; OUT.mkdir(parents=True, exist_ok=True)
rows = []
def rec(test, expected, result, ok):
    rows.append({'test': test, 'expected': expected, 'result': str(result), 'pass': bool(ok)})
    print(('PASS ' if ok else 'FAIL ') + test + ' | ' + str(result))

SELL_WORDS = re.compile(r'\b(sell|selling|price offer|payout|prodat|prodej)\b', re.I)

def visible(p):
    return p.evaluate("() => document.querySelector('main') ? document.querySelector('main').innerText + '\\n' + document.querySelector('#tabbar').innerText : document.body.innerText")

with sync_playwright() as pw:
    b = launch(pw)
    for lang in ['en', 'cs']:
        c = b.new_context(viewport={'width': 390, 'height': 844}, locale='cs-CZ' if lang == 'cs' else 'en-US')
        if lang == 'cs':
            c.add_init_script("Object.defineProperty(navigator, 'language', { get: () => 'cs-CZ' }); Object.defineProperty(navigator, 'languages', { get: () => ['cs-CZ', 'cs'] });")
        prepare(c)
        p = c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(BASE + '#/home'); p.wait_for_selector('html[data-app=ready]', timeout=20000); p.wait_for_timeout(1200)
        for sel in ['.welcome-scene [data-act=ws-close]', '[data-act=ob-skip]', '[data-act=ws-skip]']:
            if p.locator(sel).count(): p.locator(sel).first.click(); p.wait_for_timeout(400)
        tab = p.locator('#tabbar a[href="#/sell"]').inner_text().strip()
        want = 'Donate' if lang == 'en' else 'Darovat'
        rec(f'{lang} 1 Tab bar shows Donate', want, tab, tab == want)
        if lang == 'en':
            p.screenshot(path=str(OUT / 'en-1-home-guest.png'), full_page=False)
        txt = visible(p)
        hits = sorted(set(m.group(0) for m in SELL_WORDS.finditer(txt)))
        rec(f'{lang} 2 Guest Home has no selling words', 'none', hits or 'none', not hits)
        # demo account
        p.goto(BASE + '#/home'); p.wait_for_timeout(600)
        demo = p.locator('[data-act=demo]').first
        demo.click(); p.wait_for_timeout(3000)
        for sel in ['[data-act=ws-close]', '[data-act=ws-skip]', '[data-act=ob-skip]']:
            if p.locator(sel).count() and p.locator(sel).first.is_visible(): p.locator(sel).first.click(); p.wait_for_timeout(400)
        p.goto(BASE + '#/myitems'); p.wait_for_timeout(1500)
        txt = visible(p)
        hits = sorted(set(m.group(0) for m in SELL_WORDS.finditer(txt)))
        rec(f'{lang} 3 Demo My items: donations only, no selling words', 'none', hits or 'none', not hits)
        if lang == 'en': p.screenshot(path=str(OUT / 'en-2-myitems-demo.png'))
        # donate flow
        p.goto(BASE + '#/sell'); p.wait_for_timeout(1200)
        if p.locator('[data-act=d-discard]').count(): p.locator('[data-act=d-discard]').click(); p.wait_for_timeout(500)
        step1 = p.locator('.sell .eyebrow').first.inner_text()
        rec(f'{lang} 4 Flow starts at step 1 of 4', '1 of 4 / 1 ze 4', step1, '1' in step1 and '4' in step1 and '5' not in step1)
        if lang == 'en': p.screenshot(path=str(OUT / 'en-3-donate-step1.png'))
        p.locator('[data-act=d-set][data-k=cat]').first.click(); p.wait_for_timeout(300)
        p.fill('[data-in=d-title]', 'Kettle test'); p.wait_for_timeout(200)
        p.click('[data-act=d-next]'); p.wait_for_timeout(500)
        p.locator('[data-act=d-set][data-k=cond]').first.click(); p.wait_for_timeout(300)
        p.click('[data-act=d-next]'); p.wait_for_timeout(500)
        p.click('[data-act=d-next]'); p.wait_for_timeout(600)  # photo step: skip
        step4 = p.locator('.sell .eyebrow').first.inner_text()
        has_mode = p.locator('[data-k=mode]').count()
        rec(f'{lang} 5 After the photo comes the stand step (4 of 4), no Sell/Donate choice', '4 of 4, 0 mode buttons', f'{step4}, mode buttons {has_mode}', '4' in step4 and has_mode == 0 and p.locator('[data-act=d-day]').count() > 0)
        if p.locator('[data-act=d-set][data-k=stand]').count() and not p.locator('.stand-pick .pick.on').count():
            p.locator('[data-act=d-set][data-k=stand]').first.click(); p.wait_for_timeout(300)
        p.locator('[data-act=d-day]').first.click(); p.wait_for_timeout(300)
        btn = p.locator('[data-act=d-next]').inner_text().strip()
        rec(f'{lang} 6 Last button says Confirm donation', 'Confirm donation / Potvrdit dar', btn, btn in ('Confirm donation', 'Potvrdit dar'))
        if lang == 'en': p.screenshot(path=str(OUT / 'en-4-donate-step4.png'))
        p.click('[data-act=d-next]'); p.wait_for_timeout(2000)
        done = visible(p)
        ok_done = ('Thank you!' in done and 'Thank you for passing it on' in done) if lang == 'en' else ('Děkujeme!' in done)
        rec(f'{lang} 7 Done screen thanks the donor and shows a drop off code', 'thank you + code', p.url.split('#')[1] + ' | ' + done[:90].replace('\n', ' '), ok_done and p.locator('.bigcode').count() == 1)
        if lang == 'en': p.screenshot(path=str(OUT / 'en-5-donate-done.png'))
        # saved item is a donation
        p.goto(BASE + '#/myitems'); p.wait_for_timeout(1200)
        row = p.locator('.row-card', has_text='Kettle test').first.inner_text() if p.locator('.row-card', has_text='Kettle test').count() else ''
        want_mode = 'Donate' if lang == 'en' else 'Darovat'
        rec(f'{lang} 8 New item is saved as a donation', want_mode, row.replace('\n', ' ')[:90], want_mode in row)
        # profile: no payout row
        p.goto(BASE + '#/profile'); p.wait_for_timeout(1000)
        bank = p.locator('a[href="#/bank"]').count()
        rec(f'{lang} 9 Profile has no Payout details row', '0', bank, bank == 0)
        if lang == 'en': p.screenshot(path=str(OUT / 'en-6-profile.png'))
        # FAQ / about
        p.goto(BASE + '#/about'); p.wait_for_timeout(1000)
        txt = p.evaluate("() => document.querySelector('main').innerText")
        txt = txt.replace('no time to sell them or give them away', '').replace('nestihnou prodat ani nikomu dát', '')  # the problem itself
        hits = sorted(set(m.group(0) for m in SELL_WORDS.finditer(txt)))
        rec(f'{lang} 10 About page has no selling words', 'none', hits or 'none', not hits)
        rec(f'{lang} 11 No script errors', '0', len(errs), not errs)
        c.close()
    b.close()

fails = sum(1 for r in rows if not r['pass'])
(OUT / 'results.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding='utf-8')
md = ['# v5 donations-only tests', '', '| Test | Expected | Result | Pass |', '|---|---|---|---|'] + [f"| {r['test']} | {r['expected']} | {r['result']} | {'yes' if r['pass'] else 'NO'} |" for r in rows]
(OUT / 'results.md').write_text('\n'.join(md) + f'\n\nFailures: {fails}\n', encoding='utf-8')
print('FAILURES', fails)
