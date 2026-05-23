import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { text } from "./helpers.js";

export function createDiagnosticTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "check_rhel_errors",
        description: "Check recent RHEL journal and kernel errors",
        inputSchema: {
          type: "object",
          properties: {
            hours: { type: "number", description: "Number of hours to look back (default: 24)" },
          },
        },
      },
      async execute(args) {
        const { hours = 24 } = z.object({ hours: z.number().optional() }).parse(args);
        const output = await ssh.execute(`journalctl --since "${hours} hours ago" -p warning..alert --no-pager | tail -n 200`);
        return text(output || "No warnings or errors found in the specified time period");
      },
    },
    {
      definition: {
        name: "collect_sosreport",
        description: "Collect system diagnostic data using sos report (requires suitable privileges)",
        inputSchema: {
          type: "object",
          properties: {
            options: { type: "string", description: "Options for sos report", default: "--batch" },
            output_dir: { type: "string", description: "Directory to store sos report data", default: "/var/tmp" },
          },
        },
      },
      async execute(args) {
        const { options = "--batch", output_dir = "/var/tmp" } = z.object({
          options: z.string().optional(),
          output_dir: z.string().optional(),
        }).parse(args);
        const output = await ssh.execute(`sos report ${options} --tmp-dir ${output_dir} && ls -la ${output_dir}/sosreport-*`);
        return text(output);
      },
    },
    {
      definition: {
        name: "analyze_journal",
        description: "Analyze systemd journal with filters for priority, unit, and timeframe",
        inputSchema: {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["emerg", "alert", "crit", "err", "warning", "notice", "info", "debug"], default: "warning" },
            hours: { type: "number", description: "Number of hours to look back", default: 24 },
            unit: { type: "string", description: "Optional systemd unit filter" },
          },
        },
      },
      async execute(args) {
        const { priority = "warning", hours = 24, unit } = z.object({
          priority: z.string().optional(),
          hours: z.number().optional(),
          unit: z.string().optional(),
        }).parse(args);
        const unitPart = unit ? ` -u "${unit}"` : "";
        const output = await ssh.execute(`journalctl --since "${hours} hours ago" -p ${priority}${unitPart} --no-pager | tail -n 200`);
        return text(output || "No matching journal entries found.");
      },
    },
    {
      definition: {
        name: "analyze_syslog",
        description: "Check RHEL logs for error patterns",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to log file", default: "/var/log/messages" },
            pattern: { type: "string", description: "Regex pattern to search for", default: "error|fail|crit|warn" },
          },
        },
      },
      async execute(args) {
        const { path = "/var/log/messages", pattern = "error|fail|crit|warn" } = z.object({
          path: z.string().optional(),
          pattern: z.string().optional(),
        }).parse(args);
        const output = await ssh.execute(`grep -Ei "${pattern}" "${path}" | tail -n 100`);
        return text(output || "No matches found.");
      },
    },
    {
      definition: {
        name: "check_dump_config",
        description: "Check kdump configuration and recent vmcore dumps",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await ssh.execute("systemctl status kdump --no-pager 2>/dev/null; kdumpctl status 2>/dev/null; cat /etc/kdump.conf 2>/dev/null; find /var/crash -maxdepth 2 -type f 2>/dev/null | head -n 100");
        return text(output);
      },
    },
  ];
}
