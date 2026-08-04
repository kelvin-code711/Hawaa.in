// ========================================
// hawaa.in Cloud Functions
//
// 1) Live CPCB AQI pipeline: refreshAqiData runs every 30 minutes,
//    pulls all CPCB station readings from the official data.gov.in
//    mirror of the CPCB CAAQMS network, aggregates them per city
//    (see ./aqi.js), and stores the snapshot at Firestore doc
//    aqi/latest. The website only ever reads that document, so
//    visitors never hit data.gov.in directly and the last good
//    snapshot survives upstream outages.
//
// 2) Razorpay online payments: createRazorpayOrder recomputes the
//    cart total server-side and opens an order with Razorpay;
//    verifyRazorpayPayment checks the payment signature and only
//    then writes the real `orders` document (see ./razorpay.js).
// ========================================

'use strict';

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const { buildCitySnapshot } = require('./aqi');
const rzp = require('./razorpay');
const adminCore = require('./admin');

admin.initializeApp();

const dataGovApiKey = defineSecret('DATA_GOV_API_KEY');
const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
// Bootstrap only: lets the very first Super Admin claim the empty
// roster. Inert once any admin exists (see redeemAdminInvite).
const bootstrapSuperAdminPhone = defineSecret('BOOTSTRAP_SUPER_ADMIN_PHONE');

// data.gov.in's WAF resets bare programmatic requests; present a
// regular browser profile.
const BROWSER_HEADERS = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    accept: 'application/json, text/plain, */*',
    'accept-language': 'en-IN,en;q=0.9',
    referer: 'https://www.data.gov.in/'
};

const RESOURCE_URL =
    'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';
const PAGE_SIZE = 1000;
const MAX_PAGES = 10; // network is ~450 stations × ~7 pollutants ≈ 3k records
const FETCH_TIMEOUT_MS = 30000;
// Refuse to overwrite a good snapshot with a suspiciously small one
// (partial upstream response, schema change, etc.).
const MIN_CITIES_FOR_WRITE = 50;

async function fetchPage(apiKey, offset) {
    const url = `${RESOURCE_URL}?api-key=${encodeURIComponent(apiKey)}` +
        `&format=json&limit=${PAGE_SIZE}&offset=${offset}`;

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(url, {
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                headers: BROWSER_HEADERS
            });
            if (!res.ok) throw new Error(`data.gov.in HTTP ${res.status}`);
            const body = await res.json();
            if (!Array.isArray(body.records)) {
                throw new Error('data.gov.in response has no records array');
            }
            return body.records;
        } catch (err) {
            lastError = err;
            logger.warn(`AQI page offset=${offset} attempt ${attempt} failed`, err);
            if (attempt < 3) {
                await new Promise((r) => setTimeout(r, 2000 * attempt));
            }
        }
    }
    throw lastError;
}

async function fetchAllRecords(apiKey) {
    const records = [];
    for (let page = 0; page < MAX_PAGES; page++) {
        const batch = await fetchPage(apiKey, page * PAGE_SIZE);
        records.push(...batch);
        if (batch.length < PAGE_SIZE) break;
    }
    return records;
}

async function runRefresh(providedRecords) {
    const records = Array.isArray(providedRecords) && providedRecords.length > 0
        ? providedRecords
        : await fetchAllRecords(dataGovApiKey.value());
    logger.info(`Processing ${records.length} CPCB records` +
        (providedRecords ? ' (delivered by caller)' : ' (fetched)'));

    const snapshot = buildCitySnapshot(records, Date.now());
    if (snapshot.cityCount < MIN_CITIES_FOR_WRITE) {
        // Keep the previous snapshot; a partial write would silently
        // shrink the city list on the website.
        throw new Error(
            `Only ${snapshot.cityCount} cities parsed from ` +
            `${records.length} records — refusing to overwrite aqi/latest`
        );
    }

    await admin.firestore().doc('aqi/latest').set({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sourceUpdate: snapshot.latestSourceUpdateMs,
        cityCount: snapshot.cityCount,
        stationCount: snapshot.stationCount,
        source: 'CPCB via data.gov.in',
        cities: snapshot.cities
    });

    logger.info(
        `Wrote aqi/latest: ${snapshot.cityCount} cities, ` +
        `${snapshot.stationCount} stations`
    );
    return {
        records: records.length,
        cities: snapshot.cityCount,
        stations: snapshot.stationCount
    };
}

