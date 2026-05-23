import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { runAll, text } from "./helpers.js";

export function createNetworkTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "get_aix_network_info",
        description: "Get AIX network configuration and interface information",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await runAll(ssh, ["ifconfig -a", "netstat -rn", "lsattr -El inet0"]);
        return text(output);
      },
    },
  ];
}
