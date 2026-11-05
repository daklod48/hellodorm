"""Tap target check at 390 px: every visible link, button, input and checkbox must be at least 44 x 44 px
(inline text links inside a sentence are exempt, as WCAG 2.5.8 allows). Prints offenders and a final count (must be 0).
Run: python tools/check-taps.py [base url]"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
from browser import launch, prepare  # tools/browser.py: installed Chrome by default, HD_FAKE=1 for no database writes

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/v2/"
JS = r"""
() => {
  const out = [];
  document.querySelectorAll('a, button, input, select, textarea, [role=button], label.tickbox, label.file, label.confirm-pick, .scale label, .choice label').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (el.closest('[hidden], #modal:not(.show), #toast')) return;
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio' || el.type === 'file' || el.type === 'range') && el.closest('label')) return;
    if (el.tagName === 'INPUT' && el.closest('.tickbox')) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // inline links inside running text are exempt
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.parentElement && el.parentElement.textContent.trim().length > el.textContent.trim().length + 3) return;
    if (r.width < 44 || r.height < 44) out.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 40), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
  });
  return out;
}
"""
SCREENS = ["welcome", "signin", "signup", "about", "home", "browse", "item/k1", "item/s1", "checkout/k1", "saved", "cart", "stands/list", "stands/map", "waitlist", "profile", "myitems", "orders", "notes", "feedback"]
fails = 0
with sync_playwright() as pw:
    b = launch(pw)
    ctx = prepare(b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True))
    p = ctx.new_page(); p.goto(BASE); p.wait_for_selector("html[data-app=ready]", timeout=20000); p.wait_for_timeout(400)
    def run(label):
        global fails
        for x in p.evaluate(JS):
            fails += 1; print(f"FAIL {label}: <{x['tag']} .{x['cls']}> '{x['text']}' {x['w']}x{x['h']}")
    run("onboarding"); p.goto(BASE + "#/welcome"); p.wait_for_timeout(300); run("welcome")
    p.click(".langbtn", force=True); p.wait_for_timeout(300); run("language menu"); p.click("body", position={"x": 5, "y": 400})
    for s in ["signin", "signup", "about"]:
        p.goto(BASE + "#/" + s); p.wait_for_timeout(400); run(s)
    p.goto(BASE + "#/welcome"); p.wait_for_timeout(300); p.click("[data-act=guest]", force=True); p.wait_for_timeout(900)
    if p.is_visible("#modal.show"): run("dorm dialog"); p.wait_for_timeout(500); p.click(".dorm-opt >> nth=2", force=True); p.wait_for_timeout(600)
    for s in SCREENS[4:]:
        p.goto(BASE + "#/" + s); p.wait_for_timeout(500); run("guest " + s)
    # v2: a guest pays for one item and sees the pickup code (stored on the device only)
    p.goto(BASE + "#/checkout/k2"); p.wait_for_timeout(600)
    if p.locator(".confirm-pick").count():
        run("guest checkout"); p.click(".confirm-pick", force=True); p.click("#payBtn", force=True); p.wait_for_timeout(1200); run("guest pickup code")
    p.goto(BASE + "#/welcome"); p.wait_for_timeout(900)
    p.click("[data-act=demo]", force=True); p.wait_for_timeout(6000)
    for s in ["home", "myitems", "orders", "cart", "sell", "profile", "bank", "notes"]:
        p.goto(BASE + "#/" + s); p.wait_for_timeout(600); run("demo " + s)
    p.goto(BASE + "#/myitems"); p.wait_for_timeout(500)
    for i in range(min(4, p.locator(".row-card[href^='#/myitem/']").count())):
        p.goto(BASE + "#/myitems"); p.wait_for_timeout(300); p.click(f".row-card[href^='#/myitem/'] >> nth={i}", force=True); p.wait_for_timeout(700); run(f"demo my item {i}")
    p.goto(BASE + "#/orders"); p.wait_for_timeout(400); p.click(".row-card >> nth=0", force=True); p.wait_for_timeout(700); run("demo order")
    if p.is_visible(".pip-btn"): p.click(".pip-btn >> visible=true", force=True); p.wait_for_timeout(600); run("pip faq")
    b.close()
print(fails)
sys.exit(1 if fails else 0)
