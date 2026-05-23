import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { runAll, text } from "./helpers.js";

export function createSystemTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "execute_aix_command",
        description: "Execute a command on the AIX system via SSH. Use this for any AIX-specific operations like oslevel, lsdev, errpt, etc.",
        inputSchema: {
          type: "object",
          properties: {
            command: { type: "string", description: "The command to execute on the AIX system" },
          },
          required: ["command"],
        },
      },
      async execute(args) {
        const { command } = z.object({ command: z.string() }).parse(args);
        const output = await ssh.execute(command);
        return text(output);
      },
    },
    {
      definition: {
        name: "get_aix_system_info",
        description: "Get comprehensive AIX system information including OS level, hardware details, and configuration",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await runAll(ssh, [
          "oslevel -s",
          "uname -a",
          "prtconf | head -20",
          "lsattr -El sys0 -a realmem",
          "bootinfo -s hdisk0",
        ]);
        return text(output);
      },
    },
    {
      definition: {
        name: "health_check_aix",
        description: "Run a read-only AIX health check for normal operations or incident triage",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await runAll(ssh, [
          "oslevel -s",
          "uptime",
          "prtconf | head -20",
          "lparstat -i | head -40",
          "errpt | head -50",
          "df -g",
          "vmstat 1 2 | tail -1",
          "svmon -G | head -30",
          "netstat -rn",
        ]);
        return text(output);
      },
    },
    {
      definition: {
        name: "get_lpar_config",
        description: "Get LPAR configuration information",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        return text(await ssh.execute("lparstat -i"));
      },
    },
    {
      definition: {
        name: "get_kernel_params",
        description: "Get kernel tuning parameters (vmo, ioo, schedo, no, nfso) with current and default values",
        inputSchema: {
          type: "object",
          properties: {
            types: {
              type: "array",
              items: { type: "string", enum: ["vmo", "ioo", "schedo", "no", "nfso"] },
              default: ["vmo", "ioo", "schedo", "no", "nfso"],
            },
          },
        },
      },
      async execute(args) {
        const { types = ["vmo", "ioo", "schedo", "no", "nfso"] } = z.object({
          types: z.array(z.string()).optional(),
        }).parse(args);
        const results = await Promise.all(types.map(async (type) => {
          try {
            const out = await ssh.execute(`${type} -a`);
            return `--- ${type} Parameters ---\n${out}`;
          } catch (e) {
            return `--- ${type} Parameters ---\nError: ${e}`;
          }
        }));
        return text(results.join("\n\n"));
      },
    },
    {
      definition: {
        name: "get_path_commands",
        description: "List commands in PATH with 'what' and 'file' metadata for version comparison",
        inputSchema: {
          type: "object",
          properties: {
            paths: {
              type: "array",
              items: { type: "string" },
              description: "Optional list of paths to check (defaults to $PATH)",
            },
          },
        },
      },
      async execute(args) {
        const { paths } = z.object({ paths: z.array(z.string()).optional() }).parse(args);
        const pathStr = paths ? paths.join(":") : (await ssh.execute("echo $PATH")).trim();
        const dirs = pathStr.split(":").filter(Boolean);

        const results = await Promise.all(dirs.map(async (dir) => {
          try {
            const files = await ssh.execute(`find ${dir} -maxdepth 1 -type f -perm -111 -print | head -n 50`);
            if (!files.trim()) return `--- Directory: ${dir} ---\nNo commands found.`;

            const details = await Promise.all(
              files.trim().split("\n").map(async (f) => {
                const fileInfo = await ssh.execute(`file ${f}`);
                const whatInfo = await ssh.execute(`what ${f} | head -n 2`);
                return `${f}:\n  File: ${fileInfo.trim()}\n  What: ${whatInfo.trim()}`;
              })
            );
            return `--- Directory: ${dir} ---\n${details.join("\n")}`;
          } catch (e) {
            return `--- Directory: ${dir} ---\nError: ${e}`;
          }
        }));
        return text(results.join("\n\n"));
      },
    },
    {
      definition: {
        name: "get_system_limits",
        description: "Get system limits (ulimit and /etc/security/limits)",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const [ulimit, limits] = await Promise.all([
          ssh.execute("ulimit -a"),
          ssh.execute("cat /etc/security/limits"),
        ]);
        return text(`--- ulimit -a ---\n${ulimit}\n\n--- /etc/security/limits ---\n${limits}`);
      },
    },
    {
      definition: {
        name: "list_filesets",
        description: "List installed filesets using 'lslpp'",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Optional pattern to filter filesets", default: "" },
          },
        },
      },
      async execute(args) {
        const { pattern = "" } = z.object({ pattern: z.string().optional() }).parse(args);
        const command = pattern ? `lslpp -L | grep -i "${pattern}"` : "lslpp -L | head -n 200";
        return text(await ssh.execute(command));
      },
    },
  ];
}
