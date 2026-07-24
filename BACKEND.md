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

**When the catalog prices change, update BOTH `js/buy.js` (PRICES /
FILTER_PRICE) and the `isValidNewOrder` arithmetic in `firestore.rules`,
then redeploy the rules — otherwise checkout will be rejected.**

## Roadmap

- **Online payment:** add Razorpay alongside COD via a Cloud Function
  (order creation + signature verification; Blaze plan is already active).
- **Review photos:** needs Firebase Storage (upload UI exists but is hidden).
- **Hosting & email:** deploy via `firebase deploy --only hosting`
  (`firebase.json` is configured) and add the "Trigger Email" extension for
  automatic notifications.

## Historical note

An earlier iteration (merged PRs #85/#86) pointed the forms at a separate
`hawaa-in` Firebase project with anonymous email-based reviews. Everything
now lives in `hawaa-air-27548`; the `hawaa-in` project is unused by the site.
