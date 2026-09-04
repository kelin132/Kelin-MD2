import { Database, RefreshCw } from "lucide-react";
import { AuroraField } from "./AuroraField";

function isConfigurationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("Database connection is not configured") || /MONGO(?:DB)?_URI.*not configured/i.test(message);
}

export function ConnectionNotice({ onRetry, error }: { onRetry?: () => void; error?: unknown }) {
  const configurationMissing = isConfigurationError(error);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <AuroraField />
      <div className="glass-strong relative max-w-lg rounded-3xl p-8 text-center md:p-10">
        <span className="bg-gradient-brand mx-auto grid size-12 place-items-center rounded-full">
          <Database className="size-5" />
        </span>
        <p className="font-mono-ui text-neon-cyan mt-5 text-[10px] tracking-[0.24em] uppercase">
          {configurationMissing ? "Database configuration required" : "Database temporarily unavailable"}
        </p>
        <h1 className="font-display mt-2 text-2xl font-bold">
          {configurationMissing ? "AIDORU needs its data connection" : "AIDORU is reconnecting"}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {configurationMissing
            ? "The deployment is missing MONGO_URI. Add it to every running service instance, restart the deployment, and try again."
            : "MongoDB is configured, but this request could not reach it. The service will retry transient failures; try again in a moment if needed."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="connection-retry-button bg-gradient-brand text-foreground mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            <RefreshCw className="size-4" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
