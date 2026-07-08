# Hawaa.in Backend (Firebase)

The site is static; the backend is Firebase (project `hawaa-in`). Phase 1 is
live in the code: the three site forms write to Cloud Firestore directly from
the browser, secured by `firestore.rules`.

## What's wired up

| Feature | Page | Firestore collection |
| --- | --- | --- |
| Contact / support form | `support.html` | `supportTickets` |
| Review submissions | `reviews.html` | `reviews` (created as `status: "pending"`) |
| Live review display | `reviews.html` | reads `reviews` where `status == "approved"` |
| Newsletter signup | `index.html` footer | `newsletterSubscribers` (doc ID = email, so no duplicates) |

`js/firebase.js` initializes the Firebase SDK (loaded from Google's CDN — no
build step) and exposes `window.hawaaBackend`, which the existing page scripts
(`js/support.js`, `js/reviews.js`, `js/script.js`) call on form submit.

The Firebase web config in `js/firebase.js` is a public client identifier —
it is safe to commit. All protection comes from the Firestore rules.

## One-time setup (required before forms work)

1. In the [Firebase console](https://console.firebase.google.com/project/hawaa-in),
   open **Build → Firestore Database** and click **Create database**.
   Choose **Production mode** and the **asia-south1 (Mumbai)** region.
2. Deploy the security rules — either:
   - **Console (no install):** Firestore → **Rules** tab → paste the contents
     of `firestore.rules` → **Publish**, or
   - **CLI:**
     ```bash
     npm install -g firebase-tools
     firebase login
     firebase deploy --only firestore:rules
     ```

Until the rules are published, all form submissions are rejected (production
mode denies everything by default).

## How the rules protect the data

- Anonymous visitors can only **create** documents with a strictly validated
  shape (field allowlist, string length caps, valid email format, rating 1–5,
  server-set timestamps). They can never read, edit, or delete submissions —
  so customer emails and support messages stay private.
- New reviews must arrive as `status: "pending"`. Only documents you flip to
  `status: "approved"` (in the console) are publicly readable — this is ready
  for Phase 2, when the reviews page will load approved reviews live.

## Moderating / viewing submissions

Open Firestore → **Data** in the console:

- `supportTickets` — read and respond to customer messages.
- `reviews` — change `status` from `pending` to `approved` to publish it on
  the reviews page. Optionally add a boolean `verified: true` field to show
  the "Verified Purchase" badge.
- `newsletterSubscribers` — export emails for your mailing tool.

## Live reviews (Phase 2)

`reviews.html` merges approved Firestore reviews into the built-in sample
reviews at the top of `js/reviews.js` (they appear together, sorted by the
page's sort control). To retire the sample reviews once real ones
accumulate, empty that `reviewsData` array. If Firestore is unreachable the
page silently falls back to the built-in list.

## Roadmap

- **Phase 3 — Orders & payment:** persist the cart, write orders to
  Firestore, and add a Razorpay checkout via a Cloud Function (requires the
  Blaze plan; everything in Phase 1–2 runs on the free Spark plan).
- **Phase 4 — Hosting & email:** deploy via `firebase deploy --only hosting`
  (`firebase.json` is already configured) and add the "Trigger Email"
  extension for automatic notifications.
