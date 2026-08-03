// ========================================
// Firestore -> CSV exporter (orders and other website collections)
//
// Usage (from the project root, after `npm install` in functions/):
//   node scripts/export-orders.js
//   node scripts/export-orders.js --collection supportTickets
//   node scripts/export-orders.js --since 2026-08-01 --status placed
//   node scripts/export-orders.js --out C:\Users\Kelvin\Desktop\orders.csv
//
// Auth: place a service-account key at serviceAccountKey.json in the
// project root (Firebase console -> Project settings -> Service
// accounts -> Generate new private key), or set
// GOOGLE_APPLICATION_CREDENTIALS to its path. The key grants full
// project access — keep it off GitHub (.gitignore covers it) and off
// shared drives.
//
// Output is UTF-8 with a BOM so Excel shows ₹ and Indian names
// correctly, and timestamps are rendered in IST.
// ========================================

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// firebase-admin is already installed for the Cloud Functions; reuse it
// so this script needs no npm install of its own.
function loadAdmin() {
    const candidates = [
        'firebase-admin',
        path.join(ROOT, 'functions', 'node_modules', 'firebase-admin')
    ];
    for (const candidate of candidates) {
        try {
            return require(candidate);
        } catch (err) {
            if (err.code !== 'MODULE_NOT_FOUND') throw err;
        }
    }
    console.error(
        'Could not find firebase-admin.\n' +
        'Run this first:  cd functions  &&  npm install  &&  cd ..'
    );
    process.exit(1);
}

// ---- CLI ----
function parseArgs(argv) {
    const args = { collection: 'orders' };
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i];
        if (!key.startsWith('--')) continue;
        const value = argv[i + 1];
        if (value === undefined || value.startsWith('--')) {
            console.error(`Missing value for ${key}`);
            process.exit(1);
        }
        args[key.slice(2)] = value;
        i++;
    }
    return args;
}

// ---- Value formatting ----
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Firestore timestamps -> "2026-08-03 15:41 IST" (sorts correctly in
// a spreadsheet, unlike a localized date string).
function formatTimestamp(ts) {
    const ms = typeof ts.toMillis === 'function'
        ? ts.toMillis()
        : ts._seconds * 1000;
    const d = new Date(ms + IST_OFFSET_MS);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} IST`;
}

function isTimestamp(v) {
    return v && typeof v === 'object' &&
        (typeof v.toMillis === 'function' || typeof v._seconds === 'number');
}

function formatValue(v) {
    if (v === null || v === undefined) return '';
    if (isTimestamp(v)) return formatTimestamp(v);
    if (Array.isArray(v)) return v.map(formatValue).join(' | ');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

// Nested maps (an order's address) become address.city, address.pincode…
function flatten(obj, prefix, out) {
    out = out || {};
    for (const [key, value] of Object.entries(obj)) {
        const name = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value) && !isTimestamp(value)) {
            flatten(value, name, out);
        } else {
            out[name] = formatValue(value);
        }
    }
    return out;
}

// ---- CSV ----
function csvCell(value) {
    const s = value === undefined ? '' : String(value);
    // Quote anything a spreadsheet could misread; double inner quotes.
    // The leading-symbol guard stops Excel treating "+91…" as a formula.
    const needsQuotes = /[",\n\r]/.test(s) || /^[=+\-@]/.test(s);
    return needsQuotes ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows, columns) {
    const lines = [columns.map(csvCell).join(',')];
    for (const row of rows) {
        lines.push(columns.map((c) => csvCell(row[c])).join(','));
    }
    return lines.join('\r\n') + '\r\n';
}

// Preferred column order for orders; anything unexpected is appended so
// no data is ever silently dropped.
const ORDER_COLUMNS = [
    'orderId', 'createdAt', 'status', 'paymentMethod', 'total', 'subtotal', 'gst',
    'qtyPurifierOnetime', 'qtyPurifierSubscribe', 'qtyFilter', 'filterInterval',
    'address.name', 'address.phone', 'address.line1', 'address.line2',
    'address.city', 'address.state', 'address.pincode',
    'razorpay.paymentId', 'razorpay.orderId', 'razorpay.keyMode', 'uid'
];

function orderColumns(rows) {
    const seen = new Set();
    rows.forEach((r) => Object.keys(r).forEach((k) => seen.add(k)));
    const preferred = ORDER_COLUMNS.filter((c) => seen.has(c));
    const rest = [...seen].filter((c) => !ORDER_COLUMNS.includes(c)).sort();
    return [...preferred, ...rest];
}

function buildColumns(collection, rows) {
    if (collection === 'orders') return orderColumns(rows);
    const seen = new Set(['docId']);
    rows.forEach((r) => Object.keys(r).forEach((k) => seen.add(k)));
    return ['docId', ...[...seen].filter((c) => c !== 'docId').sort()];
}

// ---- Main ----
async function main() {
    const args = parseArgs(process.argv.slice(2));
    const collection = args.collection;
    const admin = loadAdmin();

    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        path.join(ROOT, 'serviceAccountKey.json');
    if (!fs.existsSync(keyPath)) {
        console.error(
            `No credentials found at ${keyPath}\n\n` +
            'Get one: Firebase console -> gear icon -> Project settings ->\n' +
            'Service accounts -> "Generate new private key". Save the file as\n' +
            'serviceAccountKey.json in this folder, then run the command again.'
        );
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.cert(require(keyPath))
    });

    let query = admin.firestore().collection(collection);
    if (args.since) {
        const since = new Date(`${args.since}T00:00:00+05:30`);
        if (Number.isNaN(since.getTime())) {
            console.error(`--since must look like 2026-08-01, got "${args.since}"`);
            process.exit(1);
        }
        query = query.where('createdAt', '>=', since);
    }
    if (args.status) query = query.where('status', '==', args.status);

    console.log(`Reading ${collection}…`);
    const snap = await query.get();

    if (snap.empty) {
        console.log('No documents matched — nothing written.');
        return;
    }

    const rows = snap.docs.map((doc) => {
        const flat = flatten(doc.data());
        return collection === 'orders'
            ? Object.assign({ orderId: doc.id }, flat)
            : Object.assign({ docId: doc.id }, flat);
    });

    // Newest first when the collection has createdAt (Firestore returns
    // documents in key order, which is meaningless for a human reading
    // an order list).
    rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const columns = buildColumns(collection, rows);
    const outPath = path.resolve(args.out || path.join(ROOT, `${collection}.csv`));
    fs.writeFileSync(outPath, '\uFEFF' + toCsv(rows, columns), 'utf8');

    console.log(`Wrote ${rows.length} ${collection} to ${outPath}`);
}

if (require.main === module) {
    main().catch((err) => {
        console.error('\nExport failed:', err && err.message ? err.message : err);
        if (err && (err.code === 'ENOTFOUND' || err.code === 14 ||
            /deadline|unavailable/i.test(String(err.message)))) {
            console.error(
                '\nThis looks like a network block reaching Google. If Firebase is\n' +
                'unreliable on this machine, run (as Administrator):\n' +
                '  powershell -ExecutionPolicy Bypass -File scripts\\fix-firebase-network.ps1'
            );
        }
        process.exit(1);
    });
}

module.exports = { flatten, formatValue, formatTimestamp, toCsv, csvCell, buildColumns };
