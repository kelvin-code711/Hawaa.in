// Plain-node tests for the CPCB aggregation logic: node test/run-tests.js
'use strict';

const assert = require('node:assert');
const path = require('node:path');
const {
    aqiCategory,
    parseIstTimestamp,
    cityKey,
    buildCitySnapshot
} = require(path.join(__dirname, '..', 'aqi.js'));

// ---- aqiCategory: Indian NAQI breakpoints ----
assert.strictEqual(aqiCategory(0), 'Good');
assert.strictEqual(aqiCategory(50), 'Good');
assert.strictEqual(aqiCategory(51), 'Satisfactory');
assert.strictEqual(aqiCategory(100), 'Satisfactory');
assert.strictEqual(aqiCategory(101), 'Moderate');
assert.strictEqual(aqiCategory(200), 'Moderate');
assert.strictEqual(aqiCategory(201), 'Poor');
assert.strictEqual(aqiCategory(300), 'Poor');
assert.strictEqual(aqiCategory(301), 'Very Poor');
assert.strictEqual(aqiCategory(400), 'Very Poor');
assert.strictEqual(aqiCategory(401), 'Severe');

// ---- parseIstTimestamp ----
// 13-07-2026 15:00 IST == 09:30 UTC
assert.strictEqual(
    parseIstTimestamp('13-07-2026 15:00:00'),
    Date.UTC(2026, 6, 13, 9, 30, 0)
);
assert.strictEqual(parseIstTimestamp('NA'), null);
assert.strictEqual(parseIstTimestamp(''), null);
assert.strictEqual(parseIstTimestamp(undefined), null);
assert.strictEqual(parseIstTimestamp('2026-07-13 15:00:00'), null);
assert.strictEqual(parseIstTimestamp('45-07-2026 15:00:00'), null);

// ---- cityKey ----
assert.strictEqual(cityKey('New Delhi'), 'new-delhi');
assert.strictEqual(cityKey('Béngaluru'), 'bengaluru');
assert.strictEqual(cityKey('  Navi Mumbai  '), 'navi-mumbai');
assert.strictEqual(cityKey('Kalaburagi (Gulbarga)'), 'kalaburagi-gulbarga');

// ---- buildCitySnapshot on the checked-in sample ----
const sample = require('./sample-records.json');
// "now" = 13-07-2026 16:00 IST
const NOW = Date.UTC(2026, 6, 13, 10, 30, 0);
const snap = buildCitySnapshot(sample.records, NOW);

// Cities: Delhi, Mumbai, Patna, Aizawl, Ahmedabad.
// Agra's only station is 8h old -> dropped. Blank city -> dropped.
assert.deepStrictEqual(
    Object.keys(snap.cities).sort(),
    ['ahmedabad-gujarat', 'aizawl-mizoram', 'delhi-delhi',
     'mumbai-maharashtra', 'patna-bihar']
);
assert.strictEqual(snap.cityCount, 5);

// Delhi: Anand Vihar max(210 PM2.5, 180 PM10, NA CO) = 210;
// Lodhi Road max(110 PM2.5, 34 OZONE) = 110. City avg = round(160) = 160.
const delhi = snap.cities['delhi-delhi'];
assert.strictEqual(delhi.aqi, 160);
assert.strictEqual(delhi.category, 'Moderate');
assert.strictEqual(delhi.stationCount, 2);
assert.strictEqual(delhi.maxStationAqi, 210);
assert.strictEqual(delhi.dominantPollutant, 'PM2.5');
assert.strictEqual(delhi.state, 'Delhi');
// Latest station update in Delhi: 15:00 IST
assert.strictEqual(delhi.lastUpdate, Date.UTC(2026, 6, 13, 9, 30, 0));

// Mumbai: single station max(88 PM10, 41 NO2) = 88 -> Satisfactory.
assert.strictEqual(snap.cities['mumbai-maharashtra'].aqi, 88);
assert.strictEqual(snap.cities['mumbai-maharashtra'].category, 'Satisfactory');
assert.strictEqual(snap.cities['mumbai-maharashtra'].dominantPollutant, 'PM10');

// Patna: old-schema field names (pollutant_avg) must still parse.
assert.strictEqual(snap.cities['patna-bihar'].aqi, 285);
assert.strictEqual(snap.cities['patna-bihar'].category, 'Poor');

// Aizawl: unparseable last_update is kept (not treated as stale).
assert.strictEqual(snap.cities['aizawl-mizoram'].aqi, 22);
assert.strictEqual(snap.cities['aizawl-mizoram'].lastUpdate, null);

// Ahmedabad: PM2.5 record has garbage avg (9999 out of range) -> only
// SO2 (19) survives.
assert.strictEqual(snap.cities['ahmedabad-gujarat'].aqi, 19);
assert.strictEqual(snap.cities['ahmedabad-gujarat'].category, 'Good');
assert.strictEqual(snap.cities['ahmedabad-gujarat'].dominantPollutant, 'SO2');

// Station bookkeeping: Delhi×2 + Mumbai + Patna + Aizawl + Ahmedabad = 6
assert.strictEqual(snap.stationCount, 6);
assert.strictEqual(snap.latestSourceUpdateMs, Date.UTC(2026, 6, 13, 9, 30, 0));

// Empty/garbage input never throws, never emits cities.
assert.strictEqual(buildCitySnapshot([], NOW).cityCount, 0);
assert.strictEqual(buildCitySnapshot(null, NOW).cityCount, 0);
assert.strictEqual(buildCitySnapshot([null, 42, {}], NOW).cityCount, 0);

console.log('All AQI aggregation tests passed.');

// ===============================================================
// Razorpay helpers (../razorpay.js)
// ===============================================================
const crypto = require('node:crypto');
const rzp = require(path.join(__dirname, '..', 'razorpay.js'));

// ---- gstOf: must match firestore.rules / js/cart.js integer math ----
assert.strictEqual(rzp.gstOf(5999), 1080);   // 5999*18+50 = 108032 -> 1080
assert.strictEqual(rzp.gstOf(0), 0);
assert.strictEqual(rzp.gstOf(250), 45);      // exact .5 boundary rounds up

// ---- computeAmounts: fixed catalog, client can't name a price ----
const amounts = rzp.computeAmounts(1, 1, 2);
assert.strictEqual(amounts.subtotal, 5999 + 5499 + 2 * 1499);
assert.strictEqual(amounts.gst, rzp.gstOf(amounts.subtotal));
assert.strictEqual(amounts.total, amounts.subtotal + amounts.gst);

// ---- validateCheckoutPayload ----
const goodAddress = {
    name: 'Asha Rao',
    phone: '+919876543210',
    line1: '12 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001'
};
const payload = rzp.validateCheckoutPayload({
    qtyPurifierOnetime: 1,
    qtyPurifierSubscribe: 1,
    qtyFilter: 0,
    filterInterval: 6,
    address: goodAddress
});
assert.strictEqual(payload.amounts.subtotal, 5999 + 5499);
assert.strictEqual(payload.filterInterval, 6);
assert.strictEqual(payload.address.line2, undefined);

