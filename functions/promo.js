// ========================================
// hawaa.in Cloud Functions — promo codes
//
// Everything a discount needs to be decided: code normalisation,
// validation of an admin's new code, and evaluation of a code against a
// specific cart and shopper. Kept free of Firebase imports so
// test/run-tests.js can exercise all of it with plain node — Firestore
// Timestamps are converted to milliseconds at the boundary, never
// handled in here.
//
// The one rule this file exists to protect: **the browser never names a
// discount.** The cart sends a code and its quantities; every rupee
// comes back from here. That is why js/cart.js has no discount
// arithmetic at all — unlike prices and GST, which are mirrored in three
// places, the discount has exactly one implementation and cannot drift.
//
// GST is charged on the discounted value, not the list value: a discount
// shown on the invoice at the time of supply is excluded from the value
// of supply under s.15(3)(a) CGST Act. So the order of operations is
// subtotal -> discount -> GST on the remainder -> total, and never
// GST on the full subtotal.
// ========================================

'use strict';

// Catalog and GST come from razorpay.js so there is one definition of
// what a purifier costs and one definition of how GST rounds.
const { CATALOG, gstOf } = require('./razorpay');

// Typed by a human on a phone keyboard, printed on packaging, read out
// over the phone. Uppercase, no spaces, no characters that look like
// each other in a sans-serif face when handwritten.
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,19}$/;

// A 100%-off code would produce a zero-rupee order that no payment
// gateway will accept and that no one intends to create. 90 is high
// enough for any real promotion and low enough to catch a typo.
const MAX_PERCENT = 90;
const MAX_FLAT = 100000;

const APPLIES_TO = ['all', 'purifier', 'filter'];

const APPLIES_TO_LABEL = {
    all: 'everything in the cart',
    purifier: 'purifiers only',
    filter: 'replacement filters only'
};

// ---- Formatting helpers (used in the messages shoppers read) ----

