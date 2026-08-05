# Hawaa.in Backend (Firebase)

The site is static; the backend is Firebase project **`hawaa-air-27548`**
("Hawaa-Air", Blaze plan, project number 994326211415). This project is
**shared with the air-purifier device backend** — its `users` (phone-keyed)
and `device_owners` collections are server-only and must never be exposed to
web clients. All website collections are separate.

## What's wired up

| Feature | Page | Firestore collection |
| --- | --- | --- |
| Sign in / sign up (Google + phone OTP) | every page (header modal) | `web_users` profile doc per user |
| Account page | `account.html` | reads `web_users`, own `reviews` |
| Review submissions (sign-in required) | `reviews.html` | `reviews` (created as `status: "pending"`) |
| Review display | `reviews.html` | `reviews` where `status == "approved"` |
| "Helpful" votes (one per user per review) | `reviews.html` | `review_votes` + counter on the review |
| Contact / support form | `support.html` | `supportTickets` |
| Newsletter signup | `index.html` footer | `newsletterSubscribers` (doc ID = email) |
| Checkout — Cash on Delivery (sign-in required) | `buy.html` cart | `orders` (created as `status: "placed"`) |
| Checkout — Pay Online via Razorpay (sign-in required) | `buy.html` cart | `orders` via Cloud Function (+ server-only `razorpay_orders`) |
| Order history | `account.html` | own `orders` |

`js/firebase.js` initializes the Firebase SDK (CDN, no build step) and exposes:

- `window.hawaaFirebase` + `window.hawaaFirebaseReady` — Auth + Firestore
  surface used by `js/nav.js` (sign-in modal), `js/reviews.js`, `js/account.js`.
- `window.hawaaBackend` — form helpers used by `js/support.js` (support
  tickets) and `js/script.js` (newsletter).

The Firebase web config in `js/firebase.js` is a public client identifier —
safe to commit. All protection comes from `firestore.rules`.

## Authentication

- **Providers:** Google and Phone (SMS region allowlist: IN). Email/password
  was removed. The modal has an explicit **Sign in / Sign up** segmented
  toggle, then "Continue with Google", an "or" divider, the mobile-number
  field, and a "By continuing…" legal notice. Google and phone OTP both
  authenticate *and* create the account; the toggle makes the choice visible
  and, on **Sign up**, shows a required Full-name field so a new mobile
  account isn't nameless (the name is written to the Auth profile on OTP
  verify). Google fills the name automatically.
- **Existing number on Sign up:** phone auth is idempotent and a number can't
  be checked for existence before the OTP is sent (Firebase blocks
  enumeration). So `js/nav.js` detects *after* verifying whether the account
  was actually new (`getAdditionalUserInfo(...).isNewUser`, with a metadata
  timestamp fallback). If someone picks **Sign up** with a number that already
  has an account, it shows "You already have a Hawaa account with this number —
  signing you in…" and signs them in without touching their existing name,
  instead of implying a new account was created.
- **Enable Google (required):** Firebase console → Authentication → Sign-in
  method → enable **Google**, and add the site's domain (e.g.
  `in-code711.github.io` and any custom domain) under
  Authentication → Settings → **Authorized domains**. Until this is done the
  Google button returns `auth/operation-not-allowed` /
  `auth/unauthorized-domain`, and the UI tells the user to use their mobile
  number instead. Google sign-in uses a popup, falling back to a full-page
  redirect when popups are blocked (common in mobile in-app browsers).
- **Test phone numbers:** none, deliberately. Firebase's "test phone
  numbers" feature pins a fixed OTP to a number and sends no SMS, which
  is an unauthenticated way in for anyone who learns the pair. That is
  harmless for a throwaway customer login and unacceptable once the same
  number holds an admin role, so the list under Authentication →
  Sign-in method → Phone is kept empty. Test sign-in with a real number
  and a real SMS.
- On sign-in, `js/nav.js` upserts `web_users/{uid}` (uid, displayName,
  email/phone, photoURL, createdAt, lastLoginAt) and redirects to
  `account.html`.

