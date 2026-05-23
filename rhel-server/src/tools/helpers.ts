import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolResult } from "./types.js";

export const safeShellTextPattern = /^[\w\-. ]+$/;

export function text(t: string): ToolResult {
  return { content: [{ type: "text", text: t }] };
}

export async function runAll(ssh: SSHConnectionManager, commands: string[]): Promise<string> {
  const results = await Promise.all(
    commands.map(async (cmd) => {
      try {
        const out = await ssh.execute(cmd);
        return `$ ${cmd}\n${out}`;
      } catch (e) {
        return `$ ${cmd}\nError: ${e}`;
      }
    })
  );
  return results.join("\n\n");
}
