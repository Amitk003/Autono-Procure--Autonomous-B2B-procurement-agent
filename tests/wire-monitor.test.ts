import { describe, it, expect } from "vitest";
import { SupplierMonitor } from "../src/wire-monitor/supplier-monitor.js";
import type { InventorySnapshot, SupplierSKU } from "../src/types.js";

const testSKU: SupplierSKU = {
  sku: "TEST-SKU-001",
  name: "Test Chemical",
  supplierName: "Test Supplier",
  supplierUrl: "https://test-supplier.com/product/test-sku",
  minOrderQuantity: 1,
  unitPrice: 100,
  currency: "USD",
};

describe("SupplierMonitor", () => {
  it("should detect stockout from in_stock to out_of_stock", () => {
    const monitor = new SupplierMonitor();
    const previous: InventorySnapshot = {
      sku: "TEST-SKU-001",
      status: "in_stock",
      quantity: 100,
      lastUpdated: new Date().toISOString(),
      raw: {},
    };
    const current: InventorySnapshot = {
      sku: "TEST-SKU-001",
      status: "out_of_stock",
      quantity: 0,
      lastUpdated: new Date().toISOString(),
      raw: {},
    };

    expect(monitor.hasStockout(previous, current)).toBe(true);
  });

  it("should detect stockout from in_stock to low_stock", () => {
    const monitor = new SupplierMonitor();
    const previous: InventorySnapshot = {
      sku: "TEST-SKU-001",
      status: "in_stock",
      quantity: 100,
      lastUpdated: new Date().toISOString(),
      raw: {},
    };
    const current: InventorySnapshot = {
      sku: "TEST-SKU-001",
      status: "low_stock",
      quantity: 2,
      lastUpdated: new Date().toISOString(),
      raw: {},
    };

    expect(monitor.hasStockout(previous, current)).toBe(true);
  });

  it("should not detect stockout when stock is stable", () => {
    const monitor = new SupplierMonitor();
    const previous: InventorySnapshot = {
      sku: "TEST-SKU-001",
      status: "in_stock",
      quantity: 100,
      lastUpdated: new Date().toISOString(),
      raw: {},
    };
    const current: InventorySnapshot = {
      sku: "TEST-SKU-001",
      status: "in_stock",
      quantity: 90,
      lastUpdated: new Date().toISOString(),
      raw: {},
    };

    expect(monitor.hasStockout(previous, current)).toBe(false);
  });

  it("should not detect stockout when already out of stock", () => {
    const monitor = new SupplierMonitor();
    const previous: InventorySnapshot = {
      sku: "TEST-SKU-001",
      status: "out_of_stock",
      quantity: 0,
      lastUpdated: new Date().toISOString(),
      raw: {},
    };
    const current: InventorySnapshot = {
      sku: "TEST-SKU-001",
      status: "out_of_stock",
      quantity: 0,
      lastUpdated: new Date().toISOString(),
      raw: {},
    };

    expect(monitor.hasStockout(previous, current)).toBe(false);
  });
});
