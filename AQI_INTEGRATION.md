# Live CPCB AQI Integration

The home-page AQI checker shows **live data from CPCB (Central Pollution
Control Board, Govt. of India) monitoring stations** — the same network
behind https://airquality.cpcb.gov.in/ccr/ — via the official
machine-readable mirror on data.gov.in.

## How it works

```
data.gov.in API (CPCB stations, hourly)
        │  every 30 min
        ▼
Cloud Function refreshAqiData  (functions/index.js, asia-south1)
        │  aggregates per city (functions/aqi.js)
        ▼
Firestore doc aqi/latest       (public read-only snapshot)
        │  one read per visitor session
        ▼
js/aqi.js on index.html        (autosuggest + result modal)
```

Why this shape: the website never calls data.gov.in directly, so the
API key stays secret, visitors get instant answers, rate limits are
irrelevant (~48 upstream calls/day regardless of traffic), and if
data.gov.in has an outage the site keeps serving the last good
snapshot with its "Updated X ago" timestamp.

### Accuracy rules

- Station AQI = max pollutant sub-index (official CPCB NAQI method);
  city AQI = average of the city's stations (CPCB bulletin convention).
- Categories use the Indian NAQI scale: Good / Satisfactory / Moderate /
  Poor / Very Poor / Severe.
- Stations silent for >6 h and "NA"/out-of-range readings are dropped.
- A fetch that yields fewer than 50 cities is discarded rather than
  overwriting a good snapshot.
- The UI never invents a number: unknown cities and outages show honest
  messages.

## One-time deployment

Prerequisite: a personal data.gov.in API key (register at
https://data.gov.in → My Account → API Key). The sample key printed in
the API docs is capped at 10 records and will NOT work.

```bash
# 1. Store the API key as a Firebase secret (paste key when prompted)
firebase functions:secrets:set DATA_GOV_API_KEY

# 2. Install function dependencies
cd functions && npm install && cd ..

# 3. Deploy the function and updated Firestore rules
firebase deploy --only functions,firestore:rules

# 4. Populate the first snapshot without waiting 30 min:
#    Google Cloud Console → Cloud Scheduler (asia-south1) →
#    job for refreshAqiData → "Force run"
```

Hosting continues to auto-deploy from GitHub `main` as before; steps
1–4 are needed once (and step 3 again only when `functions/` changes).

## Verifying after deploy

1. Firebase console → Firestore → `aqi/latest` should exist with
   `cityCount` ≈ 200+ and a fresh `updatedAt`.
2. On hawaa.in, search a city (e.g. Delhi) — the modal should show the
   AQI with "Source: CPCB (Govt. of India) · N stations · Updated …".
3. Spot-check 2–3 cities against https://airquality.cpcb.gov.in/AQI_India/
   (expect agreement within the hourly update window; the site shows a
   city average, the portal shows per-station values).

## Maintenance

- Unit tests for the aggregation math: `cd functions && npm test`.
- Function logs: Firebase console → Functions → refreshAqiData.
  The function logs record/city/station counts on every run and throws
  (visible as errors) when upstream data is missing or too small.
- If data.gov.in rotates field names again, `functions/aqi.js`
  (`subIndexOf`) is the only place that reads them.