exports.refreshAqiData = onSchedule(
    {
        schedule: 'every 30 minutes',
        region: 'asia-south1',
        secrets: [dataGovApiKey],
        timeoutSeconds: 300,
        memory: '256MiB',
        retryCount: 1
    },
    async () => {
        await runRefresh();
    }
);

// Refresh trigger for callers outside Google Cloud. data.gov.in's WAF
// TCP-resets requests from GCP, so the scheduled GitHub Action
// (.github/workflows/refresh-aqi.yml) fetches the records on a GitHub
// runner and POSTs them here as {"records": [...]}; this function
// validates, aggregates, and writes the snapshot. A request without a
// body makes the function fetch data.gov.in itself (works if the WAF
// ever unblocks GCP). Authenticated by presenting the DATA_GOV_API_KEY
// secret value in the x-admin-key header, so no extra secret is needed;
// only the project owner, the GitHub secret store, and this function
// know it.
exports.refreshAqiHttp = onRequest(
    {
        region: 'asia-south1',
        secrets: [dataGovApiKey],
        timeoutSeconds: 300,
        memory: '256MiB',
        // Publicly reachable (user-approved) so the GitHub runner can
        // deliver data; the x-admin-key check below is the auth.
        invoker: 'public'
    },
    async (req, res) => {
        const suppliedKey = req.get('x-admin-key') || req.query.admin_key;
        if (suppliedKey !== dataGovApiKey.value()) {
            res.status(403).send('forbidden');
            return;
        }
        try {
            const provided = req.body && Array.isArray(req.body.records)
                ? req.body.records
                : undefined;
            const summary = await runRefresh(provided);
            res.json({ ok: true, delivered: !!provided, ...summary });
        } catch (err) {
            logger.error('Manual refresh failed', err);
            res.status(500).json({ ok: false, error: String(err && err.message) });
        }
    }
);

// ========================================
// Razorpay online payments
//
// Flow: the cart calls createRazorpayOrder with quantities + address
// (never prices — amounts are recomputed here from the fixed catalog),
// gets back a Razorpay order id, and opens Razorpay Checkout. After
// the shopper pays, the cart calls verifyRazorpayPayment; only a
// valid HMAC signature creates the real `orders` document (via the
// Admin SDK, so firestore.rules stay locked down for prepaid orders).
// The intermediate state lives in `razorpay_orders/{razorpayOrderId}`,
// which no client can read or write.
// ========================================

exports.createRazorpayOrder = onCall(
    {
        region: 'asia-south1',
        secrets: [razorpayKeyId, razorpayKeySecret],
        timeoutSeconds: 30,
        memory: '256MiB',
        cors: true
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign in to pay online.');
        }

        let payload;
        try {
            payload = rzp.validateCheckoutPayload(request.data);
        } catch (err) {
            throw new HttpsError('invalid-argument', err.message);
        }

        const keyId = razorpayKeyId.value().trim();
        const uid = request.auth.uid;

        let order;
        try {
            order = await rzp.createRazorpayOrder(keyId, razorpayKeySecret.value().trim(), {
                amountPaise: payload.amounts.total * 100,
                // Receipt is capped at 40 chars by Razorpay; uid is 28.
                receipt: `web-${uid}`.slice(0, 40),
                notes: { uid, source: 'hawaa.in cart' }
            });
        } catch (err) {
            logger.error('Razorpay order create failed', err);
            throw new HttpsError('unavailable',
                'Could not start the payment. Please try again.');
        }

        const pending = {
            uid,
            qtyPurifierOnetime: payload.qtyPurifierOnetime,
            qtyPurifierSubscribe: payload.qtyPurifierSubscribe,
            qtyFilter: payload.qtyFilter,
            subtotal: payload.amounts.subtotal,
            gst: payload.amounts.gst,
            total: payload.amounts.total,
            address: payload.address,
            status: 'created',
            // Recorded so orders paid with test keys are recognizable.
            keyMode: keyId.startsWith('rzp_test_') ? 'test' : 'live',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (payload.filterInterval) pending.filterInterval = payload.filterInterval;

        await admin.firestore().doc(`razorpay_orders/${order.id}`).set(pending);

        return {
            keyId,
            razorpayOrderId: order.id,
            amount: order.amount,
            currency: order.currency
        };
    }
);

