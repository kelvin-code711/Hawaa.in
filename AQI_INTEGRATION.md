# Live CPCB AQI Integration

The home-page AQI checker shows **live data from CPCB (Central Pollution
Control Board, Govt. of India) monitoring stations** — the same network
behind https://airquality.cpcb.gov.in/ccr/ — via the official
machine-readable mirror on data.gov.in.

## How it works

```
data.gov.in API (CPCB stations, hourly)
        │  every 30 min (cron on the main branch)
        ▼
GitHub Action refresh-aqi.yml   (fetches on a GitHub runner)
        │  POST {records:[...]} + x-admin-key
        ▼
Cloud Function refreshAqiHttp   (functions/index.js, asia-south1)
        │  validates + aggregates per city (functions/aqi.js)
        ▼
Firestore doc aqi/latest        (public read-only snapshot)
        │  one read per visitor session
        ▼
js/aqi.js on index.html         (autosuggest + result modal)
```

**Why a GitHub Action does the fetching:** data.gov.in's firewall
TCP-resets requests coming from Google Cloud IPs (verified in
production), while GitHub-hosted runners get normal responses. The
runner therefore fetches the records and delivers them to the
processing endpoint. The endpoint is publicly reachable but rejects
any request that doesn't present the data.gov.in API key in the
`x-admin-key` header. A scheduled Cloud Function (`refreshAqiData`)
remains as a fallback fetcher in case the WAF ever unblocks GCP; its
failures are harmless noise in the logs until then.

The website never calls data.gov.in directly: visitors read the cached
Firestore snapshot instantly, the API key stays out of the site code,
and if data.gov.in has an outage the site keeps serving the last good
snapshot with its "Updated X ago" timestamp.

### Accuracy rules

- Station AQI = max pollutant sub-index (official CPCB NAQI method);
  city AQI = average of the city's stations (CPCB bulletin convention).
- Categories use the Indian NAQI scale: Good / Satisfactory / Moderate /
  Poor / Very Poor / Severe.
- Stations silent for >6 h and "NA"/out-of-range readings are dropped.
- A fetch that yields fewer than 50 cities is discarded rather than
  overwriting a good snapshot (the workflow also refuses to deliver
  fewer than 500 raw records).
- The UI never invents a number: unknown cities and outages show honest
  messages.

## Deployment state & requirements

- Cloud Functions `refreshAqiData` + `refreshAqiHttp` and the Firestore
  rules are deployed to project `hawaa-air-27548`.
- The data.gov.in API key is stored as Firebase secret
  `DATA_GOV_API_KEY` (rotate with
  `firebase functions:secrets:set DATA_GOV_API_KEY` +
  `firebase deploy --only functions`).
- **GitHub repo secret `DATA_GOV_API_KEY`** (same value) must exist —
  Settings → Secrets and variables → Actions. The refresh workflow
  fails with a clear error when it's missing.
- The 30-minute cron only fires for workflows on the **main branch** —
  merge to main for the schedule to run. Pushes that modify the
  workflow on the feature branch also trigger a run (for testing).

## Verifying

1. GitHub → Actions → `refresh-aqi` — latest run green, log shows
   `total records fetched: ~2500+` and `{"ok":true,"cities":~250,...}`.
2. Firebase console → Firestore → `aqi/latest` — fresh `updatedAt`,
   `cityCount` ≈ 200+.
3. On the site, search a city (e.g. Delhi) — modal shows the AQI with
   "Source: CPCB (Govt. of India) · N stations · Updated …".
4. Spot-check 2–3 cities against https://airquality.cpcb.gov.in/AQI_India/
   (the site shows a city average; the portal shows per-station values).

## Maintenance

- Unit tests for the aggregation math: `cd functions && npm test`.
- Fetch/delivery logs: GitHub → Actions → refresh-aqi runs.
- Processing logs: Firebase console → Functions → refreshAqiHttp.
- If data.gov.in rotates field names again, `functions/aqi.js`
  (`subIndexOf`) is the only place that reads them.
