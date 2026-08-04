// ========================================
// hawaa.in Cloud Functions — admin portal gate
//
// Cookie handling and page templates for the staff portal. Kept free of
// Firebase imports so test/run-tests.js can exercise the parsing and
// cookie construction with plain node.
//
// Why a cookie at all: the portal HTML is served by a function rather
// than sitting in Hosting as a static file, so an unauthenticated
// visitor never receives it. A top-level browser navigation cannot
// carry an Authorization header, so the session has to travel as a
// cookie — and Firebase Hosting forwards exactly one cookie to
// functions, named `__session`. That name is not a preference.
// ========================================

'use strict';

const SESSION_COOKIE_NAME = '__session';

// Firebase session cookies allow 5 minutes to 14 days. Eight hours is
// one working day: long enough not to nag, short enough that a forgotten
// session on a shared machine expires the same day.
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

// The portal's mount point. The cookie is scoped to it so it is never
// sent on public pages — that keeps admin sessions out of the Hosting
// CDN's cache key for the rest of the site.
const PORTAL_PATH = '/hawaa-ops-7k11s';

function parseCookies(header) {
    const out = {};
    if (typeof header !== 'string' || header.length === 0) return out;
    header.split(';').forEach(function (part) {
        const eq = part.indexOf('=');
        if (eq < 1) return;
        const key = part.slice(0, eq).trim();
        const value = part.slice(eq + 1).trim();
        if (!key || Object.prototype.hasOwnProperty.call(out, key)) return;
        try {
            out[key] = decodeURIComponent(value);
        } catch (e) {
            out[key] = value;
        }
    });
    return out;
}

function sessionCookieFrom(header) {
    const value = parseCookies(header)[SESSION_COOKIE_NAME];
    return typeof value === 'string' && value.length > 0 ? value : null;
}

// HttpOnly so page scripts (or anything injected into them) cannot read
// the session. Secure so it never crosses plain HTTP. SameSite=Strict so
// another site cannot cause an authenticated request to the portal.
function buildSessionCookie(value, maxAgeMs) {
    const seconds = Math.floor(maxAgeMs / 1000);
    return `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${seconds}; ` +
        `Path=${PORTAL_PATH}; HttpOnly; Secure; SameSite=Strict`;
}

function clearedSessionCookie() {
    return `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=${PORTAL_PATH}; ` +
        'HttpOnly; Secure; SameSite=Strict';
}

// Applied to every response the portal emits. `no-store` matters twice:
// it keeps the Hosting CDN from ever caching an authenticated page, and
// it keeps the browser from restoring one from history after sign-out.
const SECURITY_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
};

const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyB9KznUPIvHKwLk7Vo9H05jBYiE8MgrPzk',
    authDomain: 'hawaa.in',
    projectId: 'hawaa-air-27548',
    storageBucket: 'hawaa-air-27548.firebasestorage.app',
    messagingSenderId: '994326211415',
    appId: '1:994326211415:web:36288cebafe81e61dcec12'
};

const BASE_STYLE = `
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;
justify-content:center;background:#0f1115;color:#e8eaed;
font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.card{width:100%;max-width:340px;padding:32px 28px;background:#171a21;
border:1px solid #262b36;border-radius:14px}
h1{margin:0 0 22px;font-size:17px;font-weight:600;letter-spacing:.01em}
label{display:block;margin-bottom:6px;font-size:12px;color:#9aa3b2}
input{width:100%;padding:11px 12px;margin-bottom:14px;background:#0f1115;
border:1px solid #2d3340;border-radius:8px;color:#e8eaed;font-size:15px}
input:focus{outline:none;border-color:#4d7cfe}
button{width:100%;padding:11px;background:#4d7cfe;border:0;border-radius:8px;
color:#fff;font-size:15px;font-weight:600;cursor:pointer}
button:disabled{opacity:.5;cursor:default}
.msg{margin-top:14px;font-size:13px;color:#ff8f8f;min-height:18px}
.hint{margin-top:16px;font-size:12px;color:#6b7280}
`;

