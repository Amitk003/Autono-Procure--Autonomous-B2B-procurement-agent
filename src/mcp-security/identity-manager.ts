import pino from "pino";
import { config } from "../config.js";
import type { IdentityCredential } from "../types.js";

const logger = pino({ level: config.log.level, name: "identity-manager" });

const MOCK_IDENTITIES: IdentityCredential[] = [
  {
    id: "identity-sigma-aldrich",
    label: "Sigma-Aldrich Corporate Account",
    credentialId: config.wire.credentialId || "cred-mock-lab-supplier",
    catalog: "sigma-aldrich",
  },
  {
    id: "identity-thermo-fisher",
    label: "Thermo Fisher Scientific Account",
    credentialId: "cred-thermo-fisher",
    catalog: "thermo-fisher",
  },
];

export class IdentityManager {
  private identities: IdentityCredential[];

  constructor(identities?: IdentityCredential[]) {
    this.identities = identities ?? MOCK_IDENTITIES;
  }

  async getIdentityForSupplier(supplierName: string): Promise<IdentityCredential | null> {
    const normalized = supplierName.toLowerCase();
    const match = this.identities.find(
      (id) =>
        normalized.includes(id.catalog.toLowerCase()) ||
        normalized.includes(id.label.toLowerCase()),
    );
    if (match) {
      logger.info({ supplier: supplierName, identity: match.id }, "identity resolved");
      return match;
    }

    logger.warn({ supplier: supplierName }, "no identity found for supplier");
    return this.identities[0];
  }

  async injectIdentity(actionPayload: Record<string, unknown>, credential: IdentityCredential): Promise<Record<string, unknown>> {
    logger.info({ identityId: credential.id }, "injecting identity into action payload");
    return {
      ...actionPayload,
      credential_id: credential.credentialId,
      _identity_ref: credential.id,
    };
  }
}
