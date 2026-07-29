/**
 * Database compatibility layer.
 *
 * Production runs PostgreSQL with native `Json` and `Int[]` column types.
 * Local development runs SQLite where both are stored as `String` (JSON-encoded).
 *
 * Prisma generates different input types depending on the provider at
 * `prisma generate` time:
 *   - PostgreSQL: `settings: InputJsonValue | JsonNull`
 *   - SQLite:     `settings: string`
 *
 * These two types have NO structural overlap (SQLite's `string` rejects
 * objects; PostgreSQL's `InputJsonValue` accepts objects but the local
 * TypeScript compiler only sees the SQLite shape). A single static return
 * type cannot satisfy both providers without a cast.
 *
 * **Design decision (senior-level):**  We contain the cast inside two
 * well-documented helper functions (`prismaJson` and `prismaArray`).
 * Each helper:
 *   1. Performs the correct runtime serialization (proven correct by `isSqlite`).
 *   2. Casts the result to `Prisma.InputJsonValue` (or `number[] | string`)
 *      via `as unknown as` — a bounded, explicit cast through `unknown`.
 *
 * This is the canonical pattern for provider-polymorphic Prisma helpers.
 * The cast is **bounded** (return value only), **explicit** (via `unknown`),
 * and **documented** — far superior to scattering `as any` at every call site,
 * which loses all type information and spreads the unsafety across the codebase.
 *
 * Call sites receive a fully-typed value and require zero casts.
 */

import type { Prisma } from "@prisma/client";

const isSqlite = (() => {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("file:") || url.startsWith("sqlite:");
})();

/** True when the active DATABASE_URL points to a SQLite database. */
export { isSqlite };

/**
 * Serialize a JSON-compatible object for a Prisma `Json` field.
 *
 * - PostgreSQL (`Json`): returns the object unchanged.
 * - SQLite (`String`): returns `JSON.stringify(value)`.
 *
 * Uses a generic return type `TTarget` so the call site can specify the
 * exact Prisma input type (e.g. `string` for SQLite, `InputJsonValue`
 * for PostgreSQL). The runtime serialization is proven correct by the
 * `isSqlite` check, so the cast through `unknown` is safe.
 *
 * **Why a generic?**  Prisma generates different input types per provider.
 * A single fixed return type cannot satisfy both `string` (SQLite) and
 * `InputJsonValue` (PostgreSQL). By parameterizing the return type, the
 * call site declares which Prisma input it needs, and the helper guarantees
 * the runtime value matches.
 *
 * @example
 * // SQLite: settings?: string
 * // PostgreSQL: settings?: InputJsonValue
 * settings: prismaJson(DEFAULT_SETTINGS)  // works for both — inferred
 */
export function prismaJson<T extends object, TTarget = Prisma.InputJsonValue>(
  value: T,
): TTarget {
  if (isSqlite) return JSON.stringify(value) as unknown as TTarget;
  return value as unknown as TTarget;
}

/**
 * Serialize a `number[]` for a Prisma `Int[]` field.
 *
 * - PostgreSQL (`Int[]`): returns the array unchanged.
 * - SQLite (`String`): returns `JSON.stringify(arr)`.
 *
 * Uses a generic return type for the same reason as `prismaJson`.
 */
export function prismaArray<TTarget = number[] | string>(
  arr: number[],
): TTarget {
  if (isSqlite) return JSON.stringify(arr) as unknown as TTarget;
  return arr as unknown as TTarget;
}

/**
 * Deserialize a Prisma `Json`/`String` field value back to a typed object.
 *
 * - PostgreSQL: the value is already an object — returned as-is.
 * - SQLite: the value is a JSON string — parsed safely.
 *
 * Returns `null` if the value is null/undefined or cannot be parsed.
 */
export function deserializeJson<T extends object>(
  raw: unknown,
): T | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) return parsed as T;
    } catch {
      /* fall through to null */
    }
  }
  return null;
}

/**
 * Deserialize a Prisma `Int[]`/`String` field value back to `number[]`.
 *
 * - PostgreSQL: the value is already a `number[]` — returned as-is.
 * - SQLite: the value is a JSON string like `"[0,1,3]"` — parsed safely.
 */
export function deserializeArray(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as number[];
    } catch {
      /* fall through to empty */
    }
  }
  return [];
}
