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
