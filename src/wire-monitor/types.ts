import { z } from "zod";

export const WireTaskResponse = z.object({
  jobId: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
});

export const WireJobResult = z.object({
  jobId: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  result: z.any().optional(),
  error: z.string().optional(),
});

export interface WireCatalogAction {
  actionId: string;
  name: string;
  description: string;
  creditsPerCall: number;
  params: Record<string, unknown>;
}