function rupees(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

const IST_OFFSET_MS = ((5 * 60) + 30) * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "12 Aug 2026", in IST — the only timezone this shop trades in.
function shortDate(ms) {
    const d = new Date(ms + IST_OFFSET_MS);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ---- Code normalisation ----

// Returns the canonical form (which is also the Firestore document ID),
// or null if it could never be a code. Accepts the shapes people
// actually type: lowercase, padded, "first 10" with a stray space.
function normaliseCode(raw) {
    if (typeof raw !== 'string') return null;
    const code = raw.replace(/\s+/g, '').toUpperCase();
    return CODE_PATTERN.test(code) ? code : null;
}

// ---- Cart arithmetic ----

function lineTotals(q) {
    const onetime = (q && q.qtyPurifierOnetime) || 0;
    const subscribe = (q && q.qtyPurifierSubscribe) || 0;
    const filter = (q && q.qtyFilter) || 0;
    return {
        purifier: (onetime * CATALOG.onetime) + (subscribe * CATALOG.subscribe),
        filter: filter * CATALOG.filter
    };
}

// The part of the cart a code is allowed to discount. A filter-only code
// on a purifier-only cart has nothing to work on, which is a friendlier
// failure than silently discounting nothing.
function eligibleSubtotal(quantities, appliesTo) {
    const lines = lineTotals(quantities);
    if (appliesTo === 'purifier') return lines.purifier;
    if (appliesTo === 'filter') return lines.filter;
    return lines.purifier + lines.filter;
}

function cartSubtotal(quantities) {
    return eligibleSubtotal(quantities, 'all');
}

// Percentages round half-up in integer arithmetic, the same way gstOf()
// does — float maths on money is how a total ends up a rupee apart from
// the total someone else computed.
function discountFor(definition, eligible) {
    if (eligible <= 0) return 0;
    let amount;
    if (definition.type === 'percent') {
        amount = Math.floor(((eligible * definition.value) + 50) / 100);
        if (definition.maxDiscount) {
            amount = Math.min(amount, definition.maxDiscount);
        }
    } else {
        amount = definition.value;
    }
    // Never more than the lines it applies to: a ₹2000-off code on a
    // ₹1499 filter takes the filter to zero, not the purifier with it.
    return Math.max(0, Math.min(amount, eligible));
}

// The full money picture for a cart. `discount` of 0 reproduces exactly
// the arithmetic in firestore.rules and js/cart.js, so an undiscounted
// order priced through here is identical to one priced without promos.
function priceCart(quantities, discount) {
    const subtotal = cartSubtotal(quantities);
    const applied = Math.max(0, Math.min(discount || 0, subtotal));
    const taxable = subtotal - applied;
    const gst = gstOf(taxable);
    return {
        subtotal,
        discount: applied,
        taxable,
        gst,
        total: taxable + gst
    };
}

// ---- Reading a stored code ----

// Firestore Timestamp -> ms, tolerated in every shape it arrives in
// (Admin SDK Timestamp, a plain {_seconds}, a Date, or already a number).
function toMillis(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value._seconds === 'number') return value._seconds * 1000;
    return null;
}

// Turns a stored document into the plain shape evaluate() expects.
// Every optional field gets an explicit default so a code written by an
// older version of the portal still evaluates predictably.
function normaliseDefinition(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const code = normaliseCode(raw.code);
    if (!code) return null;
    const type = raw.type === 'flat' ? 'flat' : 'percent';
    return {
        code,
        label: typeof raw.label === 'string' ? raw.label : '',
        headline: typeof raw.headline === 'string' ? raw.headline : '',
        type,
        value: Number(raw.value) || 0,
        maxDiscount: Number(raw.maxDiscount) || 0,
        minSubtotal: Number(raw.minSubtotal) || 0,
        appliesTo: APPLIES_TO.indexOf(raw.appliesTo) === -1 ? 'all' : raw.appliesTo,
        startsAt: toMillis(raw.startsAt),
        expiresAt: toMillis(raw.expiresAt),
        maxRedemptions: Number(raw.maxRedemptions) || 0,
        perUserLimit: Number(raw.perUserLimit) > 0 ? Number(raw.perUserLimit) : 1,
        firstOrderOnly: raw.firstOrderOnly === true,
        showcase: raw.showcase === true,
        active: raw.active === true,
        redemptions: Number(raw.redemptions) || 0,
        discountGiven: Number(raw.discountGiven) || 0
    };
}

// One line of plain English describing what a code does. Used in the
// portal list, in the cart when a code is applied, and as the fallback
// headline for a showcased code the admin did not write copy for.
function describe(definition) {
    const parts = [];
    parts.push(definition.type === 'percent'
        ? `${definition.value}% off` + (definition.maxDiscount
            ? ` (up to ${rupees(definition.maxDiscount)})` : '')
        : `${rupees(definition.value)} off`);
    if (definition.appliesTo !== 'all') {
        parts.push(APPLIES_TO_LABEL[definition.appliesTo]);
    }
    if (definition.minSubtotal > 0) {
        parts.push(`on orders over ${rupees(definition.minSubtotal)}`);
    }
    if (definition.firstOrderOnly) parts.push('first order only');
    return parts.join(' · ');
}

// ---- Evaluation ----
//
// Every refusal carries a machine `reason` and a sentence written for
// the shopper. The cart decides behaviour from the reason (a cart that
// dipped below the minimum keeps the code attached so re-adding an item
// restores it; a code that does not exist is discarded) and shows the
// sentence verbatim — so the wording lives here, once, next to the rule
// that produced it.

function refuse(reason, message, extra) {
    return Object.assign({ ok: false, reason, message }, extra || {});
}

// ctx:
//   quantities      { qtyPurifierOnetime, qtyPurifierSubscribe, qtyFilter }
//   nowMs           evaluation time
//   authed          is a signed-in shopper asking?
//   userRedemptions how many times this account has already used it
//   hasPriorOrders  does this account have any order at all?
//
// When `authed` is false the per-account rules cannot be answered, so
// they are skipped and named in `deferred`. The cart shows the offer
// with a note; the order path re-runs this with authed=true and is the
// check that actually binds.
function evaluate(definition, ctx) {
    const context = ctx || {};
    const now = typeof context.nowMs === 'number' ? context.nowMs : Date.now();
    const quantities = context.quantities || {};
    const deferred = [];

    if (!definition) {
        return refuse('not-found',
            'That code is not valid. Check the spelling and try again.');
    }
    if (!definition.active) {
        return refuse('inactive', `${definition.code} is no longer available.`);
    }
    if (definition.startsAt && now < definition.startsAt) {
        return refuse('not-started',
            `${definition.code} starts on ${shortDate(definition.startsAt)}.`);
    }
    if (definition.expiresAt && now >= definition.expiresAt) {
        return refuse('expired',
            `${definition.code} expired on ${shortDate(definition.expiresAt)}.`);
    }
    if (definition.maxRedemptions &&
        definition.redemptions >= definition.maxRedemptions) {
        return refuse('exhausted', `${definition.code} has been fully claimed.`);
    }

    if (definition.firstOrderOnly) {
        if (!context.authed) {
            deferred.push('first-order');
        } else if (context.hasPriorOrders) {
            return refuse('not-first-order',
                `${definition.code} is for first orders only.`);
        }
    }

    if (!context.authed) {
        deferred.push('per-customer');
    } else if ((context.userRedemptions || 0) >= definition.perUserLimit) {
        return refuse('user-limit', definition.perUserLimit === 1
            ? `You have already used ${definition.code}.`
            : `You have used ${definition.code} the maximum number of times.`);
    }

    const subtotal = cartSubtotal(quantities);
    if (subtotal <= 0) {
        return refuse('empty-cart', 'Add something to your cart first.');
    }
    if (definition.minSubtotal && subtotal < definition.minSubtotal) {
        const shortfall = definition.minSubtotal - subtotal;
        return refuse('below-minimum',
            `Add ${rupees(shortfall)} more to use ${definition.code}.`,
            { shortfall });
    }

    const eligible = eligibleSubtotal(quantities, definition.appliesTo);
    const discount = discountFor(definition, eligible);
    if (discount <= 0) {
        return refuse('not-applicable',
            `${definition.code} applies to ${APPLIES_TO_LABEL[definition.appliesTo]}.`);
    }

    return {
        ok: true,
        code: definition.code,
        headline: definition.headline || describe(definition),
        discount,
        pricing: priceCart(quantities, discount),
        deferred
    };
}

// ---- Admin input validation ----
//
// The portal's create form. Every message is written to be read by
// whoever is running a promotion, not by a developer.

function asPositiveInt(value, field) {
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
        throw new Error(`${field} must be a whole number.`);
    }
    return n;
}

