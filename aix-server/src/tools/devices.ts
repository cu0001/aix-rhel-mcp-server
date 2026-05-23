import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { text } from "./helpers.js";

export function createDeviceTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "list_aix_devices",
        description: "List all devices on the AIX system with their status and descriptions",
        inputSchema: {
          type: "object",
          properties: {
            device_class: { type: "string", description: "Optional device class to filter (e.g., disk, adapter, processor)" },
          },
        },
      },
      async execute(args) {
        const { device_class } = z.object({ device_class: z.string().optional() }).parse(args);
        const command = device_class ? `lsdev -Cc ${device_class}` : "lsdev";
        return text(await ssh.execute(command));
      },
    },
  ];
}
