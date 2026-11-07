"""Screenshots of v3 for the fresh eyes reviewer (round 5): the main screens and every new state, at 390 and 1280 px.
Stand-in database only. Output: review/round5/fresh/<width>-<nn>-<name>.png
Run: python tools/capture-round5.py [base url] [folder name, default fresh]"""
import os, sys, json, time, pathlib
os.environ['HD_FAKE'] = '1'
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from browser import launch, prepare
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/v3/'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'review' / 'round5' / (sys.argv[2] if len(sys.argv) > 2 else 'fresh')
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as pw:
    b = launch(pw)
    for W, H in ((390, 844), (1280, 860)):
        n = [0]
        ctx = prepare(b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1, timezone_id='Europe/Prague'))
        p = ctx.new_page()
        def go(h, ms=700): p.goto(BASE + '#/' + h); p.wait_for_timeout(ms)
        def shot(name, full=False):
            n[0] += 1; p.screenshot(path=str(OUT / f'{W}-{n[0]:02d}-{name}.png'), full_page=full)
        p.goto(BASE); p.wait_for_selector('html[data-app=ready]', timeout=20000); p.wait_for_timeout(700)
        st = json.loads(p.evaluate('localStorage.getItem("fakefs") || "{}"'))
        st['listings/Lnew'] = {'title': {'en': 'Big soft reading cushion with washable cover', 'cs': 'Velký polštář na čtení s pratelným potahem'}, 'desc': {'en': 'Put on sale by the stand team.', 'cs': ''}, 'cat': 'textiles', 'cond': 'good', 'dorm': 'thaler', 'price': 190, 'newPrice': 800, 'photo': '', 'listedAt': int(time.time() * 1000)}
        st['shop/k1'] = {'status': 'sold', 'by': 'someone_else', 'until': 9e15}
        p.evaluate('s => localStorage.setItem("fakefs", s)', json.dumps(st)); p.reload(); p.wait_for_selector('html[data-app=ready]'); p.wait_for_timeout(600)
        shot('home-logged-out')
        go('stands/list'); p.click('#stand-thaler [data-act=pick-dorm]'); p.wait_for_timeout(400)
        go('browse', 300); p.fill('#qInput', 'rychlovarna konvice'); p.wait_for_timeout(900); shot('search-czech-no-accents')
        p.fill('#qInput', 'lamp xyzzy'); p.wait_for_timeout(900); shot('search-closest')
        go('stands/map', 3500); shot('stands-map')
        p.click('#stand-strahov [data-act=route]'); p.wait_for_selector('.route-res', timeout=15000); p.wait_for_timeout(800)
        p.locator('#standsMapBox').scroll_into_view_if_needed(); shot('stands-route')
        go('item/Lnew'); shot('listing-photo-label')
        go('item/k4'); p.click('[data-act=pbox-route]'); p.wait_for_selector('.pmap .route-res', timeout=15000); p.wait_for_timeout(800)
        p.locator('.pmap').scroll_into_view_if_needed(); shot('pickup-box-route')
        # the kettle (k1) was put in the cart before someone else bought it
        p.evaluate('(() => { const g = JSON.parse(localStorage.getItem("hd_guest") || "{}"); g.cart = [{ id: "k1", on: true }]; localStorage.setItem("hd_guest", JSON.stringify(g)); })()')
        p.reload(); p.wait_for_selector('html[data-app=ready]'); p.wait_for_timeout(500)
        for id_ in ['k1', 'k4', 'f3', 'e3']:  # k1 is sold (Swap), the rest wait at Strahov and Thalerova (2 stands)
            go('item/' + id_, 350)
            if p.locator('.cta-row [data-act=cart-add]').count(): p.click('.cta-row [data-act=cart-add]'); p.wait_for_timeout(250)
        go('cart', 800); p.locator('#bestStand').scroll_into_view_if_needed(); shot('cart-best-stand')
        p.locator('.swap').first.scroll_into_view_if_needed(); p.wait_for_timeout(200); shot('cart-swap')
        email = f'tester-cap-{W}-{int(time.time())}@hellodorm-demo.test'
        go('signup', 400); p.fill('#fSignup input[name=name]', 'Jana Novakova'); p.fill('#fSignup input[name=email]', email); p.fill('#fSignup input[name=password]', 'madeup123')
        p.click('#fSignup button[type=submit]'); p.wait_for_timeout(700); shot('welcome-scene-burst'); p.wait_for_timeout(2600); shot('welcome-scene')
        p.keyboard.press('Escape'); p.wait_for_timeout(300)
        go('profile'); p.click('#signOutBtn'); p.wait_for_timeout(400); shot('sign-out-confirm'); p.click('#signoutYes'); p.wait_for_timeout(900)
        go('signin', 400); p.fill('#fSignin input[name=email]', email); p.fill('#fSignin input[name=password]', 'madeup123'); p.click('#fSignin button[type=submit]'); p.wait_for_timeout(1500)
        go('home', 900); shot('welcome-back')
        go('profile'); p.click('#signOutBtn'); p.wait_for_timeout(300); p.click('#signoutYes'); p.wait_for_timeout(900)
        go('home', 400); p.click('.acct [data-act=demo]'); p.wait_for_timeout(2500); go('home', 700); shot('demo-strip')
        go('orders', 500); p.click('.row-card >> nth=0'); p.wait_for_timeout(800); shot('pickup-code-open-now')
        ctx.close()
    b.close()
print('saved to', OUT)
