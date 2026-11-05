"""Scan user-facing strings in <version>/texts.js and <version>/data/*.js for dash characters (hyphen, en dash, em dash).
Prints one line per hit and a final count. Run: python tools/scan-dashes.py  (the last line must be 0)."""
import re, sys, pathlib
sys.stdout.reconfigure(encoding='utf-8')

# Which app folder to work on: python tools/<script>.py v2 (default v2; v1 is frozen).
VER = next((a for a in sys.argv[1:] if re.fullmatch(r'v\d+', a)), 'v2')
root = pathlib.Path(__file__).resolve().parent.parent / VER
files = [root / 'texts.js'] + sorted((root / 'data').glob('*.js'))
DASH = re.compile('[\\-–—]')
# User-facing fields: en/cs values in texts and data, plus dorm names, addresses and universities.
FIELD = re.compile(r"\b(en|cs|name|short|uni|address)\s*:\s*'((?:[^'\\]|\\.)*)'")
hits = 0
for f in files:
    src = f.read_text(encoding='utf-8')
    for ln, line in enumerate(src.splitlines(), 1):
        if line.strip().startswith('//'):
            continue
        for m in FIELD.finditer(line):
            val = m.group(2)
            if DASH.search(val):
                hits += 1
                print(f"{f.name}:{ln}: {m.group(1)}: {val}")
# The browser can also add dashes itself: CSS 'hyphens: auto' splits long words with a hyphen. Not allowed.
for ln, line in enumerate((root / 'styles.css').read_text(encoding='utf-8').splitlines(), 1):
    if re.search(r'hyphens\s*:\s*auto', line):
        hits += 1
        print(f"styles.css:{ln}: hyphens: auto adds visible dashes")
print(hits)
sys.exit(1 if hits else 0)
