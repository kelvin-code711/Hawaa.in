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
const crypto = require('node:crypto');
const admin = require('firebase-admin');

const { buildCitySnapshot } = require('./aqi');
const rzp = require('./razorpay');
const promo = require('./promo');
const adminCore = require('./admin');
const portal = require('./portal');
const csv = require('./csv');

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
// Promo codes — shared machinery
//
// Three collections, none of them client-readable:
//   promo_codes/{CODE}            the definition and its counters
//   promo_redemptions/{CODE}__uid how often one account has used one code
//   promo_rate/{clientKey}        throttling for wrong-code guessing
//
// `promo_codes` is deliberately unreadable even to a signed-in shopper.
// A browsable list of live codes is a discount for anyone who opens
// devtools, so the only way to learn a code is to be told it — or to be
// shown it, if an admin ticked "show in the cart", which publishes just
// that code to promo_public/featured.
//
// firestore.rules forbids a client from writing an order that carries a
// `promo` or `discount` field at all (isValidNewOrder uses hasOnly). A
// discounted order therefore cannot be written from a browser by
// construction: it has to come through placePromoOrder or the Razorpay
// pair below, both of which price the cart here on the server.
// ========================================

// Paths come from promo.js so the reads there and the writes here can
// never point at different documents.
function promoDocRef(db, code) {
    return db.doc(promo.codeDocPath(code));
}

function redemptionDocRef(db, code, uid) {
    return db.doc(promo.redemptionDocPath(code, uid));
}

// What gets stored on the order. A snapshot, not a reference: if the
// code is later edited or deleted, the order still says exactly what was
// given and why.
function promoSnapshot(definition, discount) {
    return {
        code: definition.code,
        type: definition.type,
        value: definition.value,
        discount
    };
}

