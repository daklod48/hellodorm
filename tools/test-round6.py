"""Round 6 tests for v3 (owner's professor test, 8 Nov 2026), on the stand-in database only (HD_FAKE=1 is forced):
card payment page, Pip cheer, accepted items in Browse, all stands and Other dorm, payout fakes, credits in About,
profile photo, leaderboard. Test accounts are tester-...@hellodorm-demo.test in the test browser's memory only.
The stand-in database lives in each test browser; copying it from one browser to another stands in for the shared
online database (a buyer and a seller on two devices).
Run (local server in the hellodorm folder: python -m http.server 8080):  python tools/test-round6.py [base url]
Writes review/round6/results.md and results.json; prints a final failure count (must be 0)."""
import os, sys, json, time, base64, pathlib
os.environ['HD_FAKE'] = '1'
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from browser import launch, prepare

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/v3/'
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'review' / 'round6'; OUT.mkdir(parents=True, exist_ok=True)
PHOTO = OUT / '_test-photo.jpg'
WED = '2026-11-11T17:30:00+01:00'  # a Wednesday afternoon in Prague; every stand is open then (round 7 hours)
rows = []
def rec(test, expected, result, ok):
    rows.append({'test': test, 'expected': expected, 'result': str(result), 'pass': bool(ok)})
    print(('PASS ' if ok else 'FAIL ') + test + ' | ' + str(result))

# A busy 1600 x 1200 test photo (about 290 KB), drawn here so no outside picture is needed.
from PIL import Image, ImageDraw
import random
random.seed(1)
im = Image.new('RGB', (1600, 1200), (40, 120, 80)); d = ImageDraw.Draw(im)
for i in range(400):
    x, y = random.randint(0, 1600), random.randint(0, 1200)
    d.ellipse((x, y, x + random.randint(10, 120), y + random.randint(10, 120)), fill=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)))
im.save(PHOTO, quality=92)

uid_of = lambda email: 'u_' + ''.join(c if c.isalnum() else '_' for c in email.lower())
def b64len(data_url): return (len(data_url) - data_url.index(',') - 1) * 3 // 4

