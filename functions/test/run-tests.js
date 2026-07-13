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
