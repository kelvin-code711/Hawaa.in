# Hawaa Admin Portal — Build & Security Plan

A staff-only operations portal for managing orders, reviews and support
tickets, replacing day-to-day work in the Firebase console and the
`scripts/export-orders.js` CSV script.

Everything here runs inside the existing Firebase project
(`hawaa-air-27548`) and the existing deploy pipeline. No new domain, no
new hosting, no new vendor, no recurring cost.

---

## 1. Address

**`hawaa.in/hawa-mahal-7k2`**

"Hawa Mahal" — the Palace of Winds — is on-brand and easy to remember;
the `-7k2` suffix is what stops it being guessable. Automated scanners
probe `/admin`, `/wp-admin`, `/dashboard` and similar; none of them will
ever try this.

The suffix can be any 2–4 characters you like — it is changed by renaming
one route, with no other consequences.

**This is a second lock, not the first.** The address being secret is a
nice-to-have. Sections 4 and 5 are what actually protect the data.

---

## 2. Roles

Four roles, each a strict subset of the one above it.

| Capability | Super Admin | Manager | Staff | Viewer |
| --- | :-: | :-: | :-: | :-: |
| View order list | ✓ | ✓ | ✓ | ✓ |
| See customer name, phone, address | ✓ | ✓ | ✓ | masked |
| Update order status (packed → shipped → delivered) | ✓ | ✓ | ✓ | — |
| Cancel or refund an order | ✓ | ✓ | — | — |
| Approve / reject reviews | ✓ | ✓ | — | — |
| Mark a review "Verified Purchase" | ✓ | ✓ | — | — |
| Read support tickets | ✓ | ✓ | ✓ | — |
| Export CSV | ✓ | ✓ | — | — |
| Revenue dashboard | ✓ | ✓ | — | ✓ |
| Add / remove admins, change roles | ✓ | — | — | — |
| View audit log | ✓ | — | — | — |

**Who each role is for**

- **Super Admin** — you, and at most one trusted co-founder. The only
  role that can grant access to anyone else.
- **Manager** — a trusted operations lead. Runs the shop end to end but
  cannot create accounts or hide their own tracks.
- **Staff** — packing and dispatch. Sees what is needed to ship an order
  and nothing more. No bulk export, so a departing employee cannot walk
  out with the customer list.
- **Viewer** — an investor or partner who should see revenue and volume
  but not customer personal data. Phone numbers and addresses are masked
  (`+91 88••• ••918`).

**Roles are enforced on the server, not in the browser.** Hiding a button
is convenience, not security — the database itself refuses actions the
role does not permit, so there is no way to bypass it by fiddling with
the page.

---

## 3. Granting and removing access

### Confirmed: invite by phone number

> **Decided.** Access is granted by adding a mobile number to the
> allowlist; there are no admin passwords anywhere in the system.

1. Super Admin opens **Team** in the portal and enters the person's name,
   mobile number, and role.
2. That number is now on the allowlist. Nobody else can get in, even with
   the address.
3. The employee opens the portal, enters their number, receives an OTP,
   and is in. Nothing to share, nothing to type wrong.
4. To remove access: delete their row. Effective within seconds, and no
   one else is disturbed.

### Why not a password created by the Super Admin

The instinct — the owner creates the credentials and hands them out — is
exactly right. It is only the *password* part that causes trouble:

- A password shared over WhatsApp lives in that chat forever, on both
  phones, in both cloud backups.
- People reuse passwords. If an employee's password was already exposed
  in some unrelated website breach, it protects nothing.
- When someone leaves you must change the password *and* redistribute it
  to everyone else who was using it.
- Two people can quietly share one login, and the audit log can no longer
  tell you who actually did something.

Phone OTP removes all four problems. Access is tied to a physical SIM,
there is nothing to leak, and revoking one person affects nobody else.
It also keeps the property the site already has today: **there is no
admin password anywhere, so there is nothing to steal or guess.**

