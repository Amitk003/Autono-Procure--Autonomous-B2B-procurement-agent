# Autono-Procure

Autonomous B2B procurement agent with MCP-shielded supply chain automation.

Built for Anakin Blitz Hackathon using the Wire API and Anakin Universal Scraper.

## What It Does

A Node.js bot that watches a supplier's inventory. If stock runs out, it searches the web for alternative suppliers, extracts their prices and stock status, checks permissions, and prepares a purchase order -- all without exposing passwords to the AI.

## Problem

Geopolitical shocks can cause sudden stockouts of critical materials in laboratory and industrial supply chains. Manual alternative sourcing is slow, error-prone, and cannot operate 24/7.

## Solution

Autono-Procure is a fully autonomous procurement agent that:

1. **Monitors** primary supplier inventory via the Wire API (clean JSON, no HTML parsing)
2. **Detects** stockouts via state transition analysis
3. **Discovers** alternative suppliers using the Anakin Universal Scraper handler chain (HTTP -> Camoufox -> API fallback)
4. **Extracts** structured supplier data using Gemini AI at scrape-time
5. **Validates** every action through Relationship-Based Access Control (ReBAC)
6. **Executes** purchases with injected identity credentials - no plaintext in LLM context

## Architecture

```
Wire Monitor  ->  Anakin Scraper  ->  MCP Security
(Layer 1)         (Layer 2)          (Layer 3)
     |                |                  |
     v                v                  v
           Anakin.io API Platform
     (Wire API + URL Scraper + Search)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Quick Start

### Prerequisites

- Node.js 18+
- Anakin API key (free at https://anakin.io)

### Setup

```bash
cp .env.example .env
# Edit .env with your API keys
npm install
```

### Run Demo Simulation

```bash
npm run demo
```

### Production Mode

```bash
npm run build
npm start
```

## Key Innovations

1. **Wire API Integration**: Direct API access to B2B supplier catalogs without HTML scraping or browser automation
2. **AnakinScraper Handler Chain**: Multi-tier scraping with automatic fallback (HTTP -> Camoufox -> API)
3. **Gemini AI Structured Extraction**: Auto-format unstructured web data into JSON at scrape-time
4. **Agent-Native ReBAC**: Relationship-Based Access Control enforced in the agent execution loop
5. **Zero-Trust Identity Injection**: Named identity references replace plaintext credentials in LLM context

## How It Works

### Wire API

The [Anakin Wire API](https://docs.anakin.io/wire) provides programmatic REST access to B2B supplier systems -- login, inventory search, and purchase workflows -- screen-scraping and browser automation not required.

Instead of emulating a user in a web browser, the agent sends JSON requests to the Wire API. The Wire API manages supplier-specific session handling (CAPTCHAs, SSO, session rotation) transparently. The agent authenticates once with a credential identity string from the Anakin dashboard, then calls:

- **`GET /v1/wire/catalog`** -- search a supplier's product catalog for a given SKU
- **`POST /v1/wire/{supplier}/action`** -- execute actions like `b2b_check_inventory`

The key security property: the credential identity is a reference token, not a username/password. The agent never sees the supplier's actual login credentials.

### Anakin Universal Scraper

The [Anakin Scraper API](https://docs.anakin.io/scraper) handles the inverse problem: extracting structured data from arbitrary supplier websites that have no API.

When the agent discovers an unknown supplier URL (from search results), it sends that URL to `POST /v1/scrape`. The scraper internally runs a handler chain with automatic fallback:

1. **HTTP handler** -- fast direct GET for simple, static pages
2. **Camoufox handler** -- headless Chromium bypass for JS-rendered content and bot detection
3. **API handler** -- fallback for sites that require structured API calls

Setting `generateJson: true` on the scrape request feeds the raw page content to Gemini AI at scrape-time, returning a structured JSON object (price, stock status, supplier name, MOQ) instead of raw HTML.

## Project Structure

```
src/
  index.ts                 # Entry point
  config.ts                # Environment configuration
  types.ts                 # Shared type definitions
  wire-monitor/            # Wire API polling layer
  anakin-scraper/          # Anakin Universal Scraper client
  mcp-security/            # ReBAC + identity management
  agent/                   # Procurement agent orchestrator
  demo/                    # Stockout simulation
tests/                     # Unit tests
docs/
  ARCHITECTURE.md          # System architecture docs
  DEMO.md                  # Demo walkthrough guide
```

## Tech Stack

- **Runtime**: Node.js 24, TypeScript 5.8
- **Anakin SDK**: `@anakin-io/sdk` for Wire API and scraping
- **Validation**: Zod schemas
- **Logging**: Pino structured logger
- **Testing**: Vitest
- **Security**: Agent-native ReBAC, credential-free identity injection

## Deployment

Instead of running on my machine 24/7, I wanted this hosted somewhere free. Tried Railway -- trial expired. Tried Fly.io and Koyeb -- both need a credit card, which I'm not giving. So I hosted it on GitHub Actions as a scheduled cron job running every 6 hours. Results are saved as downloadable Excel artifacts.

To trigger it manually: go to the repo Actions tab, select **Autono-Procure Monitor**, and click **Run workflow**.

## License

MIT