function parseDateInput(value, field) {
    if (value === null || value === undefined || value === '') return null;
    const ms = typeof value === 'number' ? value : Date.parse(value);
    if (!Number.isFinite(ms)) {
        throw new Error(`${field} is not a date we can read.`);
    }
    return ms;
}

function validateDefinitionInput(input) {
    const data = input || {};

    const code = normaliseCode(data.code);
    if (!code) {
        throw new Error('A code is 3-20 characters, letters and numbers only ' +
            '(hyphens allowed), for example FIRST10 or MONSOON-500.');
    }

    const type = data.type === 'flat' ? 'flat' : 'percent';
    const value = asPositiveInt(data.value, 'The discount');
    if (type === 'percent') {
        if (value < 1 || value > MAX_PERCENT) {
            throw new Error(`A percentage discount must be between 1% and ${MAX_PERCENT}%.`);
        }
    } else if (value < 1 || value > MAX_FLAT) {
        throw new Error(`A flat discount must be between ${rupees(1)} and ${rupees(MAX_FLAT)}.`);
    }

    const maxDiscount = asPositiveInt(data.maxDiscount, 'The maximum discount');
    if (type === 'flat' && maxDiscount) {
        throw new Error('A flat discount is already a fixed amount — leave the cap empty.');
    }

    const minSubtotal = asPositiveInt(data.minSubtotal, 'The minimum order');
    const appliesTo = APPLIES_TO.indexOf(data.appliesTo) === -1 ? 'all' : data.appliesTo;

    // A flat discount larger than everything it can apply to would take
    // an order to zero. Catch it here rather than at someone's checkout.
    if (type === 'flat' && appliesTo === 'filter' && value >= CATALOG.filter) {
        throw new Error(`A filter costs ${rupees(CATALOG.filter)}, so a ` +
            `${rupees(value)} filter-only discount would make it free.`);
    }

    const startsAt = parseDateInput(data.startsAt, 'The start date');
    const expiresAt = parseDateInput(data.expiresAt, 'The end date');
    if (startsAt && expiresAt && expiresAt <= startsAt) {
        throw new Error('The end date has to be after the start date.');
    }

    const maxRedemptions = asPositiveInt(data.maxRedemptions, 'The total number of uses');

    const perUserLimit = data.perUserLimit === null || data.perUserLimit === undefined ||
        data.perUserLimit === '' ? 1 : asPositiveInt(data.perUserLimit, 'The per-customer limit');
    if (perUserLimit < 1) {
        throw new Error('Each customer has to be able to use the code at least once.');
    }

    const showcase = data.showcase === true;
    const headline = typeof data.headline === 'string' ? data.headline.trim() : '';
    if (headline.length > 60) {
        throw new Error('Keep the cart headline under 60 characters.');
    }
    const label = typeof data.label === 'string' ? data.label.trim().slice(0, 80) : '';

    const definition = {
        code,
        label,
        headline,
        type,
        value,
        maxDiscount,
        minSubtotal,
        appliesTo,
        startsAt,
        expiresAt,
        maxRedemptions,
        perUserLimit,
        firstOrderOnly: data.firstOrderOnly === true,
        showcase,
        active: data.active !== false
    };

    // A showcased code is printed in every shopper's cart, so it needs
    // copy. Fall back to the plain-English rule rather than refusing.
    if (showcase && !headline) {
        definition.headline = describe(normaliseDefinition(
            Object.assign({ redemptions: 0 }, definition)));
    }
    return definition;
}

