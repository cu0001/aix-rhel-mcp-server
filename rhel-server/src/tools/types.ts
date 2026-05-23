import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export interface ToolHandler {
  definition: Tool;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}
