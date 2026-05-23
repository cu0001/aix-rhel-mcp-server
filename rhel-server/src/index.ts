#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { config } from "./config.js";
import { SSHConnectionManager } from "./ssh/SSHConnectionManager.js";
import { createToolRegistry } from "./tools/registry.js";
import { logger } from "./logger.js";

const ssh = new SSHConnectionManager(config);
const registry = createToolRegistry(ssh);

const server = new Server(
  { name: "rhel-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: registry.map((h) => h.definition),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = registry.find((h) => h.definition.name === name);

  if (!handler) {
    logger.warn("Unknown tool requested", { tool: name });
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  const start = Date.now();
  logger.info("Tool called", { tool: name });

  try {
    const result = await handler.execute(args ?? {});
    logger.info("Tool completed", { tool: name, ms: Date.now() - start });
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("Tool failed", { tool: name, ms: Date.now() - start, error: msg });
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${msg}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("RHEL MCP Server running on stdio");
}

process.on("SIGINT", () => { ssh.close(); process.exit(0); });
process.on("SIGTERM", () => { ssh.close(); process.exit(0); });

main().catch((error) => {
  logger.error("Fatal error", { error: String(error) });
  process.exit(1);
});
