"""Builds LAB/tracker.html from LAB/runs.json and the captures. The page opens by double-click with no server and no
file picker: the run data is embedded as JSON and each thumbnail as a small base64 JPEG. Run: python LAB/build_tracker.py"""
import base64, html, io, json, pathlib
from PIL import Image

LAB = pathlib.Path(__file__).resolve().parent
runs = json.loads((LAB / 'runs.json').read_text())
CRIT = ['first_impression_beauty', 'clarity_of_main_task', 'flow_without_dead_ends', 'trust_and_credibility',
        'mobile_quality', 'speed', 'accessibility', 'delight_or_innovation']
LABEL = ['Beauty', 'Clarity', 'Flow', 'Trust', 'Mobile', 'Speed', 'Access', 'Delight']


def thumb(run, name, w=150):
    f = LAB / 'captures' / f'run-{run:02d}' / f'{name}.jpg'
    if not f.exists(): return ''
    im = Image.open(f).convert('RGB'); im.thumbnail((w, w * 2.2))
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=62)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


for r in runs:
    r['thumbs'] = [x for x in (thumb(r['run'], n) for n in ('p390-01-home', 'p390-07-checkout-full', 'p390-08-success-full')) if x]
kept = [r for r in runs if r['verdict'] in ('baseline', 'kept')]
best = max(kept, key=lambda r: r['total'])['run'] if kept else None
data = json.dumps({'runs': runs, 'crit': CRIT, 'label': LABEL, 'best': best})

page = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>HelloDorm Lab tracker</title>
<style>
:root { --bg: #E8F5EE; --card: #fff; --ink: #0B3D2E; --muted: #4B5563; --green: #17754A; --sun: #F4B740; --red: #B42318; --line: #CFE3D8; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0d1f18; --card: #14291f; --ink: #E6F4EC; --muted: #B7C9BF; --green: #5CC48F; --line: #2a4a3a; } }
:root[data-theme="dark"] { --bg: #0d1f18; --card: #14291f; --ink: #E6F4EC; --muted: #B7C9BF; --green: #5CC48F; --line: #2a4a3a; }
* { box-sizing: border-box; } body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, sans-serif; padding: 16px; }
main { max-width: 1100px; margin: 0 auto; } h1 { margin: 0 0 4px; } .muted { color: var(--muted); }
.panel { background: var(--card); border-radius: 16px; padding: 16px; margin: 16px 0; box-shadow: 0 2px 10px rgba(0,0,0,.06); }
svg text { fill: var(--muted); font-size: 12px; } .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.run { background: var(--card); border-radius: 16px; padding: 16px; border: 2px solid transparent; }
.run.best { border-color: var(--green); } .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 13px; font-weight: 700; }
.kept, .baseline { background: var(--green); color: #fff; } .reverted { background: var(--red); color: #fff; } .bestb { background: var(--sun); color: #0B3D2E; margin-left: 6px; }
.thumbs { display: flex; gap: 6px; margin: 10px 0; overflow-x: auto; } .thumbs img { height: 150px; border-radius: 8px; border: 1px solid var(--line); }
table { width: 100%; border-collapse: collapse; font-size: 14px; } td { padding: 3px 4px; border-bottom: 1px solid var(--line); } td:last-child { text-align: right; font-weight: 700; }
ul { padding-left: 18px; margin: 6px 0; } .total { font-size: 28px; font-weight: 800; }
</style></head><body><main>
<h1>HelloDorm Improvement Lab</h1><p class="muted">One card per run. Scores from an independent scorer against the frozen rubric (8 criteria, 1 to 10, total out of 80). Best kept run is outlined.</p>
<div class="panel"><b>Total score per run</b><div id="chart"></div></div>
<div class="grid" id="cards"></div></main>
<script id="data" type="application/json">__DATA__</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const W = 640, H = 220, P = 36, runs = D.runs, n = runs.length;
const x = (i) => P + (n < 2 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (n - 1)), y = (v) => H - P - (v / 80) * (H - 2 * P);
let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Total score per run">`;
[0, 20, 40, 60, 80].forEach((v) => { s += `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="4" y="${y(v) + 4}">${v}</text>`; });
s += `<polyline fill="none" stroke="var(--green)" stroke-width="3" points="${runs.map((r, i) => x(i) + ',' + y(r.total)).join(' ')}"/>`;
runs.forEach((r, i) => { s += `<circle cx="${x(i)}" cy="${y(r.total)}" r="${r.run === D.best ? 8 : 5}" fill="${r.verdict === 'reverted' ? 'var(--red)' : 'var(--green)'}"/><text x="${x(i) - 14}" y="${H - 10}">run ${r.run}</text><text x="${x(i) - 8}" y="${y(r.total) - 12}">${r.total}</text>`; });
document.getElementById('chart').innerHTML = s + '</svg>';
document.getElementById('cards').innerHTML = runs.map((r) => `<article class="run ${r.run === D.best ? 'best' : ''}">
  <h2 style="margin:0">Run ${r.run} <span class="badge ${r.verdict}">${esc(r.verdict)}</span>${r.run === D.best ? '<span class="badge bestb">best</span>' : ''}</h2>
  <p class="muted" style="margin:2px 0">${esc(r.date)}</p><p class="total">${r.total} / 80</p>
  <div class="thumbs">${r.thumbs.map((t) => `<img src="${t}" alt="Run ${r.run} capture">`).join('')}</div>
  <table>${D.crit.map((c, i) => `<tr><td>${D.label[i]}</td><td>${r.scores[c]}</td></tr>`).join('')}</table>
  <p><b>Changes</b></p><ul>${(r.changes || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  ${r.innovation ? `<p><b>Innovation:</b> ${esc(r.innovation)}</p>` : ''}
  <p><b>Top flaws found by the scorer</b></p><ul>${(r.top_3_flaws || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  <p class="muted">Code size ${(r.size_bytes / 1024).toFixed(0)} KB${r.size_change_pct != null ? ` (${r.size_change_pct > 0 ? '+' : ''}${r.size_change_pct} %)` : ''}. Tests: ${esc(r.tests)}. ${r.preview ? `Preview: <a href="${esc(r.preview)}">${esc(r.preview)}</a>` : ''}</p>
</article>`).join('');
</script></body></html>"""
(LAB / 'tracker.html').write_text(page.replace('__DATA__', data.replace('</', '<\\/')))
print('tracker.html', round((LAB / 'tracker.html').stat().st_size / 1024), 'KB,', len(runs), 'runs, best run', best)