// Records a redemption against both counters. Call inside the same
// transaction as the order write so a redemption cannot be counted for
// an order that failed to save, or an order saved without being counted.
function commitRedemption(db, tx, code, uid, discount) {
    tx.update(promoDocRef(db, code), {
        redemptions: admin.firestore.FieldValue.increment(1),
        discountGiven: admin.firestore.FieldValue.increment(discount),
        lastRedeemedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    tx.set(redemptionDocRef(db, code, uid), {
        code,
        uid,
        count: admin.firestore.FieldValue.increment(1),
        lastAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

// Guessing codes is the one thing this endpoint makes possible, so only
// a miss costs an attempt: someone re-checking a code they legitimately
// hold — which happens on every cart change — never burns quota.
const PROMO_MISS_MAX = 20;
const PROMO_MISS_WINDOW_MS = 10 * 60 * 1000;

async function allowPromoMiss(key) {
    const ref = admin.firestore().doc(`promo_rate/${key}`);
    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const decision = adminCore.rateLimitNext(
            snap.exists ? snap.data() : null, Date.now(),
            PROMO_MISS_MAX, PROMO_MISS_WINDOW_MS);
        tx.set(ref, {
            count: decision.count,
            windowStart: decision.windowStart,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return decision;
    });
}

// A signed-in shopper is throttled by account; everyone else by a hash
// of their address, so this collection never becomes a log of who tried
// which code from where.
function promoRateKey(request) {
    if (request.auth) return `uid_${request.auth.uid}`;
    const raw = request.rawRequest || {};
    const forwarded = String((raw.headers && raw.headers['x-forwarded-for']) || '')
        .split(',')[0].trim();
    const ip = forwarded || raw.ip || 'unknown';
    return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

// Prices a cart against a code without committing anything. Used by the
// cart drawer on every apply and on every quantity change while a code
// is attached, so it has to be cheap and it has to be exact — the
// numbers it returns are the numbers the shopper sees.
//
// Never throws for a bad code: a refusal is a normal answer with a
// sentence the cart can show. Only a malformed request or a flood of
// wrong guesses is an error.
exports.validatePromoCode = onCall(
    {
        region: 'asia-south1',
        timeoutSeconds: 20,
        memory: '256MiB',
        cors: true
    },
    async (request) => {
        const data = request.data || {};
        let quantities;
        try {
            quantities = rzp.validateQuantities(data);
        } catch (err) {
            throw new HttpsError('invalid-argument', err.message);
        }

        // Echoed back untouched so the cart can discard an answer that
        // arrived after the shopper changed the cart again.
        const cartKey = typeof data.cartKey === 'string' ? data.cartKey.slice(0, 40) : '';
        const code = promo.normaliseCode(data.code);
        const uid = request.auth ? request.auth.uid : null;

        if (!code) {
            const decision = await allowPromoMiss(promoRateKey(request));
            if (!decision.allowed) {
                throw new HttpsError('resource-exhausted',
                    'Too many attempts. Please try again in a few minutes.');
            }
            return {
                ok: false,
                reason: 'not-found',
                message: 'That code is not valid. Check the spelling and try again.',
                cartKey
            };
        }

        const db = admin.firestore();
        const { result } = await promo.evaluateFor(db, null, code, uid, quantities);

        if (!result.ok && result.reason === 'not-found') {
            const decision = await allowPromoMiss(promoRateKey(request));
            if (!decision.allowed) {
                throw new HttpsError('resource-exhausted',
                    'Too many attempts. Please try again in a few minutes.');
            }
        }

        return Object.assign({ cartKey }, result);
    }
);

// Cash on Delivery with a promo code. The plain COD path stays where it
// was — a direct client write validated by firestore.rules — because it
// works and it is audited. This is the discounted twin: same result,
// same order shape, but priced and counted on the server because rules
// cannot check a usage limit atomically.
exports.placePromoOrder = onCall(
    {
        region: 'asia-south1',
        timeoutSeconds: 30,
        memory: '256MiB',
        cors: true
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign in to place an order.');
        }

        let payload;
        try {
            payload = rzp.validateCheckoutPayload(request.data);
        } catch (err) {
            throw new HttpsError('invalid-argument', err.message);
        }

        const code = promo.normaliseCode((request.data || {}).promoCode);
        if (!code) {
            throw new HttpsError('invalid-argument', 'That promo code is not valid.');
        }

        const db = admin.firestore();
        const uid = request.auth.uid;
        const orderRef = db.collection('orders').doc();

        const pricing = await db.runTransaction(async (tx) => {
            const { definition, result } = await promo.evaluateFor(db, tx, code, uid, payload);
            if (!result.ok) {
                // failed-precondition rather than invalid-argument: the
                // request was well formed, the code just cannot be used
                // for this cart right now. The cart shows result.message.
                throw new HttpsError('failed-precondition', result.message);
            }

            const order = {
                uid,
                qtyPurifierOnetime: payload.qtyPurifierOnetime,
                qtyPurifierSubscribe: payload.qtyPurifierSubscribe,
                qtyFilter: payload.qtyFilter,
                subtotal: result.pricing.subtotal,
                discount: result.pricing.discount,
                gst: result.pricing.gst,
                total: result.pricing.total,
                promo: promoSnapshot(definition, result.pricing.discount),
                address: payload.address,
                paymentMethod: 'cod',
                status: 'placed',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (payload.filterInterval) order.filterInterval = payload.filterInterval;

            tx.set(orderRef, order);
            commitRedemption(db, tx, code, uid, result.pricing.discount);
            return result.pricing;
        });

        logger.info('Promo COD order placed', {
            orderId: orderRef.id, code, uid, discount: pricing.discount
        });
        return { orderId: orderRef.id, pricing };
    }
);

// Publishes the codes an admin ticked "show in the cart" to a single
// public document, so the drawer can offer them as one tap instead of
// asking someone to type. Rebuilt only when something a shopper would
// see changes — a redemption counter ticking up rewrites nothing until
// it actually exhausts the code.
const FEATURED_OFFERS_DOC = 'promo_public/featured';
const MAX_FEATURED_OFFERS = 4;

function showcaseSignature(raw) {
    const definition = raw ? promo.normaliseDefinition(raw) : null;
    // A code that is not shown in carts cannot change what is: its
    // redemption counter moves on every order it is used on, and none
    // of those need to touch the published list.
    if (!definition || !definition.showcase) return 'none';
    return [
        promo.statusOf(definition, Date.now()),
        definition.headline,
        definition.minSubtotal,
        definition.appliesTo,
        definition.firstOrderOnly ? 1 : 0,
        definition.expiresAt || 0
    ].join('|');
}

async function rebuildFeaturedOffers() {
    const db = admin.firestore();
    const snap = await db.collection('promo_codes')
        .where('showcase', '==', true).limit(50).get();
    const now = Date.now();

    // Codes that have not started yet are published too, carrying their
    // start time: nothing writes to a promo document when the clock
    // reaches it, so a code scheduled for Monday would otherwise never
    // appear. The cart reveals it on the hour; validatePromoCode still
    // refuses it until then.
    const offers = snap.docs
        .map(function (doc) { return promo.normaliseDefinition(doc.data()); })
        .filter(function (definition) {
            if (!definition) return false;
            const status = promo.statusOf(definition, now);
            return status === 'live' || status === 'scheduled';
        })
        // Easiest to qualify for first: an offer someone can use today
        // is worth more than a bigger one they cannot reach.
        .sort(function (a, b) { return a.minSubtotal - b.minSubtotal; })
        .slice(0, MAX_FEATURED_OFFERS)
        .map(promo.publicOffer);

    await db.doc(FEATURED_OFFERS_DOC).set({
        offers,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return offers.length;
}

exports.syncFeaturedOffers = onDocumentWritten(
    { document: 'promo_codes/{code}', region: 'asia-south1' },
    async (event) => {
        const before = event.data && event.data.before;
        const after = event.data && event.data.after;
        const wasShown = showcaseSignature(before && before.exists ? before.data() : null);
        const isShown = showcaseSignature(after && after.exists ? after.data() : null);
        if (wasShown === isShown) return;

        try {
            const count = await rebuildFeaturedOffers();
            logger.info('Featured offers rebuilt', { code: event.params.code, count });
        } catch (err) {
            // Non-fatal: the cart falls back to the type-a-code field,
            // and every offer is re-validated on apply anyway.
            logger.error('Could not rebuild featured offers', err);
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
        const db = admin.firestore();

        // A promo is priced here, not held here. The redemption is only
        // counted once the payment is verified, so an abandoned checkout
        // never consumes someone else's chance to use the code.
        let amounts = payload.amounts;
        let appliedPromo = null;
        const code = promo.normaliseCode((request.data || {}).promoCode);
        if (code) {
            const { definition, result } = await promo.evaluateFor(db, null, code, uid, payload);
            if (!result.ok) {
                throw new HttpsError('failed-precondition', result.message);
            }
            amounts = result.pricing;
            appliedPromo = promoSnapshot(definition, result.pricing.discount);
        }

        // Razorpay cannot charge nothing. Reachable only with a flat
        // code worth the whole cart, which the admin form already tries
        // to prevent — this is the backstop.
        if (amounts.total < 1) {
            throw new HttpsError('failed-precondition',
                'This order comes to ₹0 — please choose Cash on Delivery.');
        }

        let order;
        try {
            order = await rzp.createRazorpayOrder(keyId, razorpayKeySecret.value().trim(), {
                amountPaise: amounts.total * 100,
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
            subtotal: amounts.subtotal,
            discount: amounts.discount || 0,
            gst: amounts.gst,
            total: amounts.total,
            address: payload.address,
            status: 'created',
            // Recorded so orders paid with test keys are recognizable.
            keyMode: keyId.startsWith('rzp_test_') ? 'test' : 'live',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (payload.filterInterval) pending.filterInterval = payload.filterInterval;
        if (appliedPromo) pending.promo = appliedPromo;

        await db.doc(`razorpay_orders/${order.id}`).set(pending);

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
            // order was already written, just return it again. Returning
            // before any write is also what keeps a retry from counting
            // the promo redemption twice.
            if (pending.status === 'paid' && pending.orderDocId) {
                return pending.orderDocId;
            }

            // All reads must precede the writes below.
            const pendingPromo = pending.promo || null;
            let promoDefinition = null;
            if (pendingPromo && pendingPromo.code) {
                const promoSnap = await tx.get(promoDocRef(db, pendingPromo.code));
                promoDefinition = promoSnap.exists
                    ? promo.normaliseDefinition(promoSnap.data()) : null;
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

            if (pendingPromo) {
                order.discount = pending.discount || 0;
                order.promo = pendingPromo;

                // The money already moved. Two people can reach a
                // gateway holding the last use of a code, and the one
                // who pays second must not be told their payment was
                // wasted — so the cap is allowed to overshoot, the
                // overshoot is recorded on the order, and the portal
                // shows "51 / 50 used" rather than quietly losing it.
                if (promoDefinition) {
                    if (promoDefinition.maxRedemptions &&
                        promoDefinition.redemptions >= promoDefinition.maxRedemptions) {
                        order.promo = Object.assign({}, pendingPromo, { overLimit: true });
                        logger.warn('Promo redeemed past its limit', {
                            code: pendingPromo.code, razorpayOrderId, uid
                        });
                    }
                    commitRedemption(db, tx, pendingPromo.code, uid, order.discount);
                } else {
                    // The code was deleted between paying and verifying.
                    // Honour the price that was charged; there is no
                    // counter left to increment.
                    logger.warn('Promo code vanished before verification', {
                        code: pendingPromo.code, razorpayOrderId, uid
                    });
                }
            }

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

// Resolves who somebody is on the admin roster, redeeming a pending
// invite the first time they appear. The phone number always comes from
// the verified token, never from a request body, so an invite can only
// be redeemed by whoever holds that SIM.
//
// Returns null when the caller has no claim to admin access — callers
// translate that into a deliberately uninformative response.
// Requires the bootstrapSuperAdminPhone secret to be bound.
// Writes the role into the account's custom claim so firestore.rules can
// gate reads without a document lookup. Deliberately does NOT revoke
// refresh tokens: this runs during sign-in, and revoking would invalidate
// the very token about to be exchanged for a session cookie. Revocation
// on demotion is handled by syncAdminClaims and the team.* actions.
async function syncRoleClaim(uid, role) {
    try {
        const user = await admin.auth().getUser(uid);
        const current = (user.customClaims && user.customClaims.role) || null;
        if (current === role) return;
        await admin.auth().setCustomUserClaims(uid, role ? { role } : null);
        logger.info('Role claim synced at sign-in', { uid, from: current, to: role });
    } catch (err) {
        // Non-fatal: the portal authorises from the roster document, so a
        // failed claim sync costs Firestore reads, not access control.
        logger.error('Could not sync role claim', { uid, role, err });
    }
}

async function resolveOrRedeemAdmin(uid, tokenPhone, fallbackName) {
    const phone = adminCore.normalisePhone(tokenPhone);
    if (!phone) return null;

    const db = admin.firestore();
    const adminRef = db.doc(`admins/${uid}`);

    const existing = await adminRef.get();
    if (existing.exists) {
        const current = existing.data();
        // Repairs drift if the roster was edited outside the portal.
        await syncRoleClaim(uid, current.role);
        return { role: current.role, name: current.name, phone, redeemed: false };
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
        // Bootstrap: only while the roster is completely empty, and only
        // for the configured number. Once one admin exists this branch
        // can never run again, which makes a leaked secret inert.
        const roster = await db.collection('admins').limit(1).get();
        const configured = adminCore.normalisePhone(
            (bootstrapSuperAdminPhone.value() || '').trim());
        if (!roster.empty || !configured || configured !== phone) return null;
        role = 'super_admin';
        name = fallbackName || 'Owner';
        source = 'bootstrap';
    }

    if (!adminCore.isRole(role)) {
        logger.error('Invite carries an invalid role', { uid, phone, role });
        return null;
    }

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
        auditEntry({ uid, role, phone }, 'team.redeem', uid, { role, source }));
    await batch.commit();

    // Set the claim here as well as via syncAdminClaims: the trigger is
    // asynchronous, and the browser is about to load the portal and read
    // Firestore under these rules. Waiting for the trigger would show a
    // brand-new admin a permission error on their first page load.
    await syncRoleClaim(uid, role);

    logger.info('Admin invite redeemed', { uid, role, source });
    return { role, name, phone, redeemed: true };
}

// Exposed for the portal's own use and for any future non-cookie client.
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
        const resolved = await resolveOrRedeemAdmin(
            request.auth.uid,
            request.auth.token.phone_number,
            request.auth.token.name
        );
        if (!resolved) {
            throw new HttpsError('permission-denied', 'Not authorised.');
        }
        return { role: resolved.role, redeemed: resolved.redeemed };
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

        // ---- Promos: create a code ----
        if (action === 'promo.create') {
            const actor = await requireAdmin(request, 'promos.manage');
            let definition;
            try {
                definition = promo.validateDefinitionInput(data);
            } catch (err) {
                throw new HttpsError('invalid-argument', err.message);
            }

            const ref = promoDocRef(db, definition.code);
            await db.runTransaction(async (tx) => {
                const existing = await tx.get(ref);
                // Reusing a code silently would attach new terms to the
                // history of the old one.
                if (existing.exists) {
                    throw new HttpsError('already-exists',
                        `${definition.code} already exists. Pick a different code.`);
                }
                tx.set(ref, Object.assign({}, definition, {
                    startsAt: definition.startsAt
                        ? admin.firestore.Timestamp.fromMillis(definition.startsAt) : null,
                    expiresAt: definition.expiresAt
                        ? admin.firestore.Timestamp.fromMillis(definition.expiresAt) : null,
                    redemptions: 0,
                    discountGiven: 0,
                    createdBy: actor.uid,
                    createdByName: actor.name || '',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                }));
                tx.set(db.collection('admin_audit').doc(),
                    auditEntry(actor, 'promo.create', definition.code, {
                        type: definition.type,
                        value: definition.value,
                        maxRedemptions: definition.maxRedemptions || null,
                        showcase: definition.showcase
                    }));
            });
            return { code: definition.code };
        }

        // ---- Promos: pause, resume, retune, end ----
        if (action === 'promo.update') {
            const actor = await requireAdmin(request, 'promos.manage');
            const code = promo.normaliseCode(data.code);
            if (!code) throw new HttpsError('invalid-argument', 'Missing code.');
            const ref = promoDocRef(db, code);

            return db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists) throw new HttpsError('not-found', 'That code does not exist.');
                const current = promo.normaliseDefinition(snap.data());

                let patch;
                try {
                    patch = promo.validateUpdateInput(current, data.changes);
                } catch (err) {
                    throw new HttpsError('failed-precondition', err.message);
                }

                const write = Object.assign({}, patch, {
                    updatedBy: actor.uid,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                if ('expiresAt' in patch) {
                    write.expiresAt = patch.expiresAt
                        ? admin.firestore.Timestamp.fromMillis(patch.expiresAt) : null;
                }
                tx.update(ref, write);
                tx.set(db.collection('admin_audit').doc(),
                    auditEntry(actor, 'promo.update', code, patch));
                return { code, changed: Object.keys(patch) };
            });
        }

        // ---- Promos: delete a code nobody has used ----
        if (action === 'promo.delete') {
            const actor = await requireAdmin(request, 'promos.manage');
            const code = promo.normaliseCode(data.code);
            if (!code) throw new HttpsError('invalid-argument', 'Missing code.');
            const ref = promoDocRef(db, code);

            return db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists) throw new HttpsError('not-found', 'That code does not exist.');
                // A used code is part of the order history. Deleting it
                // would leave orders pointing at a discount nobody can
                // explain, so a used code can only ever be ended.
                if ((Number(snap.data().redemptions) || 0) > 0) {
                    throw new HttpsError('failed-precondition',
                        `${code} has already been used, so it cannot be deleted. ` +
                        'Pause or end it instead — the orders that used it stay readable.');
                }
                tx.delete(ref);
                tx.set(db.collection('admin_audit').doc(),
                    auditEntry(actor, 'promo.delete', code, {}));
                return { code, deleted: true };
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

// Every read the portal performs. Routed through one callable rather
// than read straight from Firestore in the browser so that PII masking
// happens in exactly one place — a Viewer's masked order is built on the
// server and the unmasked fields never leave it. firestore.rules still
// gate direct access as a second line of defence.
function timestampToMs(value) {
    if (!value) return null;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (value instanceof Date) return value.getTime();
    return null;
}

function orderToPlain(doc) {
    const data = doc.data();
    return {
        id: doc.id,
        qtyPurifierOnetime: data.qtyPurifierOnetime || 0,
        qtyPurifierSubscribe: data.qtyPurifierSubscribe || 0,
        qtyFilter: data.qtyFilter || 0,
        filterInterval: data.filterInterval || null,
        subtotal: data.subtotal || 0,
        discount: data.discount || 0,
        promo: data.promo || null,
        gst: data.gst || 0,
        total: data.total || 0,
        address: data.address || {},
        paymentMethod: data.paymentMethod || 'cod',
        razorpay: data.razorpay || null,
        status: data.status || 'placed',
        createdAt: timestampToMs(data.createdAt),
        createdAtMs: timestampToMs(data.createdAt)
    };
}

const QUERY_LIMIT_DEFAULT = 50;
const QUERY_LIMIT_MAX = 200;

// Collections the portal may export. An allowlist, not a denylist: the
// project shares a Firebase project with the device backend, whose
// `users` and `device_owners` collections must never be reachable from
// the website's admin surface.
const EXPORTABLE = ['orders', 'supportTickets', 'newsletterSubscribers', 'reviews',
    'promo_codes'];

// A callable response is capped at 10 MB. This keeps the largest
// plausible export well inside that and bounds the read cost of a
// misclick; `capped` in the response tells the portal to say so.
const EXPORT_ROW_CAP = 5000;

function boundedLimit(value) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n <= 0) return QUERY_LIMIT_DEFAULT;
    return Math.min(n, QUERY_LIMIT_MAX);
}

exports.adminQuery = onCall(
    {
        region: 'asia-south1',
        timeoutSeconds: 60,
        memory: '256MiB',
        cors: true
    },
    async (request) => {
        const data = request.data || {};
        const resource = data.resource;
        const db = admin.firestore();

        if (resource === 'summary') {
            const actor = await requireAdmin(request, 'dashboard');
            // Thirty days is enough for "today" and "this week" and keeps
            // the read count flat as the order history grows.
            const since = new Date(Date.now() - (30 * 86400000));
            const snap = await db.collection('orders')
                .where('createdAt', '>=', since)
                .orderBy('createdAt', 'desc')
                .limit(1000)
                .get();

            const summary = adminCore.summariseOrders(
                snap.docs.map(function (doc) {
                    const d = doc.data();
                    return {
                        total: d.total,
                        discount: d.discount || 0,
                        status: d.status,
                        createdAtMs: timestampToMs(d.createdAt)
                    };
                }),
                Date.now()
            );

            if (adminCore.can(actor.role, 'reviews.moderate')) {
                const pending = await db.collection('reviews')
                    .where('status', '==', 'pending').count().get();
                summary.pendingReviews = pending.data().count;
            }
            return summary;
        }

        if (resource === 'orders') {
            const actor = await requireAdmin(request, 'orders.read');
            const snap = await db.collection('orders')
                .orderBy('createdAt', 'desc')
                .limit(boundedLimit(data.limit))
                .get();

            let orders = snap.docs.map(orderToPlain);
            if (typeof data.status === 'string' && data.status) {
                orders = orders.filter(function (o) { return o.status === data.status; });
            }
            return {
                orders: orders.map(function (order) {
                    const projected = adminCore.projectOrder(order, actor.role);
                    projected.id = order.id;
                    return projected;
                }),
                masked: !adminCore.can(actor.role, 'orders.readPii')
            };
        }

        if (resource === 'reviews') {
            const actor = await requireAdmin(request, 'reviews.read');
            const status = typeof data.status === 'string' && data.status
                ? data.status : 'pending';
            const snap = await db.collection('reviews')
                .where('status', '==', status)
                .limit(boundedLimit(data.limit))
                .get();

            const reviews = snap.docs.map(function (doc) {
                const d = doc.data();
                return {
                    id: doc.id,
                    name: d.name || '',
                    rating: d.rating || 0,
                    title: d.title || '',
                    content: d.content || '',
                    status: d.status,
                    verified: d.verified === true,
                    helpful: d.helpful || 0,
                    createdAt: timestampToMs(d.createdAt)
                };
            });
            reviews.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
            return { reviews };
        }

        if (resource === 'promos') {
            const actor = await requireAdmin(request, 'promos.read');
            const snap = await db.collection('promo_codes').limit(200).get();
            const now = Date.now();
            const promos = snap.docs
                .map(function (doc) { return promo.normaliseDefinition(doc.data()); })
                .filter(Boolean)
                .map(function (definition) {
                    return Object.assign({}, definition, {
                        status: promo.statusOf(definition, now),
                        summary: promo.describe(definition)
                    });
                });

            // Whatever needs attention first: live codes, then the ones
            // waiting to start, then everything already finished.
            const rank = { live: 0, scheduled: 1, paused: 2, claimed: 3, expired: 4 };
            promos.sort(function (a, b) {
                if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
                return a.code.localeCompare(b.code);
            });
            return { promos, canManage: adminCore.can(actor.role, 'promos.manage') };
        }

        if (resource === 'tickets') {
            await requireAdmin(request, 'tickets.read');
            const snap = await db.collection('supportTickets')
                .orderBy('createdAt', 'desc')
                .limit(boundedLimit(data.limit))
                .get();
            return {
                tickets: snap.docs.map(function (doc) {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        name: d.name || '',
                        email: d.email || '',
                        message: d.message || '',
                        page: d.page || '',
                        createdAt: timestampToMs(d.createdAt)
                    };
                })
            };
        }

        if (resource === 'team') {
            await requireAdmin(request, 'team.manage');
            const [roster, invites] = await Promise.all([
                db.collection('admins').limit(100).get(),
                db.collection('admin_invites').limit(100).get()
            ]);
            return {
                members: roster.docs.map(function (doc) {
                    const d = doc.data();
                    return {
                        uid: doc.id,
                        name: d.name || '',
                        phone: d.phone || '',
                        role: d.role,
                        createdAt: timestampToMs(d.createdAt)
                    };
                }),
                invites: invites.docs.map(function (doc) {
                    const d = doc.data();
                    return {
                        phone: doc.id,
                        name: d.name || '',
                        role: d.role,
                        createdAt: timestampToMs(d.createdAt)
                    };
                })
            };
        }

        if (resource === 'export') {
            const actor = await requireAdmin(request, 'export');
            const collection = String(data.collection || 'orders');
            if (EXPORTABLE.indexOf(collection) === -1) {
                throw new HttpsError('invalid-argument', 'That collection cannot be exported.');
            }

            const snap = await db.collection(collection)
                .limit(EXPORT_ROW_CAP).get();
            if (snap.empty) return { collection, rows: 0, csv: '' };

            const idField = collection === 'orders' ? 'orderId' : 'docId';
            const rows = csv.sortNewestFirst(snap.docs.map(function (doc) {
                const flat = csv.flatten(doc.data());
                const row = {};
                row[idField] = doc.id;
                return Object.assign(row, flat);
            }));

            // A bulk PII download is exactly the kind of action the log
            // exists for, so record it before handing the file over.
            await db.collection('admin_audit').doc().set(
                auditEntry(actor, 'data.export', collection, { rows: rows.length }));

            logger.info('Admin CSV export', {
                uid: actor.uid, collection, rows: rows.length
            });
            return {
                collection,
                rows: rows.length,
                capped: rows.length >= EXPORT_ROW_CAP,
                csv: csv.toCsv(rows, csv.buildColumns(collection, rows))
            };
        }

        if (resource === 'audit') {
            await requireAdmin(request, 'audit.read');
            const snap = await db.collection('admin_audit')
                .orderBy('at', 'desc')
                .limit(boundedLimit(data.limit))
                .get();
            return {
                entries: snap.docs.map(function (doc) {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        actorUid: d.actorUid,
                        actorRole: d.actorRole,
                        actorPhone: d.actorPhone || '',
                        action: d.action,
                        target: d.target || '',
                        details: d.details || {},
                        at: timestampToMs(d.at)
                    };
                })
            };
        }

        throw new HttpsError('invalid-argument', 'Unknown resource.');
    }
);

// ========================================
// The gate — serves hawaa.in/hawaa-ops-7k11s
//
// Firebase Hosting rewrites the portal path here instead of serving a
// static file, so the operations HTML only ever leaves this function
// after a session has been verified AND the roster re-checked.
//
// Three outcomes, chosen so a stranger learns as little as possible:
//   no session          -> an anonymous sign-in form
//   session, no role    -> 404, identical to a URL that does not exist
//   session with a role -> the portal
//
// A signed-in Hawaa *customer* who guesses the URL therefore sees a 404,
// not a hint that they found something real.
// ========================================

function applySecurityHeaders(res) {
    Object.keys(portal.SECURITY_HEADERS).forEach(function (key) {
        res.set(key, portal.SECURITY_HEADERS[key]);
    });
}

function sendNotFound(res) {
    applySecurityHeaders(res);
    res.status(404).type('text/html')
        .send('<!doctype html><meta charset="utf-8"><title>Not Found</title>Not Found');
}

function sendLoginPage(res) {
    applySecurityHeaders(res);
    res.status(200).type('text/html').send(portal.loginPageHtml());
}

// Sign-in pre-check limits. Deliberately tight: a real person types one
// number, occasionally two. Anything beyond that is probing.
const PRECHECK_MAX = 5;
const PRECHECK_WINDOW_MS = 15 * 60 * 1000;

// Hashed so the rate-limit collection never becomes a log of who visited
// the portal from where.
function clientKey(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = forwarded || req.ip || 'unknown';
    return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

async function allowPrecheck(req) {
    const ref = admin.firestore().doc(`admin_rate/${clientKey(req)}`);
    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const decision = adminCore.rateLimitNext(
            snap.exists ? snap.data() : null, Date.now(),
            PRECHECK_MAX, PRECHECK_WINDOW_MS);
        tx.set(ref, {
            count: decision.count,
            windowStart: decision.windowStart,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return decision;
    });
}

// Is this number allowed to receive an OTP at all? Called before the
// browser asks Firebase to send an SMS, so a number that was never
// invited never triggers a message — no cost, no confusing code arriving
// on a stranger's phone.
//
// This necessarily answers "does this number have access?", which is an
// enumeration oracle. The rate limit above is what keeps that from being
// usable at scale, and App Check (once enabled) is what stops the SMS
// being requested from outside this page entirely.
async function phoneMayReceiveOtp(phone) {
    const db = admin.firestore();
    const invite = await db.doc(`admin_invites/${phone}`).get();
    if (invite.exists) return true;
    const roster = await db.collection('admins')
        .where('phone', '==', phone).limit(1).get();
    return !roster.empty;
}

exports.adminPortal = onRequest(
    {
        region: 'asia-south1',
        secrets: [bootstrapSuperAdminPhone],
        timeoutSeconds: 30,
        memory: '256MiB',
        // Reachable so Hosting can forward to it; the cookie check below
        // is the actual authentication.
        invoker: 'public'
    },
    async (req, res) => {
        const base = portal.PORTAL_PATH;
        const rawPath = (req.path || '/').replace(/\/+$/, '') || '/';

        let sub;
        if (rawPath === base) sub = '/';
        else if (rawPath.indexOf(base + '/') === 0) sub = rawPath.slice(base.length);
        else return sendNotFound(res);

        // ---- Is this number allowed an OTP? ----
        if (sub === '/precheck' && req.method === 'POST') {
            applySecurityHeaders(res);

            const decision = await allowPrecheck(req);
            if (!decision.allowed) {
                return res.status(429).json({
                    error: 'too many attempts',
                    retryAfterMs: decision.retryAfterMs
                });
            }

            const phone = adminCore.normalisePhone(req.body && req.body.phone);
            if (!phone) return res.status(400).json({ error: 'bad number' });

            if (!(await phoneMayReceiveOtp(phone))) {
                logger.info('OTP refused for unlisted number');
                return res.status(404).json({ error: 'not listed' });
            }
            return res.status(200).json({ ok: true });
        }

        // ---- Exchange a verified ID token for the session cookie ----
        if (sub === '/session' && req.method === 'POST') {
            const idToken = req.body && req.body.idToken;
            if (typeof idToken !== 'string' || idToken.length === 0) {
                applySecurityHeaders(res);
                return res.status(400).json({ error: 'missing token' });
            }

            let decoded;
            try {
                decoded = await admin.auth().verifyIdToken(idToken, true);
            } catch (err) {
                applySecurityHeaders(res);
                return res.status(401).json({ error: 'invalid token' });
            }

            // Only mint a long-lived cookie from a *fresh* sign-in, so an
            // ID token captured earlier cannot be traded for one later.
            if ((Date.now() / 1000) - decoded.auth_time > 5 * 60) {
                applySecurityHeaders(res);
                return res.status(401).json({ error: 'stale sign-in' });
            }

            const resolved = await resolveOrRedeemAdmin(
                decoded.uid, decoded.phone_number, decoded.name);
            if (!resolved) {
                logger.warn('Portal sign-in refused', { uid: decoded.uid });
                applySecurityHeaders(res);
                return res.status(404).json({ error: 'not found' });
            }

            let cookie;
            try {
                cookie = await admin.auth().createSessionCookie(idToken, {
                    expiresIn: portal.SESSION_MAX_AGE_MS
                });
            } catch (err) {
                logger.error('Session cookie creation failed', err);
                applySecurityHeaders(res);
                return res.status(500).json({ error: 'session failed' });
            }

            applySecurityHeaders(res);
            res.set('Set-Cookie',
                portal.buildSessionCookie(cookie, portal.SESSION_MAX_AGE_MS));
            logger.info('Portal session opened', { uid: decoded.uid, role: resolved.role });
            return res.status(200).json({ ok: true });
        }

        // ---- Sign out: clear the cookie and kill every other session ----
        if (sub === '/logout' && req.method === 'POST') {
            const existing = portal.sessionCookieFrom(req.headers.cookie);
            if (existing) {
                try {
                    const decoded = await admin.auth().verifySessionCookie(existing);
                    // Signs the account out everywhere, not just this
                    // browser — the safer default on a shared machine.
                    await admin.auth().revokeRefreshTokens(decoded.sub);
                } catch (err) { /* already invalid; just clear it */ }
            }
            applySecurityHeaders(res);
            res.set('Set-Cookie', portal.clearedSessionCookie());
            return res.redirect(303, base);
        }

        if (sub !== '/' || req.method !== 'GET') return sendNotFound(res);

        // ---- Serve the portal ----
        const cookie = portal.sessionCookieFrom(req.headers.cookie);
        if (!cookie) return sendLoginPage(res);

        let decoded;
        try {
            // checkRevoked: a demoted or signed-out admin's session dies
            // immediately rather than lasting until the cookie expires.
            decoded = await admin.auth().verifySessionCookie(cookie, true);
        } catch (err) {
            res.set('Set-Cookie', portal.clearedSessionCookie());
            return sendLoginPage(res);
        }

        // Re-check the roster on every page load: revoking access must
        // not wait for a cookie to expire.
        const snap = await admin.firestore().doc(`admins/${decoded.uid}`).get();
        if (!snap.exists) {
            res.set('Set-Cookie', portal.clearedSessionCookie());
            return sendNotFound(res);
        }

        const member = snap.data();
        applySecurityHeaders(res);
        return res.status(200).type('text/html').send(
            portal.portalShellHtml(member,
                adminCore.PERMISSIONS[member.role] || [], rzp.CATALOG));
    }
);
