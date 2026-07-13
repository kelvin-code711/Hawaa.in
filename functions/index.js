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
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const { buildCitySnapshot } = require('./aqi');

admin.initializeApp();

const dataGovApiKey = defineSecret('DATA_GOV_API_KEY');

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
        memory: '256MiB'
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
