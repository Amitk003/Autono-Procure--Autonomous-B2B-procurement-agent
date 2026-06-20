# Changelog

All notable changes to the Autono-Procure project are documented in this file.

## [1.0.0] - 2026-06-20

### Added

- **Initial project scaffold**: TypeScript project with strict mode, Vitest, Pino logging, Zod validation
- **Wire Monitor module** (`src/wire-monitor/`): SupplierMonitor class that polls B2B supplier inventory via the Wire API. Includes stockout detection via state transition analysis (in_stock -> out_of_stock / low_stock).
- **Anakin Scraper module** (`src/anakin-scraper/`): AnakinScraperClient that uses the Anakin Search API to find alternative suppliers and the URL Scraper with Gemini AI (`generateJson: true`) to extract structured data from supplier pages.
- **MCP Security module** (`src/mcp-security/`): ReBACChecker for Relationship-Based Access Control permission validation, IdentityManager for credential-free identity injection into Wire API payloads.
- **Procurement Agent** (`src/agent/`): Orchestrator that ties all layers together with a polling cycle, stockout detection, and mitigation workflow.
- **System prompt** (`src/agent/system-prompt.ts`): LLM system prompt for agentic behavior with structured output format.
- **Stockout simulation demo** (`src/demo/`): End-to-end demo that calls live Anakin APIs (Search + Scraper) and saves results to Excel.
- **Excel persistence** (`src/persistence.ts`): Saves supplier data, extracted content, and order payloads as .xlsx files with formatted headers and auto-filters.
- **Documentation**: README.md with problem/solution/quick-start, docs/ARCHITECTURE.md with 3-layer system design, docs/DEMO.md with phase-by-phase walkthrough.
- **Unit tests**: 14 tests across 3 test suites covering stockout detection, ReBAC validation, and identity management.

### Fixed

- **Stockout detection logic**: Fixed `hasStockout()` to only trigger on state transitions (in_stock -> out_of_stock/low_stock), not when both states are out_of_stock.
- **Config lazy-loading**: Made config module lazy via Proxy to prevent crashes when env vars are missing at import time.
- **Missing logging gaps**: Added log entries for `extractStructuredSupplierData()` start/complete and null identity abort path in `handleStockout()`.
- **TypeScript errors**: Fixed type mismatches with Anakin SDK types, unused parameter warnings, and pino logger API usage.

### Changed

- **Config module**: Added search/agent configuration values (SEARCH_LIMIT, SEARCH_MAX_URLS, AGENT_DEFAULT_CONFIDENCE, delivery day range, supplier details). All hardcoded magic numbers extracted to config/env.
- **Demo rewrote**: Removed all simulated/dummy data. Demo now calls live Anakin Search and URL Scraper APIs exclusively. Simplified from 6-phase (with simulated monitoring) to 4-phase (real API calls only).
- **IdentityManager**: Removed hardcoded MOCK_IDENTITIES fallback. Identities must be injected via constructor. Returns null instead of silently falling back to first identity.
- **SupplierMonitor**: Removed unused `_supplierUrl` parameter from `resolveInventoryAction()`.
- **AnakinScraperClient**: Removed unused `_skuName` parameter from `searchAlternativeSuppliers()`. Magic numbers (limit=5, maxUrls=10) moved to config.
- **Dead exports removed**: Cleaned up unused Zod schemas, interfaces, and `runId()`/`getSystemPrompt()` functions from barrel exports.
- **ProcurementAgent**: Hardcoded PRIMARY_SKU values replaced with config-driven values. Delivery day estimation uses configurable range instead of fixed 5-14 random.
