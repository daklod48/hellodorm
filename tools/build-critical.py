"""Rebuild the inline critical CSS block in v1/index.html from v1/styles.css.
It copies sections 1, 2, 3, 5 and 7 (tokens, base, background, buttons, onboarding and welcome), the language button
rules, and the Pip pose, tick, splash and hidden rules, so the first screen can be drawn before styles.css arrives.
Run after changing styles.css:  python tools/build-critical.py"""
import re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent / 'v1'
css = (root / 'styles.css').read_text(encoding='utf-8')
parts = re.split(r'(?=/\* =+ \d+\. )', css)
want = {'1.', '2.', '3.', '5.', '7.'}
head = re.compile(r'/\* =+ (\d+\.)')
crit = [p for p in parts if head.match(p) and head.match(p).group(1) in want]
sec4 = [p for p in parts if re.match(r'/\* =+ 4\.', p)][0]
lang = sec4[sec4.index('/* language button'):]
extra = '\n'.join(l for l in css.splitlines() if l.startswith(('.pip-pose', '@keyframes bob', '.tick ', '.splash', '[hidden]', '.sr ')))
critical = '\n'.join(crit) + '\n' + lang + '\n' + extra + '\n'
critical = re.sub(r'/\*.*?\*/', '', critical, flags=re.S)
critical = re.sub(r'\n\s*\n+', '\n', critical).strip()
html = (root / 'index.html').read_text(encoding='utf-8')
block = '/* Critical CSS for the first screen, copied from styles.css by tools/build-critical.py. */\n' + critical
new = re.sub(r'(<style id="critical">\n)(.*?)(\n  </style>)', lambda m: m.group(1) + block + m.group(3), html, flags=re.S)
(root / 'index.html').write_text(new, encoding='utf-8')
print('critical css:', len(critical) // 1024, 'KB')
