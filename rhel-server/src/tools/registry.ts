import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import { createDeviceTools } from "./devices.js";
import { createDiagnosticTools } from "./diagnostics.js";
import { createFileTools } from "./files.js";
import { createNetworkTools } from "./network.js";
import { createPerformanceTools } from "./performance.js";
import { createSystemTools } from "./system.js";
import type { ToolHandler } from "./types.js";
import { createUserTools } from "./users.js";

export function createToolRegistry(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    ...createSystemTools(ssh),
    ...createDeviceTools(ssh),
    ...createDiagnosticTools(ssh),
    ...createPerformanceTools(ssh),
    ...createFileTools(ssh),
    ...createNetworkTools(ssh),
    ...createUserTools(ssh),
  ];
}
