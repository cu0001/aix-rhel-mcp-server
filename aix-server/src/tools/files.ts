import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { safeShellTextPattern, text } from "./helpers.js";

export function createFileTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "list_aix_filesystems",
        description: "List all mounted filesystems on the AIX system with usage information",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        return text(await ssh.execute("df -g"));
      },
    },
    {
      definition: {
        name: "read_aix_file",
        description: "Read the contents of a file on the AIX system",
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
        name: "download_snap_file",
        description: "Download a file from the AIX system to the local 'snap' directory using SFTP",
        inputSchema: {
          type: "object",
          properties: {
            remote_path: { type: "string", description: "Full path to the file on the AIX system" },
            local_filename: { type: "string", description: "Filename to save as in the local 'snap' directory" },
          },
          required: ["remote_path", "local_filename"],
        },
      },
      async execute(args) {
        const { remote_path, local_filename } = z.object({
          remote_path: z.string().startsWith("/", "remote_path must be absolute"),
          local_filename: z.string().regex(safeShellTextPattern, "local_filename must be a safe filename"),
        }).parse(args);
        const localPath = `./snap/${local_filename}`;
        await ssh.downloadFile(remote_path, localPath);
        return text(`Successfully downloaded to ${localPath}`);
      },
    },
    {
      definition: {
        name: "get_standard_config_files",
        description: "Get contents of standard AIX configuration files (e.g., in /etc)",
        inputSchema: {
          type: "object",
          properties: {
            files: {
              type: "array",
              items: { type: "string" },
              default: ["/etc/profile", "/etc/environment", "/etc/resolv.conf", "/etc/hosts", "/etc/netsvc.conf"],
            },
          },
        },
      },
      async execute(args) {
        const { files = ["/etc/profile", "/etc/environment", "/etc/resolv.conf", "/etc/hosts", "/etc/netsvc.conf"] } =
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