## Profile photo

The account page (`account.html`) lets a signed-in user set a profile photo
via the **"+"** badge on the avatar. The image is centre-cropped and
downscaled client-side to a 256×256 JPEG (`js/account.js`), cached in
`localStorage` for instant display on the same device, and stored as a
bounded data URI in `web_users/{uid}.photoURL`. Google users are seeded with
their Google avatar on first sign-in. **Deploy the updated `firestore.rules`**
(they now allow the `photoURL` field, ≤ 900 KB, on `web_users`) — otherwise
the Firestore write is rejected and the photo only persists on the local
device:
`npx -y firebase-tools@latest deploy --only firestore:rules`.

## Reviews moderation

New reviews arrive as `status: "pending"` and are invisible to the public.
To publish: Firebase console → Firestore → `reviews` → change `status` to
`"approved"`. You can also set `verified: true` to show the "Verified
Purchase" badge (clients can never set this themselves). Authors can see
their own pending reviews on the account page.

The original 24 marketing reviews are seeded as `seed-01`…`seed-24`
(already approved).

## Security rules

`firestore.rules` is deployed to the project. Highlights:

- Anonymous visitors: create-only on `supportTickets` and
  `newsletterSubscribers` with strict shape validation; read approved
  `reviews`.
- Signed-in users: create `pending` reviews (strict schema, `verified`
  locked to false), one Helpful vote per review enforced atomically
  (`getAfter` counter pattern), owner-only `web_users` profiles.
- Everything else — including the device backend's `users` and
  `device_owners` — is denied to clients.

Deploy changes with `npx -y firebase-tools@latest deploy --only firestore:rules`
(run `firebase login --reauth` first if credentials expired).

## Viewing submissions

Firebase console → Firestore → Data:

- `supportTickets` — customer messages (client can never read these).
- `reviews` — moderate `pending` → `approved`.
- `newsletterSubscribers` — export emails for your mailing tool.

## Exporting to CSV / Excel

Use the admin portal's **Download CSV** control (Orders tab, Manager and
above). It exports `orders`, `supportTickets`, `newsletterSubscribers` or
`reviews` as a spreadsheet-ready file: UTF-8 BOM so ₹ and Indian names
survive Excel, IST timestamps, nested maps flattened to `address.city` /
`razorpay.paymentId`, newest first. Formatting lives in `functions/csv.js`
and is unit-tested.

Every export writes an `admin_audit` entry (`data.export`) with the row
count — a bulk copy of customer data is exactly what the log is for.

**`scripts/export-orders.js` was deleted in Phase 5, along with the need
for `serviceAccountKey.json`.** That key granted unrestricted access to
the whole project with no login, and it lived unencrypted on a laptop; a
role-checked, audited button in the portal replaces it. If a key was
generated previously, revoke it: Firebase console → ⚙ → Project settings
→ Service accounts → Manage service account permissions → Keys → delete.
Deleting the local file alone is not enough — the key stays valid until
it is revoked in the console.

Downloaded CSVs still hold names, phones and addresses. `.gitignore`
covers `*.csv` at the repo root; treat them like any other PII export.

For an always-live view instead of point-in-time files, the Firebase
**Stream Firestore to BigQuery** extension mirrors a collection into
BigQuery, which connects directly to Looker Studio / Sheets — worth it
once order volume outgrows manual exports.

## Orders (Cash on Delivery)

The cart (persisted in localStorage) checks out to an `orders` document.
The security rules recompute every amount server-side from fixed catalog
prices — purifier one-time ₹5999, subscription ₹5499, filter ₹1499,
GST 18% (integer round-half-up, mirrored by `gstOf()` in `js/buy.js`) —
so a tampered client can never change what an order costs. Orders are
created as `status: "placed"`; manage them in the console (`confirmed`,
`shipped`, `delivered`, `cancelled` — the account page colors each).
Clients can never read others' orders (address PII), update, or delete.

