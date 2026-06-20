import { z } from "zod";

export const ScrapeRequestSchema = z.object({
  url: z.string().url(),
  format: z.enum(["markdown", "json", "html"]).default("markdown"),
  renderJs: z.boolean().default(true),
  generateJson: z.boolean().default(false),
});

export const ScrapeResultSchema = z.object({
  url: z.string(),
  content: z.string().optional(),
  markdown: z.string().optional(),
  generatedJson: z.any().optional(),
  format: z.string(),
});

export interface AlternativeSupplierResult {
  suppliers: Array<{
    name: string;
    url: string;
    sku: string;
    price: number;
    currency: string;
    inStock: boolean;
  }>;
  rawPages: string[];
}