// Fields the portal may change on a code that already exists. The
// discount itself is not among them: changing what FIRST10 is worth
// after people have used it makes the order history unreadable and the
// audit trail a lie. End it and make a new one instead.
const MUTABLE_FIELDS = ['active', 'expiresAt', 'maxRedemptions', 'showcase',
    'headline', 'label', 'minSubtotal', 'perUserLimit'];

function validateUpdateInput(current, input) {
    const data = input || {};
    const patch = {};

    Object.keys(data).forEach(function (key) {
        if (MUTABLE_FIELDS.indexOf(key) === -1) return;
        if (key === 'active' || key === 'showcase') {
            patch[key] = data[key] === true;
        } else if (key === 'expiresAt') {
            patch.expiresAt = parseDateInput(data.expiresAt, 'The end date');
        } else if (key === 'headline') {
            const headline = String(data.headline || '').trim();
            if (headline.length > 60) {
                throw new Error('Keep the cart headline under 60 characters.');
            }
            patch.headline = headline;
        } else if (key === 'label') {
            patch.label = String(data.label || '').trim().slice(0, 80);
        } else {
            patch[key] = asPositiveInt(data[key], 'That value');
        }
    });

    if (Object.keys(patch).length === 0) {
        throw new Error('Nothing to change.');
    }

    // A cap below what has already been given away cannot be honoured,
    // and would make the portal show "60 / 50 used".
    if (patch.maxRedemptions && patch.maxRedemptions < current.redemptions) {
        throw new Error(`${current.code} has already been used ` +
            `${current.redemptions} times — the limit cannot be lower than that.`);
    }
    if (patch.perUserLimit !== undefined && patch.perUserLimit < 1) {
        throw new Error('Each customer has to be able to use the code at least once.');
    }
    if (patch.showcase && !(patch.headline || current.headline)) {
        patch.headline = describe(current);
    }
    return patch;
}

// ---- Portal status ----
// One word for "what is this code doing right now", derived rather than
// stored so it can never disagree with the dates and counters.
function statusOf(definition, nowMs) {
    const now = typeof nowMs === 'number' ? nowMs : Date.now();
    if (!definition.active) return 'paused';
    if (definition.startsAt && now < definition.startsAt) return 'scheduled';
    if (definition.expiresAt && now >= definition.expiresAt) return 'expired';
    if (definition.maxRedemptions &&
        definition.redemptions >= definition.maxRedemptions) return 'claimed';
    return 'live';
}