**When the catalog prices change, update `js/buy.js` (PRICES /
FILTER_PRICE), the `isValidNewOrder` arithmetic in `firestore.rules`, AND
`CATALOG` in `functions/razorpay.js`, then redeploy rules + functions —
otherwise checkout (COD and online alike) will be rejected.**

## Orders (Pay Online — Razorpay)

The checkout drawer has a **Payment method** toggle: Cash on Delivery
(default, unchanged) or **Pay Online** (UPI / cards / netbanking via
Razorpay). The online flow never trusts the browser with money:

1. `js/cart.js` calls the callable Cloud Function **`createRazorpayOrder`**
   (asia-south1) with quantities + address only. The function recomputes
   subtotal/GST/total from the fixed catalog in `functions/razorpay.js`
   (same integer math as `firestore.rules`), creates an order with the
   Razorpay Orders API, stashes the pending checkout in the server-only
   `razorpay_orders/{razorpayOrderId}` collection, and returns the
   Razorpay key ID + order id (so no Razorpay key lives in the repo).
2. The browser opens Razorpay Checkout
   (`https://checkout.razorpay.com/v1/checkout.js`, loaded on demand).
3. On payment, `js/cart.js` calls **`verifyRazorpayPayment`**, which checks
   the HMAC-SHA256 payment signature against the key secret and only then
   writes the real `orders` document with the Admin SDK —
   `paymentMethod: "razorpay"`, `status: "placed"`, plus a `razorpay`
   map (`orderId`, `paymentId`, `keyMode: "test" | "live"`). The write is
   idempotent (a retried verification returns the same order) and
   `firestore.rules` needed no loosening: clients still can't create
   non-COD orders, and `razorpay_orders` is denied to all clients.

### Setup (one-time)

```bash
npx -y firebase-tools@latest functions:secrets:set RAZORPAY_KEY_ID
npx -y firebase-tools@latest functions:secrets:set RAZORPAY_KEY_SECRET
```

Paste the Key ID / Key Secret from the Razorpay dashboard when prompted.
Deploys are automatic from GitHub: pushes to `main` publish hosting
(`firebase-hosting-deploy.yml`) and, when `functions/**` or
`firebase.json` changed, the Cloud Functions
(`firebase-functions-deploy.yml`, also runnable by hand from the
Actions tab). The functions workflow reuses the
`FIREBASE_SERVICE_ACCOUNT` repo secret, whose service account needs the
**Editor** role in Google Cloud IAM (hosting-only permissions aren't
enough to deploy functions).
**The key secret must never appear in the repo or any client file.** With
`rzp_test_…` keys everything runs in Razorpay **test mode**: no real money
moves, and real cards are declined — so COD stays the default payment
method. Test with card `4111 1111 1111 1111` (any future expiry/CVV) or
UPI `success@razorpay` / `failure@razorpay`; payments appear in the
Razorpay dashboard with the Test Mode toggle on.

### Going live

Generate live keys after Razorpay KYC/activation, run the two
`functions:secrets:set` commands again with the live values, and redeploy
functions. Nothing in the repo changes; optionally make Pay Online the
default by moving the `checked` attribute between the two payment-method
radios in `js/cart.js`.

## Admin portal — access control (Phase 1)

The staff portal will live at **`hawaa.in/hawaa-ops-7k11s`**. Phase 1
ships the access-control foundation only; see `ADMIN_PORTAL_PLAN.md` for
the full design and remaining phases.

**Roles** — `viewer` → `staff` → `manager` → `super_admin`, defined once
in `functions/admin.js` (`PERMISSIONS`). `firestore.rules` mirrors the
*read* half of that matrix; the write half is enforced by the
`adminAction` callable.

**Collections**

| Collection | Purpose | Client writes |
| --- | --- | --- |
| `admins/{uid}` | live roster, holds the role | never |
| `admin_invites/{e164Phone}` | pending access | never |
| `admin_audit/{autoId}` | append-only action history | never |