// filterInterval is dropped when nothing is subscribed / value invalid.
assert.strictEqual(rzp.validateCheckoutPayload({
    qtyPurifierOnetime: 1, qtyPurifierSubscribe: 0, qtyFilter: 0,
    filterInterval: 6, address: goodAddress
}).filterInterval, undefined);
assert.strictEqual(rzp.validateCheckoutPayload({
    qtyPurifierOnetime: 0, qtyPurifierSubscribe: 1, qtyFilter: 0,
    filterInterval: 7, address: goodAddress
}).filterInterval, undefined);

// Rejections: empty cart, tampered/absurd quantities, bad address.
assert.throws(() => rzp.validateCheckoutPayload({
    qtyPurifierOnetime: 0, qtyPurifierSubscribe: 0, qtyFilter: 0, address: goodAddress
}), /empty/);
assert.throws(() => rzp.validateCheckoutPayload({
    qtyPurifierOnetime: 1.5, qtyPurifierSubscribe: 0, qtyFilter: 0, address: goodAddress
}), /quantities/);
assert.throws(() => rzp.validateCheckoutPayload({
    qtyPurifierOnetime: 11, qtyPurifierSubscribe: 0, qtyFilter: 0, address: goodAddress
}), /quantities/);
assert.throws(() => rzp.validateCheckoutPayload({
    qtyPurifierOnetime: 1, qtyPurifierSubscribe: 0, qtyFilter: 0,
    address: Object.assign({}, goodAddress, { phone: '9876543210' })
}), /address/);
assert.throws(() => rzp.validateCheckoutPayload({
    qtyPurifierOnetime: 1, qtyPurifierSubscribe: 0, qtyFilter: 0,
    address: Object.assign({}, goodAddress, { pincode: '05601' })
}), /address/);

// ---- verifyPaymentSignature (HMAC-SHA256 of "orderId|paymentId") ----
const secret = 'test_secret_value';
const sig = crypto.createHmac('sha256', secret)
    .update('order_abc|pay_xyz').digest('hex');
assert.strictEqual(rzp.verifyPaymentSignature('order_abc', 'pay_xyz', sig, secret), true);
assert.strictEqual(rzp.verifyPaymentSignature('order_abc', 'pay_xyz', sig.slice(0, -1) + '0', secret), false);
assert.strictEqual(rzp.verifyPaymentSignature('order_other', 'pay_xyz', sig, secret), false);
assert.strictEqual(rzp.verifyPaymentSignature('order_abc', 'pay_xyz', 'short', secret), false);
assert.strictEqual(rzp.verifyPaymentSignature('', '', '', secret), false);
assert.strictEqual(rzp.verifyPaymentSignature(null, undefined, sig, secret), false);

console.log('All Razorpay helper tests passed.');

// ===============================================================
// Admin portal core (../admin.js)
// ===============================================================
const adm = require(path.join(__dirname, '..', 'admin.js'));

// ---- Permission matrix: every row of the plan's table ----
assert.strictEqual(adm.can('super_admin', 'team.manage'), true);
assert.strictEqual(adm.can('manager', 'team.manage'), false);
assert.strictEqual(adm.can('staff', 'team.manage'), false);
assert.strictEqual(adm.can('viewer', 'team.manage'), false);

assert.strictEqual(adm.can('super_admin', 'audit.read'), true);
assert.strictEqual(adm.can('manager', 'audit.read'), false);

assert.strictEqual(adm.can('manager', 'reviews.moderate'), true);
assert.strictEqual(adm.can('staff', 'reviews.moderate'), false);

assert.strictEqual(adm.can('staff', 'orders.updateStatus'), true);
assert.strictEqual(adm.can('staff', 'orders.cancel'), false);
assert.strictEqual(adm.can('viewer', 'orders.updateStatus'), false);

// Staff must not be able to bulk-export the customer list.
assert.strictEqual(adm.can('manager', 'export'), true);
assert.strictEqual(adm.can('staff', 'export'), false);
assert.strictEqual(adm.can('viewer', 'export'), false);

// Viewer sees the dashboard but never customer PII.
assert.strictEqual(adm.can('viewer', 'dashboard'), true);
assert.strictEqual(adm.can('viewer', 'orders.read'), true);
assert.strictEqual(adm.can('viewer', 'orders.readPii'), false);
assert.strictEqual(adm.can('staff', 'orders.readPii'), true);

// Unknown / malformed roles are never granted anything.
assert.strictEqual(adm.can('root', 'orders.read'), false);
assert.strictEqual(adm.can('', 'orders.read'), false);
assert.strictEqual(adm.can(null, 'orders.read'), false);
assert.strictEqual(adm.can(undefined, 'dashboard'), false);

// ---- normalisePhone: must produce exactly what firestore.rules accepts ----
assert.strictEqual(adm.normalisePhone('+919876543210'), '+919876543210');
assert.strictEqual(adm.normalisePhone('+91 98765 43210'), '+919876543210');
assert.strictEqual(adm.normalisePhone('+91-98765-43210'), '+919876543210');
assert.strictEqual(adm.normalisePhone('9876543210'), null);
assert.strictEqual(adm.normalisePhone('+0123456789'), null);
assert.strictEqual(adm.normalisePhone(''), null);
assert.strictEqual(adm.normalisePhone(null), null);
assert.strictEqual(adm.normalisePhone('+91987654321012345'), null);

// ---- validateInvite ----
const invite = adm.validateInvite({
    phone: '+91 88661 19918', name: '  Asha Rao  ', role: 'staff'
});
assert.deepStrictEqual(invite, {
    phone: '+918866119918', name: 'Asha Rao', role: 'staff'
});
assert.throws(() => adm.validateInvite({ phone: '123', name: 'A', role: 'staff' }), /mobile number/);
assert.throws(() => adm.validateInvite({ phone: '+919876543210', name: '', role: 'staff' }), /name/);
assert.throws(() => adm.validateInvite({ phone: '+919876543210', name: 'A', role: 'root' }), /role/);

// ---- Privilege escalation must be impossible ----
assert.throws(() => adm.assertCanAssign('manager', 'staff'), /Super Admin/);
assert.throws(() => adm.assertCanAssign('staff', 'staff'), /Super Admin/);
assert.throws(() => adm.assertCanAssign('viewer', 'viewer'), /Super Admin/);
// A Super Admin may grant any role up to their own.
assert.doesNotThrow(() => adm.assertCanAssign('super_admin', 'super_admin'));
assert.doesNotThrow(() => adm.assertCanAssign('super_admin', 'manager'));
assert.throws(() => adm.assertCanAssign('super_admin', 'root'), /Unknown role/);

