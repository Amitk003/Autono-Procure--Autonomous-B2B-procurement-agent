export interface SupplierSKU {
  sku: string;
  name: string;
  supplierName: string;
  supplierUrl: string;
  minOrderQuantity: number;
  unitPrice: number;
  currency: string;
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "unknown";

export interface InventorySnapshot {
  sku: string;
  status: StockStatus;
  quantity: number;
  lastUpdated: string;
  raw: Record<string, unknown>;
}

export interface AlternativeSupplier {
  supplierName: string;
  supplierUrl: string;
  sku: string;
  name: string;
  unitPrice: number;
  currency: string;
  minOrderQuantity: number;
  estimatedDeliveryDays: number;
  stockStatus: StockStatus;
  confidence: number;
}

export interface ProcurementOrder {
  supplierName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  identityRef: string;
  authorizedBy: string;
  timestamp: string;
}

export type Permission = "mcp:tools:write" | "mcp:tools:read" | "mcp:identity:use";

export interface ReBACPolicy {
  agentId: string;
  permissions: Permission[];
  roles: string[];
}

export interface IdentityCredential {
  id: string;
  label: string;
  credentialId: string;
  catalog: string;
}
