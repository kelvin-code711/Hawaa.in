// ========================================
// CPCB AQI aggregation logic (pure functions, no Firebase imports so
// the math can be unit-tested with plain node).
//
// Input: raw records from the data.gov.in resource
// 3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69 ("Real time Air Quality Index
// from various locations", CPCB CAAQMS stations). Each record is one
// pollutant reading at one station:
//   { country, state, city, station, last_update,
//     latitude, longitude, pollutant_id,
//     avg_value|pollutant_avg, min_value|pollutant_min,
//     max_value|pollutant_max }
// Values are CPCB NAQI sub-indices (0-500 per pollutant).
// ========================================

'use strict';

// Indian NAQI categories (CPCB breakpoints) — NOT the US EPA scale.
function aqiCategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Satisfactory';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'Poor';
    if (aqi <= 400) return 'Very Poor';
    return 'Severe';
}

// last_update arrives as "13-07-2026 15:00:00" in IST (UTC+5:30).
// Returns epoch millis, or null when unparseable/"NA".
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function parseIstTimestamp(value) {
    if (typeof value !== 'string') return null;
    const m = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return null;
    const [, dd, mo, yyyy, hh, mi, ss] = m.map(Number);
    if (mo < 1 || mo > 12 || dd < 1 || dd > 31 || hh > 23 || mi > 59 || ss > 59) return null;
    return Date.UTC(yyyy, mo - 1, dd, hh, mi, ss) - IST_OFFSET_MS;
}

// The dataset renamed its value columns at some point
// (pollutant_avg -> avg_value); accept either spelling.
function subIndexOf(record) {
    const raw = record.avg_value !== undefined ? record.avg_value : record.pollutant_avg;
    if (raw === null || raw === undefined || raw === '' || raw === 'NA') return null;
    const n = Number(raw);
    // Sub-indices are 0-500 by definition; anything outside is garbage.
    if (!Number.isFinite(n) || n < 0 || n > 500) return null;
    return n;
}

// Firestore map keys: keep them predictable and path-safe.
function cityKey(name) {
    return name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const STALE_STATION_MS = 6 * 60 * 60 * 1000;

/**
 * Collapse raw per-pollutant records into a per-city snapshot.
 *
 * - Station AQI = max pollutant sub-index (CPCB NAQI methodology);
 *   the pollutant responsible is the station's dominant pollutant.
 * - Stations with no valid readings, or last updated more than 6h
 *   before `nowMs`, are dropped.
 * - City AQI = average of its stations' AQIs (CPCB daily-bulletin
 *   convention), rounded; the city's dominant pollutant is taken from
 *   its worst station.
 *
 * Returns { cities: { [key]: city }, cityCount, stationCount,
 *           latestSourceUpdateMs }.
 */
function buildCitySnapshot(records, nowMs) {
    const stations = new Map(); // "state|city|station" -> station acc

    for (const record of records || []) {
        if (!record || typeof record !== 'object') continue;
        const city = typeof record.city === 'string' ? record.city.trim() : '';
        const state = typeof record.state === 'string' ? record.state.trim() : '';
        const stationName = typeof record.station === 'string' ? record.station.trim() : '';
        if (!city || !stationName) continue;

        const subIndex = subIndexOf(record);
        if (subIndex === null) continue;

        const updatedMs = parseIstTimestamp(record.last_update);

        const key = `${state}|${city}|${stationName}`;
        let station = stations.get(key);
        if (!station) {
            station = { state, city, updatedMs: null, aqi: -1, dominantPollutant: '' };
            stations.set(key, station);
        }
        if (updatedMs !== null && (station.updatedMs === null || updatedMs > station.updatedMs)) {
            station.updatedMs = updatedMs;
        }
        if (subIndex > station.aqi) {
            station.aqi = subIndex;
            station.dominantPollutant = String(record.pollutant_id || '').trim();
        }
    }

    const cities = new Map(); // key -> accumulator
    let usedStations = 0;
    let latestSourceUpdateMs = null;

    for (const station of stations.values()) {
        if (station.aqi < 0) continue;
        // Drop stations that stopped reporting (stale-station guard).
        // Stations with an unparseable timestamp are kept: bad clock
        // metadata shouldn't hide an otherwise-valid reading.
        if (station.updatedMs !== null && nowMs - station.updatedMs > STALE_STATION_MS) continue;

        usedStations++;
        if (station.updatedMs !== null &&
            (latestSourceUpdateMs === null || station.updatedMs > latestSourceUpdateMs)) {
            latestSourceUpdateMs = station.updatedMs;
        }

        // Key on city + state: the same city name can exist in two
        // states (e.g. Aurangabad in Bihar and Maharashtra).
        const key = cityKey(`${station.city} ${station.state}`);
        if (!key) continue;
        let acc = cities.get(key);
        if (!acc) {
            acc = {
                name: station.city,
                state: station.state,
                aqiSum: 0,
                stationCount: 0,
                maxStationAqi: -1,
                dominantPollutant: '',
                lastUpdateMs: null
            };
            cities.set(key, acc);
        }
        acc.aqiSum += station.aqi;
        acc.stationCount++;
        if (station.aqi > acc.maxStationAqi) {
            acc.maxStationAqi = station.aqi;
            acc.dominantPollutant = station.dominantPollutant;
        }
        if (station.updatedMs !== null &&
            (acc.lastUpdateMs === null || station.updatedMs > acc.lastUpdateMs)) {
            acc.lastUpdateMs = station.updatedMs;
        }
    }

    const out = {};
    for (const [key, acc] of cities) {
        const aqi = Math.round(acc.aqiSum / acc.stationCount);
        out[key] = {
            name: acc.name,
            state: acc.state,
            aqi,
            category: aqiCategory(aqi),
            dominantPollutant: acc.dominantPollutant,
            stationCount: acc.stationCount,
            maxStationAqi: Math.round(acc.maxStationAqi),
            lastUpdate: acc.lastUpdateMs
        };
    }

    return {
        cities: out,
        cityCount: Object.keys(out).length,
        stationCount: usedStations,
        latestSourceUpdateMs
    };
}

module.exports = {
    aqiCategory,
    parseIstTimestamp,
    subIndexOf,
    cityKey,
    buildCitySnapshot,
    STALE_STATION_MS
};