// ---- The last Super Admin cannot lock themselves out ----
assert.throws(() => adm.assertNotLastSuperAdmin('u1', 'u1', 1), /only Super Admin/);
assert.doesNotThrow(() => adm.assertNotLastSuperAdmin('u1', 'u1', 2));
// Removing somebody else is always fine.
assert.doesNotThrow(() => adm.assertNotLastSuperAdmin('u2', 'u1', 1));

// ---- Order lifecycle ----
assert.strictEqual(adm.validateOrderTransition('placed', 'confirmed', 'staff'), 'confirmed');
assert.strictEqual(adm.validateOrderTransition('confirmed', 'shipped', 'staff'), 'shipped');
assert.strictEqual(adm.validateOrderTransition('shipped', 'delivered', 'staff'), 'delivered');
// No going backwards, and terminal states stay terminal.
assert.throws(() => adm.validateOrderTransition('delivered', 'placed', 'super_admin'), /cannot move/);
assert.throws(() => adm.validateOrderTransition('cancelled', 'confirmed', 'super_admin'), /cannot move/);
assert.throws(() => adm.validateOrderTransition('shipped', 'cancelled', 'manager'), /cannot move/);
assert.throws(() => adm.validateOrderTransition('nonsense', 'placed', 'super_admin'), /unrecognised/);
// Cancelling needs 'orders.cancel', which Staff does not have.
assert.throws(() => adm.validateOrderTransition('placed', 'cancelled', 'staff'), /cannot make that change/);
assert.doesNotThrow(() => adm.validateOrderTransition('placed', 'cancelled', 'manager'));
assert.throws(() => adm.validateOrderTransition('placed', 'confirmed', 'viewer'), /cannot make that change/);

// ---- Review moderation ----
assert.deepStrictEqual(
    adm.validateReviewDecision('approved', true, 'manager'),
    { status: 'approved', verified: true }
);
assert.throws(() => adm.validateReviewDecision('approved', true, 'staff'), /cannot moderate/);
assert.throws(() => adm.validateReviewDecision('deleted', false, 'manager'), /approved or rejected/);
assert.throws(() => adm.validateReviewDecision('approved', 'yes', 'manager'), /true or false/);
assert.throws(() => adm.validateReviewDecision('rejected', true, 'manager'), /rejected review/);

// ---- PII masking for the Viewer role ----
const fullOrder = {
    qtyPurifierOnetime: 1, qtyPurifierSubscribe: 0, qtyFilter: 2,
    subtotal: 8997, gst: 1619, total: 10616,
    paymentMethod: 'cod', status: 'placed', createdAt: 'T',
    uid: 'customer-uid',
    address: {
        name: 'Asha Rao', phone: '+919876543210', line1: '12 MG Road',
        line2: 'Near Park', city: 'Bengaluru', state: 'Karnataka', pincode: '560001'
    }
};

const masked = adm.projectOrder(fullOrder, 'viewer');
assert.strictEqual(masked.total, 10616);
assert.strictEqual(masked.address.city, 'Bengaluru');
// Nothing that identifies or locates the customer survives.
assert.strictEqual(masked.address.name, undefined);
assert.strictEqual(masked.address.line1, undefined);
assert.strictEqual(masked.address.line2, undefined);
assert.strictEqual(masked.address.pincode, undefined);
assert.strictEqual(masked.uid, undefined);
assert.strictEqual(masked.address.phone.indexOf('9876543') === -1, true);
assert.strictEqual(adm.maskPhone('+919876543210'), '+91••••••••10');
assert.strictEqual(adm.maskPhone('abc'), '');
assert.strictEqual(adm.maskPhone(null), '');

// Roles that carry 'orders.readPii' get the document untouched.
assert.strictEqual(adm.projectOrder(fullOrder, 'staff'), fullOrder);
assert.strictEqual(adm.projectOrder(fullOrder, 'manager'), fullOrder);
assert.strictEqual(adm.projectOrder(fullOrder, 'super_admin'), fullOrder);
// An unknown role is treated as untrusted, not as an admin.
assert.strictEqual(adm.projectOrder(fullOrder, 'root').address.name, undefined);

console.log('All admin portal tests passed.');

// ===============================================================
// Portal gate — cookies and templates (../portal.js)
// ===============================================================
const gate = require(path.join(__dirname, '..', 'portal.js'));

// ---- Firebase Hosting forwards exactly one cookie name ----
assert.strictEqual(gate.SESSION_COOKIE_NAME, '__session');

// ---- parseCookies ----
assert.deepStrictEqual(gate.parseCookies('a=1; b=2'), { a: '1', b: '2' });
assert.deepStrictEqual(gate.parseCookies('  a = 1 ;b=2  '), { a: '1', b: '2' });
assert.deepStrictEqual(gate.parseCookies('a=hello%20world'), { a: 'hello world' });
// Malformed input must never throw — this parses attacker-controlled headers.
assert.deepStrictEqual(gate.parseCookies(''), {});
assert.deepStrictEqual(gate.parseCookies(null), {});
assert.deepStrictEqual(gate.parseCookies(undefined), {});
assert.deepStrictEqual(gate.parseCookies('novalue'), {});
assert.deepStrictEqual(gate.parseCookies('=leading'), {});
assert.deepStrictEqual(gate.parseCookies('a=%E0%A4'), { a: '%E0%A4' }); // bad escape kept raw
// A duplicated name must resolve to the first occurrence, so a second
// injected __session cannot override the real one.
assert.deepStrictEqual(gate.parseCookies('__session=real; __session=fake').__session, 'real');

// ---- sessionCookieFrom ----
assert.strictEqual(gate.sessionCookieFrom('__session=abc123'), 'abc123');
assert.strictEqual(gate.sessionCookieFrom('other=1'), null);
assert.strictEqual(gate.sessionCookieFrom('__session='), null);
assert.strictEqual(gate.sessionCookieFrom(''), null);
assert.strictEqual(gate.sessionCookieFrom(null), null);

// ---- buildSessionCookie: every flag matters ----
const setCookie = gate.buildSessionCookie('tok en', gate.SESSION_MAX_AGE_MS);
assert.ok(setCookie.indexOf('__session=tok%20en') === 0, 'value must be encoded');
assert.ok(setCookie.includes('HttpOnly'), 'page scripts must not read the session');
assert.ok(setCookie.includes('Secure'), 'never send over plain HTTP');
assert.ok(setCookie.includes('SameSite=Strict'), 'blocks cross-site use');
assert.ok(setCookie.includes('Max-Age=28800'), '8 hours');
// Scoped to the portal so admin sessions stay out of the public CDN cache key.
assert.ok(setCookie.includes('Path=' + gate.PORTAL_PATH));
assert.ok(!setCookie.includes('Path=/;'), 'must not be site-wide');

const cleared = gate.clearedSessionCookie();
assert.ok(cleared.includes('Max-Age=0'));
assert.ok(cleared.includes('Path=' + gate.PORTAL_PATH));
assert.ok(cleared.includes('HttpOnly') && cleared.includes('Secure'));