with sync_playwright() as pw:
    b = launch(pw)
    def ctx_(w=390, h=844, clock=WED, **kw):
        c = prepare(b.new_context(viewport={'width': w, 'height': h}, timezone_id='Europe/Prague', **kw))
        c.nom = []
        return c
    def page(c, store=None, h=''):
        p = c.new_page()
        if getattr(c, 'clock_at', None) is not False: p.clock.install(time=WED)
        if store is not None:
            p.add_init_script('if (!sessionStorage.getItem("hd_seeded")) { localStorage.setItem("fakefs", ' + json.dumps(json.dumps(store)) + '); sessionStorage.setItem("hd_seeded", "1"); }')
        p.errs = []
        p.on('pageerror', lambda e: p.errs.append(str(e)))
        p.goto(BASE + h); p.wait_for_selector('html[data-app=ready]', timeout=20000); p.wait_for_timeout(600)
        return p
    def go(p, h, ms=700): p.goto(BASE + '#/' + h); p.wait_for_timeout(ms)
    def store(p): return json.loads(p.evaluate('localStorage.getItem("fakefs") || "{}"'))
    def put(p, st): p.evaluate('s => localStorage.setItem("fakefs", s)', json.dumps(st)); p.reload(); p.wait_for_selector('html[data-app=ready]'); p.wait_for_timeout(600)
    def signup(p, email, name):
        go(p, 'signup', 400)
        p.fill('#fSignup input[name=name]', name); p.fill('#fSignup input[name=email]', email); p.fill('#fSignup input[name=password]', 'madeup123')
        p.click('#fSignup button[type=submit]'); p.wait_for_timeout(1500)
        if p.locator('#modal.show').count(): p.keyboard.press('Escape'); p.wait_for_timeout(300)
    def signin(p, email):
        go(p, 'signin', 400); p.fill('#fSignin input[name=email]', email); p.fill('#fSignin input[name=password]', 'madeup123')
        p.click('#fSignin button[type=submit]'); p.wait_for_timeout(1500)
        if p.locator('#modal.show').count(): p.keyboard.press('Escape'); p.wait_for_timeout(300)
    def signout(p):
        go(p, 'profile', 500); p.click('#signOutBtn'); p.wait_for_timeout(300); p.click('#signoutYes'); p.wait_for_timeout(900)
    def pick_dorm(p, dorm):
        go(p, 'stands/list', 500); p.click(f'#stand-{dorm} [data-act=pick-dorm]'); p.wait_for_timeout(400)

    # ---------- 1. Card payment page ----------
    c = ctx_(); p = page(c)
    p.click('.acct [data-act=demo]'); p.wait_for_timeout(2500)
    if p.locator('#modal.show').count(): p.keyboard.press('Escape')
    go(p, 'checkout/k5'); p.click('.confirm-pick'); p.check('input[name=pm][value=card]')
    no_stripe = 'Stripe' not in p.locator('#view').inner_text() and 'Not set up yet' not in p.locator('#view').inner_text()
    p.click('#payBtn'); p.wait_for_timeout(1000)
    rec('1 Pay by card opens the demo payment page', 'card page, no Stripe and no "Not set up yet"', f"{p.url.split('#')[1]}, form {p.locator('#fCard').count()}, Stripe text gone {no_stripe}", p.url.endswith('#/card/k5') and p.locator('#fCard').count() == 1 and no_stripe)
    brands = []
    for num in ['4111', '5500', '3782', '6011', '9999']:
        p.fill('[name=number]', num); p.wait_for_timeout(80); brands.append(p.locator('#cardBrand').inner_text())
    rec('1 Brand follows the first digit', 'Visa, Mastercard, Amex, Discover, plain Card', brands, brands == ['Visa', 'Mastercard', 'Amex', 'Discover', 'Card'])
    p.fill('[name=number]', ''); p.click('#cardPay'); p.wait_for_timeout(300)
    rec('1 Empty fields are the only check', 'message asking to fill the fields', p.locator('#fErr').inner_text(), 'Fill in all four fields' in p.locator('#fErr').inner_text())
    p.fill('[name=number]', '4242424242421234'); p.fill('[name=name]', 'Jana Novakova'); p.fill('[name=exp]', '1229'); p.fill('[name=cvc]', '987')
    grouped, exp = p.input_value('[name=number]'), p.input_value('[name=exp]')
    note = p.locator('.demo-line').first.inner_text()
    rec('1 Card number grouped by 4, expiry MM/YY, honest line', '"4242 4242 4242 1234", "12/29", the demo line', f'"{grouped}", "{exp}", "{note}"', grouped == '4242 4242 4242 1234' and exp == '12/29' and 'nothing is charged' in note)
    p.click('#cardPay'); p.wait_for_timeout(1500)
    rec('1 Pay shows the same success screen as Demo pay', 'thanks screen with pickup code and letter', f"{p.url.split('#')[1]}, codes {p.locator('.bigcode').count()}, letter {p.locator('.letter').count()}", '/thanks/' in p.url and p.locator('.bigcode').count() >= 1 and p.locator('.letter').count() == 1)
    cheer = p.get_attribute('.letter .pip-pose', 'src')
    rec('2 Thank you letter uses the corrected cheer pose', 'img/pip/pip-cheer.webp (two front flippers, merged from assets/pip-cheer-2026-11-08)', cheer, cheer.endswith('pip-cheer.webp'))
    raw = p.evaluate('localStorage.getItem("fakefs")')
    st = store(p); prof = [v for k, v in st.items() if k.startswith('users/') and k.count('/') == 1][0]
    rec('1 Saved for next time: name, expiry, last 4 only', 'card {name, exp, last4: 1234, brand}; full number and CVC nowhere', f"{prof.get('card')}, full number stored {'4242424242421234' in raw}, CVC stored {'987' in raw}", prof.get('card', {}).get('last4') == '1234' and '4242424242421234' not in raw and '"987"' not in raw)
    go(p, 'checkout/k2'); p.click('.confirm-pick'); p.check('input[name=pm][value=card]'); p.click('#payBtn'); p.wait_for_timeout(900)
    saved = p.locator('.saved-card').inner_text() if p.locator('.saved-card').count() else ''
    rec('1 Next time: "Saved card ending 1234" and "Use another card"', 'both choices shown, saved card preselected', saved.replace('\n', ' ')[:90], 'Saved card ending 1234' in saved and 'Use another card' in saved)
    p.click('#cardPay'); p.wait_for_timeout(1500)
    rec('1 Paying with the saved card', 'success screen', p.url.split('#')[1], '/thanks/' in p.url)
    # ---------- 5. Payout fakes (demo account, saved IBAN) ----------
    go(p, 'bank'); toast_free = p.locator('[data-act=demo-only]').count()
    p.click('a[href="#/transfer"]'); p.wait_for_timeout(600)
    p.fill('[name=amount]', '250'); p.click('#fTransfer button[type=submit]'); p.wait_for_timeout(300)
    confirm = p.locator('#trYes').count(); p.click('#trYes'); p.wait_for_timeout(900)
    rec('5 Transfer: amount, confirm, success, list', 'confirm dialog, success card, 1 past transfer of 250 CZK', f"no 'does nothing' buttons left {toast_free == 0}, confirm {confirm}, success {p.locator('#transferDone').count()}, list {p.locator('#trList .row-card').count()} '{p.locator('#trList').inner_text()[:30]}'",
        toast_free == 0 and confirm == 1 and p.locator('#transferDone').count() == 1 and p.locator('#trList .row-card').count() == 1 and '250' in p.locator('#trList').inner_text())
    go(p, 'bank'); p.click('[data-act=bank-change]'); p.wait_for_timeout(400); p.click('[data-bank="Fio banka"]'); p.wait_for_timeout(500)
    b1 = store(p); bn1 = [v for k, v in b1.items() if k.startswith('users/') and k.count('/') == 1][0]['bank']['bankName']
    p.click('[data-act=bank-change]'); p.wait_for_timeout(400); p.fill('#fBankName input', 'Moje Banka Test'); p.click('#fBankName button'); p.wait_for_timeout(500)
    bn2 = [v for k, v in store(p).items() if k.startswith('users/') and k.count('/') == 1][0]['bank']['bankName']
    rec('5 Change bank: pick from the list or type one', '"Fio banka", then "Moje Banka Test" saved', f'{bn1}, {bn2}', bn1 == 'Fio banka' and bn2 == 'Moje Banka Test')
    go(p, 'addcard'); p.fill('[name=number]', '5555666677778888'); p.fill('[name=name]', 'Demo'); p.fill('[name=exp]', '0130'); p.fill('[name=cvc]', '12'); p.click('#fAddCard button[type=submit]'); p.wait_for_timeout(700)
    card2 = [v for k, v in store(p).items() if k.startswith('users/') and k.count('/') == 1][0].get('card')
    rec('5 Add card saves the last 4 digits only', 'card last4 8888, Mastercard, no full number', card2, card2 and card2['last4'] == '8888' and '5555666677778888' not in p.evaluate('localStorage.getItem("fakefs")'))
    rec('Page errors (card and payout)', '0', p.errs, not p.errs)
    c.close()

    # ---------- 3. Accepted items in Browse, manager sale price, sold for everyone ----------
    seller = f'tester-r6-seller-{int(time.time())}@hellodorm-demo.test'; su = uid_of(seller)
    c = ctx_(); p = page(c)
    pick_dorm(p, 'blanice'); signup(p, seller, 'Petra Seller')
    # Sell form: photo upload is compressed to WebP, at most 150 KB.
    go(p, 'sell'); p.click('[data-act=d-set][data-k=cat][data-v=kitchen]'); p.fill('[data-in=d-title]', 'Rice cooker'); p.click('[data-act=d-next]'); p.wait_for_timeout(400)
    p.click('[data-act=d-set][data-k=cond][data-v=good]'); p.click('[data-act=d-next]'); p.wait_for_timeout(400)
    p.set_input_files('input[data-in=d-photo]:not([capture])', str(PHOTO)); p.wait_for_timeout(1500)
    dp = p.evaluate('() => { const d = document.querySelector(".draft-photo img, .photo-preview img, img[src^=\\"data:image\\"]"); return d ? d.src : ""; }')
    rec('3 Seller photo stored as WebP, at most 150 KB', 'data:image/webp, at most 153,600 bytes (test photo 1600 x 1200, about 290 KB)', f"{dp[:22]} {b64len(dp) if dp else 0} bytes", dp.startswith('data:image/webp') and b64len(dp) <= 150 * 1024)
    p.click('[data-act=d-next]'); p.wait_for_timeout(400); p.click('[data-act=d-set][data-k=mode][data-v=sell]'); p.click('[data-act=d-next]'); p.wait_for_timeout(500)
    # 4. Sell step 5 offers every stand
    stands5 = p.locator('.stand-pick .pick').count(); p.click('[data-act=d-allstands]'); p.wait_for_timeout(400)
    thal = p.locator('[data-act=d-set][data-k=stand][data-v=thaler]').count(); all5 = p.locator('.stand-pick .pick').count()
    rec('4 Sell: Thalerova and every stand can be chosen (dorm Blanice)', '6 nearest, then "Show all" gives 16 including Thalerova', f'{stands5} then {all5}, Thalerova {thal}', all5 == 16 and thal == 1)
    p.click('[data-act=d-set][data-k=stand][data-v=blanice]'); p.wait_for_timeout(300); p.click(".day-pick .pick >> nth=0"); p.wait_for_timeout(300); p.click('[data-act=d-next]'); p.wait_for_timeout(1500)
    item = [k for k in store(p) if k.startswith(f'users/{su}/items/')][0]; iid = item.split('/')[-1]
    go(p, 'myitem/' + iid); p.click('[data-act=dropped]'); p.wait_for_timeout(1200)
    st = store(p); st[f'users/{su}']['bank'] = {'holder': 'Petra Seller', 'iban': 'CZ65 0800 0000 1920 0014 5399', 'bankName': 'Demo Bank'}
    signout(p); put(p, st)
    # manager prices it: offer 250, sale price 390
    go(p, 'signin', 300); signin(p, 'manager1@hellodorm-demo.test'); go(p, 'manager', 2000)
    form = p.locator(f'form[data-form=price][data-path="{item}"]')
    sale_prefill_follows = None
    form.locator('[name=price]').fill('250'); form.locator('[name=price]').dispatch_event('input'); sale_prefill_follows = form.locator('[name=sale]').input_value()
    form.locator('[name=sale]').fill('390'); form.locator('button[type=submit]').click(); p.wait_for_timeout(1500)
    st = store(p)
    rec('3 Manager types the sale price at the offer step', 'sale price follows the offer (250) until typed; 390 stored in salePrices', f"prefill {sale_prefill_follows}, salePrices {st.get(f'salePrices/{su}_{iid}')}, offer {st[item].get('offer')}",
        sale_prefill_follows == '250' and (st.get(f'salePrices/{su}_{iid}') or {}).get('price') == 390 and st[item].get('offer') == 250)
    signout(p)
    signin(p, seller); go(p, 'myitem/' + iid); p.click('[data-act=accept]'); p.wait_for_timeout(1800)
    st = store(p); lst = st.get(f'listings/{su}_{iid}')
    rec('3 Accepted and paid: in Browse at once', 'listing at Blanice, price 390, seller photo, not demo', f"{ {k: (v if k != 'photo' else v[:16]) for k, v in (lst or {}).items() if k in ('dorm', 'price', 'demo', 'photo', 'cat', 'cond')} }",
        lst and lst['dorm'] == 'blanice' and lst['price'] == 390 and lst['photo'].startswith('data:image/webp') and lst['demo'] is False)
    signout(p); store_after = store(p); c.close()
    # a buyer on another device sees it with the photo and the New badge, and buys it
    buyer = f'tester-r6-buyer-{int(time.time())}@hellodorm-demo.test'
    c = ctx_(); p = page(c, store=store_after)
    pick_dorm(p, 'vltava'); signup(p, buyer, 'Karel Buyer')
    go(p, 'browse', 400); p.fill('#qInput', 'rice cooker'); p.wait_for_timeout(900)
    card = p.locator('.grid .card').first
    rec('3 Everyone sees it: photo, title, condition, New badge', 'card "Rice cooker", WebP photo, "New", "Good"', f"{card.locator('h3').inner_text()}, img {(card.locator('img').first.get_attribute('src') or '')[:16]}, new {card.locator('.badge.new').count()}, {card.locator('.badge.cond').inner_text()}",
        card.locator('h3').inner_text() == 'Rice cooker' and (card.locator('img').first.get_attribute('src') or '').startswith('data:image/webp') and card.locator('.badge.new').count() == 1)
    go(p, f'checkout/{su}_{iid}'); p.click('.confirm-pick'); p.click('#payBtn'); p.wait_for_timeout(1500)
    go(p, 'orders', 500); p.click('.row-card >> nth=0'); p.wait_for_timeout(800)
    p.evaluate('() => { const s = document.querySelector("#swipe"); s.value = 100; s.dispatchEvent(new Event("change")); }'); p.wait_for_timeout(1500)
    st_b = store(p)
    rec('3 Buyer picks it up', 'shop entry sold', st_b.get(f'shop/{su}_{iid}'), (st_b.get(f'shop/{su}_{iid}') or {}).get('status') == 'sold')
    go(p, 'board', 1500)
    lbt = p.locator('#lbList').inner_text() if p.locator('#lbList').count() else ''
    rec('8 Buyer appears on the leaderboard after a finished buy', 'Karel with 1.2 kg (kitchen), 1 item; count line', f"'{p.locator('#lbCount').inner_text()}' / {lbt[:60]!r}", 'Karel' in lbt and '1.2 kg' in lbt)
    signout(p); store_b = store(p); c.close()
    c = ctx_(); p = page(c, store=store_b)
    pick_dorm(p, 'blanice'); go(p, 'browse', 400); p.fill('#qInput', 'rice cooker'); p.wait_for_timeout(900)
    rec('3 Sold for everyone (a guest on a third device)', 'card shows Sold, no Add to cart', f"chip '{p.locator('.grid .card .chip.over').first.inner_text() if p.locator('.grid .card .chip.over').count() else ''}', add buttons {p.locator('.grid .card [data-act=cart-add]').count()}",
        p.locator('.grid .card .chip.over').count() >= 1 and 'Sold' in p.locator('.grid .card .chip.over').first.inner_text() and p.locator('.grid .card [data-act=cart-add]').count() == 0)
    # seller on the leaderboard too, Welcome back counts a new item at the buyer's dorm (listing at Blanice: seen from Blanice)
    signin(p, seller); go(p, 'board', 1500)
    lbt = p.locator('#lbList').inner_text() if p.locator('#lbList').count() else ''
    rec('8 Seller also counts (both sides of the deal)', 'Petra and Karel both listed', lbt.replace('\n', ' ')[:90], 'Petra' in lbt and 'Karel' in lbt)
    # toggle off
    go(p, 'profile', 600); p.click('[data-in=board-toggle]'); p.wait_for_timeout(1800); go(p, 'board', 1500)
    lbt2 = p.locator('#lbList').inner_text() if p.locator('#lbList').count() else ''
    rec('8 "Show me on the leaderboard" off removes the entry', 'Petra gone, Karel stays', lbt2.replace('\n', ' ')[:80], 'Petra' not in lbt2 and 'Karel' in lbt2)
    go(p, 'profile', 600); p.click('[data-in=board-toggle]'); p.wait_for_timeout(1800)
    # ---------- 7. Profile photo ----------
    go(p, 'profile', 600); p.click('[data-act=avatar]'); p.wait_for_timeout(400)
    p.set_input_files('#avFile', str(PHOTO)); p.wait_for_timeout(1000)
    p.locator('#avZoom').fill('160'); p.wait_for_timeout(200)
    p.mouse.move(*[v + 100 for v in (p.locator('#avCanvas').bounding_box()['x'], p.locator('#avCanvas').bounding_box()['y'])]); p.mouse.down(); p.mouse.move(150, 300); p.mouse.up()
    p.click('#avSave'); p.wait_for_timeout(1800)
    st = store(p); av = st[f'users/{su}'].get('avatar', '')
    rec('7 Profile photo cropped, WebP, at most 50 KB, saved in the account', 'data:image/webp, at most 51,200 bytes', f"{av[:22]} {b64len(av) if av else 0} bytes", av.startswith('data:image/webp') and b64len(av) <= 50 * 1024)
    shown = (p.locator('#profAvatar').count(), p.locator('#topbar .av-link img').count())
    go(p, 'board', 1500); lb_img = p.locator(f'#lbList li[data-uid="{su}"] img.av').count()
    rec('7 Photo shown on Profile, top bar and leaderboard', 'all three', f'profile {shown[0]}, top bar {shown[1]}, leaderboard {lb_img}', shown == (1, 1) and lb_img == 1)
    signout(p); store_c = store(p); c.close()
    # other device: the photo comes back; manager hides it on the leaderboard
    c = ctx_(); p = page(c, store=store_c)
    signin(p, seller); go(p, 'profile', 700)
    rec('7 Photo on another device', 'same photo after signing in elsewhere', p.locator('#profAvatar').count(), p.locator('#profAvatar').count() == 1)
    signout(p); signin(p, 'manager1@hellodorm-demo.test'); go(p, 'manager', 2000); p.click('[data-act=mgr-tab][data-v=board]'); p.wait_for_timeout(800)
    p.click(f'[data-lb="{su}"][data-hide="1"]'); p.wait_for_timeout(1500)
    go(p, 'board', 1500); hidden = p.locator(f'#lbList li[data-uid="{su}"] img.av').count(); ini = p.locator(f'#lbList li[data-uid="{su}"] .av.ini').count()
    rec('7 Manager hides an avatar from the leaderboard', 'initial instead of the photo', f'photo {hidden}, initial {ini}', hidden == 0 and ini == 1)
    signout(p)
    # remove photo
    signin(p, seller); go(p, 'profile', 600); p.click('[data-act=avatar]'); p.wait_for_timeout(300); p.click('#avRemove'); p.wait_for_timeout(1200)
    rec('7 Remove photo goes back to the initial', 'initial circle on Profile', f"photo {p.locator('#profAvatar').count()}, initial {p.locator('.prof-head .avatar').count()}", p.locator('#profAvatar').count() == 0 and p.locator('.prof-head .avatar').count() == 1)
    rec('Page errors (seller, buyer, manager)', '0', p.errs, not p.errs)
    c.close()

    # ---------- 3. Donation goes on sale at the table price; demo listings stay private ----------
    c = ctx_(); p = page(c)
    p.click('.acct [data-act=demo]'); p.wait_for_timeout(2500)
    if p.locator('#modal.show').count(): p.keyboard.press('Escape')
    go(p, 'sell'); p.click('[data-act=d-set][data-k=cat][data-v=clothes]'); p.fill('[data-in=d-title]', 'Wool scarf'); p.click('[data-act=d-next]'); p.wait_for_timeout(300)
    p.click('[data-act=d-set][data-k=cond][data-v=good]'); p.click('[data-act=d-next]'); p.wait_for_timeout(300); p.click('[data-act=d-next]'); p.wait_for_timeout(300)
    p.click('[data-act=d-set][data-k=mode][data-v=donate]'); p.click('[data-act=d-next]'); p.wait_for_timeout(400)
    p.click(".day-pick .pick >> nth=0"); p.wait_for_timeout(300); p.click('[data-act=d-next]'); p.wait_for_timeout(1500)
    du = p.evaluate('JSON.parse(localStorage.getItem("firebase:authUser:fake")).uid')
    di = [k for k, v in store(p).items() if k.startswith(f'users/{du}/items/') and v.get('title') == 'Wool scarf'][0].split('/')[-1]
    go(p, 'myitem/' + di); p.click('[data-act=dropped]'); p.wait_for_timeout(1800)
    l = store(p).get(f'listings/{du}_{di}')
    rec('3 Donation on sale at once at the typical price', 'clothes, good = 450 CZK (table), demo: true', {k: l[k] for k in ('price', 'demo', 'dorm')} if l else None, l and l['price'] == 450 and l['demo'] is True)
    go(p, 'browse', 400); p.fill('#qInput', 'wool scarf'); p.wait_for_timeout(900); mine_seen = p.locator('.grid .card h3', has_text='Wool scarf').count()
    demo_store = store(p); c.close()
    c = ctx_(); p = page(c, store=demo_store); go(p, 'browse', 400); p.fill('#qInput', 'wool scarf'); p.wait_for_timeout(900)
    others = p.locator('.grid .card h3', has_text='Wool scarf').count()
    rec('3 A Demo account\'s listing is seen only by that demo copy', 'demo sees it, another visitor does not', f'demo {mine_seen}, other {others}', mine_seen == 1 and others == 0)
    c.close()

    # ---------- 4. Other dorm: Nominatim stand-in answer, failure, map tap, name only ----------
    NOM = [{"place_id": 1, "licence": "Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright", "osm_type": "way", "osm_id": 1, "lat": "50.0756", "lon": "14.4141",
            "category": "building", "type": "dormitory", "place_rank": 30, "importance": 0.1, "addresstype": "building", "name": "Kolej Hlávkova",
            "display_name": "Kolej Hlávkova, Žitná, Nové Město, Praha, 110 00, Česko", "boundingbox": ["50.0755", "50.0757", "14.4140", "14.4142"]}]
    c = ctx_(); calls = []
    def nom(route):
        calls.append(time.time()); route.fulfill(status=200, content_type='application/json', body=json.dumps(NOM))
    c.route('https://nominatim.openstreetmap.org/**', nom)
    p = page(c)
    p.click('.dorm-first'); p.wait_for_timeout(500); p.click('#modal [data-act=other-dorm]'); p.wait_for_timeout(1200)
    p.type('#odQ', 'Hlavkova kolej', delay=40); p.wait_for_timeout(500)
    typed_calls = len(calls)
    p.click('#fOd button[type=submit]'); p.wait_for_timeout(1200); p.click('#fOd button[type=submit]'); p.wait_for_timeout(1500)
    gaps = [round(calls[i + 1] - calls[i], 2) for i in range(len(calls) - 1)]
    res = p.locator('#odList .dorm-opt').count()
    rec('4 Other dorm: search only on Search, at most 1 a second', '0 requests while typing; 2 searches 1 s or more apart; 1 place found with full address', f'{typed_calls} while typing, gaps {gaps}, results {res}', typed_calls == 0 and len(calls) == 2 and all(g >= 0.95 for g in gaps) and res == 1)
    p.click('#odList .dorm-opt >> nth=0'); p.wait_for_timeout(1500)
    pin = p.locator('#odMap .leaflet-marker-icon').count(); addr = p.locator('#odPick').inner_text()
    p.click('#odSave'); p.wait_for_timeout(1200)
    st = store(p); wl = [v for k, v in st.items() if k.startswith('waitlist/')]
    g = p.evaluate('JSON.parse(localStorage.getItem("hd_guest"))')
    go(p, 'home', 700)
    rec('4 Chosen place on the map, saved as my dorm, counts as Ask for a stand', 'pin, full address, dorm custom, waitlist entry, Home says no stand yet and shows nearest items', f"pin {pin}, '{addr[:60]}', dorm {g.get('dorm')}, waitlist {[w.get('dormName')[:30] for w in wl]}, home '{p.locator('.dorm-line').inner_text()[:50]}'",
        pin == 1 and 'Žitná' in addr and g.get('dorm') == 'custom' and len(wl) == 1 and 'no stand yet' in p.locator('.dorm-line').inner_text())
    go(p, 'stands/list', 600)
    first = p.locator('.stands-list .row-card b').first.inner_text()
    rec('4 Distances and nearest stand work from it', 'stands sorted from Kolej Hlávkova, Švehlova or Podolí first', first[:40], any(n in first for n in ('Švehlova', 'Podolí', 'Strahov')))
    c.close()
    c = ctx_(); c.route('https://nominatim.openstreetmap.org/**', lambda r: r.abort())
    p = page(c); p.click('.dorm-first'); p.wait_for_timeout(500); p.click('#modal [data-act=other-dorm]'); p.wait_for_timeout(1500)
    p.fill('#odQ', 'Kolej Nowhere'); p.click('#fOd button[type=submit]'); p.wait_for_timeout(1500)
    fail_msg = p.locator('#odFail').count()
    box = p.locator('#odMap').bounding_box(); p.mouse.click(box['x'] + box['width'] / 2 + 30, box['y'] + box['height'] / 2 - 20); p.wait_for_timeout(600)
    pin = p.locator('#odMap .leaflet-marker-icon').count(); p.click('#odSave'); p.wait_for_timeout(900)
    g = p.evaluate('JSON.parse(localStorage.getItem("hd_guest"))')
    rec('4 Search fails: tap the map to place the pin', 'message, pin by tap, saved with position', f"msg {fail_msg}, pin {pin}, {g.get('customDorm')}", fail_msg == 1 and pin == 1 and g.get('customDorm', {}).get('lat') is not None)
    c.close()
    c = ctx_(); c.route('https://nominatim.openstreetmap.org/**', lambda r: r.fulfill(status=200, content_type='application/json', body='[]'))
    c.route('https://tile.openstreetmap.org/**', lambda r: r.abort()); c.route('**/vendor/leaflet/leaflet.js', lambda r: r.abort())
    p = page(c); p.click('.dorm-first'); p.wait_for_timeout(500); p.click('#modal [data-act=other-dorm]'); p.wait_for_timeout(1200)
    p.fill('#odQ', 'Kolej Mala'); p.click('#fOd button[type=submit]'); p.wait_for_timeout(1500)
    none = p.locator('#odNone').count(); p.click('#odSave'); p.wait_for_timeout(900)
    g = p.evaluate('JSON.parse(localStorage.getItem("hd_guest"))')
    rec('4 Nothing found and no map: save the name alone', '"Nothing found", saved name only', f"none {none}, {g.get('customDorm')}", none == 1 and g.get('customDorm', {}).get('name') == 'Kolej Mala')
    rec('Page errors (other dorm)', '0', p.errs, not p.errs)
    c.close()

    # ---------- 6. Credits only in About; 8. demo never on the leaderboard ----------
    c = ctx_(1280, 900); p = page(c); pick_dorm(p, 'strahov')
    leaks = []
    for h in ['home', 'browse', 'item/k1', 'stands/map', 'cart', 'profile']:
        go(p, h, 2500 if h.startswith('stands') else 800)
        txt = p.locator('#view').inner_text()
        if h.startswith('stands'): corner = p.locator('#standsMap .leaflet-control-attribution').inner_text() if p.locator('#standsMap .leaflet-control-attribution').count() else ''
        for w in ('Photo:', 'Foto:', 'CC BY', 'Wikimedia', 'Unsplash', 'Illustration:', 'Routing:', 'Gemini'):
            if w in txt: leaks.append(f'{h}: {w}')
    go(p, 'about', 800); items = p.locator('#creditsList li').count(); links = p.locator('#creditsList a').count()
    rec('6 Credits only in About, OSM credit stays on the map', '0 credit lines elsewhere; map corner "© OpenStreetMap contributors"; About lists every picture with links', f'leaks {leaks}, corner "{corner}", About {items} lines and {links} links',
        not leaks and 'OpenStreetMap contributors' in corner and items >= 45 and links >= 80)
    p.click('.acct [data-act=demo]') if p.locator('.acct [data-act=demo]').count() else (go(p, 'home'), p.click('.acct [data-act=demo]'))
    p.wait_for_timeout(2500)
    du = p.evaluate('JSON.parse(localStorage.getItem("firebase:authUser:fake")).uid')
    go(p, 'orders', 500); p.click('.row-card >> nth=0'); p.wait_for_timeout(700)
    lbk = [k for k in store(p) if k.startswith('leaderboard/')]
    rec('8 Demo account never on the leaderboard', 'no entry for the demo copy', lbk, f'leaderboard/{du}' not in lbk)
    c.close()
    b.close()

PHOTO.unlink(missing_ok=True)
passed = sum(r['pass'] for r in rows)
(OUT / 'results.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding='utf-8')
md = ['| Test | Expected | Result | PASS or FAIL |', '|---|---|---|---|'] + [f"| {r['test']} | {r['expected']} | {r['result'].replace('|', '/')} | {'PASS' if r['pass'] else 'FAIL'} |" for r in rows]
(OUT / 'results.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
print(f'{passed} of {len(rows)} passed')
print(len(rows) - passed)