**Why admin writes go through a Cloud Function.** `orders` and `reviews`
remain `allow update: if false` for everyone, Super Admin included. Every
privileged change is made by `adminAction` with the Admin SDK, which
checks the caller's role and writes the audit entry *in the same
transaction* — so an action cannot occur without a trace, and no browser
console can bypass either step.

**Why authorisation re-reads `admins/{uid}`.** The role also travels as a
custom claim (set by the `syncAdminClaims` trigger) so rules can gate
reads cheaply. Claims are baked into an ID token valid for up to an hour,
so callables authorise against the document instead: revoking someone
takes effect on their next request, not whenever their token expires.
`syncAdminClaims` additionally revokes refresh tokens on demotion.

**No OTP for numbers that were never invited.** The login page POSTs to
`/hawaa-ops-7k11s/precheck` *before* asking Firebase to send an SMS. The
number must already exist in `admins` or `admin_invites`; otherwise the
page says "No account exists for this number" and no message is sent —
no SMS billing, and no stray code arriving on a stranger's phone.

That check necessarily answers "does this number have access?", which is
an enumeration oracle, so it is rate-limited to 5 attempts per 15 minutes
per client, keyed by a SHA-256 of the IP in `admin_rate/{hash}` (hashed
so the collection never becomes a record of who opened the portal from
where). **It is a front-door check, not a wall:** the Firebase web config
is public, so someone could still call Firebase Auth directly and trigger
an SMS outside this page. Closing that requires App Check enforcement on
Authentication — still outstanding.

**Sign-in is phone-only for admins.** Invites are keyed by phone number
and redeemed against the verified `phone_number` claim in the ID token,
so access is tied to a physical SIM. There are no admin passwords.

### The gate (Phase 2)

`firebase.json` rewrites `/hawaa-ops-7k11s` (and everything under it) to
the **`adminPortal`** function instead of serving a static file, so the
operations HTML only leaves the server after a session is verified *and*
the roster re-checked. Responses carry `Cache-Control: private,
no-store`, `X-Robots-Tag: noindex`, `X-Frame-Options: DENY` and
`Referrer-Policy: no-referrer`.

| Request | Response |
| --- | --- |
| No session cookie | Anonymous sign-in form (no branding) |
| Valid session, no `admins/{uid}` | 404, same as a nonexistent URL |
| Valid session with a role | The portal |
| Any other path or method under the route | 404 |

**The cookie is named `__session` — that is not a preference.** Firebase
Hosting strips every cookie except that one before forwarding a request
to a function. It is set `HttpOnly` (page scripts cannot read it),
`Secure`, `SameSite=Strict`, and scoped to `Path=/hawaa-ops-7k11s` so it
is never sent on public pages — a site-wide cookie would enter the
Hosting CDN's cache key and fragment caching for the whole site.

Sessions last 8 hours and are minted only from an ID token whose sign-in
happened within the last 5 minutes, so a captured token cannot be traded
for a long-lived cookie later. `verifySessionCookie(..., true)` checks
revocation on every load, and signing out revokes refresh tokens across
all devices.

`robots.txt` deliberately omits the portal path — see the comments in
that file for why listing a secret URL there is counterproductive.

### The screens (Phase 3)

The portal is a single page served by `adminPortal`, with tabs gated by
the caller's permissions: **Orders**, **Reviews**, **Support**, **Team**
and **Activity** (the audit log). A summary strip shows orders today,
revenue this week, orders awaiting dispatch, and reviews waiting.

All reads go through the **`adminQuery`** callable
(`resource: 'summary' | 'orders' | 'reviews' | 'tickets' | 'team' |
'audit'`) and all writes through **`adminAction`**. The browser never
queries Firestore directly, which is what makes the Viewer role's
masking real: `projectOrder()` strips name, street address and pincode
**on the server**, so the unmasked values are never transmitted. Rules
cannot do this — they allow or deny whole documents, never fields.

