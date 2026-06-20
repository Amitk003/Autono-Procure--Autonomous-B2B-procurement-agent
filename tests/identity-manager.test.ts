import { describe, it, expect } from "vitest";
import { IdentityManager } from "../src/mcp-security/identity-manager.js";
import type { IdentityCredential } from "../src/types.js";

const testIdentities: IdentityCredential[] = [
  { id: "id-1", label: "Sigma-Aldrich Corp", credentialId: "cred-sigma", catalog: "sigma-aldrich" },
  { id: "id-2", label: "Thermo Fisher Sci", credentialId: "cred-thermo", catalog: "thermo-fisher" },
];

describe("IdentityManager", () => {
  it("should resolve identity matching supplier name", async () => {
    const manager = new IdentityManager(testIdentities);
    const identity = await manager.getIdentityForSupplier("Sigma-Aldrich Chemical Co.");
    expect(identity).not.toBeNull();
    expect(identity!.id).toBe("id-1");
  });

  it("should return first identity when no match found", async () => {
    const manager = new IdentityManager(testIdentities);
    const identity = await manager.getIdentityForSupplier("Unknown Supplier Inc.");
    expect(identity).not.toBeNull();
    expect(identity!.id).toBe("id-1");
  });

  it("should inject identity into action payload", async () => {
    const manager = new IdentityManager(testIdentities);
    const identity = testIdentities[0];
    const payload = await manager.injectIdentity(
      { action: "add_to_cart", sku: "TEST-SKU" },
      identity,
    );

    expect(payload.credential_id).toBe("cred-sigma");
    expect(payload._identity_ref).toBe("id-1");
    expect(payload.action).toBe("add_to_cart");
  });

  it("should not mutate original payload", async () => {
    const manager = new IdentityManager(testIdentities);
    const original = { action: "checkout" };
    const identity = testIdentities[0];
    const injected = await manager.injectIdentity(original, identity);

    expect(original).not.toHaveProperty("credential_id");
    expect(injected).not.toBe(original);
  });
});
