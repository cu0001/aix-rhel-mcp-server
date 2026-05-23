import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { runAll, text } from "./helpers.js";

function metricCommands(interval: number, count: number): Record<string, string> {
  return {
    vmstat: `vmstat ${interval} ${count}`,
    iostat: `iostat -xz ${interval} ${count}`,
    mpstat: `mpstat ${interval} ${count}`,
    pidstat: `pidstat ${interval} ${count}`,
    sar: `sar -u ${interval} ${count}`,
    memory: "free -h && vmstat -s",
    netstat: "ss -s && ip -s link",
  };
}

export function createPerformanceTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "get_rhel_performance",
        description: "Get RHEL performance metrics including CPU, memory, disk, load, and top processes",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await runAll(ssh, [
          "uptime",
          "vmstat 1 2 | tail -1",
          "free -h",
          "iostat -xz 1 2 2>/dev/null | tail -n +4 || true",
          "ps -eo pid,ppid,user,stat,pcpu,pmem,comm --sort=-pcpu | head -20",
        ]);
        return text(output);
      },
    },
    {
      definition: {
        name: "collect_performance_data",
        description: "Collect comprehensive RHEL performance data (vmstat, iostat, mpstat, pidstat, sar, memory, network)",
        inputSchema: {
          type: "object",
          properties: {
            interval: { type: "number", description: "Interval in seconds", default: 5 },
            count: { type: "number", description: "Number of samples", default: 12 },
            metrics: {
              type: "array",
              items: { type: "string", enum: ["vmstat", "iostat", "mpstat", "pidstat", "sar", "memory", "netstat"] },
              default: ["vmstat", "iostat", "mpstat"],
            },
          },
        },
      },
      async execute(args) {
        const { interval = 5, count = 12, metrics = ["vmstat", "iostat", "mpstat"] } = z.object({
          interval: z.number().optional(),
          count: z.number().optional(),
          metrics: z.array(z.string()).optional(),
        }).parse(args);

        const commands = metricCommands(interval, count);
        const results = await Promise.all(metrics.map(async (metric) => {
          const cmd = commands[metric];
          if (!cmd) return "";
          try {
            const out = await ssh.execute(cmd);
            return `--- ${metric} ---\n${out}`;
          } catch (e) {
            return `--- ${metric} ---\nError: ${e}`;
          }
        }));
        return text(results.join("\n\n"));
      },
    },
  ];
}
