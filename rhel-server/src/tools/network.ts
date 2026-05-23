import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { runAll, text } from "./helpers.js";

export function createNetworkTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "get_rhel_network_info",
        description: "Get RHEL network configuration, interfaces, routing, DNS, sockets, and firewall status",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await runAll(ssh, [
          "ip addr show",
          "ip route show table all",
          "ss -tulpen",
          "nmcli device status 2>/dev/null || true",
          "cat /etc/resolv.conf",
          "firewall-cmd --state 2>/dev/null && firewall-cmd --list-all 2>/dev/null || true",
        ]);
        return text(output);
      },
    },
  ];
}
