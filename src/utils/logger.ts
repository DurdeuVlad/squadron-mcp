export type LogLevel = "info" | "warn" | "error";

export interface LogMetadata {
  [key: string]: unknown;
}

export function log(level: LogLevel, message: string, metadata: LogMetadata = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata,
  };

  console.error(JSON.stringify(entry));
}
