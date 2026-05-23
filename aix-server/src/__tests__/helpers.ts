import { vi } from "vitest";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";

/**
 * Creates a mock SSHConnectionManager for use in tool handler tests.
 * Pass a command→response map to control what each command returns.
 */
export function createMockSSH(
  responses: Map<string, string> = new Map()
): SSHConnectionManager {
  return {
    execute: vi.fn().mockImplementation(async (cmd: string) => {
      return responses.get(cmd) ?? "";
    }),
    downloadFile: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  } as unknown as SSHConnectionManager;
}
