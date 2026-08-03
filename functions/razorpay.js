// ========================================
// hawaa.in Cloud Functions — Razorpay helpers
//
// Pure logic for the online-payment flow: server-side price
// recomputation (mirrors firestore.rules / js/cart.js exactly),
// checkout-payload validation, Razorpay Orders API calls, and
// payment-signature verification. Kept free of Firebase imports so
// test/run-tests.js can exercise everything with plain node.
// ========================================

'use strict';

const crypto = require('node:crypto');

// Fixed catalog — MUST stay identical to PRICES / FILTER_PRICE in
// js/cart.js and the isValidNewOrder arithmetic in firestore.rules.
const CATALOG = {
    onetime: 5999,
    subscribe: 5499,
    filter: 1499
};

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';
const FETCH_TIMEOUT_MS = 20000;

// 18% GST, round half-up in pure integer math — same formula as
// gstOf() in js/cart.js and firestore.rules.
function gstOf(subtotal) {
    return Math.floor((subtotal * 18 + 50) / 100);
}

function isValidQty(q) {
    return Number.isInteger(q) && q >= 0 && q <= 10;
}

// Recompute every amount from quantities alone; the client never
// gets to name a price.
function computeAmounts(qtyOnetime, qtySubscribe, qtyFilter) {
    const subtotal =
        qtyOnetime * CATALOG.onetime +
        qtySubscribe * CATALOG.subscribe +
        qtyFilter * CATALOG.filter;
    const gst = gstOf(subtotal);
    return { subtotal, gst, total: subtotal + gst };
}

function isNonEmptyString(v, max) {
    return typeof v === 'string' && v.trim().length >= 1 && v.length <= max;
}

// Mirrors isValidOrderAddress in firestore.rules so admin-written
// razorpay orders keep the same shape/quality as COD orders.
function validateAddress(a) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
    if (!isNonEmptyString(a.name, 100)) return null;
    if (typeof a.phone !== 'string' || !/^\+91[6-9][0-9]{9}$/.test(a.phone)) return null;
    if (!isNonEmptyString(a.line1, 200)) return null;
    if (a.line2 !== undefined && !isNonEmptyString(a.line2, 200)) return null;
    if (!isNonEmptyString(a.city, 100)) return null;
    if (!isNonEmptyString(a.state, 100)) return null;
    if (typeof a.pincode !== 'string' || !/^[1-9][0-9]{5}$/.test(a.pincode)) return null;
    const address = {
        name: a.name.trim(),
        phone: a.phone,
        line1: a.line1.trim(),
        city: a.city.trim(),
        state: a.state.trim(),
        pincode: a.pincode
    };
    if (a.line2 !== undefined) address.line2 = a.line2.trim();
    return address;
}

// Validates the createRazorpayOrder request body. Returns a normalized
// payload or throws an Error whose message is safe to show the client.
function validateCheckoutPayload(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Missing checkout details.');
    }
    const qtyOnetime = data.qtyPurifierOnetime;
    const qtySubscribe = data.qtyPurifierSubscribe;
    const qtyFilter = data.qtyFilter;
    if (!isValidQty(qtyOnetime) || !isValidQty(qtySubscribe) || !isValidQty(qtyFilter)) {
        throw new Error('Invalid item quantities.');
    }
    if (qtyOnetime + qtySubscribe + qtyFilter < 1) {
        throw new Error('The cart is empty.');
    }
    const address = validateAddress(data.address);
    if (!address) {
        throw new Error('Invalid delivery address.');
    }
    const payload = {
        qtyPurifierOnetime: qtyOnetime,
        qtyPurifierSubscribe: qtySubscribe,
        qtyFilter: qtyFilter,
        address,
        amounts: computeAmounts(qtyOnetime, qtySubscribe, qtyFilter)
    };
    if (qtySubscribe > 0 && (data.filterInterval === 5 || data.filterInterval === 6)) {
        payload.filterInterval = data.filterInterval;
    }
    return payload;
}

// Razorpay signs checkout payments as
// HMAC_SHA256(order_id + '|' + payment_id, key_secret).
function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature, keySecret) {
    if (typeof razorpayOrderId !== 'string' || typeof razorpayPaymentId !== 'string' ||
        typeof signature !== 'string' || razorpayOrderId === '' || razorpayPaymentId === '') {
        return false;
    }
    const expected = crypto
        .createHmac('sha256', keySecret)
        .update(razorpayOrderId + '|' + razorpayPaymentId)
        .digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Creates an order on Razorpay (amount in paise). Node 20's global
// fetch; Basic auth with key_id:key_secret.
async function createRazorpayOrder(keyId, keySecret, { amountPaise, receipt, notes }) {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
        method: 'POST',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
            authorization: `Basic ${auth}`,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt,
            notes: notes || {}
        })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.id) {
        const detail = body && body.error && body.error.description;
        throw new Error(`Razorpay order create failed (HTTP ${res.status})` +
            (detail ? `: ${detail}` : ''));
    }
    return body;
}

module.exports = {
    CATALOG,
    gstOf,
    computeAmounts,
    validateAddress,
    validateCheckoutPayload,
    verifyPaymentSignature,
    createRazorpayOrder
};
