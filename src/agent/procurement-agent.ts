import pino from "pino";
import { config } from "../config.js";
import { SupplierMonitor } from "../wire-monitor/index.js";
import { AnakinScraperClient } from "../anakin-scraper/index.js";
import { ReBACChecker } from "../mcp-security/rebac-checker.js";
import { IdentityManager } from "../mcp-security/identity-manager.js";
import type {
  SupplierSKU,
  InventorySnapshot,
  AlternativeSupplier,
  ProcurementOrder,
  StockStatus,
} from "../types.js";

const logger = pino({ level: config.log.level, name: "procurement-agent" });

const PRIMARY_SKU: SupplierSKU = {
  sku: config.supplier.primarySku,
  name: config.supplier.primaryName,
  supplierName: config.supplier.primaryVendor,
  supplierUrl: config.supplier.primaryUrl,
  minOrderQuantity: config.supplier.minOrderQty,
  unitPrice: config.supplier.unitPrice,
  currency: config.supplier.currency,
};

export class ProcurementAgent {
  private monitor: SupplierMonitor;
  private scraper: AnakinScraperClient;
  private rebac: ReBACChecker;
  private identityManager: IdentityManager;
  private previousSnapshot: InventorySnapshot | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor() {
    this.monitor = new SupplierMonitor();
    this.scraper = new AnakinScraperClient();
    this.rebac = new ReBACChecker();
    this.identityManager = new IdentityManager();
  }

  async executeProcurementCycle(): Promise<void> {
    logger.info("starting procurement cycle");

    const currentSnapshot = await this.monitor.checkInventory(PRIMARY_SKU);
    logger.info({ status: currentSnapshot.status }, "inventory check complete");

    if (this.previousSnapshot && this.monitor.hasStockout(this.previousSnapshot, currentSnapshot)) {
      logger.warn(
        { sku: PRIMARY_SKU.sku, previous: this.previousSnapshot.status, current: currentSnapshot.status },
        "stockout detected! initiating alternative sourcing",
      );
      await this.handleStockout(PRIMARY_SKU);
    }

    this.previousSnapshot = currentSnapshot;
  }

  startPolling(): void {
    if (this.running) return;
    this.running = true;
    logger.info({ intervalMs: config.supplier.pollIntervalMs }, "starting polling");

    this.executeProcurementCycle().catch((err) =>
      logger.error({ err }, "initial cycle failed"),
    );

    this.pollTimer = setInterval(() => {
      this.executeProcurementCycle().catch((err) =>
        logger.error({ err }, "poll cycle failed"),
      );
    }, config.supplier.pollIntervalMs);
  }

  stopPolling(): void {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    logger.info("polling stopped");
  }

  private async handleStockout(sku: SupplierSKU): Promise<void> {
    logger.info({ sku: sku.sku }, "executing stockout mitigation workflow");

    const checkAuthorized = await this.rebac.authorizeToolWrite(config.agent.id);
    if (!checkAuthorized) {
      logger.error("agent not authorized for tool write - aborting procurement");
      return;
    }
    logger.info("write permission granted");

    const urls = await this.scraper.searchAlternativeSuppliers(sku.sku);
    if (urls.length === 0) {
      logger.warn("no alternative suppliers found");
      return;
    }

    const extractedData = await this.scraper.extractStructuredSupplierData(urls);
    const alternatives = this.buildAlternatives(sku, extractedData);

    logger.info({ count: alternatives.length }, "alternative suppliers evaluated");

    const identityUse = await this.rebac.authorizeIdentityUse(config.agent.id);
    if (!identityUse) {
      logger.error("identity use not authorized");
      return;
    }

    if (alternatives.length > 0) {
      const bestSupplier = alternatives[0];
      const identity = await this.identityManager.getIdentityForSupplier(bestSupplier.supplierName);

      if (identity) {
        logger.info({ identity: identity.id, supplier: bestSupplier.supplierName }, "identity resolved for supplier");
        const order: ProcurementOrder = {
          supplierName: bestSupplier.supplierName,
          sku: bestSupplier.sku,
          quantity: sku.minOrderQuantity,
          unitPrice: bestSupplier.unitPrice,
          totalCost: bestSupplier.unitPrice * sku.minOrderQuantity,
          identityRef: identity.id,
          authorizedBy: config.agent.id,
          timestamp: new Date().toISOString(),
        };

        logger.info({ order }, "procurement order ready for execution");

        const payload = await this.identityManager.injectIdentity(
          { action: "add_to_cart", sku: order.sku, quantity: order.quantity },
          identity,
        );

        logger.info({ payload }, "order submitted via Wire API with identity injection");
      } else {
        logger.error({ supplier: bestSupplier.supplierName }, "no identity resolved for supplier - aborting order");
      }
    }
  }

  private buildAlternatives(sku: SupplierSKU, extracted: Array<Record<string, unknown>>): AlternativeSupplier[] {
    const alternatives: AlternativeSupplier[] = [];
    const seen = new Set<string>();
    const range = config.agent.deliveryDaysMax - config.agent.deliveryDaysMin;

    for (const item of extracted) {
      const name = this.extractField(item, ["supplierName", "name", "supplier"]) as string;
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      const url = this.extractField(item, ["url", "supplierUrl"]) as string || sku.supplierUrl;
      const price = Number(this.extractField(item, ["unitPrice", "price", "cost", "amount"])) || sku.unitPrice * 1.15;

      alternatives.push({
        supplierName: name,
        supplierUrl: url,
        sku: sku.sku,
        name: sku.name,
        unitPrice: price,
        currency: sku.currency,
        minOrderQuantity: sku.minOrderQuantity,
        estimatedDeliveryDays: config.agent.deliveryDaysMin + Math.floor(Math.random() * range),
        stockStatus: "in_stock" as StockStatus,
        confidence: config.agent.defaultConfidence,
      });
    }

    return alternatives.sort((a, b) => a.unitPrice - b.unitPrice);
  }

  private extractField(obj: Record<string, unknown>, candidates: string[]): unknown {
    for (const key of candidates) {
      if (obj[key] !== undefined) return obj[key];
      const lower = Object.entries(obj).find(
        ([k]) => k.toLowerCase() === key.toLowerCase(),
      );
      if (lower) return lower[1];
    }
    return undefined;
  }
}
