import pino from "pino";
import { config } from "./config.js";
import { ProcurementAgent } from "./agent/index.js";

const logger = pino({ level: config.log.level, name: "autono-procure" });

function handleShutdown(agent: ProcurementAgent): void {
  const shutdown = () => {
    logger.info("shutting down autono-procure agent");
    agent.stopPolling();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main(): Promise<void> {
  logger.info("initializing autono-procure agent");
  logger.info({ agentId: config.agent.id }, "agent configuration");

  const agent = new ProcurementAgent();
  handleShutdown(agent);

  logger.info("starting procurement monitoring cycle");
  agent.startPolling();

  logger.info(
    { sku: config.supplier.primarySku, intervalMs: config.supplier.pollIntervalMs },
    "agent is polling primary supplier. waiting for stockout events...",
  );
}

main().catch((err) => {
  logger.fatal({ err }, "fatal error in main");
  process.exit(1);
});
