import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { safeShellTextPattern, text } from "./helpers.js";

const safeAbsolutePath = z.string().regex(/^\/[\w./-]+$/, "path must be an absolute safe path");

export function createDiagnosticTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "check_aix_errors",
        description: "Check the AIX error log for recent errors and warnings",
        inputSchema: {
          type: "object",
          properties: {
            hours: { type: "number", description: "Number of hours to look back (default: 24)" },
          },
        },
      },
      async execute(args) {
        const { hours = 24 } = z.object({ hours: z.number().optional() }).parse(args);
        const command = `errpt -a -s \`date -v-${hours}H +%m%d%H%M%Y\` 2>/dev/null || errpt -a | head -100`;
        const output = await ssh.execute(command);
        return text(output || "No errors found in the specified time period");
      },
    },
    {
      definition: {
        name: "collect_snap",
        description: "Collect system diagnostic data using the 'snap' command (requires root)",
        inputSchema: {
          type: "object",
          properties: {
            options: { type: "string", description: "Options for snap command (e.g., 'all', 'minimal')", default: "all" },
            output_dir: { type: "string", description: "Directory to store snap data", default: "/tmp" },
          },
        },
      },
      async execute(args) {
        const { options = "all", output_dir = "/tmp" } = z.object({
          options: z.string().optional(),
          output_dir: z.string().optional(),
        }).parse(args);
        const output = await ssh.execute(`snap -ac -d ${output_dir} && ls -la ${output_dir}/*.pax.Z`);
        return text(output);
      },
    },
    {
      definition: {
        name: "collect_perfpmr",
        description: "Collect AIX performance diagnostic data using 'perfpmr' as an independent collection",
        inputSchema: {
          type: "object",
          properties: {
            duration: { type: "number", description: "Collection duration in seconds", default: 300 },
            output_dir: { type: "string", description: "Output directory for perfpmr data", default: "/tmp/perfpmr" },
          },
        },
      },
      async execute(args) {
        const { duration = 300, output_dir = "/tmp/perfpmr" } = z.object({
          duration: z.number().optional(),
          output_dir: safeAbsolutePath.optional(),
        }).parse(args);
        const output = await ssh.execute(
          `mkdir -p ${output_dir} && cd ${output_dir} && /usr/lpp/perfagent/tools/perfpmr ${duration}`
        );
        return text(output);
      },
    },
    {
      definition: {
        name: "collect_nmon",
        description: "Collect AIX nmon performance data as an independent .nmon collection",
        inputSchema: {
          type: "object",
          properties: {
            interval: { type: "number", description: "Sampling interval in seconds", default: 10 },
            count: { type: "number", description: "Number of samples to collect", default: 60 },
            output_dir: { type: "string", description: "Output directory for nmon data", default: "/tmp/nmon" },
          },
        },
      },
      async execute(args) {
        const { interval = 10, count = 60, output_dir = "/tmp/nmon" } = z.object({
          interval: z.number().int().positive().optional(),
          count: z.number().int().positive().optional(),
          output_dir: safeAbsolutePath.optional(),
        }).parse(args);
        const output = await ssh.execute(
          `mkdir -p ${output_dir} && cd ${output_dir} && nmon -f -s ${interval} -c ${count} -m ${output_dir} && ls -la ${output_dir}/*.nmon`
        );
        return text(output);
      },
    },
    {
      definition: {
        name: "download_perfpmr_file",
        description: "Download a perfpmr output file from the AIX system to the local 'perfpmr' directory using SFTP",
        inputSchema: {
          type: "object",
          properties: {
            remote_path: { type: "string", description: "Full path to the perfpmr file on the AIX system" },
            local_filename: { type: "string", description: "Filename to save as in the local 'perfpmr' directory" },
          },
          required: ["remote_path", "local_filename"],
        },
      },
      async execute(args) {
        const { remote_path, local_filename } = z.object({
          remote_path: safeAbsolutePath,
          local_filename: z.string().regex(safeShellTextPattern, "local_filename must be a safe filename"),
        }).parse(args);
        const localPath = `./perfpmr/${local_filename}`;
        await ssh.downloadFile(remote_path, localPath);
        return text(`Successfully downloaded to ${localPath}`);
      },
    },
    {
      definition: {
        name: "download_nmon_file",
        description: "Download a nmon output file from the AIX system to the local 'nmon' directory using SFTP",
        inputSchema: {
          type: "object",
          properties: {
            remote_path: { type: "string", description: "Full path to the .nmon file on the AIX system" },
            local_filename: { type: "string", description: "Filename to save as in the local 'nmon' directory" },
          },
          required: ["remote_path", "local_filename"],
        },
      },
      async execute(args) {
        const { remote_path, local_filename } = z.object({
          remote_path: safeAbsolutePath,
          local_filename: z.string().regex(safeShellTextPattern, "local_filename must be a safe filename"),
        }).parse(args);
        const localPath = `./nmon/${local_filename}`;
        await ssh.downloadFile(remote_path, localPath);
        return text(`Successfully downloaded to ${localPath}`);
      },
    },
    {
      definition: {
        name: "analyze_errpt",
        description: "Analyze the AIX error log with filters for severity and timeframe",
        inputSchema: {
          type: "object",
          properties: {
            severity: { type: "string", enum: ["PERM", "TEMP", "PERF", "PEND", "UNKN", "ALL"], default: "ALL" },
            hours: { type: "number", description: "Number of hours to look back", default: 24 },
            resource_name: { type: "string", description: "Optional resource name to filter by" },
            detail: { type: "boolean", description: "Whether to show detailed error descriptions", default: true },
          },
        },
      },
      async execute(args) {
        const { severity = "ALL", resource_name, detail = true } = z.object({
          severity: z.string().optional(),
          hours: z.number().optional(),
          resource_name: z.string().optional(),
          detail: z.boolean().optional(),
        }).parse(args);
        let command = "errpt";
        if (severity !== "ALL") command += ` -T ${severity}`;
        if (resource_name) command += ` -N ${resource_name}`;
        if (detail) command += " -a";
        command += " | head -n 100";
        return text(await ssh.execute(command));
      },
    },
    {
      definition: {
        name: "analyze_syslog",
        description: "Check syslog for error patterns",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to syslog file", default: "/var/adm/ras/syslog.out" },
            pattern: { type: "string", description: "Regex pattern to search for", default: "error|fail|crit" },
          },
        },
      },
      async execute(args) {
        const { path = "/var/adm/ras/syslog.out", pattern = "error|fail|crit" } = z.object({
          path: z.string().optional(),
          pattern: z.string().optional(),
        }).parse(args);
        const output = await ssh.execute(`grep -Ei "${pattern}" "${path}" | tail -n 50`);
        return text(output || "No matches found.");
      },
    },
    {
      definition: {
        name: "check_dump_config",
        description: "Check system dump configuration and recent dumps",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await ssh.execute("sysdumpdev -l && ls -la /var/adm/ras/ | grep -i dump");
        return text(output);
      },
    },
  ];
}
