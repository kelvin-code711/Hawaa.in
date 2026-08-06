// ========================================
// hawaa.in Cloud Functions — Firestore -> CSV
//
// Pure formatting logic for the portal's Export button. Kept free of
// Firebase imports so test/run-tests.js can exercise it with plain node;
// Firestore timestamps are recognised by shape (toMillis / _seconds)
// rather than by type.
//
// Output is aimed at Excel, which is fussier than it looks:
//   - UTF-8 BOM (added by the caller) so rupee signs and Indian names
//     survive instead of turning into mojibake
//   - timestamps as "2026-08-03 15:41 IST" — sorts correctly as text,
//     unlike a localized date string
//   - a leading-symbol guard so "+919876543210" is not parsed as a
//     formula, which is also how CSV injection attacks land
// ========================================

'use strict';

const IST_OFFSET_MS = ((5 * 60) + 30) * 60 * 1000;

function isTimestamp(value) {
    return value && typeof value === 'object' &&
        (typeof value.toMillis === 'function' || typeof value._seconds === 'number');
}

function formatTimestamp(ts) {
    const ms = typeof ts.toMillis === 'function'
        ? ts.toMillis()
        : ts._seconds * 1000;
    const d = new Date(ms + IST_OFFSET_MS);
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} IST`;
}

function formatValue(value) {
    if (value === null || value === undefined) return '';
    if (isTimestamp(value)) return formatTimestamp(value);
    if (Array.isArray(value)) return value.map(formatValue).join(' | ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

// Nested maps (an order's address) become address.city, address.pincode…
function flatten(obj, prefix, out) {
    out = out || {};
    Object.keys(obj || {}).forEach(function (key) {
        const value = obj[key];
        const name = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value) && !isTimestamp(value)) {
            flatten(value, name, out);
        } else {
            out[name] = formatValue(value);
        }
    });
    return out;
}

function csvCell(value) {
    const s = value === undefined || value === null ? '' : String(value);
    // Quote anything a spreadsheet could misread, and double inner
    // quotes. The leading-symbol guard stops Excel evaluating a cell as
    // a formula — both a display bug and an injection vector.
    const needsQuotes = /[",\n\r]/.test(s) || /^[=+\-@]/.test(s);
    return needsQuotes ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows, columns) {
    const lines = [columns.map(csvCell).join(',')];
    rows.forEach(function (row) {
        lines.push(columns.map(function (c) { return csvCell(row[c]); }).join(','));
    });
    return lines.join('\r\n') + '\r\n';
}

// Preferred column order for orders; anything unexpected is appended so
// a new field is never silently dropped from an export.
const ORDER_COLUMNS = [
    'orderId', 'createdAt', 'status', 'paymentMethod', 'total', 'subtotal',
    'discount', 'promo.code', 'gst',
    'qtyPurifierOnetime', 'qtyPurifierSubscribe', 'qtyFilter', 'filterInterval',
    'address.name', 'address.phone', 'address.line1', 'address.line2',
    'address.city', 'address.state', 'address.pincode',
    'promo.type', 'promo.value', 'promo.discount', 'promo.overLimit',
    'razorpay.paymentId', 'razorpay.orderId', 'razorpay.keyMode', 'uid'
];

// Promo exports are read to answer "what did this campaign cost us",
// so the counters sit next to the code rather than at the far right.
const PROMO_COLUMNS = [
    'docId', 'code', 'label', 'type', 'value', 'maxDiscount', 'appliesTo',
    'minSubtotal', 'firstOrderOnly', 'perUserLimit',
    'redemptions', 'maxRedemptions', 'discountGiven',
    'active', 'showcase', 'headline', 'startsAt', 'expiresAt',
    'createdAt', 'createdByName', 'lastRedeemedAt'
];

// Preferred order first, then anything unexpected, so a field added
// later is never silently dropped from an export.
function orderedColumns(preferredOrder, rows, always) {
    const seen = new Set(always || []);
    rows.forEach(function (r) {
        Object.keys(r).forEach(function (k) { seen.add(k); });
    });
    const preferred = preferredOrder.filter(function (c) { return seen.has(c); });
    const rest = Array.from(seen).filter(function (c) {
        return preferredOrder.indexOf(c) === -1;
    }).sort();
    return preferred.concat(rest);
}

function orderColumns(rows) {
    return orderedColumns(ORDER_COLUMNS, rows);
}

function buildColumns(collection, rows) {
    if (collection === 'orders') return orderColumns(rows);
    if (collection === 'promo_codes') {
        return orderedColumns(PROMO_COLUMNS, rows, ['docId']);
    }
    const seen = new Set(['docId']);
    rows.forEach(function (r) {
        Object.keys(r).forEach(function (k) { seen.add(k); });
    });
    return ['docId'].concat(Array.from(seen).filter(function (c) {
        return c !== 'docId';
    }).sort());
}

// Newest first. Firestore returns documents in key order, which is
// meaningless to someone reading an order list.
function sortNewestFirst(rows) {
    return rows.sort(function (a, b) {
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
}

module.exports = {
    isTimestamp,
    formatTimestamp,
    formatValue,
    flatten,
    csvCell,
    toCsv,
    buildColumns,
    sortNewestFirst,
    ORDER_COLUMNS,
    PROMO_COLUMNS
};
