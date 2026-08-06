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
    // Ask the server whether this number is on the list *before* asking
    // Firebase to send an SMS. A number nobody invited never gets a
    // message: no cost, and no stray code arriving on a stranger's phone.
    const pre = await fetch('${PORTAL_PATH}/precheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: raw })
    });
    if (pre.status === 429) {
      $('send').disabled = false;
      return fail('Too many attempts. Try again in a few minutes.');
    }
    if (!pre.ok) {
      $('send').disabled = false;
      return fail('No account exists for this number.');
    }

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

const APP_STYLE = `
*{box-sizing:border-box}
body{margin:0;background:#0f1115;color:#e8eaed;
font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
a{color:#8fb0ff}
header{display:flex;align-items:center;gap:14px;flex-wrap:wrap;
padding:14px 20px;background:#12151c;border-bottom:1px solid #262b36;
position:sticky;top:0;z-index:5}
header h1{margin:0;font-size:15px;font-weight:600;letter-spacing:.02em}
header .who{margin-left:auto;font-size:12px;color:#9aa3b2;text-align:right}
header .who b{display:block;color:#e8eaed;font-size:13px;font-weight:600}
.linkbtn{background:none;border:1px solid #2d3340;color:#9aa3b2;padding:6px 12px;
border-radius:7px;font-size:12px;cursor:pointer}
.linkbtn:hover{color:#e8eaed;border-color:#3d4557}
main{padding:20px;max-width:1000px;margin:0 auto}
.stats{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
margin-bottom:22px}
.stat{background:#171a21;border:1px solid #262b36;border-radius:11px;padding:14px 16px}
.stat .k{font-size:11px;color:#9aa3b2;text-transform:uppercase;letter-spacing:.06em}
.stat .v{font-size:22px;font-weight:600;margin-top:5px}
nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px;
border-bottom:1px solid #262b36;padding-bottom:10px}
nav button{background:none;border:0;color:#9aa3b2;padding:7px 13px;border-radius:7px;
font-size:13px;cursor:pointer}
nav button.on{background:#232936;color:#e8eaed;font-weight:600}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.chips button{background:#171a21;border:1px solid #262b36;color:#9aa3b2;
padding:5px 12px;border-radius:20px;font-size:12px;cursor:pointer}
.chips button.on{background:#4d7cfe;border-color:#4d7cfe;color:#fff}
.row{background:#171a21;border:1px solid #262b36;border-radius:11px;
padding:14px 16px;margin-bottom:10px}
.row .top{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
.row .top .id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
font-size:12px;color:#6b7280}
.row .top .amt{margin-left:auto;font-weight:600}
.meta{color:#9aa3b2;font-size:12px;margin-top:5px}
.tag{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;
font-weight:600;text-transform:capitalize}
.t-placed{background:#3a3357;color:#c3b5ff}
.t-confirmed{background:#1f3a52;color:#8fc9ff}
.t-shipped{background:#12405c;color:#7fd8ff}
.t-delivered{background:#1c4630;color:#7fe0a8}
.t-cancelled{background:#4a2630;color:#ff9fb0}
.t-pending{background:#4a3a1c;color:#ffd08a}
.t-approved{background:#1c4630;color:#7fe0a8}
.t-rejected{background:#4a2630;color:#ff9fb0}
.t-live{background:#1c4630;color:#7fe0a8}
.t-scheduled{background:#1f3a52;color:#8fc9ff}
.t-paused{background:#33383f;color:#c9d1de}
.t-claimed{background:#3a3357;color:#c3b5ff}
.t-expired{background:#33383f;color:#8b93a1}
.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;
font-weight:600;letter-spacing:.04em}
.bar{height:5px;border-radius:3px;background:#232936;overflow:hidden;margin-top:9px}
.bar i{display:block;height:100%;background:#4d7cfe;border-radius:3px}
.bar.full i{background:#c3b5ff}
fieldset{border:1px solid #262b36;border-radius:11px;padding:14px 16px;margin:0 0 12px}
legend{padding:0 7px;font-size:11px;color:#9aa3b2;text-transform:uppercase;
letter-spacing:.06em}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
.field label{display:block;margin-bottom:5px;font-size:12px;color:#9aa3b2}
.field input,.field select{width:100%;padding:9px 11px;background:#0f1115;
border:1px solid #2d3340;border-radius:7px;color:#e8eaed;font-size:14px}
.field input:focus,.field select:focus{outline:none;border-color:#4d7cfe}
.field .help{display:block;margin-top:4px;font-size:11px;color:#6b7280}
.check{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:#c9d1de}
.check input{width:16px;height:16px;margin:2px 0 0;flex-shrink:0}
.preview{background:#12151c;border:1px solid #2d3340;border-radius:9px;
padding:12px 14px;font-size:13px;line-height:1.6;color:#c9d1de}
.preview b{color:#e8eaed}
.preview .warn{color:#ffd08a}
.detail{margin-top:12px;padding-top:12px;border-top:1px solid #262b36;
display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.detail h4{margin:0 0 5px;font-size:11px;color:#9aa3b2;text-transform:uppercase;
letter-spacing:.06em}
.detail p{margin:0;white-space:pre-wrap}
.actions{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}
.actions button{padding:7px 14px;border:0;border-radius:7px;font-size:13px;
font-weight:600;cursor:pointer;background:#4d7cfe;color:#fff}
.actions button.ghost{background:#232936;color:#c9d1de}
.actions button.danger{background:#5c2733;color:#ffb3c0}
.actions button:disabled{opacity:.45;cursor:default}
.empty{color:#6b7280;padding:26px 0;text-align:center}
.err{background:#3a1f27;border:1px solid #5c2733;color:#ffb3c0;
padding:11px 14px;border-radius:9px;margin-bottom:14px}
form.invite{background:#171a21;border:1px solid #262b36;border-radius:11px;
padding:16px;margin-bottom:18px;display:grid;gap:10px;
grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
form.invite input,form.invite select{padding:9px 11px;background:#0f1115;
border:1px solid #2d3340;border-radius:7px;color:#e8eaed;font-size:14px;width:100%}
form.invite button{padding:9px;background:#4d7cfe;border:0;border-radius:7px;
color:#fff;font-weight:600;cursor:pointer}
.note{color:#6b7280;font-size:12px;margin:0 0 16px}
`;

