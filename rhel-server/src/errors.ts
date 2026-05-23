export class SSHError extends Error {
  constructor(message: string, public override readonly cause?: Error) {
    super(message);
    this.name = "SSHError";
  }
}

export class CommandError extends Error {
  constructor(
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(`Command failed (exit ${exitCode}): ${stderr.trim() || "(no stderr)"}`);
    this.name = "CommandError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
