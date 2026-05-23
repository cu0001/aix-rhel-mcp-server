import { describe, it, expect } from "vitest";
import { SSHError, CommandError, ValidationError } from "../errors.js";

describe("SSHError", () => {
  it("sets name and message", () => {
    const err = new SSHError("connection refused");
    expect(err.name).toBe("SSHError");
    expect(err.message).toBe("connection refused");
    expect(err instanceof Error).toBe(true);
  });

  it("stores cause", () => {
    const cause = new Error("ECONNREFUSED");
    const err = new SSHError("connection refused", cause);
    expect(err.cause).toBe(cause);
  });
});

describe("CommandError", () => {
  it("sets name, message, exitCode, command, and stderr", () => {
    const err = new CommandError("ls /missing", 1, "No such file");
    expect(err.name).toBe("CommandError");
    expect(err.exitCode).toBe(1);
    expect(err.command).toBe("ls /missing");
    expect(err.stderr).toBe("No such file");
    expect(err.message).toContain("exit 1");
    expect(err.message).toContain("No such file");
  });

  it("handles empty stderr gracefully", () => {
    const err = new CommandError("false", 1, "");
    expect(err.message).toContain("(no stderr)");
  });
});

describe("ValidationError", () => {
  it("sets name and message", () => {
    const err = new ValidationError("path must be absolute");
    expect(err.name).toBe("ValidationError");
    expect(err.message).toBe("path must be absolute");
    expect(err instanceof Error).toBe(true);
  });
});
