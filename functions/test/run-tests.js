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
