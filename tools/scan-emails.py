"""Fails if a config file holds a real looking email address. Allowed: addresses on names reserved for examples by
RFC 2606 and RFC 6761 (example.com, example.org, example.net, and anything ending .test, .example or .invalid).
Run: python tools/scan-emails.py   (the last line must be 0)"""
import re, sys, pathlib
sys.stdout.reconfigure(encoding='utf-8')
root = pathlib.Path(__file__).resolve().parent.parent
FILES = sorted(root.glob('v*/config.js')) + [root / 'firestore.rules', root / 'firebase-config.txt']
EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)')
SAFE = re.compile(r'(^|\.)(example\.(com|org|net))$|\.(test|example|invalid)$', re.I)
hits = 0
for f in FILES:
    if not f.exists():
        continue
    for ln, line in enumerate(f.read_text(encoding='utf-8').splitlines(), 1):
        for m in EMAIL.finditer(line):
            if not SAFE.search(m.group(1)):
                hits += 1
                print(f"{f.relative_to(root)}:{ln}: {m.group(0)}")
print(hits)
sys.exit(1 if hits else 0)