// ---- Response headers ----
assert.strictEqual(gate.SECURITY_HEADERS['Cache-Control'], 'private, no-store, max-age=0');
assert.ok(gate.SECURITY_HEADERS['X-Robots-Tag'].includes('noindex'));
assert.strictEqual(gate.SECURITY_HEADERS['X-Frame-Options'], 'DENY');
assert.strictEqual(gate.SECURITY_HEADERS['Referrer-Policy'], 'no-referrer');

// ---- Login page gives nothing away ----
const login = gate.loginPageHtml();
assert.ok(login.includes('<title>Sign in</title>'));
assert.ok(login.includes('noindex'));
// No branding and no hint of what the login opens.
assert.strictEqual(/hawaa/i.test(login.replace(/hawaa-air-27548|hawaa\.in|hawaa-ops-7k11s/g, '')), false);
assert.strictEqual(/admin|staff|portal|operations/i.test(login), false);

// ---- Portal shell escapes stored values ----
const shell = gate.portalShellHtml(
    { name: '<script>x</script>Asha', role: 'manager' },
    ['orders.read', 'reviews.moderate']);
assert.strictEqual(shell.includes('<script>x</script>Asha'), false);
assert.ok(shell.includes('scriptx/scriptAsha'));
// The caller's permissions are embedded so the UI can hide what it
// cannot do — without a second copy of the matrix to drift out of step.
assert.ok(shell.includes('["orders.read","reviews.moderate"]'));

// Missing name/role must not surface as "undefined" in the header.
const bare = gate.portalShellHtml({});
const header = bare.slice(bare.indexOf('class="who"'), bare.indexOf('</header>'));
assert.ok(header.includes('there'));
assert.strictEqual(header.includes('undefined'), false);
// A role with no permissions still renders; it just has nothing to show.
assert.ok(bare.includes('[]'));

console.log('All portal gate tests passed.');

// ===============================================================
// Dashboard summary — IST day boundaries and revenue rules
// ===============================================================

// 00:00 IST is 18:30 UTC the previous day. A UTC-based implementation
// would silently file every order placed before 05:30 IST under the
// wrong day, so these boundaries are the whole point.
assert.strictEqual(
    adm.istDayStartMs(Date.UTC(2026, 7, 4, 10, 0, 0)),   // 15:30 IST, 4 Aug
    Date.UTC(2026, 7, 3, 18, 30, 0)                       // 00:00 IST, 4 Aug
);
assert.strictEqual(
    adm.istDayStartMs(Date.UTC(2026, 7, 3, 19, 0, 0)),   // 00:30 IST, 4 Aug
    Date.UTC(2026, 7, 3, 18, 30, 0)
);
assert.strictEqual(
    adm.istDayStartMs(Date.UTC(2026, 7, 3, 18, 29, 0)),  // 23:59 IST, 3 Aug
    Date.UTC(2026, 7, 2, 18, 30, 0)                       // 00:00 IST, 3 Aug
);

const NOW_IST = Date.UTC(2026, 7, 4, 10, 0, 0);
const DAY = 86400000;
const summary = adm.summariseOrders([
    { total: 1000, status: 'delivered',  createdAtMs: NOW_IST - 3600000 },
    { total: 5000, status: 'cancelled',  createdAtMs: NOW_IST - 7200000 },
    { total: 2000, status: 'placed',     createdAtMs: NOW_IST - (3 * DAY) },
    { total: 3000, status: 'confirmed',  createdAtMs: NOW_IST - (5 * DAY) },
    { total: 9999, status: 'delivered',  createdAtMs: NOW_IST - (10 * DAY) }
], NOW_IST);

assert.strictEqual(summary.ordersToday, 2);
// A cancelled order still happened, but it is not money.
assert.strictEqual(summary.revenueToday, 1000);
assert.strictEqual(summary.ordersWeek, 4);
assert.strictEqual(summary.revenueWeek, 1000 + 2000 + 3000);
// Anything not yet shipped needs attention, regardless of age.
assert.strictEqual(summary.awaitingDispatch, 2);

// Garbage in must never throw — this runs on every dashboard load.
assert.deepStrictEqual(adm.summariseOrders([], NOW_IST).ordersToday, 0);
assert.deepStrictEqual(adm.summariseOrders(null, NOW_IST).revenueWeek, 0);
assert.deepStrictEqual(
    adm.summariseOrders([null, {}, { total: 'x', createdAtMs: NOW_IST }], NOW_IST).revenueToday,
    0
);

console.log('All dashboard summary tests passed.');

// ===============================================================
// CSV export (../csv.js)
// ===============================================================
const csvlib = require(path.join(__dirname, '..', 'csv.js'));

// ---- csvCell: spreadsheet hazards ----
assert.strictEqual(csvlib.csvCell('plain'), 'plain');
assert.strictEqual(csvlib.csvCell('a,b'), '"a,b"');
assert.strictEqual(csvlib.csvCell('say "hi"'), '"say ""hi"""');
assert.strictEqual(csvlib.csvCell('line1\nline2'), '"line1\nline2"');
assert.strictEqual(csvlib.csvCell(''), '');
assert.strictEqual(csvlib.csvCell(null), '');
assert.strictEqual(csvlib.csvCell(undefined), '');
// Leading symbols are quoted so Excel treats them as text. This is both
// a display fix for phone numbers and the CSV-injection guard.
assert.strictEqual(csvlib.csvCell('+919876543210'), '"+919876543210"');
assert.strictEqual(csvlib.csvCell('=1+1'), '"=1+1"');
assert.strictEqual(csvlib.csvCell('@user'), '"@user"');
assert.strictEqual(csvlib.csvCell('-5'), '"-5"');
assert.strictEqual(csvlib.csvCell('=cmd|"/c calc"!A1'), '"=cmd|""/c calc""!A1"');

// ---- Timestamps render in IST and sort as text ----
const ts = { toMillis: () => Date.UTC(2026, 7, 3, 10, 11, 0) }; // 15:41 IST
assert.strictEqual(csvlib.formatTimestamp(ts), '2026-08-03 15:41 IST');
// Just before IST midnight must still be the 3rd, not the 4th.
assert.strictEqual(
    csvlib.formatTimestamp({ toMillis: () => Date.UTC(2026, 7, 3, 18, 29, 0) }),
    '2026-08-03 23:59 IST'
);
// Raw Firestore shape (_seconds) works too, for documents read via the
// REST shape rather than the SDK.
assert.strictEqual(
    csvlib.formatTimestamp({ _seconds: Date.UTC(2026, 7, 3, 10, 11, 0) / 1000 }),
    '2026-08-03 15:41 IST'
);

