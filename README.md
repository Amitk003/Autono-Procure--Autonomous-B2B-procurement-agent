# Autono-Procure

Autonomous B2B procurement agent with MCP-shielded supply chain automation.

Built for Anakin Blitz Hackathon using the Wire API and Anakin Universal Scraper.

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

## License

MIT
