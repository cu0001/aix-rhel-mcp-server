import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { runAll, text } from "./helpers.js";

const deviceClassSchema = z.enum(["block", "pci", "cpu", "network", "all"]);
type DeviceClass = z.infer<typeof deviceClassSchema>;

export function createDeviceTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "list_rhel_devices",
        description: "List RHEL devices with optional class filtering for block, pci, cpu, network, or all",
        inputSchema: {
          type: "object",
          properties: {
            device_class: {
              type: "string",
              enum: ["block", "pci", "cpu", "network", "all"],
              description: "Optional device class to filter",
              default: "all",
            },
          },
        },
      },
      async execute(args) {
        const { device_class = "all" } = z.object({
          device_class: deviceClassSchema.optional(),
        }).parse(args);

        const commandsByClass: Record<DeviceClass, string[]> = {
          block: ["lsblk -o NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,MODEL,SERIAL"],
          pci: ["lspci -nn 2>/dev/null || true"],
          cpu: ["lscpu", "cat /proc/cpuinfo | head -n 120"],
          network: ["ip -brief link", "ethtool -i $(ls /sys/class/net | head -n 1) 2>/dev/null || true"],
          all: [
            "lsblk -o NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,MODEL,SERIAL",
            "lspci -nn 2>/dev/null || true",
            "lscpu",
            "ip -brief link",
          ],
        };

        return text(await runAll(ssh, commandsByClass[device_class]));
      },
    },
  ];
}
