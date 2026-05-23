const DEBUG = process.env.DEBUG === "true" || process.env.DEBUG === "1";

type LogData = Record<string, unknown>;

function write(level: string, msg: string, data?: LogData): void {
  // MCP uses stdout for protocol — all logging must go to stderr
  const entry: Record<string, unknown> = { level, msg, ts: new Date().toISOString() };
  if (data) Object.assign(entry, data);
  process.stderr.write(JSON.stringify(entry) + "\n");
}

export const logger = {
  info(msg: string, data?: LogData): void { write("info", msg, data); },
  warn(msg: string, data?: LogData): void { write("warn", msg, data); },
  error(msg: string, data?: LogData): void { write("error", msg, data); },
  debug(msg: string, data?: LogData): void { if (DEBUG) write("debug", msg, data); },
};
