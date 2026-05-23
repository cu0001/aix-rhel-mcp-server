import { z } from "zod";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "./types.js";
import { runAll, safeShellTextPattern, text } from "./helpers.js";

export function createUserTools(ssh: SSHConnectionManager): ToolHandler[] {
  return [
    {
      definition: {
        name: "list_aix_processes",
        description: "List running processes on the AIX system",
        inputSchema: {
          type: "object",
          properties: {
            filter: { type: "string", description: "Optional filter string to search for specific processes (alphanumeric only)" },
          },
        },
      },
      async execute(args) {
        const { filter } = z.object({
          filter: z.string().regex(safeShellTextPattern, "filter must be alphanumeric").optional(),
        }).parse(args);
        const command = filter
          ? `ps -ef | grep "${filter}" | grep -v grep`
          : "ps -ef";
        return text(await ssh.execute(command));
      },
    },
    {
      definition: {
        name: "get_aix_users",
        description: "Get information about users and groups on the AIX system",
        inputSchema: { type: "object", properties: {} },
      },
      async execute() {
        const output = await runAll(ssh, ["lsuser ALL", "lsgroup ALL", "who"]);
        return text(output);
      },
    },
    {
      definition: {
        name: "get_users_and_groups",
        description: "Get lists of users and groups with their basic attributes",
        inputSchema: {
          type: "object",
          properties: {
            target: { type: "string", enum: ["users", "groups", "all"], default: "all" },
          },
        },
      },
      async execute(args) {
        const { target = "all" } = z.object({
          target: z.enum(["users", "groups", "all"]).optional(),
        }).parse(args);
        const results: string[] = [];
        if (target === "users" || target === "all") {
          const out = await ssh.execute("lsuser -a id ALL | head -n 200");
          results.push(`--- Users (Sample) ---\n${out}`);
        }
        if (target === "groups" || target === "all") {
          const out = await ssh.execute("lsgroup -a id ALL | head -n 200");
          results.push(`--- Groups (Sample) ---\n${out}`);
        }
        return text(results.join("\n\n"));
      },
    },
  ];
}
