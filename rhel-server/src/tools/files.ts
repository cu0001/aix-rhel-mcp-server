import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { safeShellTextPattern, text } from "./helpers.js";

export function createFileTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "list_rhel_filesystems",
        description: "List mounted filesystems, usage, block devices, and LVM layout on the RHEL system",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await ssh.execute("df -hT && lsblk -f && pvs 2>/dev/null && vgs 2>/dev/null && lvs 2>/dev/null");
        return text(output);
      },
    },
    {
      definition: {
        name: "read_rhel_file",
        description: "Read the contents of a file on the RHEL system",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "The full path to the file to read" },
            lines: { type: "number", description: "Optional number of lines to read (default: all)" },
          },
          required: ["path"],
        },
      },
      async execute(args) {
        const { path, lines } = z.object({
          path: z.string().startsWith("/", "path must be absolute"),
          lines: z.number().int().positive().optional(),
        }).parse(args);
        const command = lines ? `head -n ${lines} "${path}"` : `cat "${path}"`;
        return text(await ssh.execute(command));
      },
    },
    {
      definition: {
        name: "download_sos_file",
        description: "Download a file from the RHEL system to the local 'sos' directory using SFTP",
        inputSchema: {
          type: "object",
          properties: {
            remote_path: { type: "string", description: "Full path to the file on the RHEL system" },
            local_filename: { type: "string", description: "Filename to save as in the local 'sos' directory" },
          },
          required: ["remote_path", "local_filename"],
        },
      },
      async execute(args) {
        const { remote_path, local_filename } = z.object({
          remote_path: z.string().startsWith("/", "remote_path must be absolute"),
          local_filename: z.string().regex(safeShellTextPattern, "local_filename must be a safe filename"),
        }).parse(args);
        const localPath = `./sos/${local_filename}`;
        await ssh.downloadFile(remote_path, localPath);
        return text(`Successfully downloaded to ${localPath}`);
      },
    },
    {
      definition: {
        name: "get_standard_config_files",
        description: "Get contents of standard RHEL configuration files",
        inputSchema: {
          type: "object",
          properties: {
            files: {
              type: "array",
              items: { type: "string" },
              default: ["/etc/redhat-release", "/etc/os-release", "/etc/fstab", "/etc/hosts", "/etc/resolv.conf", "/etc/sysctl.conf"],
            },
          },
        },
      },
      async execute(args) {
        const { files = ["/etc/redhat-release", "/etc/os-release", "/etc/fstab", "/etc/hosts", "/etc/resolv.conf", "/etc/sysctl.conf"] } =
          z.object({ files: z.array(z.string()).optional() }).parse(args);
        const results = await Promise.all(files.map(async (f) => {
          try {
            const out = await ssh.execute(`cat "${f}"`);
            return `--- File: ${f} ---\n${out}`;
          } catch (e) {
            return `--- File: ${f} ---\nError: ${e}`;
          }
        }));
        return text(results.join("\n\n"));
      },
    },
  ];
}
