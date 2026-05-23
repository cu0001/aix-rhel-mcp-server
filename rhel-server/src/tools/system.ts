import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { runAll, text } from "./helpers.js";

export function createSystemTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "execute_rhel_command",
        description: "Execute a command on the RHEL ppc64le system via SSH. Use this for Linux-specific operations like uname, rpm, systemctl, journalctl, etc.",
        inputSchema: {
          type: "object",
          properties: {
            command: { type: "string", description: "The command to execute on the RHEL system" },
          },
          required: ["command"],
        },
      },
      async execute(args) {
        const { command } = z.object({ command: z.string() }).parse(args);
        return text(await ssh.execute(command));
      },
    },
    {
      definition: {
        name: "get_rhel_system_info",
        description: "Get comprehensive RHEL ppc64le system information including OS release, kernel, CPU, memory, block devices, and virtualization hints",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await runAll(ssh, [
          "cat /etc/redhat-release",
          "uname -a",
          "uname -m",
          "lscpu",
          "free -h",
          "lsblk -o NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,MODEL",
          "systemd-detect-virt 2>/dev/null || true",
        ]);
        return text(output);
      },
    },
    {
      definition: {
        name: "health_check_rhel",
        description: "Run a read-only RHEL ppc64le health check for normal operations or incident triage",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await runAll(ssh, [
          "cat /etc/redhat-release",
          "uname -a",
          "uname -m",
          "uptime",
          "systemctl --failed --no-pager",
          "journalctl --since \"24 hours ago\" -p warning..alert --no-pager | tail -n 100",
          "df -hT",
          "free -h",
          "vmstat 1 2 | tail -1",
          "ss -s",
        ]);
        return text(output);
      },
    },
    {
      definition: {
        name: "get_rhel_power_info",
        description: "Get IBM Power / ppc64le platform details from Linux",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await runAll(ssh, [
          "uname -m",
          "lscpu | egrep 'Architecture|Byte Order|CPU\\(s\\)|Thread|Core|Socket|Model name|Hypervisor|Virtualization'",
          "cat /proc/cpuinfo | egrep 'platform|model|machine|firmware|revision' | head -50",
          "ppc64_cpu --smt 2>/dev/null || true",
        ]);
        return text(output);
      },
    },
    {
      definition: {
        name: "get_rhel_services",
        description: "List systemd service state, optionally filtered by service name pattern",
        inputSchema: {
          type: "object",
          properties: {
            filter: { type: "string", description: "Optional service name filter" },
          },
        },
      },
      async execute(args) {
        const { filter } = z.object({ filter: z.string().optional() }).parse(args);
        const command = filter
          ? `systemctl list-units --type=service --all --no-pager | grep -i "${filter}"`
          : "systemctl list-units --type=service --all --no-pager | head -n 200";
        return text(await ssh.execute(command));
      },
    },
    {
      definition: {
        name: "get_kernel_params",
        description: "Get Linux kernel and sysctl parameters",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Optional sysctl key pattern, e.g. vm., net.ipv4" },
          },
        },
      },
      async execute(args) {
        const { pattern } = z.object({ pattern: z.string().optional() }).parse(args);
        const command = pattern ? `sysctl -a 2>/dev/null | grep -i "${pattern}"` : "sysctl -a 2>/dev/null | head -n 300";
        return text(await ssh.execute(command));
      },
    },
    {
      definition: {
        name: "get_path_commands",
        description: "List commands in PATH with file metadata and package ownership",
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
                const pkgInfo = await ssh.execute(`rpm -qf ${f} 2>/dev/null || true`);
                return `${f}:\n  File: ${fileInfo.trim()}\n  Package: ${pkgInfo.trim()}`;
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
        description: "Get system limits from ulimit, limits.conf, and systemd defaults",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const [ulimit, limits, systemd] = await Promise.all([
          ssh.execute("ulimit -a"),
          ssh.execute("cat /etc/security/limits.conf /etc/security/limits.d/*.conf 2>/dev/null"),
          ssh.execute("systemctl show --property DefaultLimitNOFILE --property DefaultLimitNPROC --property DefaultTasksMax 2>/dev/null || true"),
        ]);
        return text(`--- ulimit -a ---\n${ulimit}\n\n--- limits.conf ---\n${limits}\n\n--- systemd defaults ---\n${systemd}`);
      },
    },
    {
      definition: {
        name: "list_packages",
        description: "List installed RPM packages, optionally filtered by pattern",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Optional package name filter", default: "" },
          },
        },
      },
      async execute(args) {
        const { pattern = "" } = z.object({ pattern: z.string().optional() }).parse(args);
        const command = pattern ? `rpm -qa | grep -i "${pattern}"` : "rpm -qa | sort | head -n 300";
        return text(await ssh.execute(command));
      },
    },
  ];
}
