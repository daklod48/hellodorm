| Test | Expected | Result | PASS or FAIL |
|---|---|---|---|
| Search "lamp desk" | finds LED desk lamp | Results for "lamp desk": ['LED desk lamp'] | PASS |
| Search "desk lamp" | finds LED desk lamp | Results for "desk lamp": ['LED desk lamp'] | PASS |
| Search "rychlovarna konvice" | finds Electric kettle, 1.7 L | Results for "rychlovarna konvice": ['Electric kettle, 1.7 L'] | PASS |
| Search "konvice" | finds Electric kettle, 1.7 L | Results for "konvice": ['Electric kettle, 1.7 L'] | PASS |
| Search "kettle" | finds Electric kettle, 1.7 L | Results for "kettle": ['Electric kettle, 1.7 L'] | PASS |
| Search "xyzzy" | empty page, no items | 0 items, empty page True | PASS |
| Search "lamp xyzzy" (one wrong word) | Closest matches, lamps first | Closest matches: ['LED desk lamp', 'Floor lamp', 'Extension cord, 5 sockets'] | PASS |
| Search with accents and a hyphen | same item as without | ['Electric kettle, 1.7 L'] | PASS |
| Home search text arrives in Browse | Browse shows "kettle" and the kettle | /browse, box 'kettle', ['Electric kettle, 1.7 L'] | PASS |
| Map code not loaded on Home (network list) | 0 requests for map.js, Leaflet, tiles or routes | 32 requests on Home, 0 map requests | PASS |
| Map code loads when Stands opens | map.js, leaflet.js, leaflet.css requested | 3 files | PASS |
| Stands shows a real street map with all pins | 16 stand pins, my dorm highlighted, item numbers, tiles loaded | 16 pins, 1 highlighted, numbers 5,4,5,1,1,1,1,1,1,1,2,1,1,3,2,0, 12 tiles | PASS |
| Map credits | "© OpenStreetMap contributors" and "Routing: FOSSGIS OSRM" | Map: © OpenStreetMap contributors · Routing: FOSSGIS OSRM · Leaflet © OpenStreetMap contributors | PASS |
| Mouse wheel zooms only after a click | zoom same before the click, changes after | zoom 11 -> 11 before click, 15 after | PASS |
| No button on top of an open popup | 0 overlaps over 16 popups | 0 overlaps (worst popup) | PASS |
| Walking route Thalerova to Strahov (live FOSSGIS service) | line on the map with km and minutes | 7.9 km, 105 min, 2 line drawn, 0.9 s, text "7.9 km · 105 min walk" | PASS |
| At most 1 route request per second | gap between requests at least 1 s | 2 requests, gaps [1.0] | PASS |
| Route service does not answer | "Route not available right now" and an Open in Google Maps link | Route not available right now / https://www.google.com/maps/dir/?api=1&origin=50.09143,14.48 | PASS |
| Walking route in the item pickup box | map and route panel open inside the pickup box | map 1, panel 1 | PASS |
| Fallback when Leaflet cannot load | drawn map shown, Stands not blank | drawn map 1, note 1 | PASS |
| Fallback when map tiles cannot load | drawn map after 7 s | drawn map 1 | PASS |
| Cart at 2 stands: best stand card | Strahov 3, Thalerova 1; tip "Pick up at Strahov: 3 of 4 items in one trip" | Your cart is at 2 stands [('strahov', '3'), ('thaler', '1')] / Pick up at Strahov: 3 of 4 items in one trip | PASS |
| Sold cart item shows Swap | row of k1 shows a similar available kitchen item | swap to k2 | PASS |
| One tap Swap replaces it | cart has k2 instead of k1 | ['k2', 'k4', 'e5', 'f3'] | PASS |
| Sold saved item shows Swap and replaces it | Saved row offers Swap, k1 replaced | True, hearts ['k2'] | PASS |
| Open now at 15:00 Prague (Wed, hours 16:00 to 19:00) | Opens at 16:00 | "Opens at 16:00", icon 1 | PASS |
| Open now at 21:00 Prague (Wed, hours 16:00 to 19:00) | Closed, opens tomorrow at 16:00 | "Closed, opens tomorrow at 16:00", icon 1 | PASS |
| Open now at 17:30 Prague (Wed, hours 16:00 to 19:00) | Open now, until 19:00 | "Open now, until 19:00", icon 1 | PASS |
| Photo label inside its box at 320 px | overlaps 0, label at most 85 %, 3 lines, 12 px or more | 1 label cards on the last page, problems 0 [] | PASS |
| Photo label inside its box at 390 px | overlaps 0, label at most 85 %, 3 lines, 12 px or more | 1 label cards on the last page, problems 0 [] | PASS |
| Photo label inside its box at 1280 px | overlaps 0, label at most 85 %, 3 lines, 12 px or more | 1 label cards on the last page, problems 0 [] | PASS |
| [390] Link opens logged out on Home | Home, account choices with Demo account | screen home, demo button 1 | PASS |
| [390] Demo strip and Reset demo | strip says fresh for every tester; Reset brings back the 2 demo cart items | "Demo account. It starts fresh for every tester and is gone after you s", cart after reset 2 | PASS |
| [390] Demo: sign out and back in starts fresh | new demo copy (other id), sign out asked to confirm | confirm True, same copy False | PASS |
| [390] Sign up shows the welcome scene | Pip, "Welcome to HelloDorm, Jana", 3 start cards, burst gone within 2.5 s, welcomed stored | "Welcome to HelloDorm, Jana", cards 3, burst 1 then 0, welcomed True | PASS |
| [390] Second sign in: Welcome back, no scene | no scene; card: 1 of 1 saved available, 2 in cart, 0 new | scene 0, card 1, saved 1, cart 2, new 0 | PASS |
| [390] Second device: cart and dorm come back | 2 cart items, dorm kept, no welcome scene | cart rows 2, scene 0, dorm line 1 | PASS |
| [390] Third sign in after 1 new item at my dorm | "1 new item" shown, still no scene | "1 new item at Thalerova since last time", new 1, scene 0 | PASS |
| [390] Page errors in the professor flow | 0 | 0 | PASS |
| [1280] Link opens logged out on Home | Home, account choices with Demo account | screen home, demo button 1 | PASS |
| [1280] Demo strip and Reset demo | strip says fresh for every tester; Reset brings back the 2 demo cart items | "Demo account. It starts fresh for every tester and is gone after you s", cart after reset 2 | PASS |
| [1280] Demo: sign out and back in starts fresh | new demo copy (other id), sign out asked to confirm | confirm True, same copy False | PASS |
| [1280] Sign up shows the welcome scene | Pip, "Welcome to HelloDorm, Jana", 3 start cards, burst gone within 2.5 s, welcomed stored | "Welcome to HelloDorm, Jana", cards 3, burst 1 then 0, welcomed True | PASS |
| [1280] Second sign in: Welcome back, no scene | no scene; card: 1 of 1 saved available, 2 in cart, 0 new | scene 0, card 1, saved 1, cart 2, new 0 | PASS |
| [1280] Second device: cart and dorm come back | 2 cart items, dorm kept, no welcome scene | cart rows 2, scene 0, dorm line 1 | PASS |
| [1280] Third sign in after 1 new item at my dorm | "1 new item" shown, still no scene | "1 new item at Thalerova since last time", new 1, scene 0 | PASS |
| [1280] Page errors in the professor flow | 0 | 0 | PASS |
| Reduced motion: welcome scene without animation | still card, no burst canvas, no Pip animation | motion reduced, canvas 0, pip anim none | PASS |
| A tap skips the celebration | burst canvas removed at once | 1 then 0 | PASS |
| Manager puts a donated item on sale | listing created, found by search in Browse | 1 ready to sell, 1 listing, search finds ['Denim jacket'] | PASS |
| Page errors (manager) | 0 | 0 | PASS |
