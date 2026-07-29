/**
 * Database compatibility layer.
 *
 * The production database is PostgreSQL (Json + Int[] native types).
 * Local development uses SQLite (String fields requiring JSON serialization).
 *
 * These helpers detect the active provider at runtime and serialize values
 * appropriately, so the same code path works in both environments without
 * conditional imports or type gymnastics.
 */

const isSqlite = (() => {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("file:") || url.startsWith("sqlite:");
})();

/** True when the active DATABASE_URL points to a SQLite database. */
export { isSqlite };

/**
 * Serialize a JSON-compatible value for a Prisma Json field.
 * - PostgreSQL (Json): pass the object through.
 * - SQLite (String): JSON.stringify it.
 */
export function serializeJson<T>(value: T): T | string {
  if (isSqlite) return JSON.stringify(value);
  return value;
}

/**
 * Serialize a number array for a Prisma Int[] field.
 * - PostgreSQL (Int[]): pass the array through.
 * - SQLite (String): JSON.stringify it.
 */
export function serializeArray(arr: number[]): number[] | string {
  if (isSqlite) return JSON.stringify(arr);
  return arr;
}