Dashboard maths lives in `summariseOrders()` / `istDayStartMs()` in
`functions/admin.js`. "Today" means the **IST** day (00:00 IST is 18:30
UTC the previous day); a UTC-based implementation would file every order
placed before 05:30 IST under the wrong day. Cancelled orders count as
orders placed but never as revenue.

The page receives the caller's permission list from
`adminCore.PERMISSIONS[role]` rather than re-deriving it in browser JS,
so there is only ever one copy of the matrix. Hidden buttons are
cosmetic — `adminQuery` and `adminAction` re-authorise every call.

### Deploys

Pushes to `main` run two workflows: `firebase-hosting-deploy.yml`
(static files) and `firebase-functions-deploy.yml` (**functions *and*
`firestore.rules`**). The rules ship with the functions deliberately —
the portal's role checks span both, and rules lagging behind the code
would lock the portal out of its own data.

**Service-account roles required on `hawaa-air-27548`** for the
functions workflow, beyond Editor: **Service Account User**, **Cloud
Functions Admin**, **Secret Manager Admin**. Editor deliberately
excludes granting permissions, and a functions deploy has to grant
several — which is why a robot deploy fails where an Owner's local
deploy succeeds. These project-level bindings are also needed once:

```bash
gcloud projects add-iam-policy-binding hawaa-air-27548 --member=serviceAccount:service-994326211415@gcp-sa-pubsub.iam.gserviceaccount.com --role=roles/iam.serviceAccountTokenCreator
gcloud projects add-iam-policy-binding hawaa-air-27548 --member=serviceAccount:994326211415-compute@developer.gserviceaccount.com --role=roles/run.invoker
gcloud projects add-iam-policy-binding hawaa-air-27548 --member=serviceAccount:994326211415-compute@developer.gserviceaccount.com --role=roles/eventarc.eventReceiver
```

### Runbook — day-to-day admin tasks

**Give someone access.** Portal → **Team** → enter their name, mobile
number in the form `+919876543210`, and a role → **Invite**. Tell them
the portal address. They sign in with that number and an OTP; nothing is
created for them to remember and nothing is shared over chat.

**Change what someone can do.** Team → pick a new role from the dropdown
next to their name. It applies immediately, and their existing sign-in
is invalidated if the change reduces their access.

**Remove someone.** Team → **Remove access**. Effective on their very
next click. Do this the day a person leaves — it is the whole reason
access is per-person rather than a shared password.

**Choosing a role:** Staff for packing and dispatch (no exports, no
refunds); Manager for someone running the shop day to day; Viewer for an
investor or partner who should see revenue but not customer details;
Super Admin only for an owner — it is the only role that can grant
access to others.

**If a phone is lost or stolen**, remove that person in Team straight
away. Their session dies immediately; re-invite once they have the
number back on a new SIM.

**Check what happened.** Portal → **Activity**. Every status change,
moderation decision, team change and CSV export, with who and when.
Nobody can edit or delete it, including a Super Admin.

### First Super Admin (one-time)

```bash
npx -y firebase-tools@latest functions:secrets:set BOOTSTRAP_SUPER_ADMIN_PHONE
```

Enter the owner's number in E.164 (`+919876543210`). After deploy, that
number signs in and the portal calls `redeemAdminInvite`, which creates
the first `super_admin`. **The bootstrap path only runs while `admins` is
completely empty** — once one admin exists it can never fire again, so a
leaked secret is inert. Everyone else is added from the portal's Team
screen; nobody self-registers.

## Roadmap

- **Review photos:** needs Firebase Storage (upload UI exists but is hidden).
- **Hosting & email:** deploy via `firebase deploy --only hosting`
  (`firebase.json` is configured) and add the "Trigger Email" extension for
  automatic notifications.

## Historical note

An earlier iteration (merged PRs #85/#86) pointed the forms at a separate
`hawaa-in` Firebase project with anonymous email-based reviews. Everything
now lives in `hawaa-air-27548`; the `hawaa-in` project is unused by the site.
