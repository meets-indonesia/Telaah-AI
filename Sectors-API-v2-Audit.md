# Sectors API v2 — Capability Audit for Telaah 360

## Executive Summary

Sectors API v2 provides enough first-party coverage to build Telaah 360 as an evidence-backed assistant for one IDX issuer: company reports, quarterly financials, valuation/peers, ownership, corporate actions, filings/news/suspensions, daily price-volume, broker aggregates, and foreign flow are all documented. The API does **not** document real-time running trades, order book, execution timestamps, or parent-order reconstruction; those must remain out of scope.

The v2 documentation index contains **66 API-reference pages**: 32 Indonesia/IDX, 11 Singapore/SGX, 4 Malaysia/KLSE, and 19 mining-extension pages. This audit read the v2 overview, changelog, and each listed API-reference page.

## Platform Rules

| Rule | Implementation consequence |
|---|---|
| v1 was discontinued on 11 May 2026; only v2 is supported. | Use only `/v2/*` routes. |
| Base URL is `https://api.sectors.app`; authentication is the `Authorization` header containing the API key. | Keep key server-side; never expose in browser or logs. |
| Successful 2xx calls consume the documented endpoint cost. A valid 404 lookup costs 1 credit. 400 validation failures, 401/403, 429, and 5xx do not consume credits. | Validate symbol, slug, dates, sections, and pagination locally before calling. |
| Empty list/filter result is a successful, billed result. | Treat empty result as `available_empty`, not as error or zero. |
| Natural-language company screener costs 3 credits; structured screener costs 1. | Use structured queries in production; reserve `q` for an explicitly requested natural-language experiment. |

