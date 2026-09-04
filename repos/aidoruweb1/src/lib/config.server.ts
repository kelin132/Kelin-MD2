const MONGO_ENV_KEYS = [
  "MONGO_URI",
  "MONGODB_URI",
  "MONGO_URL",
  "MONGODB_URL",
  "MONGO_CONNECTION_STRING",
  "MONGODB_CONNECTION_STRING",
] as const;

export const MONGO_CONFIGURATION_MESSAGE =
  "Database connection is not configured. Add MONGO_URI (or MONGODB_URI) to every deployment instance, then restart the service.";

export function getMongoUri(): string {
  for (const key of MONGO_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  throw new Error(MONGO_CONFIGURATION_MESSAGE);
}

export function isMongoConfigurationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes(MONGO_CONFIGURATION_MESSAGE) ||
    /MONGO(?:DB)?_URI.*not configured/i.test(message)
  );
}
