"""Readability check at 390 px (phone): every visible text at least 12 px, and every text field, select and search box
outline at least 3:1 against the white field (WCAG 1.4.11 non-text contrast). Prints offenders and a final count (must be 0).
Run: python tools/check-readable.py [base url]      (HD_FAKE=1 runs it without touching the real database, see browser.py)"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
from browser import launch, prepare

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/v2/"
MIN_PX = 12
JS = r"""
(minPx) => {
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const out = [];
  const shown = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width && r.height && cs.visibility !== 'hidden' && !el.closest('[hidden], .sr, #modal:not(.show), #toast:not(.show), [aria-hidden="true"]'); };
  document.querySelectorAll('body *').forEach((el) => {
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (!text || !shown(el)) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < minPx - 0.01) out.push(`text ${fs.toFixed(1)} px: '${text.slice(0, 30)}' (.${(el.className || el.tagName).toString().slice(0, 30)})`);
  });
  document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), select, textarea, .searchbar, .sel').forEach((el) => {
    if (!shown(el)) return;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.borderTopWidth) === 0 || cs.borderTopStyle === 'none') return; // the outline is drawn by a wrapper (.searchbar, .sel)
    const r = ratio(rgb(cs.borderTopColor), [255, 255, 255]);
    if (r < 3) out.push(`field outline ${r.toFixed(2)}:1 (${cs.borderTopColor}) on <${el.tagName.toLowerCase()} .${(el.className || '').toString().slice(0, 30)}>`);
  });
  return out;
}
"""
fails = 0
with sync_playwright() as pw:
    b = launch(pw)
    ctx = prepare(b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True))
    p = ctx.new_page(); p.goto(BASE); p.wait_for_selector("html[data-app=ready]", timeout=20000); p.wait_for_timeout(400)
    def run(label):
        global fails
        for x in sorted(set(p.evaluate(JS, MIN_PX))):
            fails += 1; print(f"FAIL {label}: {x}")
    run("onboarding"); p.click("[data-act=ob-skip]"); p.wait_for_timeout(300); run("welcome")
    for s in ["signin", "signup", "about", "waitlist"]:
        p.goto(BASE + "#/" + s); p.wait_for_timeout(400); run(s)
    p.goto(BASE + "#/welcome"); p.wait_for_timeout(300); p.click("[data-act=demo]", force=True); p.wait_for_timeout(5000)
    if p.is_visible("#modal.show"): p.keyboard.press("Escape")
    for s in ["home", "browse", "item/k1", "cart", "sell", "myitems", "orders", "notes", "profile", "bank", "stands/list", "stands/map"]:
        p.goto(BASE + "#/" + s); p.wait_for_timeout(600); run("demo " + s)
    b.close()
print(fails)
sys.exit(1 if fails else 0)