// ---- flatten: nested maps become dotted columns ----
const flat = csvlib.flatten({
    total: 7079,
    address: { name: 'Asha Rao', city: 'Bengaluru', pincode: '560001' },
    razorpay: { paymentId: 'pay_1', keyMode: 'test' },
    createdAt: ts,
    tags: ['a', 'b']
});
assert.strictEqual(flat['address.city'], 'Bengaluru');
assert.strictEqual(flat['razorpay.paymentId'], 'pay_1');
assert.strictEqual(flat.createdAt, '2026-08-03 15:41 IST');
assert.strictEqual(flat.tags, 'a | b');
assert.strictEqual(flat.total, '7079');

// ---- Column order: known fields first, unknown ones kept not dropped ----
const rows = [Object.assign({ orderId: 'o1', surpriseField: 'x' }, flat)];
const cols = csvlib.buildColumns('orders', rows);
assert.strictEqual(cols[0], 'orderId');
assert.strictEqual(cols.indexOf('address.name') < cols.indexOf('surpriseField'), true);
assert.ok(cols.includes('surpriseField'), 'a new field must never be silently dropped');
// Non-order collections lead with docId.
assert.strictEqual(csvlib.buildColumns('supportTickets', [{ docId: 'd1', email: 'a@b.co' }])[0], 'docId');

// ---- toCsv: CRLF line endings, header first ----
const out = csvlib.toCsv([{ a: '1', b: 'x,y' }], ['a', 'b']);
assert.strictEqual(out, 'a,b\r\n1,"x,y"\r\n');
assert.strictEqual(csvlib.toCsv([], ['a']), 'a\r\n');

// ---- Newest first ----
const sorted = csvlib.sortNewestFirst([
    { createdAt: '2026-08-01 10:00 IST' },
    { createdAt: '2026-08-03 10:00 IST' },
    { createdAt: '2026-08-02 10:00 IST' }
]);
assert.strictEqual(sorted[0].createdAt, '2026-08-03 10:00 IST');
assert.strictEqual(sorted[2].createdAt, '2026-08-01 10:00 IST');
// Rows with no timestamp must not throw or jump the queue.
assert.doesNotThrow(() => csvlib.sortNewestFirst([{}, { createdAt: '2026-08-01 10:00 IST' }]));

console.log('All CSV export tests passed.');

// ===============================================================
// Sign-in pre-check rate limiting
// ===============================================================
const WINDOW = 15 * 60 * 1000;
const MAX = 5;

// First attempt from an unseen client starts a window.
const first = adm.rateLimitNext(null, 1000, MAX, WINDOW);
assert.strictEqual(first.allowed, true);
assert.strictEqual(first.count, 1);
assert.strictEqual(first.windowStart, 1000);

// Attempts accumulate inside the window.
let state = { count: 4, windowStart: 1000 };
const fifth = adm.rateLimitNext(state, 1000 + 60000, MAX, WINDOW);
assert.strictEqual(fifth.allowed, true);
assert.strictEqual(fifth.count, 5);

// The sixth is refused, and the window is NOT extended by the refusal —
// otherwise a persistent prober would lock themselves out forever and
// never learn the limit had reset.
const sixth = adm.rateLimitNext({ count: 5, windowStart: 1000 }, 1000 + 60000, MAX, WINDOW);
assert.strictEqual(sixth.allowed, false);
assert.strictEqual(sixth.count, 5);
assert.strictEqual(sixth.windowStart, 1000);
assert.strictEqual(sixth.retryAfterMs, WINDOW - 60000);

// Once the window passes, the count resets.
const afterWindow = adm.rateLimitNext({ count: 5, windowStart: 1000 }, 1000 + WINDOW + 1, MAX, WINDOW);
assert.strictEqual(afterWindow.allowed, true);
assert.strictEqual(afterWindow.count, 1);
assert.strictEqual(afterWindow.windowStart, 1000 + WINDOW + 1);

// Corrupt or missing stored state must fail open into a fresh window,
// never throw — this runs before any authentication.
assert.strictEqual(adm.rateLimitNext({}, 5000, MAX, WINDOW).allowed, true);
assert.strictEqual(adm.rateLimitNext({ count: 'x' }, 5000, MAX, WINDOW).count, 1);
assert.strictEqual(adm.rateLimitNext(undefined, 5000, MAX, WINDOW).allowed, true);
assert.strictEqual(adm.rateLimitNext({ windowStart: 'nope', count: 99 }, 5000, MAX, WINDOW).allowed, true);

// ---- The login page must not send an SMS before the check ----
const loginHtml = gate.loginPageHtml();
assert.ok(loginHtml.includes('/precheck'), 'login page must call the pre-check');
assert.ok(
    loginHtml.indexOf('/precheck') < loginHtml.indexOf('signInWithPhoneNumber(auth'),
    'the pre-check must run before the SMS is requested'
);
assert.ok(loginHtml.includes('No account exists for this number.'));
// And it still must not reveal what the portal is.
assert.strictEqual(/admin|staff|portal|operations/i.test(loginHtml), false);

console.log('All sign-in pre-check tests passed.');

// ===============================================================
// Promo codes (../promo.js)
// ===============================================================
const pr = require(path.join(__dirname, '..', 'promo.js'));

// ---- Code normalisation ----
// People type codes off packaging and out of emails: lowercase, padded,
// with a stray space in the middle. All of those are the same code.
assert.strictEqual(pr.normaliseCode('first10'), 'FIRST10');
assert.strictEqual(pr.normaliseCode('  first 10 '), 'FIRST10');
assert.strictEqual(pr.normaliseCode('MONSOON-500'), 'MONSOON-500');
// Too short, illegal characters, or leading punctuation are not codes.
assert.strictEqual(pr.normaliseCode('AB'), null);
assert.strictEqual(pr.normaliseCode('-LEAD'), null);
assert.strictEqual(pr.normaliseCode('SAVE_10'), null);
assert.strictEqual(pr.normaliseCode('A'.repeat(21)), null);
assert.strictEqual(pr.normaliseCode(undefined), null);
assert.strictEqual(pr.normaliseCode(42), null);

const ONE_PURIFIER = { qtyPurifierOnetime: 1, qtyPurifierSubscribe: 0, qtyFilter: 0 };
const ONE_FILTER = { qtyPurifierOnetime: 0, qtyPurifierSubscribe: 0, qtyFilter: 1 };
const BOTH = { qtyPurifierOnetime: 1, qtyPurifierSubscribe: 0, qtyFilter: 1 };

function code(overrides) {
    return pr.normaliseDefinition(Object.assign({
        code: 'SAVE10', type: 'percent', value: 10, active: true, perUserLimit: 1
    }, overrides));
}

// ---- The discounted value is what GST is charged on ----
// A discount recorded on the invoice at the time of supply is excluded
// from the value of supply (s.15(3)(a) CGST Act), so tax is computed on
// what is actually paid. Charging GST on the list price would overtax
// every discounted order.
const priced = pr.priceCart(ONE_PURIFIER, 600);
assert.strictEqual(priced.subtotal, 5999);
assert.strictEqual(priced.discount, 600);
assert.strictEqual(priced.taxable, 5399);
assert.strictEqual(priced.gst, 972);          // NOT 1080, which is 18% of 5999
assert.strictEqual(priced.total, 6371);