// The subset of a code that is safe to publish. Only codes an admin has
// explicitly ticked "show in the cart" ever reach this — everything else
// about promo_codes is server-only, because a readable code list is a
// discount for anyone who opens devtools.
//
// The window travels with the offer so the cart can drop it the moment
// it ends and reveal it the moment it starts. Nothing writes to a promo
// document when the clock passes its start or end time, so a published
// list filtered only at write time would show a code a day early and
// keep showing it a week late.
function publicOffer(definition) {
    return {
        code: definition.code,
        headline: definition.headline || describe(definition),
        minSubtotal: definition.minSubtotal,
        appliesTo: definition.appliesTo,
        firstOrderOnly: definition.firstOrderOnly,
        startsAt: definition.startsAt,
        expiresAt: definition.expiresAt
    };
}

// ---- Firestore glue ----
//
// Still no Firebase imports: the caller hands in its own `db`, so all of
// this stays exercisable with a plain object that mimics the Admin SDK's
// shape.
//
// The asymmetry that matters, and that this adapter exists for: a
// Transaction reads through `tx.get(ref)`, but the Firestore instance
// has no `get()` of its own at all — a DocumentReference or a Query
// carries one. Passing the database where a transaction was expected
// therefore fails at runtime and nowhere else, which is exactly how it
// reached production the first time.
function readerFor(tx) {
    if (tx) return function (target) { return tx.get(target); };
    return function (target) { return target.get(); };
}

function codeDocPath(code) {
    return 'promo_codes/' + code;
}

// One document per (code, account). The composite ID means a
// per-customer limit is enforced by a single read inside the same
// transaction that writes the order — no query, no race.
function redemptionDocPath(code, uid) {
    return 'promo_redemptions/' + code + '__' + uid;
}

// Everything evaluate() needs about one code and one shopper.
async function readContext(db, tx, code, uid) {
    const read = readerFor(tx);

    const snap = await read(db.doc(codeDocPath(code)));
    const definition = snap.exists ? normaliseDefinition(snap.data()) : null;
    if (!definition || !uid) {
        return { definition, userRedemptions: 0, hasPriorOrders: false };
    }

    const redemption = await read(db.doc(redemptionDocPath(code, uid)));
    const userRedemptions = redemption.exists
        ? (Number(redemption.data().count) || 0) : 0;

    // Only ask the first-order question when a code actually cares:
    // otherwise every promo preview costs an extra query.
    let hasPriorOrders = false;
    if (definition.firstOrderOnly) {
        const prior = await read(
            db.collection('orders').where('uid', '==', uid).limit(1));
        hasPriorOrders = !prior.empty;
    }

    return { definition, userRedemptions, hasPriorOrders };
}

// Prices a cart against a code for one shopper. `tx` is null for the
// preview and a Transaction on the paths that write an order, where the
// read has to be consistent with the write that follows it.
async function evaluateFor(db, tx, code, uid, quantities, nowMs) {
    const context = await readContext(db, tx, code, uid);
    return {
        definition: context.definition,
        result: evaluate(context.definition, {
            quantities,
            nowMs: typeof nowMs === 'number' ? nowMs : Date.now(),
            authed: !!uid,
            userRedemptions: context.userRedemptions,
            hasPriorOrders: context.hasPriorOrders
        })
    };
}

module.exports = {
    CODE_PATTERN,
    MAX_PERCENT,
    MAX_FLAT,
    APPLIES_TO,
    rupees,
    shortDate,
    normaliseCode,
    lineTotals,
    eligibleSubtotal,
    cartSubtotal,
    discountFor,
    priceCart,
    toMillis,
    normaliseDefinition,
    describe,
    evaluate,
    validateDefinitionInput,
    validateUpdateInput,
    MUTABLE_FIELDS,
    statusOf,
    publicOffer,
    readerFor,
    codeDocPath,
    redemptionDocPath,
    readContext,
    evaluateFor
};