// The operations portal. Reads go through the adminQuery callable and
// writes through adminAction, so the browser never touches Firestore
// directly — masking and permission checks stay server-side.
//
// `permissions` is the caller's row of the matrix in admin.js, passed in
// rather than duplicated here so the UI can hide what it cannot do
// without a second copy of the rules drifting out of step. Hiding a
// control is cosmetic; every one of these calls is checked again on the
// server.
function portalShellHtml(session, permissions, catalog) {
    const safe = function (value, fallback) {
        return String(value === undefined || value === null || value === ''
            ? fallback : value).replace(/[<>&"]/g, '');
    };
    const name = safe(session && session.name, 'there');
    const role = safe(session && session.role, '');
    const perms = JSON.stringify(Array.isArray(permissions) ? permissions : []);
    // Passed in rather than restated here so the promo preview quotes
    // the same prices the checkout charges.
    const prices = JSON.stringify(catalog || {});

    return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>Operations</title>
<style>${APP_STYLE}</style>
</head><body>
<header>
  <h1>Hawaa Operations</h1>
  <div class="who"><b>${name}</b>${role.replace('_', ' ')}</div>
  <form method="POST" action="${PORTAL_PATH}/logout">
    <button class="linkbtn" type="submit">Sign out</button>
  </form>
</header>
<main>
  <div id="error"></div>
  <div class="stats" id="stats"></div>
  <nav id="tabs"></nav>
  <div id="view"><div class="empty">Loading…</div></div>
</main>

<script type="module">
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFunctions, httpsCallable }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-functions.js';

const app = initializeApp(${JSON.stringify(FIREBASE_CONFIG)});
const auth = getAuth(app);
const fns = getFunctions(app, 'asia-south1');
const query = httpsCallable(fns, 'adminQuery');
const act = httpsCallable(fns, 'adminAction');

const PERMS = ${perms};
const can = (p) => PERMS.indexOf(p) !== -1;
const CATALOG = ${prices};

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v === undefined || v === null ? '' : v)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;');
const money = (p) => '\\u20B9' + new Intl.NumberFormat('en-IN').format(p || 0);
const when = (ms) => ms
  ? new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata',
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  : '—';

function showError(text) {
  $('error').innerHTML = text ? '<div class="err">' + esc(text) + '</div>' : '';
}

// A callable that reports unauthenticated means the browser's sign-in
// was lost while the page cookie is still valid. Sending them back
// through /logout clears both so they get a clean sign-in.
function handleFailure(err) {
  const code = err && err.code ? String(err.code) : '';
  if (code.indexOf('unauthenticated') !== -1) {
    document.body.innerHTML =
      '<main><div class="err">Your sign-in expired. ' +
      '<a href="${PORTAL_PATH}">Reload to sign in again.</a></div></main>';
    return;
  }
  showError((err && err.message) || 'Something went wrong. Try again.');
}

// ---- Tabs -------------------------------------------------------
const TABS = [
  { id: 'orders',  label: 'Orders',   perm: 'orders.read' },
  { id: 'reviews', label: 'Reviews',  perm: 'reviews.read' },
  { id: 'promos',  label: 'Promos',   perm: 'promos.read' },
  { id: 'tickets', label: 'Support',  perm: 'tickets.read' },
  { id: 'team',    label: 'Team',     perm: 'team.manage' },
  { id: 'audit',   label: 'Activity', perm: 'audit.read' }
].filter((t) => can(t.perm));

let active = TABS.length ? TABS[0].id : null;
let orderFilter = '';
let reviewFilter = 'pending';

function renderTabs() {
  $('tabs').innerHTML = TABS.map((t) =>
    '<button data-tab="' + t.id + '" class="' + (t.id === active ? 'on' : '') +
    '">' + t.label + '</button>').join('');
}

$('tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('button[data-tab]');
  if (!tab) return;
  active = tab.dataset.tab;
  renderTabs();
  load();
});

