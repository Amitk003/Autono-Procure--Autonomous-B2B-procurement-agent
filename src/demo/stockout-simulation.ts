import pino from "pino";
import { config } from "../config.js";
import { AnakinScraperClient } from "../anakin-scraper/index.js";
import { ReBACChecker } from "../mcp-security/rebac-checker.js";
import { IdentityManager } from "../mcp-security/identity-manager.js";
import { saveToExcel } from "../persistence.js";

const logger = pino({
  level: "info",
  name: "autono-procure-demo",
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

const SKU = config.supplier.primarySku;

function section(title: string): void {
  logger.info("");
  logger.info("=".repeat(60));
  logger.info(title);
  logger.info("=".repeat(60));
}

async function main(): Promise<void> {
  logger.info("Anakin API key: %s", config.anakin.apiKey ? "configured" : "MISSING (set ANAKIN_API_KEY)");
  logger.info("Gemini API key: %s", config.gemini.apiKey || "not set (optional)");

  const scraper = new AnakinScraperClient();
  const rebac = new ReBACChecker();
  const identityManager = new IdentityManager();

  section("PHASE 1: Search for real alternative suppliers via Anakin Search API");
  logger.info("Searching the web for suppliers carrying: %s", SKU);

  const urls = await scraper.searchAlternativeSuppliers(SKU);

  if (urls.length === 0) {
    logger.warn("No supplier URLs found.");
  } else {
    logger.info("Live search results (%d URLs found):", urls.length);
    for (const url of urls.slice(0, 5)) {
      logger.info("  - %s", url);
    }
  }

  const searchRows = urls.map((u, i) => ({
    "#": i + 1,
    SKU,
    Supplier_URL: u,
    Discovered_At: new Date().toISOString(),
  }));
  const searchPath = await saveToExcel("01_search_results", searchRows);
  logger.info("Saved: %s", searchPath);

  section("PHASE 2: Extract structured data from real supplier pages via Anakin Scraper API");
  logger.info("Scraping %d supplier pages and extracting structured data...", Math.min(urls.length, 5));

  const extracted = await scraper.extractStructuredSupplierData(urls.slice(0, 5));

  const extractRows: Record<string, unknown>[] = [];
  if (extracted.length > 0) {
    logger.info("Live extraction results (%d suppliers):", extracted.length);
    for (const item of extracted) {
      const url = String(item.url ?? "unknown");
      const price = String(item.price ?? item.unitPrice ?? item.cost ?? "N/A");
      const stock = String(item.inStock ?? item.stockStatus ?? item.availability ?? "unknown");
      extractRows.push({
        SKU,
        Supplier_URL: url,
        Price: price,
        In_Stock: stock,
        Currency: String(item.currency ?? "USD"),
        Min_Order: String(item.minOrderQuantity ?? item.minimumOrder ?? "1"),
        Extracted_At: String(item.extractedAt ?? new Date().toISOString()),
      });
      const keys = Object.keys(item).filter(k => k !== "url" && k !== "extractedAt");
      logger.info("  %s -> keys: %s", url, keys.join(", "));
    }
    logger.info("");
    logger.info("Full raw data from first supplier:");
    logger.info(JSON.stringify(extracted[0], null, 2));
  } else {
    logger.warn("No data could be extracted from any supplier URL.");
  }

  const extractPath = await saveToExcel("02_supplier_data", extractRows);
  logger.info("Saved: %s", extractPath);

  section("PHASE 3: ReBAC permission check");
  const writeOk = await rebac.authorizeToolWrite(config.agent.id);
  logger.info("mcp:tools:write: %s", writeOk ? "PERMITTED" : "DENIED");

  const identityOk = await rebac.authorizeIdentityUse(config.agent.id);
  logger.info("mcp:identity:use: %s", identityOk ? "PERMITTED" : "DENIED");

  section("PHASE 4: Identity injection (credential-free Wire API call)");
  let orderRows: Record<string, unknown>[] = [];

  if (extracted.length > 0) {
    const best = extracted[0];
    const identity = await identityManager.getIdentityForSupplier(String(best.url ?? ""));

    if (identity) {
      const payload = await identityManager.injectIdentity(
        { action: "add_to_cart", sku: SKU, quantity: 5 },
        identity,
      );
      logger.info("Wire API payload with injected identity:");
      logger.info(JSON.stringify(payload, null, 2));

      orderRows.push({
        SKU,
        Action: String(payload.action),
        Quantity: 5,
        Identity_Ref: String(payload._identity_ref),
        Credential_ID: String(payload.credential_id),
        Supplier_URL: String(best.url ?? ""),
        Timestamp: new Date().toISOString(),
      });
    } else {
      logger.info("No identity resolved for supplier - identity injection skipped (expected if no Wire identities configured)");
      orderRows.push({
        SKU,
        Action: "SKIPPED",
        Quantity: 0,
        Identity_Ref: "NO_IDENTITY_RESOLVED",
        Credential_ID: "N/A",
        Supplier_URL: String(best.url ?? ""),
        Timestamp: new Date().toISOString(),
      });
    }
  }

  if (orderRows.length > 0) {
    const orderPath = await saveToExcel("03_order_payload", orderRows);
    logger.info("Saved: %s", orderPath);
  }

  section("SAVED FILES");
  logger.info("All outputs persisted to the data/ directory as Excel (.xlsx):");
  logger.info("  data/");
  logger.info("    |- %s", searchPath.split(/[\\/]/).pop());
  logger.info("    |- %s", extractPath.split(/[\\/]/).pop());
  if (orderRows.length > 0) {
    const ts = searchPath.split(/[\\/]/).pop()?.split("_")[0];
    logger.info("    |- %s_03_order_payload.xlsx", ts);
  }
  logger.info("");
  logger.info("Open these .xlsx files in Excel to view supplier data, pricing, and order details.");
}

main().catch((err) => {
  logger.error(err, "demo failed");
  process.exit(1);
});
