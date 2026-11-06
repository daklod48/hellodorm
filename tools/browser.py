"""Shared browser setup for the checks in tools/.

On the owner's laptop nothing changes: the checks use the installed Chrome and the real Firebase project.
Two optional switches (environment variables) help elsewhere:
  HD_CHROME=<path>  use this Chrome or Chromium program instead of the installed Chrome.
  HD_FAKE=1         load the in-memory stand-in in tools/fake-firebase/ instead of the real Firebase code, and block
                    every Firebase and ntfy address. Nothing is written to the real database, so test runs do not
                    add test accounts or inflate the visit and tap counters used for the demand test.
"""
import os, pathlib

FAKE_DIR = pathlib.Path(__file__).resolve().parent / 'fake-firebase'
FAKE = os.environ.get('HD_FAKE') == '1'


def launch(pw):
    path = os.environ.get('HD_CHROME')
    if path:
        return pw.chromium.launch(executable_path=path, headless=True)
    return pw.chromium.launch(channel='chrome', headless=True)


def prepare(ctx):
    """Call once per browser context, before opening pages."""
    if not FAKE:
        return ctx
    def sdk(route):
        name = route.request.url.rsplit('/', 1)[-1]
        f = FAKE_DIR / name
        if f.exists():
            route.fulfill(status=200, content_type='text/javascript', body=f.read_text(encoding='utf-8'))
        else:
            route.abort()
    ctx.route('https://www.gstatic.com/firebasejs/**', sdk)
    # Managers are listed by Firebase user ID. In the stand-in, the test manager signs in as manager1@hellodorm-demo.test,
    # whose stand-in UID is put in place of the placeholder (test browser only; the real config file is not touched).
    def cfg(route):
        body = route.fetch().text().replace("'PASTE_MANAGER_UID_HERE'", "'u_manager1_hellodorm_demo_test'")
        route.fulfill(status=200, content_type='text/javascript', body=body)
    ctx.route('**/v2/config.js', cfg)
    for pat in ('https://*.googleapis.com/**', 'https://*.firebaseapp.com/**', 'https://ntfy.sh/**'):
        ctx.route(pat, lambda r: r.abort())
    return ctx