exports.verifyRazorpayPayment = onCall(
    {
        region: 'asia-south1',
        secrets: [razorpayKeySecret],
        timeoutSeconds: 30,
        memory: '256MiB',
        cors: true
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign in to pay online.');
        }
        const data = request.data || {};
        const razorpayOrderId = data.razorpayOrderId;
        const razorpayPaymentId = data.razorpayPaymentId;
        const razorpaySignature = data.razorpaySignature;

        if (!rzp.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId,
            razorpaySignature, razorpayKeySecret.value().trim())) {
            logger.warn('Razorpay signature mismatch', { razorpayOrderId, uid: request.auth.uid });
            throw new HttpsError('permission-denied',
                'Payment could not be verified.');
        }

        const db = admin.firestore();
        const pendingRef = db.doc(`razorpay_orders/${razorpayOrderId}`);
        const orderRef = db.collection('orders').doc();
        const uid = request.auth.uid;

        const orderDocId = await db.runTransaction(async (tx) => {
            const snap = await tx.get(pendingRef);
            if (!snap.exists) {
                throw new HttpsError('not-found', 'Unknown payment order.');
            }
            const pending = snap.data();
            if (pending.uid !== uid) {
                throw new HttpsError('permission-denied', 'This payment belongs to another account.');
            }
            // Retried verification (double-click, flaky network): the
            // order was already written, just return it again.
            if (pending.status === 'paid' && pending.orderDocId) {
                return pending.orderDocId;
            }

            const order = {
                uid,
                qtyPurifierOnetime: pending.qtyPurifierOnetime,
                qtyPurifierSubscribe: pending.qtyPurifierSubscribe,
                qtyFilter: pending.qtyFilter,
                subtotal: pending.subtotal,
                gst: pending.gst,
                total: pending.total,
                address: pending.address,
                paymentMethod: 'razorpay',
                razorpay: {
                    orderId: razorpayOrderId,
                    paymentId: razorpayPaymentId,
                    keyMode: pending.keyMode
                },
                status: 'placed',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (pending.filterInterval) order.filterInterval = pending.filterInterval;

            tx.set(orderRef, order);
            tx.update(pendingRef, {
                status: 'paid',
                paymentId: razorpayPaymentId,
                orderDocId: orderRef.id,
                paidAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return orderRef.id;
        });

        logger.info('Razorpay payment verified', { razorpayOrderId, orderDocId, uid });
        return { orderId: orderDocId };
    }
);

// ========================================
// Admin portal (hawaa.in/hawaa-ops-7k11s)
//
// Access model:
//   admin_invites/{e164Phone} — pending invite created by a Super Admin
//   admins/{uid}              — the live roster; role lives here
//   admin_audit/{autoId}      — append-only record of every change
//
// No client can write any of those three collections (see
// firestore.rules). Every privileged change goes through adminAction
// below, which authorises against the admins document and writes the
// audit entry inside the same transaction — so an action cannot happen
// without leaving a trace, and revoking someone takes effect on their
// very next request rather than whenever their token expires.
// ========================================

// Authorisation for callables. Deliberately reads admins/{uid} rather
// than trusting request.auth.token.role: the custom claim is baked into
// an ID token that stays valid for up to an hour, so a revoked admin
// would keep their powers until it expired. This costs one document
// read and makes revocation immediate.
async function requireAdmin(request, permission) {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Sign in first.');
    }
    const uid = request.auth.uid;
    const snap = await admin.firestore().doc(`admins/${uid}`).get();
    if (!snap.exists) {
        // Same message either way — an ordinary customer probing the
        // portal learns nothing about whether admin accounts exist.
        throw new HttpsError('permission-denied', 'Not authorised.');
    }
    const actor = snap.data();
    if (!adminCore.can(actor.role, permission)) {
        throw new HttpsError('permission-denied', 'Your role cannot do that.');
    }
    return { uid, role: actor.role, name: actor.name, phone: actor.phone };
}

function auditEntry(actor, action, target, details) {
    return {
        actorUid: actor.uid,
        actorRole: actor.role,
        actorPhone: actor.phone || null,
        action,
        target: target || null,
        details: details || {},
        at: admin.firestore.FieldValue.serverTimestamp()
    };
}

async function countSuperAdmins() {
    const agg = await admin.firestore().collection('admins')
        .where('role', '==', 'super_admin').count().get();
    return agg.data().count;
}