Sources: [v2 overview](https://docs.sectors.app/get-started/v2/overview.md), [v2 changelog](https://docs.sectors.app/api-references/v2/changelog.md), [Company Report reference](https://docs.sectors.app/api-references/v2/indonesia/report/company-report.md).

## Telaah 360: Direct Capability Match

| Telaah module | API support | Recommended use |
|---|---|---|
| Claim Intelligence | Strong | Route claim type to financial, market, broker, event, or valuation evidence. |
| Business & Financial Health | Strong | Get available dates first; fetch only the required quarterly reports; use Company Report `financials` for annual context. |
| Valuation & Peer Lens | Strong with validation | Company Report `valuation` + `peers`; expose only comparisons with matched period/basis. |
| Ownership/Profile | Strong | Company Report `overview`, `management`, `ownership`; shareholder-composition endpoint; free-float endpoint. |
| FlowLens broker context | Strong for end-of-day aggregate flow | Per-symbol broker summary, top buyers/sellers, registry, and foreign flow. Do not infer identity, intent, or coordination. |
| Price/Volume/Technical | Strong for daily indicators | Daily transaction series supports close/volume, 90-day range; compute indicators in application code. |
| Events & Disclosure | Strong | Corporate actions, filings, suspensions, news. Treat news as context; preserve publication date/source. |
| Peer and sector context | Strong but bounded | Screener/taxonomy/subsector report; maximum 5 peers after comparable-metric gate. |
| Mining-specific issuer context | Conditional expansion | Mining extension supports operations, commodity pricing, production, ownership, licences; entity mapping and USD units require explicit handling. |

## Credit-Aware Request Plan

### Quick Check: target 5–9 credits

1. Resolve issuer through a cached/screened directory or validated symbol.
2. Fetch one or two Company Report sections (`overview`, then only the section relevant to the claim).
3. Fetch daily market data only for technical/price claims.
4. Fetch broker summary/foreign flow only for broker-flow claims.
5. Fetch one event endpoint only if the input concerns an event.

### Full Company Review: target 14–22 credits before cache

| Call family | Typical cost | Notes |
|---|---:|---|
| Company Report selected sections | 1 credit per section | Default all 8 IDX sections costs 8; request named sections only. |
| Quarterly financials | 1 per returned quarter | Retrieve dates first and fetch only the periods used. |
| Daily transaction data | 1 | Up to 90 days; supports technical and price-volume context. |
| Broker summary + foreign flow | 1 + 1 | Use top buyers/sellers only when ranking itself is needed (2 credits). |
| Ownership/corporate action/filing/news/suspension | 1 each | Execute progressively and cache report snapshot. |

Avoid default multi-section/multi-classification calls where a user did not ask for all data. The global full-universe close feed is approximately 32 pages/credits for ~950 tickers; it belongs in a scheduled scanner, not in a per-report request.

## IDX API v2 Catalog

### Screeners, taxonomy and helper lists

| Endpoint | Cost | Capability | Telaah use |
|---|---:|---|---|
| [`GET /v2/companies/`](https://docs.sectors.app/api-references/v2/indonesia/screener/companies.md) | 1 structured / 3 natural language | Filter/sort IDX companies. | Resolve/discover peer universe and structured filters. |
| [`GET /v2/free-float/`](https://docs.sectors.app/api-references/v2/indonesia/screener/free-float.md) | 1 per 100 returned | Free-float analysis. | Ownership/Profile context. |
| [`GET /v2/companies/list_companies_with_segments/`](https://docs.sectors.app/api-references/v2/indonesia/helper-list/companies-segments-list.md) | 1 | Companies with segment availability. | Gate segment analysis before call. |
| [`GET /v2/companies/quarterly-financial-dates/`](https://docs.sectors.app/api-references/v2/indonesia/helper-list/latest-quarterly-dates.md) | 1/page | Latest quarterly date for full universe; ~32 pages complete. | Scheduled freshness index; poll with `since`. |
| [`GET /v2/company/get_quarterly_financial_dates/{symbol}/`](https://docs.sectors.app/api-references/v2/indonesia/helper-list/company-quarterly-dates.md) | 1 | Valid quarterly report dates for a symbol. | Mandatory preflight for period-safe comparisons. |
| [`GET /v2/industries/`](https://docs.sectors.app/api-references/v2/indonesia/helper-list/industries.md) | 1 | Industry/subsector slugs. | Peer taxonomy filter. |
| [`GET /v2/subindustries/`](https://docs.sectors.app/api-references/v2/indonesia/helper-list/subindustries.md) | 1 | Industry/subindustry slugs. | Narrow peer taxonomy. |
| [`GET /v2/subsectors/`](https://docs.sectors.app/api-references/v2/indonesia/helper-list/subsectors.md) | 1 | Sector/subsector slugs. | Sector context. |
| [`GET /v2/tags/`](https://docs.sectors.app/api-references/v2/indonesia/helper-list/tags.md) | 1 | News/filing tag vocabulary. | Validate event/news filters. |

### Company, financial and sector reports

| Endpoint | Cost | Capability | Telaah use |
|---|---:|---|---|
| [`GET /v2/company/report/{symbol}/`](https://docs.sectors.app/api-references/v2/indonesia/report/company-report.md) | 1/section; 8 default | Sections: overview, valuation, future, peers, financials, dividend, management, ownership. | Primary Full Review source; always request explicit sections. |
| [`GET /v2/financials/quarterly/{symbol}/`](https://docs.sectors.app/api-references/v2/indonesia/report/quarterly-financials.md) | 1/quarter returned | Quarterly data; fields vary by sector. | Claim check and Business & Financial Health. |
| [`GET /v2/company/get-segments/{symbol}/`](https://docs.sectors.app/api-references/v2/indonesia/report/company-segments.md) | 1 | Revenue/cost segment breakdown. | Optional segment/dependency explanation. |
| [`GET /v2/subsector/report/{sub_sector}/`](https://docs.sectors.app/api-references/v2/indonesia/report/sector-report.md) | 1/section; 6 default | Subsector report. | Sector Lens; select sections only. |
| [`GET /v2/company/shareholders-composition/{symbol}/`](https://docs.sectors.app/api-references/v2/indonesia/company/shareholders-composition.md) | 1 | Shareholder composition. | Ownership section; report dates/limitations. |
| [`GET /v2/company/corporate-actions/{symbol}/`](https://docs.sectors.app/api-references/v2/indonesia/company/corporate-actions.md) | 1 | Corporate actions for issuer. | Rights issue/dividend/split/event explanation. |
| [`GET /v2/listing-performance/{symbol}/`](https://docs.sectors.app/api-references/v2/indonesia/ipo/listing-performance.md) | 1 | Performance since IPO. | Long-horizon context only. |

### Market, index and rankings

| Endpoint | Cost | Capability | Telaah use |
|---|---:|---|---|
| [`GET /v2/daily/{symbol}/`](https://docs.sectors.app/api-references/v2/indonesia/transaction/daily.md) | 1 | Close, volume and market cap for up to 90 days. | Returns, price/volume chart, SMA/EMA/MACD/RSI. |
| [`GET /v2/close/`](https://docs.sectors.app/api-references/v2/indonesia/transaction/close.md) | 1/page; ~32 full universe | Daily close for every IDX ticker. | Scheduled discovery, never default per report. |
| [`GET /v2/idx-total/`](https://docs.sectors.app/api-references/v2/indonesia/transaction/idx-total.md) | 1 | Historical IDX total market cap up to 90 days. | Market backdrop. |
| [`GET /v2/index-daily/{index_code}/`](https://docs.sectors.app/api-references/v2/indonesia/transaction/index-daily.md) | 1 | Daily index price. | Benchmark context. |
| [`GET /v2/most-traded/`](https://docs.sectors.app/api-references/v2/indonesia/ranking/most-traded.md) | 2 | Most traded by volume, up to 90 days. | Optional watchlist/discovery. |
| [`GET /v2/companies/top-changes/`](https://docs.sectors.app/api-references/v2/indonesia/ranking/top-changes.md) | 1 per classification × period; 10 default | Gainers/losers across periods. | Optional market context; specify one pair. |

### Events, disclosures and brokers

| Endpoint | Cost | Capability | Telaah use |
|---|---:|---|---|
| [`GET /v2/filings/`](https://docs.sectors.app/api-references/v2/indonesia/news/filings.md) | 1 | IDX insider/major-holder filings. | Event timeline and ownership context. |
| [`GET /v2/news/`](https://docs.sectors.app/api-references/v2/indonesia/news/news.md) | 1 | IDX/mining news with filters. | News explanation/source context. |
| [`GET /v2/suspensions/`](https://docs.sectors.app/api-references/v2/indonesia/news/suspensions.md) | 1 | Suspension history/reasons. | Event risk context. |
| [`GET /v2/broker-summary/{symbol}/`](https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-summary-by-symbol.md) | 1 | Per-broker daily rows, 14-day range; buy/sell/net, lots, frequency, WAP. | Core FlowLens module. |
| [`GET /v2/broker-summary/{symbol}/top/`](https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-summary-top.md) | 2 | Top buyers/sellers per symbol. | Summary only when ranking is useful. |
| [`GET /v2/broker-activity/{broker_code}/`](https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-activity-by-code.md) | 1 | Broker’s stock/day activity, 14-day range. | Broker-centric follow-up. |
| [`GET /v2/broker-activity/{broker_code}/top/`](https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-activity-top.md) | 2 | Broker top accumulations/distributions. | Optional broker narrative. |
| [`GET /v2/brokers/`](https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-registry.md) | 1 | Curated broker name, origin, cohort, licence. | Cache as reference data; metadata only. |
| [`GET /v2/brokers/top/`](https://docs.sectors.app/api-references/v2/indonesia/brokers/top.md) | 2 | Daily broker gross/absolute-net ranking. | Optional market flow backdrop. |
| [`GET /v2/foreign-flow/{symbol}/`](https://docs.sectors.app/api-references/v2/indonesia/brokers/foreign-flow-by-symbol.md) | 1 | Daily net foreign-broker inflow, up to 90 days. | Foreign-flow context; not ownership inference. |

## SGX API v2 Catalog

SGX supports screener, taxonomy/tags, company report, daily price-volume, share buybacks, short-sell, rankings, filings and news. It is useful for a future regional version of Telaah, but not needed to ship an IDX-first product.

| Endpoint family | Cost rule | Capability |
|---|---:|---|
| [`/v2/sgx/companies/`](https://docs.sectors.app/api-references/v2/singapore/screener/sgx-companies.md) | 1 structured / 3 natural language | SGX screener. |
| [`/v2/sgx/sectors/`](https://docs.sectors.app/api-references/v2/singapore/helper-list/sgx-sectors.md), [`subsectors`](https://docs.sectors.app/api-references/v2/singapore/helper-list/sgx-subsectors.md), [`tags`](https://docs.sectors.app/api-references/v2/singapore/helper-list/sgx-tags.md) | 1 each | SGX reference vocabularies. |
| [`/v2/sgx/company/report/{symbol}/`](https://docs.sectors.app/api-references/v2/singapore/report/company-report.md) | 1/section; 4 default | SGX company report. |
| [`/v2/sgx/daily/{symbol}/`](https://docs.sectors.app/api-references/v2/singapore/transaction/daily.md) | 1 | Daily price and volume. |
| [`/v2/sgx/buybacks/`](https://docs.sectors.app/api-references/v2/singapore/transaction/share-buybacks.md) | 1 | Share buybacks. |
| [`/v2/sgx/short-sell/`](https://docs.sectors.app/api-references/v2/singapore/transaction/short-sell.md) | 1 | Short-sell data. |
| [`/v2/sgx/companies/top/`](https://docs.sectors.app/api-references/v2/singapore/ranking/top-companies.md) | 1/classification; 5 default | SGX ranking. |
| [`/v2/sgx/filings/`](https://docs.sectors.app/api-references/v2/singapore/news/sgx-filings.md), [`news`](https://docs.sectors.app/api-references/v2/singapore/news/sgx-news.md) | 1 each | Insider filing and news. |

## KLSE API v2 Catalog

| Endpoint family | Cost rule | Capability |
|---|---:|---|
| [`/v2/klse/companies/`](https://docs.sectors.app/api-references/v2/malaysia/klse-companies.md) | 1 | KLSE company directory by sector. |
| [`/v2/klse/companies/top/`](https://docs.sectors.app/api-references/v2/malaysia/klse-top-companies.md) | 1/classification; 5 default | KLSE rankings. |
| [`/v2/klse/company/report/{symbol}/`](https://docs.sectors.app/api-references/v2/malaysia/klse-report.md) | 1/section; 4 default | KLSE company report. |
| [`/v2/klse/sectors/`](https://docs.sectors.app/api-references/v2/malaysia/klse-sectors.md) | 1 | KLSE sectors. |

## Mining Extension v2 Catalog

All documented mining endpoints cost 1 credit. They are an optional enrichment layer for mining/emerging-resource issuer prompts; they are not a replacement for IDX market data.

| Family | Endpoints | Capability |
|---|---|---|
| Companies | [`companies`](https://docs.sectors.app/api-references/v2/mining/companies/mining-companies.md), [`detail`](https://docs.sectors.app/api-references/v2/mining/companies/mining-companies-detail.md), [`financials`](https://docs.sectors.app/api-references/v2/mining/companies/mining-companies-financials.md), [`ownership`](https://docs.sectors.app/api-references/v2/mining/companies/mining-companies-ownership.md), [`performance`](https://docs.sectors.app/api-references/v2/mining/companies/mining-companies-performance.md) | Search/company operations, USD financials, ownership, production/sales performance. |
| Commodities & trade | [`commodities`](https://docs.sectors.app/api-references/v2/mining/commodities-trade/commodities.md), [`price`](https://docs.sectors.app/api-references/v2/mining/commodities-trade/commodity-price.md), [`exports`](https://docs.sectors.app/api-references/v2/mining/commodities-trade/export-destination.md), [`global`](https://docs.sectors.app/api-references/v2/mining/commodities-trade/global-commodity.md), [`sales destinations`](https://docs.sectors.app/api-references/v2/mining/commodities-trade/sales-destination.md) | Commodity coverage, monthly/bi-weekly pricing, export/global/sales context. |
| Production & sites | [`resources index`](https://docs.sectors.app/api-references/v2/mining/sites-production/commodity-resources-reserves.md), [`resources detail`](https://docs.sectors.app/api-references/v2/mining/sites-production/commodity-resources-reserves-detail.md), [`sites`](https://docs.sectors.app/api-references/v2/mining/sites-production/mining-sites.md), [`site detail`](https://docs.sectors.app/api-references/v2/mining/sites-production/mining-site-detail.md), [`total production`](https://docs.sectors.app/api-references/v2/mining/sites-production/commodity-production.md) | Provincial resources/reserves, site data, national production. |
| Contracts & licences | [`contracts`](https://docs.sectors.app/api-references/v2/mining/licenses-auctions/mining-contracts.md), [`auctions`](https://docs.sectors.app/api-references/v2/mining/licenses-auctions/mining-license-auctions.md), [`auction detail`](https://docs.sectors.app/api-references/v2/mining/licenses-auctions/mining-license-auctions-detail.md), [`licenses`](https://docs.sectors.app/api-references/v2/mining/licenses-auctions/mining-licenses.md) | Contract, auction, and licence intelligence. |

## Architecture Decisions for Telaah

1. **Use the REST API through typed server-side adapters.** It provides deterministic, cacheable inputs for claim verification and calculations.
2. **Cache reference data:** broker registry, sector taxonomies, tags and peer/universe candidates. Cache report-level responses by symbol, sections, date window and parameters.
3. **Use a section planner:** `Company Report` is valuable but bills per section. Quick Check requests only required sections; Full Review requests named sections progressively.
4. **Period guard comes first:** quarterly-date helper → quarterly financials. Never ask the agent to infer a report date.
5. **Implement a data-quality gate:** raw endpoint response validates to Zod schema → normalised evidence → calculation → agent explanation → citation guard.
6. **Keep FlowLens factual:** broker summary supports daily aggregate broker rows, not trade reconstruction. Present origin/cohort as registry metadata and never as investor identity.
7. **Treat mining as conditional:** use only after explicit company/entity match; label USD values and distinguish mining-company data from IDX issuer data.

## Recommended First Build Order

1. Authentication, adapter/error model, cache, date/symbol validation.
2. Company Report selected sections + quarterly date/financials + daily market data.
3. Claim/evidence schema and direct-answer UI.
4. Broker summary, foreign flow and broker-registry cache.
5. Corporate actions, filings, suspensions and news timeline.
6. Peer/valuation comparability gate.
7. Ownership/free float, mining enrichment, save/share, and regional markets.

## Sources

The complete primary-source index is [Sectors API `llms.txt`](https://docs.sectors.app/llms.txt). Core platform rules come from the [v2 overview](https://docs.sectors.app/get-started/v2/overview.md) and [v2 changelog](https://docs.sectors.app/api-references/v2/changelog.md). Each catalog entry above links to its own official API-reference page.

