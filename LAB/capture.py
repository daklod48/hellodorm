"""Improvement Lab capture: screenshots of every main screen at 390 x 844 (phone) and 1440 x 900 (laptop), a click
through of the main flow (guest Home, dorm, item, reserve, demo account, checkout, pay, pickup code), and metrics.json
(ready time, code size, results of the four checks). Runs against the local server with the stand-in database
(tools/fake-firebase), so nothing is written to the real HelloDorm database.

Run (local server on port 8080 first):  HD_FAKE=1 python LAB/capture.py 0      -> LAB/captures/run-00/
Add HD_CHROME=<path> if the installed Chrome is not found."""
import io, json, os, pathlib, re, statistics, subprocess, sys, time
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from playwright.sync_api import sync_playwright
from browser import launch, prepare
from PIL import Image

RUN = int(sys.argv[1]) if len(sys.argv) > 1 else 0
BASE = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8080/v2/'
OUT = ROOT / 'LAB' / 'captures' / f'run-{RUN:02d}'
OUT.mkdir(parents=True, exist_ok=True)
for f in OUT.glob('*.jpg'): f.unlink()


def save(page, name, full=False):
    png = page.screenshot(full_page=full)
    im = Image.open(io.BytesIO(png)).convert('RGB')
    if im.height > 4000: im = im.crop((0, 0, im.width, 4000))
    im.save(OUT / f'{name}.jpg', quality=80)


def screen(p): return p.evaluate("document.querySelector('#view').dataset.screen")


def walk(b, w, h, tag):
    ctx = prepare(b.new_context(viewport={'width': w, 'height': h}, is_mobile=w < 900, has_touch=w < 900, device_scale_factor=1))
    p = ctx.new_page(); errors = []
    p.on('pageerror', lambda e: errors.append(str(e)))
    t0 = time.time(); p.goto(BASE); p.wait_for_selector('html[data-app=ready]', timeout=30000); ready = time.time() - t0
    p.wait_for_timeout(1000)
    save(p, f'{tag}-01-home'); save(p, f'{tag}-02-home-full', True)
    p.click('.dorm-first'); p.wait_for_timeout(500); save(p, f'{tag}-03-choose-dorm')
    p.click('.dorm-opt:has-text("Thalerova")'); p.wait_for_timeout(800)
    p.goto(BASE + '#/browse'); p.wait_for_timeout(900); save(p, f'{tag}-04-browse')
    p.goto(BASE + '#/item/k1'); p.wait_for_timeout(900); save(p, f'{tag}-05-item')
    p.click('[data-act=reserve]'); p.wait_for_timeout(600); save(p, f'{tag}-06-sign-in-dialog')
    p.click('#modal [data-act=demo]'); p.wait_for_timeout(2500)
    flow = {'after_demo': screen(p)}
    save(p, f'{tag}-07-checkout-full', True)
    p.click('.confirm-pick'); p.click('#payBtn'); p.wait_for_timeout(1500)
    flow['after_pay'] = screen(p)
    save(p, f'{tag}-08-success-full', True)
    for i, s in enumerate(['orders', 'profile', 'about', 'feedback', 'sell', 'saved'], 9):
        p.goto(BASE + '#/' + s); p.wait_for_timeout(800); save(p, f'{tag}-{i:02d}-{s}')
    ctx.close()
    return ready, errors, flow


def ready_times(b, n=3):
    out = []
    for _ in range(n):
        ctx = prepare(b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True))
        p = ctx.new_page(); t0 = time.time(); p.goto(BASE); p.wait_for_selector('html[data-app=ready]', timeout=30000)
        out.append(round(time.time() - t0, 3)); ctx.close()
    return out


def code_bytes():
    v2 = ROOT / 'v2'
    files = [*v2.glob('*.js'), *v2.glob('*.mjs'), *v2.glob('*.css'), *v2.glob('*.html'), *(v2 / 'data').glob('*.js')]
    return sum(f.stat().st_size for f in files)


def check(cmd):
    try:
        r = subprocess.run([sys.executable, *cmd], cwd=ROOT, capture_output=True, text=True, timeout=900, env=os.environ)
        last = (r.stdout.strip().splitlines() or ['?'])[-1]
        return int(last) if re.fullmatch(r'\d+', last) else last
    except Exception as e:  # report, do not hide
        return f'error: {e}'


with sync_playwright() as pw:
    b = launch(pw)
    r390, e390, f390 = walk(b, 390, 844, 'p390')
    r1440, e1440, f1440 = walk(b, 1440, 900, 'l1440')
    times = ready_times(b)
    b.close()

metrics = {
    'run': RUN, 'date': time.strftime('%Y-%m-%d %H:%M'),
    'ready_seconds_median': statistics.median(times), 'ready_seconds_runs': times,
    'note_speed': 'Time from opening the page to the app being ready, local server, stand-in database, same machine every run.',
    'code_bytes_v2': code_bytes(),
    'flow_phone': f390, 'flow_laptop': f1440,
    'page_errors': e390 + e1440,
    'checks_failures': {
        'contrast_4_5': check(['tools/check-contrast.py', BASE, 'x']),
        'tap_targets_44px': check(['tools/check-taps.py', BASE]),
        'text_12px_and_field_outlines': check(['tools/check-readable.py', BASE]),
        'dashes_in_visible_text': check(['tools/scan-dashes.py', 'v2']),
    },
}
(OUT / 'metrics.json').write_text(json.dumps(metrics, indent=2))
print(json.dumps(metrics, indent=2))
print('captures:', len(list(OUT.glob('*.jpg'))))
