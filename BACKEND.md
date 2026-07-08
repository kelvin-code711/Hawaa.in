# Hawaa.in Backend (Firebase)

The site is static; the backend is Firebase project **`hawaa-air-27548`**
("Hawaa-Air", Blaze plan, project number 994326211415). This project is
**shared with the air-purifier device backend** — its `users` (phone-keyed)
and `device_owners` collections are server-only and must never be exposed to
web clients. All website collections are separate.

## What's wired up

| Feature | Page | Firestore collection |
| --- | --- | --- |
| Sign in / sign up (phone OTP + email/password) | every page (header modal) | `web_users` profile doc per user |
| Account page | `account.html` | reads `web_users`, own `reviews` |
| Review submissions (sign-in required) | `reviews.html` | `reviews` (created as `status: "pending"`) |
| Review display | `reviews.html` | `reviews` where `status == "approved"` |
| "Helpful" votes (one per user per review) | `reviews.html` | `review_votes` + counter on the review |
| Contact / support form | `support.html` | `supportTickets` |
| Newsletter signup | `index.html` footer | `newsletterSubscribers` (doc ID = email) |

`js/firebase.js` initializes the Firebase SDK (CDN, no build step) and exposes:

- `window.hawaaFirebase` + `window.hawaaFirebaseReady` — Auth + Firestore
  surface used by `js/nav.js` (sign-in modal), `js/reviews.js`, `js/account.js`.
- `window.hawaaBackend` — form helpers used by `js/support.js` (support
  tickets) and `js/script.js` (newsletter).

The Firebase web config in `js/firebase.js` is a public client identifier —
safe to commit. All protection comes from `firestore.rules`.

## Authentication

- **Providers:** Email/Password and Phone (SMS region allowlist: IN).
- **Test phone number:** `+91 88661 19918` → OTP `123456` (no SMS sent).
  Configured in Firebase console → Authentication → Sign-in method.
- On sign-in, `js/nav.js` upserts `web_users/{uid}` (uid, displayName,
  email/phone, createdAt, lastLoginAt) and redirects to `account.html`.

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

## Roadmap

- **Orders & payment:** persist the cart, write orders to Firestore, and add
  a Razorpay checkout via a Cloud Function (Blaze plan is already active).
- **Review photos:** needs Firebase Storage (upload UI exists but is hidden).
- **Hosting & email:** deploy via `firebase deploy --only hosting`
  (`firebase.json` is configured) and add the "Trigger Email" extension for
  automatic notifications.

## Historical note

An earlier iteration (merged PRs #85/#86) pointed the forms at a separate
`hawaa-in` Firebase project with anonymous email-based reviews. Everything
now lives in `hawaa-air-27548`; the `hawaa-in` project is unused by the site.
