| Test | Expected | Result | PASS or FAIL |
|---|---|---|---|
| thaler at 02:00 Prague, browser in Europe/Prague | Closed, opens at 03:00 | "Closed, opens at 03:00", open 0 | PASS |
| thaler at 04:00 Prague, browser in Europe/Prague | Open now, until 01:00 | "Open now, until 01:00", open 1 | PASS |
| strahov at 05:30 Prague, browser in Europe/Prague | Closed, opens at 06:00 | "Closed, opens at 06:00", open 0 | PASS |
| strahov at 06:10 Prague, browser in Europe/Prague | Open now, until 05:00 | "Open now, until 05:00", open 1 | PASS |
| blanice at 03:00 Prague, browser in Europe/Prague | Open now, 24 hours | "Open now, 24 hours", open 1 | PASS |
| thaler at 02:00 Prague, browser in America/New_York | Closed, opens at 03:00 | "Closed, opens at 03:00", open 0 | PASS |
| thaler at 04:00 Prague, browser in America/New_York | Open now, until 01:00 | "Open now, until 01:00", open 1 | PASS |
| strahov at 05:30 Prague, browser in America/New_York | Closed, opens at 06:00 | "Closed, opens at 06:00", open 0 | PASS |
| strahov at 06:10 Prague, browser in America/New_York | Open now, until 05:00 | "Open now, until 05:00", open 1 | PASS |
| blanice at 03:00 Prague, browser in America/New_York | Open now, 24 hours | "Open now, 24 hours", open 1 | PASS |
| Hours lines on stand cards (en-GB) | Open 24 hours, every day / Open every day, closed 01:00 to 03:00 / Open every day, closed 05:00 to 06:00 | ('Open 24 hours, every day · 1 item', 'Open every day, closed 01:00 to 03:00 · 5 items', 'Open every day, closed 05:00 to 06:00 · 3 items') | PASS |
| Item pickup box names Thalerova's hours (en-GB) | Open every day, closed 01:00 to 03:00 | PICK UP AT  Thalerova kolej  HelloDorm stand at the main entrance (planned location)  Jeseniova 1954/210, 130 00 Praha 3 | PASS |
| Hours lines on stand cards (cs-CZ) | Otevřeno nonstop, každý den / Otevřeno každý den, zavřeno 01:00 až 03:00 / Otevřeno každý den, zavřeno 05:00 až 06:00 | ('Otevřeno nonstop, každý den · 1 věc', 'Otevřeno každý den, zavřeno 01:00 až 03:00 · 5 věcí', 'Otevřeno každý den, zavřeno 05:00 až 06:00 · 3 věci') | PASS |
| Item pickup box names Thalerova's hours (cs-CZ) | Otevřeno každý den, zavřeno 01:00 až 03:00 | VYZVEDNUTÍ  Thalerova kolej  Stánek HelloDorm u hlavního vchodu (plánované místo)  Jeseniova 1954/210, 130 00 Praha 3  O | PASS |
| Hold at Thalerova from 01:30 runs on to 03:00 two days later | 49.5 hours (48 h would end at 01:30, inside 01:00 to 03:00) | 49.49890305555556 hours | PASS |
| Hold at Strahov from 01:30 is 48 hours | 48 hours (01:30 is outside 05:00 to 06:00) | 48.0 hours | PASS |
| Pickup code at 01:30 at Thalerova: closed, opens at 03:00, no slider yet | "Closed, opens at 03:00" and "Pickup opens in 1 h 30 min" | Closed, opens at 03:00 / Pickup opens in 1 h 29 min
Open every da | PASS |
| Sell: 7 days (today and 6 more), Thalerova names its closed hours | 7 choices, "Any time, except 01:00 to 03:00", no "2 hours" text | 7 days, first "Wed 11 NovAny time, except 01:00 to 03:00", intro "Your own dorm stand is first. Choose a day; you can drop the" | PASS |
| Sell: a 24 hour stand says any time that day | "Any time that day" | Wed 11 NovAny time that day | PASS |
| Page errors (hours, hold, sell) | 0 | [] | PASS |
| Public link forwards to v3 with the invite and the screen | /v3/, screen about, dorm thaler chosen from the invite | /v3/#/about, screen about, dorm thaler | PASS |
| index.html points at v3 in all three places | script, noscript and link use 'v3/' | v3/ x4, url=v2 0, 'v2/' + 0 | PASS |
| No old hours left in v3 | 0 files with "16:00 to 19:00" or "10:00 to 13:00" (EN or CZ) | [] | PASS |