// With no discount the arithmetic must be bit-identical to the
// undiscounted path in firestore.rules and js/cart.js.
const undiscounted = pr.priceCart(ONE_PURIFIER, 0);
assert.strictEqual(undiscounted.gst, rzp.computeAmounts(1, 0, 0).gst);
assert.strictEqual(undiscounted.total, rzp.computeAmounts(1, 0, 0).total);
assert.strictEqual(pr.priceCart(BOTH, 0).total, rzp.computeAmounts(1, 0, 1).total);

// A discount can take an order to zero but never below it.
assert.strictEqual(pr.priceCart(ONE_FILTER, 99999).discount, 1499);
assert.strictEqual(pr.priceCart(ONE_FILTER, 99999).total, 0);
assert.strictEqual(pr.priceCart(ONE_PURIFIER, -50).discount, 0);

// ---- Percentages round half-up in integer arithmetic ----
// Float maths here is how a cart total ends up a rupee away from the
// total the order was written with.
assert.strictEqual(pr.discountFor(code({ value: 10 }), 5999), 600);   // 599.9 -> 600
assert.strictEqual(pr.discountFor(code({ value: 10 }), 1499), 150);   // 149.9 -> 150
assert.strictEqual(pr.discountFor(code({ value: 1 }), 1499), 15);     // 14.99 -> 15
assert.strictEqual(pr.discountFor(code({ value: 50 }), 5999), 3000);
// The cap wins over the percentage.
assert.strictEqual(pr.discountFor(code({ value: 50, maxDiscount: 800 }), 5999), 800);
// A flat amount is never more than what it applies to.
assert.strictEqual(pr.discountFor(code({ type: 'flat', value: 500 }), 5999), 500);
assert.strictEqual(pr.discountFor(code({ type: 'flat', value: 5000 }), 1499), 1499);
assert.strictEqual(pr.discountFor(code({ type: 'flat', value: 500 }), 0), 0);

// ---- appliesTo restricts what a code can discount ----
assert.strictEqual(pr.eligibleSubtotal(BOTH, 'all'), 5999 + 1499);
assert.strictEqual(pr.eligibleSubtotal(BOTH, 'purifier'), 5999);
assert.strictEqual(pr.eligibleSubtotal(BOTH, 'filter'), 1499);
assert.strictEqual(pr.eligibleSubtotal(ONE_PURIFIER, 'filter'), 0);
// A filter-only code on a mixed cart discounts the filter, not the cart.
const filterOnly = pr.evaluate(code({ appliesTo: 'filter', value: 10 }),
    { quantities: BOTH, authed: true });
assert.strictEqual(filterOnly.ok, true);
assert.strictEqual(filterOnly.discount, 150);
assert.strictEqual(filterOnly.pricing.subtotal, 7498);

console.log('All promo arithmetic tests passed.');

// ---- Evaluation: every refusal, and why ----
const NOW_MS = Date.UTC(2026, 7, 6, 6, 0, 0);
const ev = (definition, extra) => pr.evaluate(definition,
    Object.assign({ quantities: ONE_PURIFIER, nowMs: NOW_MS, authed: true }, extra));

assert.strictEqual(ev(null).reason, 'not-found');
assert.strictEqual(ev(code({ active: false })).reason, 'inactive');
assert.strictEqual(ev(code({ startsAt: NOW_MS + 86400000 })).reason, 'not-started');
assert.strictEqual(ev(code({ expiresAt: NOW_MS - 1 })).reason, 'expired');
// The boundary belongs to the shopper: a code is live right up to its
// expiry instant, and dead at it.
assert.strictEqual(ev(code({ expiresAt: NOW_MS + 1 })).ok, true);
assert.strictEqual(ev(code({ expiresAt: NOW_MS })).reason, 'expired');
assert.strictEqual(ev(code({ startsAt: NOW_MS })).ok, true);

assert.strictEqual(ev(code({ maxRedemptions: 50, redemptions: 50 })).reason, 'exhausted');
assert.strictEqual(ev(code({ maxRedemptions: 50, redemptions: 49 })).ok, true);
// No cap means no cap, however many have gone out.
assert.strictEqual(ev(code({ maxRedemptions: 0, redemptions: 9999 })).ok, true);

assert.strictEqual(
    ev(code({ firstOrderOnly: true }), { hasPriorOrders: true }).reason, 'not-first-order');
assert.strictEqual(ev(code({ firstOrderOnly: true }), { hasPriorOrders: false }).ok, true);

assert.strictEqual(ev(code({ perUserLimit: 1 }), { userRedemptions: 1 }).reason, 'user-limit');
assert.strictEqual(ev(code({ perUserLimit: 3 }), { userRedemptions: 2 }).ok, true);
assert.strictEqual(ev(code({ perUserLimit: 3 }), { userRedemptions: 3 }).reason, 'user-limit');

// A minimum that is not met is the shopper's to fix, so the message
// says exactly how much more — it is the difference between a dead end
// and an upsell.
const short = ev(code({ minSubtotal: 7500 }));
assert.strictEqual(short.reason, 'below-minimum');
assert.strictEqual(short.shortfall, 1501);
assert.ok(short.message.includes('₹1,501'), short.message);
assert.strictEqual(ev(code({ minSubtotal: 5999 })).ok, true);

// A code that applies to nothing in this cart.
const wrongItems = ev(code({ appliesTo: 'filter' }));
assert.strictEqual(wrongItems.reason, 'not-applicable');
assert.ok(wrongItems.message.includes('filters'), wrongItems.message);

assert.strictEqual(pr.evaluate(code({}), {
    quantities: { qtyPurifierOnetime: 0, qtyPurifierSubscribe: 0, qtyFilter: 0 },
    nowMs: NOW_MS, authed: true
}).reason, 'empty-cart');

// Every refusal carries a sentence a shopper can act on, and it names
// the code so a screenshot is enough to support it.
['inactive', 'not-started', 'expired', 'exhausted', 'user-limit'].forEach(function (reason) {
    const cases = {
        inactive: code({ active: false }),
        'not-started': code({ startsAt: NOW_MS + 86400000 }),
        expired: code({ expiresAt: NOW_MS - 1 }),
        exhausted: code({ maxRedemptions: 1, redemptions: 1 }),
        'user-limit': code({})
    };
    const out = ev(cases[reason], { userRedemptions: 1 });
    assert.strictEqual(out.reason, reason);
    assert.ok(out.message.length > 10, reason);
    assert.ok(out.message.includes('SAVE10'), reason + ': ' + out.message);
});

// ---- Signed-out shoppers ----
// Per-account rules cannot be answered without an account, so they are
// skipped and named rather than guessed at. The cart shows the offer
// with a caveat; the order path re-runs this with authed=true.
const anon = pr.evaluate(code({ firstOrderOnly: true, perUserLimit: 1 }),
    { quantities: ONE_PURIFIER, nowMs: NOW_MS, authed: false, hasPriorOrders: true });
