import "dotenv/config";

let _loaded: Record<string, unknown> | null = null;

function load(): Record<string, unknown> {
  if (_loaded) return _loaded;
  _loaded = {
    "anakin.apiKey": env("ANAKIN_API_KEY", ""),
    "wire.credentialId": env("WIRE_CREDENTIAL_ID", ""),
    "gemini.apiKey": env("GEMINI_API_KEY", ""),
    "supplier.primarySku": env("PRIMARY_SUPPLIER_SKU", "LAB-GRADE-ACETONE-99.9"),
    "supplier.primaryUrl": env("PRIMARY_SUPPLIER_URL", "https://example-b2b-supplier.com/product/LAB-ACETONE-99"),
    "supplier.pollIntervalMs": Number(env("POLL_INTERVAL_MS", "30000")),
    "agent.id": env("AGENT_ID", "autono-procure-v1"),
    "log.level": env("LOG_LEVEL", "info"),
  };
  return _loaded;
}

function env(name: string, fallback?: string): string {
  const value = process.env[name];
  if (!value) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function mkproxy(prefix: string): Record<string, unknown> {
  return new Proxy({} as Record<string, unknown>, {
    get(_, prop: string) {
      return load()[`${prefix}.${prop}`];
    },
  });
}

export const config = {
  anakin: mkproxy("anakin") as { apiKey: string },
  wire: mkproxy("wire") as { credentialId: string },
  gemini: mkproxy("gemini") as { apiKey: string },
  supplier: mkproxy("supplier") as { primarySku: string; primaryUrl: string; pollIntervalMs: number },
  agent: mkproxy("agent") as { id: string },
  log: mkproxy("log") as { level: string },
};
