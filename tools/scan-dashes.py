"""Scan user-facing strings in v1/texts.js and v1/data/*.js for dash characters (hyphen, en dash, em dash).
Prints one line per hit and a final count. Run: python tools/scan-dashes.py  (the last line must be 0)."""
import re, sys, pathlib
sys.stdout.reconfigure(encoding='utf-8')

root = pathlib.Path(__file__).resolve().parent.parent / 'v1'
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
print(hits)
sys.exit(1 if hits else 0)
