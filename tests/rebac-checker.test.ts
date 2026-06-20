import { describe, it, expect } from "vitest";
import { ReBACChecker } from "../src/mcp-security/rebac-checker.js";

describe("ReBACChecker", () => {
  const agentId = "autono-procure-v1";

  it("should grant permission for authorized agent", async () => {
    const checker = new ReBACChecker({ agentId });
    const result = await checker.hasPermission(agentId, "mcp:tools:write");
    expect(result).toBe(true);
  });

  it("should deny permission for unauthorized agent", async () => {
    const checker = new ReBACChecker({ agentId });
    const result = await checker.hasPermission("unauthorized-agent", "mcp:tools:write");
    expect(result).toBe(false);
  });

  it("should authorize tool write for valid agent", async () => {
    const checker = new ReBACChecker({ agentId });
    const result = await checker.authorizeToolWrite(agentId);
    expect(result).toBe(true);
  });

  it("should authorize identity use for valid agent", async () => {
    const checker = new ReBACChecker({ agentId });
    const result = await checker.authorizeIdentityUse(agentId);
    expect(result).toBe(true);
  });

  it("should allow custom policy overrides", async () => {
    const checker = new ReBACChecker({
      agentId: "restricted-agent",
      permissions: ["mcp:tools:read"],
    });

    const writeResult = await checker.hasPermission("restricted-agent", "mcp:tools:write");
    expect(writeResult).toBe(false);

    const readResult = await checker.hasPermission("restricted-agent", "mcp:tools:read");
    expect(readResult).toBe(true);
  });

  it("should expose current policy", () => {
    const checker = new ReBACChecker({ agentId });
    const policy = checker.getPolicy();
    expect(policy.agentId).toBe(agentId);
    expect(policy.permissions).toContain("mcp:tools:write");
    expect(policy.roles).toContain("procurement-officer");
  });
});
