# Autono-Procure Demo Guide

## End-to-End Demo Flow

This demo simulates a geopolitical supply chain shock that causes a primary B2B supplier stockout, triggering the autonomous procurement agent.

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

#### Phase 1: Primary Supplier Monitoring (Wire API)
The agent polls the primary supplier's inventory using the Wire API `b2b_check_inventory` action. The initial snapshot shows `in_stock` status with 250 units available.

```
Initial inventory snapshot:
{
  "sku": "LAB-GRADE-ACETONE-99.9",
  "status": "in_stock",
  "quantity": 250,
  "lastUpdated": "2026-06-20T10:00:00.000Z",
  "raw": { "source": "wire_api", "stockStatus": "in_stock" }
}
```

#### Phase 2: Stockout Detection (Trigger)
A simulated geopolitical event causes the primary supplier's inventory to drop to zero. The agent detects the state transition from `in_stock` to `out_of_stock`.

**Key Innovation**: The Wire API returns clean JSON - no HTML parsing needed. This saves LLM tokens and reduces latency.

#### Phase 3: Agentic Discovery via AnakinScraper
The agent invokes the Anakin Universal Scraper handler chain to find alternative suppliers:

1. **HTTP fetch** - Fast path for simple pages
2. **Camoufox anti-detect browser** - For JavaScript-heavy or protected sites
3. **External API fallback** - Last resort

The search queries are dynamically generated:
- `{SKU} laboratory supplier buy online`
- `{SKU} chemical supplier price stock`
- `buy {SKU} alternative suppliers industrial`

#### Phase 4: Structured Data Extraction (Gemini AI)
The scraper uses the `generateJson: true` flag to pass unstructured web content through Gemini AI for structured JSON extraction at the point of data capture.

**Key Innovation**: Instead of scraping raw HTML and parsing it separately, Gemini extracts structured data (price, stock status, supplier name) directly during the scrape.

#### Phase 5: Zero-Trust ReBAC Permission Validation
Before executing any action, the agent validates:
1. `mcp:tools:write` - Permission to execute Wire API write actions
2. `mcp:identity:use` - Permission to use identity credentials

**Key Innovation**: This implements a Relationship-Based Access Control (ReBAC) model directly in the agent's execution loop, preventing unauthorized actions even if the LLM is compromised.

#### Phase 6: Identity Injection & Mock Order
The agent resolves the correct identity credential for the chosen alternative supplier and injects it into the Wire API call. No plaintext credentials ever enter the LLM context.

```
Wire action payload (identity injected, no plaintext credentials):
{
  "action": "add_to_cart",
  "sku": "LAB-GRADE-ACETONE-99.9",
  "quantity": 5,
  "credential_id": "cred-mock-lab-supplier",
  "_identity_ref": "identity-sigma-aldrich"
}
```

### Expected Output

The simulation prints a complete trace of all 6 phases with structured JSON at each step. The final summary confirms:
- [OK] Wire API supplier monitoring
- [OK] Stockout detection triggered
- [OK] AnakinScraper handler chain invoked
- [OK] Gemini AI structured extraction
- [OK] ReBAC permission validation passed
- [OK] Identity injection - no plaintext credentials exposed

### Recording Tips

1. Start the demo with `npm run demo`
2. Scroll through each phase slowly
3. Pause at the ReBAC validation step to highlight the security innovation
4. End on the identity injection payload to show no plaintext credentials
5. Keep the submission under 3 minutes