// Mirrors the role from admins/{uid} into a custom claim, so
// firestore.rules can gate reads without a document lookup per request.
// On removal or demotion the refresh tokens are revoked, forcing the
// browser to obtain a token that no longer carries the old role.
exports.syncAdminClaims = onDocumentWritten(
    { document: 'admins/{uid}', region: 'asia-south1' },
    async (event) => {
        const uid = event.params.uid;
        const after = event.data && event.data.after;
        const before = event.data && event.data.before;
        const newRole = after && after.exists ? after.data().role : null;
        const oldRole = before && before.exists ? before.data().role : null;
        if (newRole === oldRole) return;

        try {
            await admin.auth().setCustomUserClaims(uid,
                newRole ? { role: newRole } : null);
            // Downgrade or removal must not wait for token expiry.
            const demoted = !newRole ||
                (oldRole && adminCore.rankOf(newRole) < adminCore.rankOf(oldRole));
            if (demoted) {
                await admin.auth().revokeRefreshTokens(uid);
            }
            logger.info('Admin claim synced', { uid, oldRole, newRole, demoted });
        } catch (err) {
            logger.error('Failed to sync admin claim', { uid, newRole, err });
            throw err;
        }
    }
);

// Called by the portal right after sign-in. Turns a pending invite into
// a real admin record. The phone number is taken from the verified ID
// token, never from the request body, so an invite can only be redeemed
// by someone holding that SIM.
exports.redeemAdminInvite = onCall(
    {
        region: 'asia-south1',
        secrets: [bootstrapSuperAdminPhone],
        timeoutSeconds: 30,
        memory: '256MiB',
        cors: true
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign in first.');
        }
        const uid = request.auth.uid;
        const phone = adminCore.normalisePhone(request.auth.token.phone_number);
        if (!phone) {
            throw new HttpsError('failed-precondition',
                'Admin access requires signing in with your mobile number.');
        }

        const db = admin.firestore();
        const adminRef = db.doc(`admins/${uid}`);

        const existing = await adminRef.get();
        if (existing.exists) {
            return { role: existing.data().role, redeemed: false };
        }

        const inviteRef = db.doc(`admin_invites/${phone}`);
        const invite = await inviteRef.get();

        let role;
        let name;
        let source;

        if (invite.exists) {
            role = invite.data().role;
            name = invite.data().name;
            source = 'invite';
        } else {
            // Bootstrap: only while the roster is completely empty, and
            // only for the configured number. Once one admin exists this
            // branch can never run again.
            const roster = await db.collection('admins').limit(1).get();
            const configured = adminCore.normalisePhone(
                (bootstrapSuperAdminPhone.value() || '').trim());
            if (!roster.empty || !configured || configured !== phone) {
                throw new HttpsError('permission-denied', 'Not authorised.');
            }
            role = 'super_admin';
            name = request.auth.token.name || 'Owner';
            source = 'bootstrap';
        }

        if (!adminCore.isRole(role)) {
            throw new HttpsError('failed-precondition', 'That invite has an invalid role.');
        }

        const actor = { uid, role, phone };
        const batch = db.batch();
        batch.set(adminRef, {
            uid,
            phone,
            name,
            role,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        if (invite.exists) batch.delete(inviteRef);
        batch.set(db.collection('admin_audit').doc(),
            auditEntry(actor, 'team.redeem', uid, { role, source }));
        await batch.commit();

        logger.info('Admin invite redeemed', { uid, role, source });
        return { role, redeemed: true };
    }
);

// Every privileged mutation in the portal. One entry point so that
// permission checking and audit logging cannot be forgotten.
exports.adminAction = onCall(
    {
        region: 'asia-south1',
        timeoutSeconds: 30,
        memory: '256MiB',
        cors: true
    },
    async (request) => {
        const data = request.data || {};
        const action = data.action;
        const db = admin.firestore();

        // ---- Orders: advance or cancel ----
        if (action === 'order.setStatus') {
            const actor = await requireAdmin(request, 'orders.updateStatus');
            const orderId = String(data.orderId || '');
            if (!orderId) throw new HttpsError('invalid-argument', 'Missing order.');
            const ref = db.doc(`orders/${orderId}`);

            return db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists) throw new HttpsError('not-found', 'Order not found.');
                const from = snap.data().status;
                let to;
                try {
                    to = adminCore.validateOrderTransition(from, data.status, actor.role);
                } catch (err) {
                    throw new HttpsError('failed-precondition', err.message);
                }
                tx.update(ref, {
                    status: to,
                    statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    statusUpdatedBy: actor.uid
                });
                tx.set(db.collection('admin_audit').doc(),
                    auditEntry(actor, 'order.setStatus', orderId, { from, to }));
                return { orderId, status: to };
            });
        }

        // ---- Reviews: approve or reject ----
        if (action === 'review.moderate') {
            const actor = await requireAdmin(request, 'reviews.moderate');
            const reviewId = String(data.reviewId || '');
            if (!reviewId) throw new HttpsError('invalid-argument', 'Missing review.');
            const ref = db.doc(`reviews/${reviewId}`);

            let decision;
            try {
                decision = adminCore.validateReviewDecision(
                    data.decision, data.verified === true, actor.role);
            } catch (err) {
                throw new HttpsError('failed-precondition', err.message);
            }

            return db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists) throw new HttpsError('not-found', 'Review not found.');
                const from = snap.data().status;
                tx.update(ref, {
                    status: decision.status,
                    verified: decision.verified,
                    moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    moderatedBy: actor.uid
                });
                tx.set(db.collection('admin_audit').doc(),
                    auditEntry(actor, 'review.moderate', reviewId, {
                        from, to: decision.status, verified: decision.verified
                    }));
                return { reviewId, status: decision.status };
            });
        }

        // ---- Team: invite someone by phone number ----
        if (action === 'team.invite') {
            const actor = await requireAdmin(request, 'team.manage');
            let invite;
            try {
                invite = adminCore.validateInvite(data);
                adminCore.assertCanAssign(actor.role, invite.role);
            } catch (err) {
                throw new HttpsError('invalid-argument', err.message);
            }

            const ref = db.doc(`admin_invites/${invite.phone}`);
            const batch = db.batch();
            batch.set(ref, {
                phone: invite.phone,
                name: invite.name,
                role: invite.role,
                invitedBy: actor.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            batch.set(db.collection('admin_audit').doc(),
                auditEntry(actor, 'team.invite', invite.phone,
                    { role: invite.role, name: invite.name }));
            await batch.commit();
            return { phone: invite.phone, role: invite.role };
        }

        // ---- Team: change an existing admin's role ----
        if (action === 'team.setRole') {
            const actor = await requireAdmin(request, 'team.manage');
            const targetUid = String(data.uid || '');
            if (!targetUid) throw new HttpsError('invalid-argument', 'Missing user.');
            try {
                adminCore.assertCanAssign(actor.role, data.role);
            } catch (err) {
                throw new HttpsError('invalid-argument', err.message);
            }

            const ref = db.doc(`admins/${targetUid}`);
            const snap = await ref.get();
            if (!snap.exists) throw new HttpsError('not-found', 'That person is not an admin.');
            const from = snap.data().role;

            if (from === 'super_admin' && data.role !== 'super_admin') {
                try {
                    adminCore.assertNotLastSuperAdmin(targetUid, actor.uid,
                        await countSuperAdmins());
                } catch (err) {
                    throw new HttpsError('failed-precondition', err.message);
                }
            }

            const batch = db.batch();
            batch.update(ref, { role: data.role });
            batch.set(db.collection('admin_audit').doc(),
                auditEntry(actor, 'team.setRole', targetUid, { from, to: data.role }));
            await batch.commit();
            return { uid: targetUid, role: data.role };
        }

        // ---- Team: revoke access ----
        if (action === 'team.revoke') {
            const actor = await requireAdmin(request, 'team.manage');
            const targetUid = String(data.uid || '');
            if (!targetUid) throw new HttpsError('invalid-argument', 'Missing user.');

            const ref = db.doc(`admins/${targetUid}`);
            const snap = await ref.get();
            if (!snap.exists) throw new HttpsError('not-found', 'That person is not an admin.');
            const from = snap.data().role;

            if (from === 'super_admin') {
                try {
                    adminCore.assertNotLastSuperAdmin(targetUid, actor.uid,
                        await countSuperAdmins());
                } catch (err) {
                    throw new HttpsError('failed-precondition', err.message);
                }
            }

            const batch = db.batch();
            batch.delete(ref);
            batch.set(db.collection('admin_audit').doc(),
                auditEntry(actor, 'team.revoke', targetUid, { from }));
            await batch.commit();
            return { uid: targetUid, revoked: true };
        }

        throw new HttpsError('invalid-argument', 'Unknown action.');
    }
);
