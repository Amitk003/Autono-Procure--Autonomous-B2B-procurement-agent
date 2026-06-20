import { Anakin } from "@anakin-io/sdk";
import pino from "pino";
import { config } from "../config.js";

const logger = pino({ level: config.log.level, name: "anakin-scraper" });

const SEARCH_QUERIES = [
  (sku: string) => `${sku} laboratory supplier buy online`,
  (sku: string) => `${sku} chemical supplier price stock`,
  (sku: string) => `buy ${sku} alternative suppliers industrial`,
];

export class AnakinScraperClient {
  private client: Anakin;

  constructor() {
    this.client = new Anakin({ apiKey: config.anakin.apiKey });
  }

  async searchAlternativeSuppliers(sku: string): Promise<string[]> {
    logger.info({ sku }, "searching for alternative suppliers");

    const results: string[] = [];

    for (const queryFn of SEARCH_QUERIES) {
      const query = queryFn(sku);
      try {
        const searchResult = await this.client.search(query, { limit: config.search.limit });
        for (const s of searchResult.results) {
          if (s.url) results.push(s.url);
        }
      } catch (error) {
        logger.warn({ error, query }, "search query failed, continuing");
      }
    }

    const unique = [...new Set(results)];
    logger.info({ count: unique.length }, "alternative suppliers found");
    return unique.slice(0, config.search.maxUrls);
  }

  async extractSupplierDetails(url: string): Promise<string> {
    logger.info({ url }, "extracting supplier details");

    try {
      const doc = await this.client.scrape(url, {
        formats: ["markdown"],
        generateJson: true,
      });

      if (doc.generatedJson) {
        return JSON.stringify(doc.generatedJson);
      }

      return doc.markdown ?? "";
    } catch (error) {
      logger.error({ error, url }, "extraction failed");
      return "";
    }
  }

  async extractStructuredSupplierData(
    urls: string[],
  ): Promise<Array<Record<string, unknown>>> {
    logger.info({ count: urls.length }, "extracting structured data from supplier URLs");
    const results: Array<Record<string, unknown>> = [];

    for (const url of urls) {
      const content = await this.extractSupplierDetails(url);
      if (content) {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(content);
        } catch {
          parsed = { rawContent: content };
        }
        results.push({ url, ...parsed, extractedAt: new Date().toISOString() });
      }
    }

    logger.info({ extracted: results.length }, "structured data extraction complete");
    return results;
  }
}
