# Harmonic Learning Loop

Status: Phase 1 (logging + reviewed calibration)
Date: 2026-11-27

## Goal

Turn every harmonic scan into a measurable sample, then use the outcomes to
improve the rule set without overfitting.

No harmonic system is perfect. The target is a small, durable edge with
controlled invalidation risk, measured out of sample.

## Flow

```text
scan -> candidate log (Redis) -> 10-day wait -> outcome evaluation -> calibration
```

### 1. Candidate logging

After a fresh `/api/harmonic/scan` result, the scanner records every match:

- symbol, pattern, timeframe, direction, status
- score, price, PRZ, invalidation, T1, T2
- pivot D date, scan date, distance to PRZ

Storage:

- `telaah:harmonic:candidates` sorted set (last 5,000 candidates)
- one entry per candidate per day (deduplicated for 14 days)

Every scan does not create duplicates. The log is best-effort; a Redis outage
does not break the scan response.

### 2. Outcome evaluation

The daily evaluation job at **17:30 WIB**:

1. loads candidates older than 10 days;
2. groups them by symbol;
3. fetches daily candles once per symbol;
4. measures T1, T2, invalidation, or timeout over up to 60 bars;
5. stores the result in `telaah:harmonic:evaluations`.

Run manually:

```bash
./deploy/podman/harmonic-evaluate.sh
```

### 3. Calibration

`/harmonic/calibration` aggregates live outcomes by pattern, timeframe,
direction, and status:

- sample size
- T1 / T2 / invalidation rates
- average days to T1
- suggested weight delta
- confidence: low (<20), medium (20-49), high (>=50)

The suggested delta is **not applied automatically**. A production weight
change requires:

1. enough out-of-sample samples;
2. a stable result across timeframes and market regimes;
3. a code review and a fresh walk-forward run;
4. an explicit release.

This is deliberate: automatic tuning on a small sample is a fast path to
overfitting.

## Guardrails

- Do not tune on the same window used for validation.
- Do not trust groups with fewer than 20 evaluated candidates.
- Treat `forming` patterns separately from `completed` patterns.
- Keep the 0.4% round-trip fee assumption visible; add slippage per symbol
  before making return claims.
- A high T1 rate with a high invalidation rate can still be a poor strategy.

## Current limits

- The first useful calibration batch needs at least 10 days of logged scans
  and enough candidates per group.
- The live log covers scans that pass through the API; watchlist-only scans
  are not logged yet.
- Evaluation uses Yahoo daily candles; delayed data can change the exact
  intraday outcome.
