import { Anakin } from "@anakin-io/sdk";
import pino from "pino";
import { config } from "../config.js";
import type { InventorySnapshot, StockStatus, SupplierSKU } from "../types.js";

const logger = pino({ level: config.log.level, name: "supplier-monitor" });

export class SupplierMonitor {
  private client: Anakin;
  private currentStatus: InventorySnapshot | null = null;

  constructor() {
    this.client = new Anakin({ apiKey: config.anakin.apiKey });
  }

  async checkInventory(sku: SupplierSKU): Promise<InventorySnapshot> {
    logger.info({ sku: sku.sku, supplier: sku.supplierName }, "checking inventory");

    try {
      const actionId = await this.resolveInventoryAction(sku.supplierUrl);
      const result = await this.client.wire(actionId, {
        url: sku.supplierUrl,
        sku: sku.sku,
        credentialId: config.wire.credentialId || undefined,
      });

      return this.parseInventoryResponse(sku, result);
    } catch (error) {
      logger.error({ error, sku: sku.sku }, "inventory check failed");
      return this.buildUnknownSnapshot(sku, error);
    }
  }

  hasStockout(previous: InventorySnapshot, current: InventorySnapshot): boolean {
    if (previous.status === "in_stock" && current.status === "out_of_stock") return true;
    if (previous.status === "in_stock" && current.status === "low_stock") return true;
    return false;
  }

  getCurrentStatus(): InventorySnapshot | null {
    return this.currentStatus;
  }

  private async resolveInventoryAction(_supplierUrl: string): Promise<string> {
    return "b2b_check_inventory";
  }

  private parseInventoryResponse(sku: SupplierSKU, raw: unknown): InventorySnapshot {
    const data = raw as Record<string, unknown>;
    const stockStr = String(data?.stockStatus ?? data?.status ?? "").toLowerCase();
    const status: StockStatus = stockStr.includes("out")
      ? "out_of_stock"
      : stockStr.includes("low")
        ? "low_stock"
        : stockStr.includes("in")
          ? "in_stock"
          : "unknown";

    return {
      sku: sku.sku,
      status,
      quantity: Number(data?.quantity ?? data?.available ?? 0),
      lastUpdated: new Date().toISOString(),
      raw: data as Record<string, unknown>,
    };
  }

  private buildUnknownSnapshot(sku: SupplierSKU, error: unknown): InventorySnapshot {
    return {
      sku: sku.sku,
      status: "unknown",
      quantity: 0,
      lastUpdated: new Date().toISOString(),
      raw: { error: String(error) },
    };
  }
}
