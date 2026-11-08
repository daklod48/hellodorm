| Test | Expected | Result | PASS or FAIL |
|---|---|---|---|
| 1 Pay by card opens the demo payment page | card page, no Stripe and no "Not set up yet" | /card/k5, form 1, Stripe text gone True | PASS |
| 1 Brand follows the first digit | Visa, Mastercard, Amex, Discover, plain Card | ['Visa', 'Mastercard', 'Amex', 'Discover', 'Card'] | PASS |
| 1 Empty fields are the only check | message asking to fill the fields | Fill in all four fields. Any made up numbers work. | PASS |
| 1 Card number grouped by 4, expiry MM/YY, honest line | "4242 4242 4242 1234", "12/29", the demo line | "4242 4242 4242 1234", "12/29", "Demo payment page: use made up numbers, nothing is charged." | PASS |
| 1 Pay shows the same success screen as Demo pay | thanks screen with pickup code and letter | /thanks/GR2YQ7, codes 1, letter 1 | PASS |
| 2 Thank you letter uses the corrected cheer pose | img/pip/pip-cheer.webp (two front flippers, merged from assets/pip-cheer-2026-11-08) | img/pip/pip-cheer.webp | PASS |
| 1 Saved for next time: name, expiry, last 4 only | card {name, exp, last4: 1234, brand}; full number and CVC nowhere | {'name': 'Jana Novakova', 'exp': '12/29', 'last4': '1234', 'brand': 'Visa'}, full number stored False, CVC stored False | PASS |
| 1 Next time: "Saved card ending 1234" and "Use another card" | both choices shown, saved card preselected | Which card Saved card ending 1234 Visa · 12/29 · Jana Novakova Use another card | PASS |
| 1 Paying with the saved card | success screen | /thanks/GN5FXK | PASS |
| 5 Transfer: amount, confirm, success, list | confirm dialog, success card, 1 past transfer of 250 CZK | no 'does nothing' buttons left True, confirm 1, success 1, list 1 '250 CZK

Wed 11 Nov · CZ65 •••' | PASS |
| 5 Change bank: pick from the list or type one | "Fio banka", then "Moje Banka Test" saved | Fio banka, Moje Banka Test | PASS |
| 5 Add card saves the last 4 digits only | card last4 8888, Mastercard, no full number | {'name': 'Demo', 'exp': '01/30', 'last4': '8888', 'brand': 'Mastercard'} | PASS |
| Page errors (card and payout) | 0 | [] | PASS |
| 3 Seller photo stored as WebP, at most 150 KB | data:image/webp, at most 153,600 bytes (test photo 1600 x 1200, about 290 KB) | data:image/webp;base64 49458 bytes | PASS |
| 4 Sell: Thalerova and every stand can be chosen (dorm Blanice) | 6 nearest, then "Show all" gives 16 including Thalerova | 6 then 16, Thalerova 1 | PASS |
| 3 Manager types the sale price at the offer step | sale price follows the offer (250) until typed; 390 stored in salePrices | prefill 250, salePrices {'price': 390, 'at': 1794414620035}, offer 250 | PASS |
| 3 Accepted and paid: in Browse at once | listing at Blanice, price 390, seller photo, not demo | {'cat': 'kitchen', 'cond': 'good', 'dorm': 'blanice', 'price': 390, 'photo': 'data:image/webp;', 'demo': False} | PASS |
| 3 Everyone sees it: photo, title, condition, New badge | card "Rice cooker", WebP photo, "New", "Good" | Rice cooker, img data:image/webp;, new 1, Good | PASS |
| 3 Buyer picks it up | shop entry sold | {'status': 'sold', 'by': 'u_tester_r6_buyer_1794150344_hellodorm_demo_test', 'until': 9000000000000000} | PASS |
| 8 Buyer appears on the leaderboard after a finished buy | Karel with 1.2 kg (kitchen), 1 item; count line | '2 people have bought, sold or donated so far' / '1\nK\nKarel\nYou\n1 item\n1.2 kg\n2\nP\nPetra\n1 item\n1.2 kg' | PASS |
| 3 Sold for everyone (a guest on a third device) | card shows Sold, no Add to cart | chip 'Sold', add buttons 0 | PASS |
| 8 Seller also counts (both sides of the deal) | Petra and Karel both listed | 1 K Karel 1 item 1.2 kg 2 P Petra You 1 item 1.2 kg | PASS |
| 8 "Show me on the leaderboard" off removes the entry | Petra gone, Karel stays | 1 K Karel 1 item 1.2 kg | PASS |
| 7 Profile photo cropped, WebP, at most 50 KB, saved in the account | data:image/webp, at most 51,200 bytes | data:image/webp;base64 8778 bytes | PASS |
| 7 Photo shown on Profile, top bar and leaderboard | all three | profile 1, top bar 1, leaderboard 1 | PASS |
| 7 Photo on another device | same photo after signing in elsewhere | 1 | PASS |
| 7 Manager hides an avatar from the leaderboard | initial instead of the photo | photo 0, initial 1 | PASS |
| 7 Remove photo goes back to the initial | initial circle on Profile | photo 0, initial 1 | PASS |
| Page errors (seller, buyer, manager) | 0 | [] | PASS |
| 3 Donation on sale at once at the typical price | clothes, good = 450 CZK (table), demo: true | {'price': 450, 'demo': True, 'dorm': 'thaler'} | PASS |
| 3 A Demo account's listing is seen only by that demo copy | demo sees it, another visitor does not | demo 1, other 0 | PASS |
| 4 Other dorm: search only on Search, at most 1 a second | 0 requests while typing; 2 searches 1 s or more apart; 1 place found with full address | 0 while typing, gaps [1.23], results 1 | PASS |
| 4 Chosen place on the map, saved as my dorm, counts as Ask for a stand | pin, full address, dorm custom, waitlist entry, Home says no stand yet and shows nearest items | pin 1, 'Kolej Hlávkova
Kolej Hlávkova, Žitná, Nové Město, Praha, 110', dorm custom, waitlist ['Kolej Hlávkova, Žitná, Nové Mě'], home 'Your dorm: Kolej Hlávkova (no stand yet)
Change' | PASS |
| 4 Distances and nearest stand work from it | stands sorted from Kolej Hlávkova, Švehlova or Podolí first | Koleje Strahov | PASS |
| 4 Search fails: tap the map to place the pin | message, pin by tap, saved with position | msg 1, pin 1, {'name': 'Kolej Nowhere', 'address': '', 'lat': 50.08596, 'lon': 14.44805} | PASS |
| 4 Nothing found and no map: save the name alone | "Nothing found", saved name only | none 1, {'name': 'Kolej Mala', 'address': '', 'lat': None, 'lon': None} | PASS |
| Page errors (other dorm) | 0 | [] | PASS |
| 6 Credits only in About, OSM credit stays on the map | 0 credit lines elsewhere; map corner "© OpenStreetMap contributors"; About lists every picture with links | leaks [], corner "© OpenStreetMap contributors", About 54 lines and 94 links | PASS |
| 8 Demo account never on the leaderboard | no entry for the demo copy | [] | PASS |