// Deliberately anonymous: no company name, no logo, no mention of an
// admin area. Someone who guesses the URL learns only that some login
// exists here — not whose, and not what it opens.
function loginPageHtml() {
    return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>Sign in</title>
<style>${BASE_STYLE}</style>
</head><body>
<div class="card">
  <h1>Sign in</h1>
  <div id="step1">
    <label for="phone">Mobile number</label>
    <input id="phone" type="tel" inputmode="tel" autocomplete="tel"
           placeholder="+91 98765 43210">
    <button id="send">Send code</button>
  </div>
  <div id="step2" style="display:none">
    <label for="code">6-digit code</label>
    <input id="code" type="text" inputmode="numeric" autocomplete="one-time-code"
           maxlength="6" placeholder="······">
    <button id="verify">Verify</button>
  </div>
  <div class="msg" id="msg"></div>
  <div class="hint" id="hint"></div>
</div>
<div id="recaptcha"></div>
<script type="module">
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

const app = initializeApp(${JSON.stringify(FIREBASE_CONFIG)});
const auth = getAuth(app);
auth.languageCode = 'en';

const $ = (id) => document.getElementById(id);
const msg = $('msg');
let confirmation = null;

const verifier = new RecaptchaVerifier(auth, 'recaptcha', { size: 'invisible' });

function fail(text) { msg.textContent = text; }

$('send').addEventListener('click', async () => {
  const raw = $('phone').value.replace(/[\\s-]/g, '');
  if (!/^\\+[1-9][0-9]{7,14}$/.test(raw)) {
    return fail('Enter the number with country code, e.g. +919876543210');
  }
  $('send').disabled = true; fail('');
  try {
    confirmation = await signInWithPhoneNumber(auth, raw, verifier);
    $('step1').style.display = 'none';
    $('step2').style.display = 'block';
    $('hint').textContent = 'Code sent to ' + raw;
    $('code').focus();
  } catch (e) {
    $('send').disabled = false;
    fail(e && e.code === 'auth/too-many-requests'
      ? 'Too many attempts. Try again later.'
      : 'Could not send the code. Check the number and try again.');
  }
});

$('verify').addEventListener('click', async () => {
  const code = $('code').value.trim();
  if (!/^[0-9]{6}$/.test(code)) return fail('Enter the 6-digit code.');
  $('verify').disabled = true; fail('');
  try {
    const cred = await confirmation.confirm(code);
    const idToken = await cred.user.getIdToken(true);
    // Anything other than OK: the number is valid but not permitted.
    // Sign back out so no stale client session is left behind.
    const res = await fetch('${PORTAL_PATH}/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!res.ok) {
      await auth.signOut();
      $('verify').disabled = false;
      return fail('That number does not have access.');
    }
    window.location.replace('${PORTAL_PATH}');
  } catch (e) {
    $('verify').disabled = false;
    fail(e && e.code === 'auth/invalid-verification-code'
      ? 'That code is not correct.'
      : 'Could not verify the code. Try again.');
  }
});
</script>
</body></html>`;
}

// Phase 2 placeholder: proves the gate end to end (session verified,
// role resolved) before Phase 3 builds the operations screens here.
function portalShellHtml(session) {
    const name = String(session.name || 'there').replace(/[<>&]/g, '');
    const role = String(session.role || '').replace(/[<>&]/g, '');
    return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>Operations</title>
<style>${BASE_STYLE}
.card{max-width:420px}
dl{margin:0 0 20px;font-size:14px}
dt{color:#9aa3b2;font-size:12px;margin-top:12px}
dd{margin:2px 0 0}
.ok{color:#5fd08a}
</style>
</head><body>
<div class="card">
  <h1>Signed in</h1>
  <dl>
    <dt>Name</dt><dd>${name}</dd>
    <dt>Role</dt><dd>${role}</dd>
    <dt>Gate</dt><dd class="ok">Session verified</dd>
  </dl>
  <p class="hint">The operations screens arrive in Phase 3. This page
  confirms the gate works: it is served only to a verified session that
  still holds a role.</p>
  <form method="POST" action="${PORTAL_PATH}/logout">
    <button type="submit">Sign out</button>
  </form>
</div>
</body></html>`;
}

module.exports = {
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE_MS,
    PORTAL_PATH,
    SECURITY_HEADERS,
    parseCookies,
    sessionCookieFrom,
    buildSessionCookie,
    clearedSessionCookie,
    loginPageHtml,
    portalShellHtml
};
