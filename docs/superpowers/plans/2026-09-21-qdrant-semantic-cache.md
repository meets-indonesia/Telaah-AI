# Qdrant Vector Semantic Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a local Qdrant vector semantic caching layer with calendar-day freshness invalidation to save Sectors credits and OpenRouter tokens.

**Architecture:** Docker Qdrant (`localhost:6333`) + OpenRouter text embeddings + Next.js API interceptor in `/api/analyze`. Intercepts incoming user prompts before calling Sectors / LLM; matches similarity $\ge 0.88$; verifies `capturedDate === today`; returns cached report or updates stale entry.

**Tech Stack:** Docker (OrbStack), Qdrant REST API, OpenRouter Embedding API, TypeScript, Next.js 14.

**Spec:** `docs/superpowers/specs/2026-09-21-qdrant-vector-semantic-cache.md`

## Global Constraints
- Do not break existing API contracts or frontend states.
- Calendar-day freshness rule: if `capturedDate !== today (YYYY-MM-DD)`, cache MUST be treated as expired.
- Graceful degradation: If Qdrant is down or unreachable, bypass cache without throwing 500 to the user.
- Zero TypeScript build errors (`npm run build` must succeed).

---

### Task 1: Qdrant Docker Setup & Volume Configuration
**Files:**
- Modify: `.gitignore`
- Create/Start: Docker container `telaah-qdrant` on port `6333`

- [ ] **Step 1: Add data/qdrant_storage to .gitignore**
- [ ] **Step 2: Start Qdrant container via Docker**
  Run: `docker run -d --name telaah-qdrant -p 6333:6333 -p 6334:6334 -v $(pwd)/data/qdrant_storage:/qdrant/storage:z qdrant/qdrant`
- [ ] **Step 3: Verify Qdrant health check**
  Run: `curl http://localhost:6333/healthz`
- [ ] **Step 4: Commit**
  `git commit -m "chore: add qdrant persistent storage to gitignore and start container"`

---

### Task 2: Vector Embedding & Qdrant Client Layer
**Files:**
- Create: `src/lib/vector/embeddings.ts`
- Create: `src/lib/vector/qdrant.ts`

- [ ] **Step 1: Implement embeddings.ts**
  Fetch text embeddings (1536 dimensions) from OpenRouter using `process.env.OPENROUTER_API_KEY`.
- [ ] **Step 2: Implement qdrant.ts**
  - Collection initialization: `ensureCollectionExists()` with distance `Cosine` and size 1536.
  - Search method: `searchSemanticReport(embedding, symbol, minScore = 0.88)`
  - Upsert method: `upsertReportToVectorCache(prompt, symbol, report, mode)`
  - Safe error wrappers with graceful fallback if Qdrant is offline.
- [ ] **Step 3: Verify compilation**
  Run `npm run build` to ensure type safety.
- [ ] **Step 4: Commit**
  `git commit -m "feat(vector): implement OpenRouter embeddings and Qdrant client layer"`

---

### Task 3: Integrate Semantic Cache into /api/analyze with Date Invalidation
**Files:**
- Modify: `src/app/api/analyze/route.ts`

- [ ] **Step 1: Add pre-flight semantic cache lookup**
  - After symbol extraction, query `searchSemanticReport(prompt, symbol)`.
  - If match found: check `payload.capturedDate === getTodayWIB()`.
  - If matching and date is today: return cached report with tag `{ fromVectorCache: true }`.
  - If date is different (stale day): log expiration and proceed to fetch fresh data.
- [ ] **Step 2: Store fresh results into Qdrant**
  On fresh fetch completion, asynchronously save into Qdrant via `upsertReportToVectorCache()`.
- [ ] **Step 3: Test cache hit & date invalidation using curl**
- [ ] **Step 4: Commit**
  `git commit -m "feat(api): integrate semantic cache with calendar-day freshness guard in /api/analyze"`

---

### Task 4: Frontend Cache Indicator & Verification
**Files:**
- Modify: `src/app/page.tsx`
- Test on `http://localhost:3000`

- [ ] **Step 1: Add subtle visual indicator when result is served from Vector Cache (0 Credits)**
- [ ] **Step 2: End-to-end testing in orca_browser**
  - Ask query 1: *"Bagaimana prospek laba BBCA?"*
  - Ask query 2 (semantic variation): *"BCA labanya kuartal ini bagus gak?"* $\to$ verify instantaneous cache hit with 0 credits.
- [ ] **Step 3: Verify `npm run build`**
- [ ] **Step 4: Commit**
  `git commit -m "feat(ui): add vector cache indicator and complete end-to-end verification"`