// ---- Summary ----------------------------------------------------
async function loadStats() {
  if (!can('dashboard')) { $('stats').innerHTML = ''; return; }
  try {
    const s = (await query({ resource: 'summary' })).data;
    const tiles = [
      ['Orders today', s.ordersToday],
      ['Revenue this week', money(s.revenueWeek)],
      ['Awaiting dispatch', s.awaitingDispatch]
    ];
    // Only worth a tile once discounts are actually running — an empty
    // "₹0 discounted" is noise on a dashboard read every morning.
    if (s.discountWeek > 0) {
      tiles.push(['Discounts this week', '\\u2212' + money(s.discountWeek)]);
    }
    if (typeof s.pendingReviews === 'number') {
      tiles.push(['Reviews waiting', s.pendingReviews]);
    }
    $('stats').innerHTML = tiles.map((t) =>
      '<div class="stat"><div class="k">' + esc(t[0]) + '</div><div class="v">' +
      esc(t[1]) + '</div></div>').join('');
  } catch (err) { handleFailure(err); }
}

// ---- Orders -----------------------------------------------------
function orderRow(o, masked) {
  const a = o.address || {};
  const items = [];
  if (o.qtyPurifierOnetime) items.push(o.qtyPurifierOnetime + ' x Purifier (one-time)');
  if (o.qtyPurifierSubscribe) items.push(o.qtyPurifierSubscribe + ' x Purifier (subscription)');
  if (o.qtyFilter) items.push(o.qtyFilter + ' x Filter');

  let where = esc(a.city || '') + (a.state ? ', ' + esc(a.state) : '');
  let contact = '';
  if (!masked) {
    where = esc(a.line1 || '') + (a.line2 ? ', ' + esc(a.line2) : '') +
      '<br>' + esc(a.city || '') + ', ' + esc(a.state || '') + ' ' + esc(a.pincode || '');
    contact = '<div><h4>Customer</h4><p>' + esc(a.name || '') + '<br>' +
      esc(a.phone || '') + '</p></div>';
  }

  const buttons = [];
  if (can('orders.updateStatus')) {
    if (o.status === 'placed') buttons.push(['confirmed', 'Confirm', '']);
    if (o.status === 'confirmed') buttons.push(['shipped', 'Mark shipped', '']);
    if (o.status === 'shipped') buttons.push(['delivered', 'Mark delivered', '']);
  }
  if (can('orders.cancel') && (o.status === 'placed' || o.status === 'confirmed')) {
    buttons.push(['cancelled', 'Cancel', 'danger']);
  }

  return '<div class="row">' +
    '<div class="top"><span class="tag t-' + esc(o.status) + '">' + esc(o.status) +
      '</span><span class="id">' + esc(o.id) + '</span>' +
      '<span class="amt">' + money(o.total) + '</span></div>' +
    '<div class="meta">' + when(o.createdAt) + ' &middot; ' +
      esc(items.join(', ') || 'No items') + ' &middot; ' +
      (o.paymentMethod === 'razorpay' ? 'Paid online' : 'Cash on delivery') + '</div>' +
    '<div class="detail">' + contact +
      '<div><h4>Deliver to</h4><p>' + (where || '—') + '</p></div>' +
      '<div><h4>Amounts</h4><p>Subtotal ' + money(o.subtotal) +
        (o.discount
          ? '<br>\\u2212' + money(o.discount) + ' (' +
            esc((o.promo && o.promo.code) || 'discount') + ')' +
            (o.promo && o.promo.overLimit ? ' \\u00b7 past its limit' : '')
          : '') +
        '<br>GST ' + money(o.gst) + '<br><b>Total ' + money(o.total) + '</b></p></div>' +
    '</div>' +
    (buttons.length
      ? '<div class="actions">' + buttons.map((b) =>
          '<button class="' + b[2] + '" data-order="' + esc(o.id) +
          '" data-to="' + b[0] + '">' + b[1] + '</button>').join('') + '</div>'
      : '') +
    '</div>';
}

