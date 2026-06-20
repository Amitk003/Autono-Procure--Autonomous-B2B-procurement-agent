import pino from "pino";
import { config } from "../config.js";
import type { Permission, ReBACPolicy } from "../types.js";

const logger = pino({ level: config.log.level, name: "rebac-checker" });

const DEFAULT_POLICY: ReBACPolicy = {
  agentId: config.agent.id,
  permissions: ["mcp:tools:read", "mcp:tools:write", "mcp:identity:use"],
  roles: ["procurement-officer", "supply-chain-admin"],
};

export class ReBACChecker {
  private policy: ReBACPolicy;

  constructor(policy?: Partial<ReBACPolicy>) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  async hasPermission(agentId: string, permission: Permission): Promise<boolean> {
    logger.info({ agentId, permission }, "checking permission");

    if (agentId !== this.policy.agentId) {
      logger.warn({ agentId, expected: this.policy.agentId }, "agent mismatch");
      return false;
    }

    const granted = this.policy.permissions.includes(permission);
    logger.info({ agentId, permission, granted }, "permission check result");
    return granted;
  }

  async authorizeToolWrite(agentId: string): Promise<boolean> {
    return this.hasPermission(agentId, "mcp:tools:write");
  }

  async authorizeIdentityUse(agentId: string): Promise<boolean> {
    return this.hasPermission(agentId, "mcp:identity:use");
  }

  getPolicy(): ReBACPolicy {
    return { ...this.policy };
  }
}
