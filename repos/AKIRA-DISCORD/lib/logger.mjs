/** Simple console logger for standalone/panel mode */

const LEVELS = { info: "INFO", warn: "WARN", error: "ERR ", debug: "DBG " };

export function log(level, message) {
  const ts  = new Date().toTimeString().slice(0, 8);
  const tag = LEVELS[level] ?? "LOG ";
  process.stdout.write(`[${ts}] [${tag}] ${message}\n`);
}
