# Local Qdrant Vector Semantic Cache Spec

## Overview
Implement a local vector database caching layer using **Qdrant** running in Docker (via OrbStack). The purpose is to drastically cut down Sectors API credits and OpenRouter synthesis token usage by semantically searching previously analyzed reports before making fresh API calls.

## Objectives
1. **Semantic Matching**: Before calling Sectors API and OpenRouter synthesis, perform semantic cosine similarity matching against user prompts stored in Qdrant (similarity threshold $\ge 0.88$).
2. **Freshness Guard (Calendar Day Invalidation)**: If a matching report is found, inspect its `capturedDate` (in `YYYY-MM-DD` WIB format).
   - If `capturedDate === today`: Hit cache! Return the full report immediately (**0 Sectors credits, 0 LLM synthesis tokens**).
   - If `capturedDate !== today`: Cache is expired/stale because the trading day or market state has rolled over. Trigger a fresh fetch from Sectors and LLM, then upsert the new report into Qdrant.
3. **Local Docker Setup**: Run Qdrant on `localhost:6333` backed by persistent storage at `data/qdrant_storage/`.
4. **Graceful Fallback**: If the Qdrant container is unreachable, the system must transparently bypass vector caching and proceed to normal fetching without throwing errors to the user.

---

## Technical Architecture

### 1. Vector Embeddings
- Provider: OpenRouter (`openai/text-embedding-3-small` or standard embedding API via existing `OPENROUTER_API_KEY`).
- Dimension: 1536 floats.
- Distance metric: Cosine.

### 2. Qdrant Collection (`telaah_intelligence_cache`)
- Point ID: UUIDv4 or deterministic hash of prompt + symbol.
- Vector: 1536 floats.
- Payload:
  ```json
  {
    "symbol": "BBCA",
    "prompt": "Bagaimana prospek laba dan valuasi BBCA?",
    "capturedDate": "2026-09-21",
    "capturedTimestamp": 1789973200000,
    "mode": "full",
    "report": { ...CompanyIntelligenceReport... }
  }
  ```

### 3. Workflow Sequence
1. User enters prompt in frontend / Copilot.
2. `classifier.ts` classifies input and extracts ticker symbol.
3. Cache check (`querySemanticReportCache(prompt, symbol)`):
   - Compute embedding of prompt.
   - Search Qdrant with optional symbol filter.
   - If score $\ge 0.88$:
     - Check `payload.capturedDate === getTodayWIB()`.
     - If true: Return cached report immediately with tag `fromVectorCache: true`.
     - If false: Log cache expiration (stale day) and continue to Step 4.
4. If cache miss / expired:
   - Call Sectors API v2 and OpenRouter synthesizer.
   - Save resulting report to Qdrant with today's `capturedDate`.
   - Return report to user.

---

## Verification Plan
1. Start Qdrant Docker container via OrbStack and verify health check at `http://localhost:6333/healthz`.
2. Unit / integration check:
   - Save sample report for `BBCA` with today's date.
   - Query semantically related prompt: *"BCA prospek labanya gimana?"* $\to$ must match and return cached result (0 credits).
   - Test date invalidation: set `capturedDate` to yesterday $\to$ must bypass cache and trigger fresh API fetch.
3. Verify graceful degradation when Docker container is stopped.
4. Run `npm run build` to verify zero TypeScript errors.
