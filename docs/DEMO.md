# Autono-Procure Demo Guide

## End-to-End Demo Flow

This demo searches the web for alternative suppliers for a given lab SKU using the Anakin Search API, extracts structured data from real supplier pages using the Anakin URL Scraper, validates permissions via ReBAC, and prepares a credential-free Wire API order payload.

### Prerequisites

- Node.js 18+
- Anakin API key (get one free at https://anakin.io)
- Gemini API key (optional, for structured JSON extraction)

### Setup

```bash
cp .env.example .env
# Edit .env with your API keys
npm install
```

### Running the Simulation

```bash
npm run demo
```

### Demo Walkthrough

#### Phase 1: Search for Alternative Suppliers (Anakin Search API)
The agent searches the web for suppliers carrying the target SKU using the Anakin Search API. Three search queries are generated dynamically:

- `{SKU} laboratory supplier buy online`
- `{SKU} chemical supplier price stock`
- `buy {SKU} alternative suppliers industrial`

Results are deduplicated and limited to configurable maximum (default 10). All found supplier URLs are saved to an Excel file.

**Key Innovation**: The Anakin Search API returns clean, structured results with URLs, titles, and snippets - no raw HTML parsing needed.

#### Phase 2: Structured Data Extraction (Anakin URL Scraper + Gemini AI)
Each supplier URL is scraped using the Anakin URL Scraper. The `generateJson: true` flag passes unstructured web content through Gemini AI for structured JSON extraction at the point of data capture.

Key fields extracted:
- Price and currency
- Stock/availability status
- Minimum order quantity
- Supplier name

**Key Innovation**: Instead of scraping raw HTML and parsing it separately, Gemini extracts structured data (price, stock status, supplier name) directly during the scrape.

#### Phase 3: ReBAC Permission Validation
Before any order action, the agent validates two permissions against Relationship-Based Access Control (ReBAC) policy:

1. `mcp:tools:write` - Permission to execute Wire API write actions
2. `mcp:identity:use` - Permission to use identity credentials

**Key Innovation**: This implements ReBAC directly in the agent's execution loop, preventing unauthorized actions even if the LLM is compromised.

#### Phase 4: Identity Injection & Wire Order
If Wire identities are configured in the dashboard, the agent resolves the correct identity credential for the chosen alternative supplier and injects it into the Wire API call payload. No plaintext credentials ever enter the LLM context.

When no identities are configured, the demo logs the skipped step and saves an empty order record.

**Key Innovation**: Named identity references replace plaintext credentials. The agent passes only `credential_id` and `_identity_ref` - Wire's backend resolves the actual session.

### Output Files

All results are saved as Excel (.xlsx) files in the `data/` directory:

```
data/
  |- 2026-06-20T15-30-00_01_search_results.xlsx   # all supplier URLs
  |- 2026-06-20T15-30-05_02_supplier_data.xlsx     # extracted pricing & stock data
  |- 2026-06-20T15-30-05_03_order_payload.xlsx     # order payload with identity ref
```

### Expected Output

The simulation prints a complete trace with structured JSON at each step:

```
[OK] Anakin Search API - real web search for suppliers
[OK] Anakin Scraper API - real page extraction
[OK] ReBAC permission validation
[OK] Identity injection (no plaintext in LLM context)
```

### Recording Tips

1. Start the demo with `npm run demo`
2. Scroll through each phase slowly - show the actual supplier URLs being discovered
3. Pause at the ReBAC validation step to highlight the security innovation
4. End on the saved Excel files in the `data/` directory
5. Keep the submission under 3 minutes