// Builds the file in the browser from the CSV the server returns. The
// BOM is what makes Excel read it as UTF-8 — without it, rupee signs and
// Indian names arrive as mojibake.
function downloadCsv(filename, text) {
  const blob = new Blob(['\\ufeff' + text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const EXPORTABLE = [
  ['orders', 'Orders'],
  ['supportTickets', 'Support messages'],
  ['newsletterSubscribers', 'Newsletter emails'],
  ['reviews', 'Reviews'],
  ['promo_codes', 'Promo codes']
];

function exportBar() {
  if (!can('export')) return '';
  return '<form class="invite" id="exportForm" style="grid-template-columns:1fr auto">' +
    '<select name="collection">' + EXPORTABLE.map((c) =>
      '<option value="' + c[0] + '">' + c[1] + '</option>').join('') + '</select>' +
    '<button type="submit">Download CSV</button></form>' +
    '<p class="note">Opens in Excel or Google Sheets. Downloads are recorded ' +
    'in Activity, because an export is a copy of customer data.</p>';
}

async function loadOrders() {
  const filters = ['', 'placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  const chips = '<div class="chips">' + filters.map((f) =>
    '<button data-filter="' + f + '" class="' + (f === orderFilter ? 'on' : '') + '">' +
    (f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)) + '</button>').join('') +
    '</div>';

  const res = (await query({ resource: 'orders', status: orderFilter, limit: 100 })).data;
  const note = res.masked
    ? '<p class="note">Customer names, phone numbers and addresses are hidden for your role.</p>'
    : '';
  $('view').innerHTML = exportBar() + chips + note + (res.orders.length
    ? res.orders.map((o) => orderRow(o, res.masked)).join('')
    : '<div class="empty">No orders here yet.</div>');
}

// ---- Reviews ----------------------------------------------------
async function loadReviews() {
  const states = ['pending', 'approved', 'rejected'];
  const chips = '<div class="chips">' + states.map((s) =>
    '<button data-review-filter="' + s + '" class="' + (s === reviewFilter ? 'on' : '') +
    '">' + s.charAt(0).toUpperCase() + s.slice(1) + '</button>').join('') + '</div>';

  const res = (await query({ resource: 'reviews', status: reviewFilter, limit: 100 })).data;
  $('view').innerHTML = chips + (res.reviews.length ? res.reviews.map((r) =>
    '<div class="row">' +
      '<div class="top"><span class="tag t-' + esc(r.status) + '">' + esc(r.status) +
        '</span><span>' + '\\u2605'.repeat(Math.max(0, Math.min(5, r.rating))) + '</span>' +
        '<span class="amt">' + esc(r.name) + '</span></div>' +
      '<div class="meta">' + when(r.createdAt) +
        (r.verified ? ' &middot; Verified purchase' : '') + '</div>' +
      '<div class="detail"><div><h4>' + esc(r.title) + '</h4><p>' +
        esc(r.content) + '</p></div></div>' +
      (can('reviews.moderate') && r.status === 'pending'
        ? '<div class="actions">' +
            '<button data-review="' + esc(r.id) + '" data-decision="approved" data-verified="0">Approve</button>' +
            '<button class="ghost" data-review="' + esc(r.id) + '" data-decision="approved" data-verified="1">Approve + verified</button>' +
            '<button class="danger" data-review="' + esc(r.id) + '" data-decision="rejected" data-verified="0">Reject</button>' +
          '</div>'
        : '') +
    '</div>').join('') : '<div class="empty">Nothing ' + esc(reviewFilter) + '.</div>');
}

// ---- Promos -----------------------------------------------------
//
// The form is the dangerous part of this screen: "10" means a tenth of
// an order in one field and ten rupees in another, and nobody notices
// until the discount has been given away. So every keystroke is priced
// against a real cart and the answer is shown in rupees, underneath, in
// the same words a customer would see.

const GST_PCT = 18;
const roundHalfUp = (n) => Math.floor((n + 50) / 100);

function previewOf(f) {
  const type = f.type;
  const value = Number(f.value) || 0;
  const cap = Number(f.maxDiscount) || 0;
  const min = Number(f.minSubtotal) || 0;
  // Price against the smallest cart the code can apply to — that is
  // where a percentage looks smallest and a flat amount looks largest.
  const basis = f.appliesTo === 'filter'
    ? { subtotal: CATALOG.filter, what: 'a replacement filter' }
    : { subtotal: CATALOG.onetime, what: 'one Hawaa Edge' };

  if (value < 1) return { text: 'Enter a discount to see what it costs.' };

  let off = type === 'percent'
    ? roundHalfUp(basis.subtotal * value)
    : value;
  if (type === 'percent' && cap) off = Math.min(off, cap);
  off = Math.max(0, Math.min(off, basis.subtotal));

  const taxable = basis.subtotal - off;
  const gst = roundHalfUp(taxable * GST_PCT);
  const total = taxable + gst;

  const warn = min > basis.subtotal
    ? 'A minimum of ' + money(min) + ' means ' + basis.what +
      ' on its own will not qualify.'
    : (off >= basis.subtotal ? 'This takes ' + basis.what + ' to zero.' : '');

  return {
    text: 'On ' + basis.what + ' (' + money(basis.subtotal) + '): <b>' +
      money(off) + ' off</b>. The customer pays <b>' + money(total) +
      '</b> — ' + money(taxable) + ' plus ' + money(gst) + ' GST. ' +
      'You give up ' + money(off) + ' per order.',
    warn
  };
}

function promoFormValues() {
  const form = $('promoForm');
  if (!form) return {};
  const f = new FormData(form);
  const get = (k) => String(f.get(k) || '').trim();
  return {
    code: get('code'), label: get('label'), type: get('type'),
    value: get('value'), maxDiscount: get('maxDiscount'),
    minSubtotal: get('minSubtotal'), appliesTo: get('appliesTo'),
    startsAt: get('startsAt'), expiresAt: get('expiresAt'),
    maxRedemptions: get('maxRedemptions'), perUserLimit: get('perUserLimit'),
    firstOrderOnly: !!f.get('firstOrderOnly'), showcase: !!f.get('showcase'),
    headline: get('headline')
  };
}

// A bare date from <input type="date"> is ambiguous. A promotion that
// "ends 30 Sep" ends when 30 Sep ends in India, not when it begins in
// London — so the day is pinned to IST before it leaves the browser.
function istStart(day) { return day ? day + 'T00:00:00+05:30' : ''; }
function istEnd(day) { return day ? day + 'T23:59:59+05:30' : ''; }

function refreshPromoForm() {
  const f = promoFormValues();
  const isPercent = f.type === 'percent';

  const unit = $('valueUnit');
  if (unit) unit.textContent = isPercent ? '%' : '\\u20B9';
  const capRow = $('capRow');
  if (capRow) capRow.style.display = isPercent ? '' : 'none';
  const headlineRow = $('headlineRow');
  if (headlineRow) headlineRow.style.display = f.showcase ? '' : 'none';

  const p = previewOf(f);
  const box = $('promoPreview');
  if (box) {
    box.innerHTML = p.text + (p.warn
      ? '<br><span class="warn">' + esc(p.warn) + '</span>' : '');
  }
}

function promoForm() {
  const opt = (v, l) => '<option value="' + v + '">' + l + '</option>';
  return '<form id="promoForm">' +
    '<fieldset><legend>New code</legend>' +
      '<div class="grid">' +
        '<div class="field"><label for="p-code">Code</label>' +
          '<input id="p-code" name="code" placeholder="MONSOON10" maxlength="20" required ' +
          'style="text-transform:uppercase">' +
          '<span class="help">What the customer types.</span></div>' +
        '<div class="field"><label for="p-label">Campaign name</label>' +
          '<input id="p-label" name="label" placeholder="Monsoon launch" maxlength="80">' +
          '<span class="help">Only you see this.</span></div>' +
        '<div class="field"><label for="p-type">Discount type</label>' +
          '<select id="p-type" name="type">' +
          opt('percent', 'Percentage off') + opt('flat', 'Flat amount off') +
          '</select></div>' +
        '<div class="field"><label for="p-value">Amount <span id="valueUnit">%</span></label>' +
          '<input id="p-value" name="value" type="number" min="1" step="1" required>' +
          '</div>' +
        '<div class="field" id="capRow"><label for="p-cap">Never more than</label>' +
          '<input id="p-cap" name="maxDiscount" type="number" min="0" step="1" ' +
          'placeholder="No cap"><span class="help">Caps a percentage on big carts.</span></div>' +
        '<div class="field"><label for="p-min">Minimum order</label>' +
          '<input id="p-min" name="minSubtotal" type="number" min="0" step="1" ' +
          'placeholder="Any amount"></div>' +
        '<div class="field"><label for="p-applies">Applies to</label>' +
          '<select id="p-applies" name="appliesTo">' +
          opt('all', 'Everything in the cart') + opt('purifier', 'Purifiers only') +
          opt('filter', 'Filters only') + '</select></div>' +
      '</div></fieldset>' +

    '<fieldset><legend>Limits</legend>' +
      '<div class="grid">' +
        '<div class="field"><label for="p-starts">Starts</label>' +
          '<input id="p-starts" name="startsAt" type="date">' +
          '<span class="help">Blank = right away.</span></div>' +
        '<div class="field"><label for="p-ends">Ends after</label>' +
          '<input id="p-ends" name="expiresAt" type="date">' +
          '<span class="help">Blank = never. Runs to the end of that day.</span></div>' +
        '<div class="field"><label for="p-max">Total uses</label>' +
          '<input id="p-max" name="maxRedemptions" type="number" min="0" step="1" ' +
          'placeholder="Unlimited"></div>' +
        '<div class="field"><label for="p-per">Uses per customer</label>' +
          '<input id="p-per" name="perUserLimit" type="number" min="1" step="1" value="1">' +
          '</div>' +
      '</div>' +
      '<div style="display:grid;gap:10px;margin-top:12px">' +
        '<label class="check"><input type="checkbox" name="firstOrderOnly">' +
          '<span>First order only — nobody who has ordered before can use it.</span></label>' +
        '<label class="check"><input type="checkbox" name="showcase">' +
          '<span>Show this code in every shopper\\u2019s cart as a one-tap offer. ' +
          'It becomes public the moment you save.</span></label>' +
      '</div>' +
      '<div class="field" id="headlineRow" style="display:none;margin-top:10px">' +
        '<label for="p-headline">What the cart says</label>' +
        '<input id="p-headline" name="headline" maxlength="60" ' +
        'placeholder="10% off your first order">' +
        '<span class="help">Blank = we write it from the rules above.</span></div>' +
    '</fieldset>' +

    '<div class="preview" id="promoPreview">Enter a discount to see what it costs.</div>' +
    '<div class="actions" style="margin-top:12px">' +
      '<button type="submit">Create code</button></div>' +
    '</form>' +
    '<p class="note">The discount, what it applies to and the first-order rule ' +
    'are fixed once a code exists — orders that used it have to keep meaning ' +
    'what they meant. Everything else can be changed, and a code nobody has ' +
    'used yet can be deleted.</p>';
}

function promoRow(p, canManage) {
  const used = p.redemptions || 0;
  const cap = p.maxRedemptions || 0;
  const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const usage = cap ? used + ' of ' + cap + ' used' :
    (used === 1 ? '1 use' : used + ' uses');

  const facts = [esc(p.summary)];
  if (p.perUserLimit > 1) facts.push(p.perUserLimit + ' per customer');
  if (p.startsAt && p.status === 'scheduled') facts.push('starts ' + when(p.startsAt));
  if (p.expiresAt) facts.push((p.status === 'expired' ? 'ended ' : 'ends ') + when(p.expiresAt));
  if (p.showcase) facts.push('shown in cart');

  const buttons = [];
  if (canManage) {
    if (p.status === 'paused') buttons.push(['resume', 'Resume', 'ghost']);
    else if (p.status === 'live' || p.status === 'scheduled') {
      buttons.push(['pause', 'Pause', 'ghost']);
      buttons.push(['end', 'End now', 'danger']);
    }
    buttons.push([p.showcase ? 'unshow' : 'show',
      p.showcase ? 'Hide from cart' : 'Show in cart', 'ghost']);
    if (used === 0) buttons.push(['delete', 'Delete', 'danger']);
  }

  return '<div class="row">' +
    '<div class="top"><span class="tag t-' + esc(p.status) + '">' + esc(p.status) +
      '</span><span class="code">' + esc(p.code) + '</span>' +
      (p.label ? '<span class="id">' + esc(p.label) + '</span>' : '') +
      '<span class="amt">' + money(p.discountGiven) + ' given</span></div>' +
    '<div class="meta">' + facts.join(' &middot; ') + '</div>' +
    '<div class="meta">' + esc(usage) + '</div>' +
    (cap ? '<div class="bar' + (pct >= 100 ? ' full' : '') +
      '"><i style="width:' + pct + '%"></i></div>' : '') +
    (buttons.length ? '<div class="actions">' + buttons.map((b) =>
      '<button class="' + b[2] + '" data-promo="' + esc(p.code) +
      '" data-do="' + b[0] + '">' + b[1] + '</button>').join('') + '</div>' : '') +
    '</div>';
}

async function loadPromos() {
  const res = (await query({ resource: 'promos' })).data;
  const live = res.promos.filter((p) => p.status === 'live').length;
  $('view').innerHTML = (res.canManage ? promoForm() : '') +
    '<p class="note">' + (live === 1 ? '1 code is live' : live + ' codes are live') +
    ' right now. Codes are never shown to shoppers unless you tick ' +
    '\\u201cshow in cart\\u201d.</p>' +
    (res.promos.length
      ? res.promos.map((p) => promoRow(p, res.canManage)).join('')
      : '<div class="empty">No promo codes yet.</div>');
  if (res.canManage) refreshPromoForm();
}

// ---- Support ----------------------------------------------------
async function loadTickets() {
  const res = (await query({ resource: 'tickets', limit: 100 })).data;
  $('view').innerHTML = res.tickets.length ? res.tickets.map((t) =>
    '<div class="row">' +
      '<div class="top"><b>' + esc(t.name) + '</b><span class="id">' + esc(t.email) +
        '</span><span class="amt" style="font-weight:400;color:#9aa3b2">' +
        when(t.createdAt) + '</span></div>' +
      '<div class="detail"><div><p>' + esc(t.message) + '</p></div></div>' +
      (t.page ? '<div class="meta">Sent from ' + esc(t.page) + '</div>' : '') +
    '</div>').join('') : '<div class="empty">No messages yet.</div>';
}

// ---- Team -------------------------------------------------------
async function loadTeam() {
  const res = (await query({ resource: 'team' })).data;
  const roles = ['viewer', 'staff', 'manager', 'super_admin'];

  const form = '<form class="invite" id="inviteForm">' +
    '<input name="name" placeholder="Full name" required>' +
    '<input name="phone" placeholder="+919876543210" required>' +
    '<select name="role">' + roles.map((r) =>
      '<option value="' + r + '">' + r.replace('_', ' ') + '</option>').join('') +
    '</select><button type="submit">Invite</button></form>' +
    '<p class="note">They sign in at this address with that number. ' +
    'No password is created or shared.</p>';

  const members = res.members.map((m) =>
    '<div class="row"><div class="top"><b>' + esc(m.name) + '</b>' +
      '<span class="id">' + esc(m.phone) + '</span>' +
      '<span class="amt">' + esc(m.role.replace('_', ' ')) + '</span></div>' +
      '<div class="actions">' +
        '<select data-setrole="' + esc(m.uid) + '">' + roles.map((r) =>
          '<option value="' + r + '"' + (r === m.role ? ' selected' : '') + '>' +
          r.replace('_', ' ') + '</option>').join('') + '</select>' +
        '<button class="danger" data-revoke="' + esc(m.uid) + '">Remove access</button>' +
      '</div></div>').join('');

  const invites = res.invites.length
    ? '<h3 style="font-size:13px;color:#9aa3b2;margin:22px 0 10px">Invited, not signed in yet</h3>' +
      res.invites.map((i) =>
        '<div class="row"><div class="top"><b>' + esc(i.name) + '</b>' +
        '<span class="id">' + esc(i.phone) + '</span>' +
        '<span class="amt">' + esc(i.role.replace('_', ' ')) + '</span></div></div>').join('')
    : '';

  $('view').innerHTML = form + members + invites;
}

// ---- Activity ---------------------------------------------------
async function loadAudit() {
  const res = (await query({ resource: 'audit', limit: 100 })).data;
  $('view').innerHTML = '<p class="note">Every change made in this portal. ' +
    'Nobody can edit or delete these entries.</p>' + (res.entries.length
    ? res.entries.map((e) =>
        '<div class="row"><div class="top"><b>' + esc(e.action) + '</b>' +
        '<span class="id">' + esc(e.target) + '</span>' +
        '<span class="amt" style="font-weight:400;color:#9aa3b2">' + when(e.at) +
        '</span></div><div class="meta">' + esc(e.actorPhone || e.actorUid) +
        ' (' + esc(e.actorRole) + ')' +
        (Object.keys(e.details || {}).length
          ? ' &middot; ' + esc(JSON.stringify(e.details)) : '') +
        '</div></div>').join('')
    : '<div class="empty">Nothing recorded yet.</div>');
}

// ---- Dispatch ---------------------------------------------------
const LOADERS = {
  orders: loadOrders, reviews: loadReviews, promos: loadPromos,
  tickets: loadTickets, team: loadTeam, audit: loadAudit
};

async function load() {
  if (!active) {
    $('view').innerHTML = '<div class="empty">Your role has no screens yet.</div>';
    return;
  }
  $('view').innerHTML = '<div class="empty">Loading…</div>';
  showError('');
  try { await LOADERS[active](); } catch (err) { handleFailure(err); }
}

async function run(payload, confirmText) {
  if (confirmText && !window.confirm(confirmText)) return;
  showError('');
  try {
    await act(payload);
    await Promise.all([load(), loadStats()]);
  } catch (err) { handleFailure(err); }
}

$('view').addEventListener('click', (e) => {
  const filter = e.target.closest('button[data-filter]');
  if (filter) { orderFilter = filter.dataset.filter; return load(); }

  const rf = e.target.closest('button[data-review-filter]');
  if (rf) { reviewFilter = rf.dataset.reviewFilter; return load(); }

  const order = e.target.closest('button[data-order]');
  if (order) {
    const to = order.dataset.to;
    return run({ action: 'order.setStatus', orderId: order.dataset.order, status: to },
      to === 'cancelled' ? 'Cancel this order? This cannot be undone.' : null);
  }

  const review = e.target.closest('button[data-review]');
  if (review) {
    return run({ action: 'review.moderate', reviewId: review.dataset.review,
      decision: review.dataset.decision, verified: review.dataset.verified === '1' });
  }

  const revoke = e.target.closest('button[data-revoke]');
  if (revoke) {
    return run({ action: 'team.revoke', uid: revoke.dataset.revoke },
      'Remove this person\\u2019s access? They lose it immediately.');
  }

  const promoBtn = e.target.closest('button[data-promo]');
  if (promoBtn) {
    const code = promoBtn.dataset.promo;
    const verb = promoBtn.dataset.do;
    if (verb === 'delete') {
      return run({ action: 'promo.delete', code },
        'Delete ' + code + '? Nobody has used it, so nothing is lost.');
    }
    const changes =
      verb === 'pause'  ? { active: false } :
      verb === 'resume' ? { active: true } :
      verb === 'show'   ? { showcase: true } :
      verb === 'unshow' ? { showcase: false } :
      // "End now" stops the code without deleting it, so every order
      // that used it still says what it used.
      { expiresAt: new Date().toISOString() };
    const confirmText =
      verb === 'end'  ? 'End ' + code + ' now? Nobody will be able to use it again.' :
      verb === 'show' ? 'Show ' + code + ' in every cart? Anyone visiting the site will see it.' :
      null;
    return run({ action: 'promo.update', code, changes }, confirmText);
  }
});

$('view').addEventListener('change', (e) => {
  const setrole = e.target.closest('select[data-setrole]');
  if (setrole) {
    run({ action: 'team.setRole', uid: setrole.dataset.setrole, role: setrole.value });
  }
  if (e.target.closest('#promoForm')) refreshPromoForm();
});

// Priced live rather than on blur: the number that stops a costly typo
// has to appear while the typo is still on screen.
$('view').addEventListener('input', (e) => {
  if (e.target.closest('#promoForm')) refreshPromoForm();
});

$('view').addEventListener('submit', async (e) => {
  if (e.target.id === 'promoForm') {
    e.preventDefault();
    const f = promoFormValues();
    return run({
      action: 'promo.create',
      code: f.code,
      label: f.label,
      type: f.type,
      value: f.value === '' ? 0 : Number(f.value),
      maxDiscount: f.maxDiscount === '' ? 0 : Number(f.maxDiscount),
      minSubtotal: f.minSubtotal === '' ? 0 : Number(f.minSubtotal),
      appliesTo: f.appliesTo,
      startsAt: istStart(f.startsAt),
      expiresAt: istEnd(f.expiresAt),
      maxRedemptions: f.maxRedemptions === '' ? 0 : Number(f.maxRedemptions),
      perUserLimit: f.perUserLimit === '' ? 1 : Number(f.perUserLimit),
      firstOrderOnly: f.firstOrderOnly,
      showcase: f.showcase,
      headline: f.headline
    }, f.showcase
      ? 'Create ' + f.code.toUpperCase() +
        ' and show it in every cart? The code becomes public immediately.'
      : null);
  }

  if (e.target.id === 'inviteForm') {
    e.preventDefault();
    const f = new FormData(e.target);
    return run({ action: 'team.invite', name: f.get('name'), phone: f.get('phone'),
      role: f.get('role') });
  }

  if (e.target.id === 'exportForm') {
    e.preventDefault();
    const collection = new FormData(e.target).get('collection');
    const button = e.target.querySelector('button');
    button.disabled = true;
    button.textContent = 'Preparing…';
    showError('');
    try {
      const res = (await query({ resource: 'export', collection })).data;
      if (!res.rows) {
        showError('Nothing to export from ' + collection + ' yet.');
      } else {
        const day = new Date().toISOString().slice(0, 10);
        downloadCsv(collection + '-' + day + '.csv', res.csv);
        if (res.capped) {
          showError('Showing the first ' + res.rows +
            ' rows — there are more than one file can hold.');
        }
      }
    } catch (err) {
      handleFailure(err);
    }
    button.disabled = false;
    button.textContent = 'Download CSV';
  }
});

// The page cookie and the browser's Firebase sign-in are separate; the
// cookie got us this page, but the callables need the sign-in.
onAuthStateChanged(auth, (user) => {
  if (!user) {
    document.body.innerHTML =
      '<main><div class="err">Your sign-in expired. ' +
      '<a href="${PORTAL_PATH}">Reload to sign in again.</a></div></main>';
    return;
  }
  renderTabs();
  loadStats();
  load();
});
</script>
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
