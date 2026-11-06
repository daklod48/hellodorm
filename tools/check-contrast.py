"""Runtime contrast check: opens the app in headless Chrome (Playwright, installed Chrome), walks every visible
element that holds text on a list of screens, and computes the WCAG contrast between its text colour and the
first solid background behind it. Prints every pair under 4.5:1 and a final failure count (must be 0).
Run: python tools/check-contrast.py [base url] [manager password]"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
from browser import launch, prepare  # tools/browser.py: installed Chrome by default, HD_FAKE=1 for no database writes

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/v2/"
MGR_PW = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("HD_MGR_PW", "")

JS = r"""
() => {
  const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  // Returns a list of candidate backgrounds: one for a plain colour, several for a gradient (each stop).
  const bgOf = (el) => {
    let layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e); const c = parse(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        if (!/gradient/.test(cs.backgroundImage)) return null; // photo behind text: skip
        const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter((x) => x && x.a > 0);
        if (stops.length) { layers.push(stops); break; }
      }
      if (c && c.a > 0) { layers.push([c]); if (c.a >= 1) break; }
    }
    if (!layers.length) return [{ r: 255, g: 255, b: 255, a: 1 }];
    // compose from the bottom up; a gradient layer yields one result per stop
    let outs = layers[layers.length - 1].map((c) => (c.a < 1 ? blend(c, { r: 255, g: 255, b: 255, a: 1 }) : c));
    for (let i = layers.length - 2; i >= 0; i--) outs = outs.flatMap((o) => layers[i].map((c) => blend(c, o)));
    return outs;
  };
  const bad = [], seen = new Set();
  document.querySelectorAll('body *').forEach((el) => {
    if (!el.childNodes.length) return;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (!text) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    if (el.closest('[hidden], .sr, #toast:not(.show), #modal:not(.show), [aria-hidden="true"]')) return;
    const fg = parse(cs.color); const bgs = bgOf(el); if (!fg || !bgs) return;
    let ratio = 99, bg = bgs[0];
    for (const b of bgs) {
      const f2 = fg.a < 1 ? blend(fg, b) : fg;
      const l1 = lum(f2.r, f2.g, f2.b), l2 = lum(b.r, b.g, b.b);
      const r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (r < ratio) { ratio = r; bg = b; }
    }
    if (ratio < 4.5) {
      const key = cs.color + '|' + `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` + '|' + text.slice(0, 30);
      if (seen.has(key)) return; seen.add(key);
      bad.push({ ratio: Math.round(ratio * 100) / 100, color: cs.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`, text: text.slice(0, 40), cls: (el.className || '').toString().slice(0, 40), tag: el.tagName });
    }
  });
  return bad;
}
"""
SCREENS_GUEST = ["onboarding", "welcome", "signin", "signup", "about", "home", "browse", "item/k1", "item/s1", "checkout/k1", "saved", "cart", "stands/map", "waitlist", "profile", "myitems", "orders", "feedback"]
SCREENS_DEMO = ["home", "myitems", "notes", "orders", "cart", "sell", "profile", "bank", "checkout/k5"]
fails = 0
with sync_playwright() as pw:
    b = launch(pw)
    for w, h, mobile in ((390, 844, True), (1280, 800, False)):
        ctx = prepare(b.new_context(viewport={"width": w, "height": h}, is_mobile=mobile, has_touch=mobile))
        p = ctx.new_page(); p.goto(BASE); p.wait_for_selector("html[data-app=ready]", timeout=20000); p.wait_for_timeout(400)
        def run(label):
            bad = p.evaluate(JS)
            global fails
            for x in bad:
                fails += 1
                print(f"FAIL {w}px {label}: {x['ratio']}:1 {x['color']} on {x['bg']} <{x['tag']} .{x['cls']}> '{x['text']}'")
        run("onboarding")
        p.goto(BASE + "#/welcome"); p.wait_for_timeout(400); run("welcome")
        p.click(".langbtn", force=True); p.wait_for_timeout(300); run("language menu"); p.keyboard.press("Escape"); p.click("body", position={"x": 5, "y": 400})
        for s in ["signin", "signup", "about"]:
            p.goto(BASE + "#/" + s); p.wait_for_timeout(500); run(s)
        p.goto(BASE + "#/welcome"); p.wait_for_timeout(300); p.click("[data-act=guest]", force=True); p.wait_for_timeout(900)
        if p.is_visible("#modal.show"): run("dorm dialog"); p.wait_for_timeout(500); p.click(".dorm-opt >> nth=2", force=True); p.wait_for_timeout(600)
        for s in SCREENS_GUEST[5:]:
            p.goto(BASE + "#/" + s); p.wait_for_timeout(600); run("guest " + s)
        p.goto(BASE + "#/browse"); p.wait_for_timeout(600)
        if p.locator("[data-act=cart-add]").count():
            p.locator(".card").filter(has=p.locator("[data-act=cart-add]")).first.locator("h3 a").click(force=True); p.wait_for_timeout(500)
            if p.is_visible("[data-act=reserve]"): p.click("[data-act=reserve]", force=True); p.wait_for_timeout(500); run("need account dialog"); p.keyboard.press("Escape")
        if p.is_visible(".pip-btn"):
            p.click(".pip-btn >> visible=true", force=True); p.wait_for_timeout(600); run("pip faq"); p.keyboard.press("Escape")
        p.goto(BASE + "#/feedback"); p.wait_for_timeout(500)
        for sel in ('input[name="q1"][value="4"] + span', 'input[name="q3"][value="yes"] + span'): p.click(sel, force=True)
        p.wait_for_timeout(700); run("feedback answers picked")
        p.goto(BASE + "#/checkout/k2"); p.wait_for_timeout(600)
        if p.locator(".confirm-pick").count():
            p.click(".confirm-pick", force=True); p.wait_for_timeout(200); run("guest checkout ticked"); p.click("#payBtn", force=True); p.wait_for_timeout(1200); run("guest pickup code")
        p.goto(BASE + "#/welcome"); p.wait_for_timeout(900)
        p.click("[data-act=demo]", force=True); p.wait_for_timeout(6000)
        for s in SCREENS_DEMO:
            p.goto(BASE + "#/" + s); p.wait_for_timeout(700); run("demo " + s)
        p.goto(BASE + "#/myitems"); p.wait_for_timeout(600)
        for i in range(min(4, p.locator(".row-card[href^='#/myitem/']").count())):
            p.goto(BASE + "#/myitems"); p.wait_for_timeout(400); p.click(f".row-card[href^='#/myitem/'] >> nth={i}", force=True); p.wait_for_timeout(700); run(f"demo my item {i}")
        p.goto(BASE + "#/orders"); p.wait_for_timeout(500); p.click(".row-card >> nth=0", force=True); p.wait_for_timeout(700); run("demo order")
        if MGR_PW:
            p.goto(BASE + "#/profile"); p.wait_for_timeout(300); p.click("[data-act=signout]", force=True); p.wait_for_timeout(500)
            if p.is_visible("[data-act=signout-yes]"): p.click("[data-act=signout-yes]"); p.wait_for_timeout(1500)
            p.goto(BASE + "#/signin"); p.wait_for_timeout(400); p.fill("input[name=email]", "manager1@hellodorm-demo.test"); p.fill("input[name=password]", MGR_PW); p.click("#fSignin button[type=submit]"); p.wait_for_timeout(3500)
            if p.is_visible("#modal.show"): p.keyboard.press("Escape")
            p.goto(BASE + "#/manager"); p.wait_for_timeout(3500); run("manager queue")
            for tab in ["offers", "totals", "controls"]:
                p.click(f"[data-act=mgr-tab][data-v={tab}]", force=True); p.wait_for_timeout(500); run("manager " + tab)
        ctx.close()
    b.close()
print(fails)
sys.exit(1 if fails else 0)
