import pino from "pino";
import { config } from "../config.js";
import type { IdentityCredential } from "../types.js";

const logger = pino({ level: config.log.level, name: "identity-manager" });

export class IdentityManager {
  private identities: IdentityCredential[];

  constructor(identities?: IdentityCredential[]) {
    this.identities = identities ?? [];
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
    return null;
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
