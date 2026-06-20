# Autono-Procure Architecture

## System Overview

Autono-Procure is a fully autonomous B2B procurement agent that operates securely across borders. Designed for sectors facing critical material shortages, the agent monitors primary suppliers for necessary inventory. If a geopolitical shock causes a stockout at a primary vendor, the agent autonomously searches for verified alternative suppliers globally and executes the purchase, all while maintaining rigorous security protocols via MCP and AuthZEN.

## Architecture Layers

```
                    +---------------------+
                    |   Procurement       |
                    |   Agent (Orchestr.) |
                    +--------+-----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v-----+  +---v---------+  +--v-----------+
     | Wire Monitor |  | Anakin      |  | MCP Security |
     | (Layer 1)    |  | Scraper     |  | (Layer 3)    |
     |              |  | (Layer 2)   |  |              |
     | Polls B2B    |  | Searches &  |  | ReBAC Check  |
     | supplier     |  | extracts    |  | Identity Inj |
     | inventory    |  | alt vendors |  | AuthZEN      |
     +--------------+  +-------------+  +--------------+
              |              |              |
              v              v              v
     +---------------------+---------------------+
     |           Anakin.io API Platform          |
     |  (Wire API + URL Scraper + Search API)   |
     +------------------------------------------+
```

### Layer 1: Primary Supplier Monitoring (Wire API)

The agent uses the Wire API to check inventory on a supported B2B catalog. Wire provides pre-built API actions for 200+ platforms. This prevents the agent from wasting tokens on raw HTML parsing and returns clean JSON indicating stock status.

**Key Files:**
- `src/wire-monitor/supplier-monitor.ts` - Polls primary supplier via Wire API
- `src/wire-monitor/types.ts` - Wire task/response schemas

### Layer 2: Autonomous Alternative Discovery (AnakinScraper)

When a stockout is detected, the agent shifts from the Wire API to dynamic web exploration. It uses the Anakin Universal Scraper which features a robust handler chain:
1. Fast HTTP fetch (primary)
2. Camoufox anti-detect browser (fallback for JS-heavy sites)
3. External API fallback (last resort)

The scraper also uses Gemini AI (via `generateJson: true`) to auto-extract structured supplier data directly from unstructured HTML at the point of extraction.

**Key Files:**
- `src/anakin-scraper/scraper-client.ts` - Search and extraction client
- `src/anakin-scraper/types.ts` - Scrape request/response schemas

### Layer 3: Zero-Trust Security (MCP + ReBAC)

An autonomous agent that can browse and buy requires rigorous security. The MCP layer:
- Validates every action against Relationship-Based Access Control (ReBAC) policies
- Never exposes plaintext credentials to the LLM
- Uses named identity references injected at the Wire API call layer
- Enforces `mcp:tools:write` and `mcp:identity:use` permissions

**Key Files:**
- `src/mcp-security/rebac-checker.ts` - ReBAC permission validation
- `src/mcp-security/identity-manager.ts` - Credential identity injection

### Agent Orchestration

The Procurement Agent ties all layers together. It maintains a polling cycle, detects state changes, and orchestrates the stockout mitigation workflow.

**Key Files:**
- `src/agent/procurement-agent.ts` - Main orchestration logic
- `src/agent/system-prompt.ts` - LLM system prompt for agentic behavior

## Data Flow

1. **Poll Cycle**: Agent polls primary supplier via Wire API `b2b_check_inventory` action
2. **State Comparison**: Previous vs current inventory snapshot compared
3. **Stockout Trigger**: Status change from `in_stock` -> `out_of_stock` or `low_stock`
4. **ReBAC Check**: Agent validates `mcp:tools:write` permission
5. **Search Discovery**: Anakin Search API finds alternative supplier URLs
6. **Content Extraction**: Anakin URL Scraper + Gemini AI extracts structured data
7. **Identity Resolution**: IdentityManager matches supplier to credential vault
8. **ReBAC Check 2**: Agent validates `mcp:identity:use` permission
9. **Order Execution**: Wire API called with injected identity (no plaintext credentials)

## Security Model

- **No plaintext credentials in LLM context**: Identity references replace raw credentials
- **Every action validated**: ReBAC checks before every Wire write operation
- **Audit trail**: All authorization decisions logged with timestamps
- **Least privilege**: Agent only granted required permissions (read, write, identity use)
