import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { runAll, text } from "./helpers.js";

function metricCommands(interval: number, count: number): Record<string, string> {
  return {
    vmstat: `vmstat ${interval} ${count}`,
    iostat: `iostat -d ${interval} ${count}`,
    sar: `sar -u ${interval} ${count}`,
    lparstat: `lparstat ${interval} ${count}`,
    mpstat: `mpstat ${interval} ${count}`,
    netstat: "netstat -s",
    svmon: "svmon -G",
  };
}

export function createPerformanceTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "get_aix_performance",
        description: "Get AIX system performance metrics including CPU, memory, and disk usage",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await runAll(ssh, [
          "vmstat 1 2 | tail -1",
          "iostat -d 1 2 | tail -n +3",
          "svmon -G",
          "topas -n 1 2>/dev/null || echo 'topas not available'",
        ]);
        return text(output);
      },
    },
    {
      definition: {
        name: "collect_performance_data",
        description: "Collect comprehensive performance data (vmstat, iostat, sar, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            interval: { type: "number", description: "Interval in seconds", default: 5 },
            count: { type: "number", description: "Number of samples", default: 12 },
            metrics: {
              type: "array",
              items: { type: "string", enum: ["vmstat", "iostat", "sar", "lparstat", "mpstat", "netstat", "svmon"] },
              default: ["vmstat", "iostat", "lparstat"],
            },
          },
        },
      },
      async execute(args) {
        const { interval = 5, count = 12, metrics = ["vmstat", "iostat", "lparstat"] } = z.object({
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
