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
- **Test phone number:** `+91 88661 19918` → OTP `123456` (no SMS sent).
  Configured in Firebase console → Authentication → Sign-in method.
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
npx -y firebase-tools@latest deploy --only functions
npx -y firebase-tools@latest deploy --only hosting
```

Paste the Key ID / Key Secret from the Razorpay dashboard when prompted.
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

## Roadmap

- **Review photos:** needs Firebase Storage (upload UI exists but is hidden).
- **Hosting & email:** deploy via `firebase deploy --only hosting`
  (`firebase.json` is configured) and add the "Trigger Email" extension for
  automatic notifications.

## Historical note

An earlier iteration (merged PRs #85/#86) pointed the forms at a separate
`hawaa-in` Firebase project with anonymous email-based reviews. Everything
now lives in `hawaa-air-27548`; the `hawaa-in` project is unused by the site.