assert.strictEqual(anon.ok, true);
assert.deepStrictEqual(anon.deferred, ['first-order', 'per-customer']);
// The same shopper, signed in, is refused.
assert.strictEqual(
    ev(code({ firstOrderOnly: true }), { hasPriorOrders: true }).reason, 'not-first-order');
// A code with no per-account rules still defers the per-customer count,
// because that is a count against an account that does not exist yet.
assert.deepStrictEqual(pr.evaluate(code({}), {
    quantities: ONE_PURIFIER, nowMs: NOW_MS, authed: false
}).deferred, ['per-customer']);
// A signed-in shopper with nothing outstanding defers nothing.
assert.deepStrictEqual(ev(code({})).deferred, []);

// A successful evaluation carries the whole money picture, so the cart
// never has to work any of it out.
const good = ev(code({ value: 10 }));
assert.strictEqual(good.code, 'SAVE10');
assert.strictEqual(good.discount, 600);
assert.deepStrictEqual(good.pricing,
    { subtotal: 5999, discount: 600, taxable: 5399, gst: 972, total: 6371 });

console.log('All promo evaluation tests passed.');

// ---- Admin input: the guardrails that stop an expensive typo ----
const created = pr.validateDefinitionInput({
    code: 'monsoon10', label: 'Monsoon', type: 'percent', value: 10,
    maxDiscount: 800, minSubtotal: 4999, appliesTo: 'purifier',
    maxRedemptions: 200, perUserLimit: 1, firstOrderOnly: true
});
assert.strictEqual(created.code, 'MONSOON10');
assert.strictEqual(created.active, true);
assert.strictEqual(created.firstOrderOnly, true);

// "50" meaning half the order and "50" meaning fifty rupees look
// identical in a form field, so the range checks have to be tight.
assert.throws(() => pr.validateDefinitionInput({ code: 'X1', value: 10 }), /3-20 characters/);
assert.strictEqual(pr.validateDefinitionInput({ code: 'X10', value: 10 }).code, 'X10');
assert.throws(() => pr.validateDefinitionInput({ code: 'SAVE', value: 0 }), /between 1% and 90%/);
assert.throws(() => pr.validateDefinitionInput({ code: 'SAVE', value: 91 }), /between 1% and 90%/);
assert.throws(() => pr.validateDefinitionInput({ code: 'SAVE', value: 10.5 }), /whole number/);
assert.throws(() => pr.validateDefinitionInput({ code: 'SAVE', type: 'flat', value: 0 }), /flat discount must be/);
// A 100%-off code produces an order no gateway will accept.
assert.strictEqual(pr.validateDefinitionInput({ code: 'SAVE', value: 90 }).value, 90);
// A cap on a flat amount is a contradiction, not a refinement.
assert.throws(() => pr.validateDefinitionInput(
    { code: 'SAVE', type: 'flat', value: 500, maxDiscount: 100 }), /already a fixed amount/);
// A flat filter discount worth more than a filter makes filters free.
assert.throws(() => pr.validateDefinitionInput(
    { code: 'SAVE', type: 'flat', value: 1499, appliesTo: 'filter' }), /would make it free/);
assert.strictEqual(pr.validateDefinitionInput(
    { code: 'SAVE', type: 'flat', value: 1498, appliesTo: 'filter' }).value, 1498);
assert.throws(() => pr.validateDefinitionInput({
    code: 'SAVE', value: 10, startsAt: '2026-09-10', expiresAt: '2026-09-01'
}), /after the start date/);
assert.throws(() => pr.validateDefinitionInput(
    { code: 'SAVE', value: 10, expiresAt: 'whenever' }), /not a date/);
assert.throws(() => pr.validateDefinitionInput(
    { code: 'SAVE', value: 10, perUserLimit: 0 }), /at least once/);

// A showcased code appears in every cart, so it always ends up with
// copy — written by the admin, or derived from its own rules.
const shown = pr.validateDefinitionInput({
    code: 'FIRST10', value: 10, maxDiscount: 800, minSubtotal: 4999,
    firstOrderOnly: true, showcase: true
});
assert.ok(shown.headline.includes('10% off'), shown.headline);
assert.ok(shown.headline.includes('₹4,999'), shown.headline);
assert.ok(shown.headline.includes('first order only'), shown.headline);
assert.strictEqual(pr.validateDefinitionInput({
    code: 'FIRST10', value: 10, showcase: true, headline: 'Welcome gift'
}).headline, 'Welcome gift');
assert.throws(() => pr.validateDefinitionInput(
    { code: 'SAVE', value: 10, showcase: true, headline: 'x'.repeat(61) }), /under 60/);

// ---- Editing a live code ----
const live = code({ code: 'LIVE10', redemptions: 10, maxRedemptions: 50 });
assert.deepStrictEqual(pr.validateUpdateInput(live, { active: false }), { active: false });
assert.deepStrictEqual(pr.validateUpdateInput(live, { maxRedemptions: 100 }),
    { maxRedemptions: 100 });
// What a code is worth is fixed once it exists: changing it would make
// the orders that already used it unexplainable.
assert.throws(() => pr.validateUpdateInput(live, { value: 50 }), /Nothing to change/);
assert.throws(() => pr.validateUpdateInput(live, { type: 'flat' }), /Nothing to change/);
assert.throws(() => pr.validateUpdateInput(live, { firstOrderOnly: true }), /Nothing to change/);
assert.throws(() => pr.validateUpdateInput(live, { code: 'OTHER' }), /Nothing to change/);
// A cap below what has already gone out cannot be honoured.
assert.throws(() => pr.validateUpdateInput(live, { maxRedemptions: 5 }), /already been used 10/);
assert.throws(() => pr.validateUpdateInput(live, { perUserLimit: 0 }), /at least once/);
// Ticking "show in cart" on a code with no copy fills the copy in.
assert.ok(pr.validateUpdateInput(live, { showcase: true }).headline.includes('10% off'));

console.log('All promo admin-input tests passed.');

// ---- Status is derived, never stored, so it cannot go stale ----
assert.strictEqual(pr.statusOf(code({}), NOW_MS), 'live');
assert.strictEqual(pr.statusOf(code({ active: false }), NOW_MS), 'paused');
assert.strictEqual(pr.statusOf(code({ startsAt: NOW_MS + 1000 }), NOW_MS), 'scheduled');
assert.strictEqual(pr.statusOf(code({ expiresAt: NOW_MS - 1000 }), NOW_MS), 'expired');
assert.strictEqual(
    pr.statusOf(code({ maxRedemptions: 5, redemptions: 5 }), NOW_MS), 'claimed');
// Paused beats everything: an admin who hit Pause expects it to say so.
assert.strictEqual(
    pr.statusOf(code({ active: false, expiresAt: NOW_MS - 1 }), NOW_MS), 'paused');

