// ========================================
// hawaa.in Cloud Functions — live CPCB AQI pipeline
//
// refreshAqiData runs every 30 minutes, pulls all CPCB station
// readings from the official data.gov.in mirror of the CPCB CAAQMS
// network, aggregates them per city (see ./aqi.js), and stores the
// snapshot at Firestore doc aqi/latest. The website only ever reads
// that document, so visitors never hit data.gov.in directly and the
// last good snapshot survives upstream outages.
// ========================================

'use strict';

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const { buildCitySnapshot } = require('./aqi');

admin.initializeApp();

const dataGovApiKey = defineSecret('DATA_GOV_API_KEY');

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
                headers: { accept: 'application/json' }
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
        const records = await fetchAllRecords(dataGovApiKey.value());
        logger.info(`Fetched ${records.length} CPCB records`);

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
    }
);