The Super Admin still controls exactly who gets in and what they can do.
That requirement is fully met — only the mechanism changes.

### If a username and password is still preferred

It can be built: a Cloud Function (restricted to Super Admin) creates the
account with a generated one-time password, forces a change at first
login, and requires a verified phone number as a second step. This is
more moving parts and strictly weaker than the invite flow, so it is
offered as an option rather than the default.

---

## 4. Security layers

Seven layers. An attacker has to defeat all of them.

**Layer 1 — Discovery.** Unguessable address; a `robots.txt` rule and a
`noindex` tag so the page can never appear in Google; no link to it from
anywhere on the public site.

**Layer 2 — The gate.** The portal is not a plain file. A Cloud Function
serves it and checks for a valid signed session first. No session means
a plain **404 Not Found** — identical to a page that does not exist, so
a stranger cannot even confirm the portal is real. The page HTML never
reaches an unauthenticated visitor.

**Layer 3 — Identity.** Sign-in by phone OTP (or Google with 2-step
verification enabled). The account must also appear on the admin
allowlist — a valid Hawaa customer login is not admin access.

**Layer 4 — Authorization.** The person's role travels inside their login
token, and `firestore.rules` checks it on every single read and write.
Enforced by the database, in Google's data centre, where no browser can
interfere.

**Layer 5 — Data protection.** App Check ensures the database only
answers your real website in a real browser, blocking scripted access
even with valid credentials. The Viewer role receives masked personal
data. Bulk export is limited to Manager and above.

**Layer 6 — Accountability.** Every change — order status, review
approval, admin added or removed — is written to an append-only audit
log: who, what, when. Nobody can edit or delete it, including the Super
Admin. Sessions expire after 8 hours, and the Super Admin can force-log
out every device at once if a phone is lost.

**Layer 7 — Key hygiene.** Once the portal can export CSVs, the
`serviceAccountKey.json` file is deleted from all machines and revoked in
the Firebase console. That file grants unlimited access to everything
with no login required, and removing it is the single largest security
improvement in this plan.

---

## 5. Build phases

Each phase is independently useful and safe to stop at.

**Phase 1 — Foundation.** `admins` collection, the four roles, a Cloud
Function mirroring the role into the login token, `firestore.rules`
rewritten to enforce every row of the table in Section 2, and the audit
log. No visible UI yet; this is the part that actually secures things.

**Phase 2 — The gate.** Session-cookie sign-in, the serving function,
the `hawa-mahal-7k2` route, `robots.txt`. From here the portal is
unreachable and invisible to everyone else.

**Phase 3 — Operations UI.** Order list with filters and status buttons,
order detail with everything needed to pack and ship, review moderation
queue with approve/reject, support ticket inbox, and a summary strip
(orders today, revenue this week, reviews waiting).

**Phase 4 — Team management.** The Team screen: invite by number, assign
role, revoke access, view the audit log.

**Phase 5 — Hardening and handover.** App Check across the site, CSV
export from the browser, delete and revoke the service-account key, 2-step
verification on the Google accounts, and a short written runbook for
adding and removing staff.

---

## 6. What is needed from you

- The mobile number that should be the first **Super Admin**.
- Confirmation of the address `hawaa.in/hawa-mahal-7k2` (or a different
  suffix).
- ~~Confirmation of the sign-in flow.~~ **Decided: invite by phone
  number + OTP.** The username-and-password variant will not be built.
- Later, at Phase 5: turn on 2-step verification for the Google account
  used for admin, and delete the local `serviceAccountKey.json`.

---

## 7. Cost

Nothing here changes the billing picture. Firebase Hosting and Cloud
Functions free allowances are far above what an internal portal uses, and
the portal's database reads replace reads that already happen today in
the Firebase console. App Check, App Check enforcement, audit logging and
the session gate are all free.

The one thing to watch as order volume grows is recalculating revenue by
reading every order on each page load. The dashboard will use Firestore's
count and aggregation queries instead, which stay cheap at any volume.