// ---- Published offers carry no more than the cart needs ----
const offer = pr.publicOffer(code({
    maxRedemptions: 50, redemptions: 7, value: 25,
    startsAt: NOW_MS, expiresAt: NOW_MS + 86400000
}));
assert.strictEqual(offer.code, 'SAVE10');
assert.ok(offer.headline.length > 0);
// The window travels with the offer. Nothing writes to a promo document
// when the clock passes its start or end, so a cart that could not see
// these would show a code a day early and keep showing it a week late.
assert.strictEqual(offer.startsAt, NOW_MS);
assert.strictEqual(offer.expiresAt, NOW_MS + 86400000);
// How the discount is computed, how many are left, and who has used it
// are the shop's business, not the internet's.
['value', 'type', 'maxDiscount', 'redemptions', 'maxRedemptions', 'discountGiven',
    'active', 'perUserLimit', 'label'].forEach(function (field) {
    assert.strictEqual(offer[field], undefined, 'publicOffer leaked ' + field);
});

// ---- Stored documents survive missing and malformed fields ----
// A code written by an older portal must still evaluate predictably
// rather than producing NaN rupees.
const sparse = pr.normaliseDefinition({ code: 'BARE', type: 'percent', value: 5, active: true });
assert.strictEqual(sparse.perUserLimit, 1);
assert.strictEqual(sparse.maxRedemptions, 0);
assert.strictEqual(sparse.minSubtotal, 0);
assert.strictEqual(sparse.appliesTo, 'all');
assert.strictEqual(sparse.startsAt, null);
assert.strictEqual(sparse.firstOrderOnly, false);
assert.strictEqual(pr.evaluate(sparse, { quantities: ONE_PURIFIER, authed: true }).ok, true);
assert.strictEqual(pr.normaliseDefinition(null), null);
assert.strictEqual(pr.normaliseDefinition({ code: '??' }), null);
assert.strictEqual(pr.normaliseDefinition({ code: 'OK10', appliesTo: 'moon' }).appliesTo, 'all');
// Timestamps arrive in whichever shape the SDK hands over.
assert.strictEqual(pr.toMillis({ _seconds: 1000 }), 1000000);
assert.strictEqual(pr.toMillis({ toMillis: () => 42 }), 42);
assert.strictEqual(pr.toMillis(new Date(7)), 7);
assert.strictEqual(pr.toMillis('nope'), null);

console.log('All promo definition tests passed.');

// ===============================================================
// Promo integration points
// ===============================================================

// ---- The quantity-only validator the promo preview relies on ----
assert.deepStrictEqual(rzp.validateQuantities({
    qtyPurifierOnetime: 1, qtyPurifierSubscribe: 0, qtyFilter: 2
}), { qtyPurifierOnetime: 1, qtyPurifierSubscribe: 0, qtyFilter: 2 });
assert.throws(() => rzp.validateQuantities({
    qtyPurifierOnetime: 0, qtyPurifierSubscribe: 0, qtyFilter: 0
}), /cart is empty/);
assert.throws(() => rzp.validateQuantities({
    qtyPurifierOnetime: 11, qtyPurifierSubscribe: 0, qtyFilter: 0
}), /Invalid item quantities/);
assert.throws(() => rzp.validateQuantities(null), /Missing checkout details/);

// ---- Roles ----
// Staff answer the phone when a code does not work, so they can see
// what is running; creating money-off codes is a Manager decision.
assert.strictEqual(adm.can('staff', 'promos.read'), true);
assert.strictEqual(adm.can('staff', 'promos.manage'), false);
assert.strictEqual(adm.can('manager', 'promos.manage'), true);
assert.strictEqual(adm.can('super_admin', 'promos.manage'), true);
assert.strictEqual(adm.can('viewer', 'promos.read'), false);

// ---- The dashboard counts what discounts cost ----
const discounted = adm.summariseOrders([
    { total: 6371, discount: 600, status: 'delivered', createdAtMs: NOW_IST - 3600000 },
    { total: 5000, discount: 999, status: 'cancelled', createdAtMs: NOW_IST - 7200000 },
    { total: 4000, discount: 400, status: 'placed', createdAtMs: NOW_IST - (3 * DAY) },
    { total: 9999, discount: 900, status: 'delivered', createdAtMs: NOW_IST - (10 * DAY) }
], NOW_IST);
// A cancelled order gave nothing away, and last month is not this week.
assert.strictEqual(discounted.discountWeek, 1000);
// Orders written before promos existed have no discount field at all.
assert.strictEqual(adm.summariseOrders([
    { total: 5000, status: 'placed', createdAtMs: NOW_IST }
], NOW_IST).discountWeek, 0);

// ---- A Viewer sees the discount but still no customer ----
const maskedDiscounted = adm.projectOrder(Object.assign({
    discount: 600, promo: { code: 'SAVE10', discount: 600 }
}, fullOrder), 'viewer');
assert.strictEqual(maskedDiscounted.discount, 600);
assert.strictEqual(maskedDiscounted.promo.code, 'SAVE10');
assert.strictEqual(maskedDiscounted.address.name, undefined);

// ---- The portal ----
const promoShell = gate.portalShellHtml(
    { name: 'Asha', role: 'manager' }, adm.PERMISSIONS.manager, rzp.CATALOG);
assert.ok(promoShell.includes("id: 'promos'"));
// The preview is priced from the same catalog the checkout charges.
assert.ok(promoShell.includes(JSON.stringify(rzp.CATALOG)));
assert.ok(promoShell.includes('promo_codes'));
// A role without promos.read gets the tab filtered out client-side by
// the permissions it is handed.
const viewerShell = gate.portalShellHtml(
    { name: 'V', role: 'viewer' }, adm.PERMISSIONS.viewer, rzp.CATALOG);
assert.strictEqual(viewerShell.includes('"promos.read"'), false);

// ---- CSV ----
// The discount sits beside the total, not at the far right, because it
// is the first thing anyone reconciling an export looks for.
assert.ok(csvlib.ORDER_COLUMNS.indexOf('discount') > csvlib.ORDER_COLUMNS.indexOf('subtotal'));
assert.ok(csvlib.ORDER_COLUMNS.indexOf('promo.code') < csvlib.ORDER_COLUMNS.indexOf('gst'));
const promoCsvCols = csvlib.buildColumns('promo_codes', [
    { docId: 'SAVE10', code: 'SAVE10', redemptions: 3, surpriseField: 'x' }
]);
assert.strictEqual(promoCsvCols[0], 'docId');
assert.ok(promoCsvCols.indexOf('redemptions') !== -1);
// A field added later is never silently dropped.
assert.ok(promoCsvCols.indexOf('surpriseField') !== -1);
// Orders still export exactly as before when no promo is involved.
assert.deepStrictEqual(
    csvlib.buildColumns('orders', [{ orderId: 'a', total: 1, status: 'placed' }]),
    ['orderId', 'status', 'total']
);

console.log('All promo integration tests passed.');
