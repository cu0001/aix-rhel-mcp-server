#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { config } from "./config.js";
import { SSHConnectionManager } from "./ssh/SSHConnectionManager.js";
import { createToolRegistry } from "./tools/registry.js";
import { logger } from "./logger.js";

const PORT = process.env.PORT || 8000;

const ssh = new SSHConnectionManager(config);
const registry = createToolRegistry(ssh);

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "aix-mcp-server" });
});

// Store active transports by session ID
const activeTransports = new Map<string, { transport: SSEServerTransport; server: Server }>();

// SSE endpoint
app.get("/sse", async (req, res) => {
  logger.info("SSE connection request received");
  
  const sessionId = req.query.sessionId as string || `session-${Date.now()}`;
  
  const transport = new SSEServerTransport("/message", res);
  const server = new Server(
    { name: "aix-server", version: "1.0.0" },
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

  // Store the transport and server
  activeTransports.set(sessionId, { transport, server });

  await server.connect(transport);
  logger.info("SSE connection established", { sessionId });

  // Handle client disconnect
  req.on("close", () => {
    logger.info("SSE connection closed", { sessionId });
    activeTransports.delete(sessionId);
  });
});

// Message endpoint for SSE transport
app.post("/message", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  logger.info("Message received", { sessionId, body: req.body });
  
  if (!sessionId) {
    logger.warn("Message received without sessionId");
    return res.status(400).json({ error: "sessionId required" });
  }

  const session = activeTransports.get(sessionId);
  if (!session) {
    logger.warn("Message received for unknown session", { sessionId });
    return res.status(404).json({ error: "Session not found" });
  }

  // SSEServerTransport handles messages internally through the response object
  // Just acknowledge receipt
  res.sendStatus(200);
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down...");
  ssh.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down...");
  ssh.close();
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`AIX MCP Server listening on port ${PORT}`);
  logger.info(`SSE endpoint: http://localhost:${PORT}/sse`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

// Made with Bob
