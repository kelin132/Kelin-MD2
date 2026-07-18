export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  details: string | null;
}

const MAX_LOGS = 1000;
const logs: LogEntry[] = [];
let counter = 0;

export function addLog(level: LogLevel, message: string, details?: string): void {
  const entry: LogEntry = {
    id: `log_${Date.now()}_${++counter}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    details: details ?? null,
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
}

export function getLogs(level?: string, limit = 100): LogEntry[] {
  let result = level && level !== "all" ? logs.filter((l) => l.level === level) : logs;
  return result.slice(-Math.min(limit, MAX_LOGS));
}

export function clearLogs(): void {
  logs.length = 0;
}

// Intercept bot logs into buffer
export function botLog(level: LogLevel, message: string, details?: string): void {
  addLog(level, message, details);
}
