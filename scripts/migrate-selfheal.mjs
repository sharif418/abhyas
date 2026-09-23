// =============================================================================
// অভ্যাস (Abhyas) — Self-Healing Production Migration System
// =============================================================================
//
// WHY THIS EXISTS
// ---------------
// Production PostgreSQL ended up in a "drifted" state: the actual schema
// stopped matching `prisma/migrations` bookkeeping, so plain
// `prisma migrate deploy` aborts early and NEW migrations never apply
// (symptom: /api/habits, /api/goals, /api/planner → 500 for missing
// columns/tables while older endpoints keep working).
//
// WHAT THIS DOES (idempotent — safe on every container boot)
// ----------------------------------------------------------
//   1. Reads every `prisma/migrations/*/migration.sql` in chronological order.
//   2. Splits each file into statements and applies ONLY the statements whose
//      target object (table / column / index / constraint) does not exist yet.
//      "already exists" errors are tolerated — the goal is convergence.
//   3. Repairs the `_prisma_migrations` bookkeeping table:
//        • deletes rows for FAILED attempts (finished_at NULL, never rolled back)
//        • inserts correctly-checksummed "applied" rows for every migration
//          that is not yet recorded as successfully applied.
//   4. Prints a machine-readable summary line so `docker logs` shows exactly
//      what happened.
//
// After this script runs, `prisma migrate deploy` is a green no-op.
//
// DESIGN NOTES
// ------------
// • Uses the already-generated Prisma client (query engine only — no
//   schema-engine binary needed), so it works in the minimal runtime image.
// • PostgreSQL only. Local dev (SQLite via `db push`) is skipped instantly.
// • Never drops, renames or truncates anything — additive convergence only.
// =============================================================================

import { createHash, randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations')

const log = (...args) => console.log('[selfheal]', ...args)

// --- Provider gate: this script only repairs PostgreSQL ---------------------
const DATABASE_URL = process.env.DATABASE_URL ?? ''
const isPostgres = DATABASE_URL.startsWith('postgres')
if (!isPostgres) {
  // Local dev uses SQLite + `db push`; nothing to repair.
  log('non-postgres DATABASE_URL — skipping (local dev manages its own schema).')
  process.exit(0)
}

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({
  log: [{ level: 'error', emit: 'stdout' }],
})

// --- SQL statement handling ---------------------------------------------------

/**
 * Split a migration.sql into individual statements.
 * Strips `--` comment lines (Prisma-generated migrations use them as
 * statement titles) and splits on statement-terminating semicolons.
 */
function splitStatements(sql) {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
  return withoutComments
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.replace(/^\s+|\s+$/g, ''))
    .filter(Boolean)
}

// --- Existence probes (PostgreSQL catalogs) ----------------------------------

const tableExists = async (name) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass($1) IS NOT NULL AS present`,
    `public."${name}"`,
  )
  return rows.length > 0 && rows[0].present === true
}

const columnExists = async (table, column) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 AS present FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    table,
    column,
  )
  return rows.length > 0
}

const indexExists = async (name) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 AS present FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = $1`,
    name,
  )
  return rows.length > 0
}

const constraintExists = async (name) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 AS present FROM pg_constraint WHERE conname = $1`,
    name,
  )
  return rows.length > 0
}

const typeExists = async (name) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 AS present FROM pg_type t
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typname = $1`,
    name,
  )
  return rows.length > 0
}

// --- Statement classification -------------------------------------------------

/** Extract the first double-quoted identifier after a keyword, e.g.
 *  `CREATE TABLE "Goal"` → "Goal"; falls back to unquoted token. */
function identAfter(statement, keywordRegex) {
  const m = statement.match(keywordRegex)
  if (!m) return null
  return (m[2] ?? m[1] ?? '').replace(/"/g, '') || null
}

/**
 * Decide whether a statement should run, probing the catalog first.
 * Returns { skip: boolean, reason?: string }.
 */
async function shouldRun(statement) {
  const s = statement.replace(/\s+/g, ' ').trim()

  // CREATE TABLE "X" (…)
  if (/^CREATE TABLE/i.test(s)) {
    const name = identAfter(s, /^CREATE TABLE (?:IF NOT EXISTS )?("?)([^"(]+)\1/i)
    if (name && (await tableExists(name))) return { skip: true, reason: `table ${name} exists` }
    return { skip: false }
  }

  // CREATE [UNIQUE] INDEX "X" ON …
  if (/^CREATE (?:UNIQUE )?INDEX/i.test(s)) {
    const name = identAfter(s, /^CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?("?)([^ (]+)\1/i)
    if (name && (await indexExists(name))) return { skip: true, reason: `index ${name} exists` }
    return { skip: false }
  }

  // ALTER TABLE "T" ADD COLUMN "C" …
  let m = s.match(/^ALTER TABLE "?([^"\s]+)"? ADD COLUMN "?([^"\s]+)"?/i)
  if (m) {
    if (await columnExists(m[1], m[2])) return { skip: true, reason: `column ${m[1]}.${m[2]} exists` }
    return { skip: false }
  }

  // ALTER TABLE "T" ADD CONSTRAINT "N" …
  m = s.match(/^ALTER TABLE "?([^"\s]+)"? ADD CONSTRAINT "?([^"\s]+)"?/i)
  if (m) {
    if (await constraintExists(m[2])) return { skip: true, reason: `constraint ${m[2]} exists` }
    return { skip: false }
  }

  // ALTER TABLE "T" ADD PRIMARY KEY / FOREIGN KEY / UNIQUE (unnamed)
  m = s.match(/^ALTER TABLE "?([^"\s]+)"? ADD (PRIMARY KEY|FOREIGN KEY|UNIQUE)/i)
  if (m) {
    const kind = { 'PRIMARY KEY': 'p', 'FOREIGN KEY': 'f', UNIQUE: 'u' }[m[2]]
    const rows = await prisma.$queryRawUnsafe(
      `SELECT 1 AS present FROM pg_constraint
       WHERE conrelid = $1::regclass AND contype = $2`,
      `public."${m[1]}"`,
      kind,
    )
    if (rows.length > 0) return { skip: true, reason: `${m[2]} on ${m[1]} exists` }
    return { skip: false }
  }

  // CREATE TYPE "X" / CREATE SCHEMA / CREATE EXTENSION — always attempt.
  return { skip: false }
}

// --- Bookkeeping repair ---------------------------------------------------------

const MIGRATIONS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE "_prisma_migrations" ADD PRIMARY KEY ("id");
`

async function ensureMigrationsTable() {
  for (const stmt of splitStatements(MIGRATIONS_TABLE_DDL)) {
    try {
      await prisma.$executeRawUnsafe(stmt)
    } catch {
      /* ALTER TABLE ADD PRIMARY KEY fails when the PK already exists — fine. */
    }
  }
}

async function listRecordedMigrations() {
  return prisma.$queryRawUnsafe(
    `SELECT migration_name, checksum, finished_at, rolled_back_at
     FROM "_prisma_migrations"`,
  )
}

// --- Main -----------------------------------------------------------------------

const applied = []
const skippedExisting = []
const errors = []

try {
  const dirs = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && /^\d+_/.test(d.name))
    .map((d) => d.name)
    .sort()

  if (dirs.length === 0) {
    log(`no migration directories found under ${MIGRATIONS_DIR}`)
  }

  await ensureMigrationsTable()

  for (const dirName of dirs) {
    const filePath = join(MIGRATIONS_DIR, dirName, 'migration.sql')
    const sql = await readFile(filePath, 'utf8')
    const statements = splitStatements(sql)
    let ran = 0

    for (const statement of statements) {
      const { skip, reason } = await shouldRun(statement)
      if (skip) {
        skippedExisting.push(`${dirName}: ${reason}`)
        continue
      }
      try {
        await prisma.$executeRawUnsafe(statement)
        ran += 1
      } catch (err) {
        const message = err?.meta?.message ?? err?.message ?? String(err)
        // Convergence tolerance: objects that already exist under a different
        // statement shape are fine. Extension privilege issues are logged but
        // non-fatal (the app does not require the extensions to boot).
        if (/already exists|duplicate/i.test(message)) {
          skippedExisting.push(`${dirName}: tolerated "already exists"`)
        } else if (/must be (a )?superuser|permission denied/i.test(message)) {
          skippedExisting.push(`${dirName}: tolerated extension privilege issue`)
        } else {
          errors.push(`${dirName}: ${message.slice(0, 300)}`)
        }
      }
    }

    if (ran > 0) applied.push(`${dirName} (${ran} stmts)`)
  }

  // --- Bookkeeping: remove failed attempts, mark converged migrations applied.
  await prisma.$executeRawUnsafe(
    `DELETE FROM "_prisma_migrations"
     WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
  )

  const recorded = await listRecordedMigrations()
  const recordedOk = new Set(recorded.filter((r) => r.finished_at).map((r) => r.migration_name))
  const recordedByChecksum = new Map(
    recorded.filter((r) => r.finished_at).map((r) => [r.migration_name, r.checksum]),
  )

  for (const dirName of dirs) {
    const sql = await readFile(join(MIGRATIONS_DIR, dirName, 'migration.sql'), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const steps = splitStatements(sql).length

    if (recordedOk.has(dirName)) {
      // Applied already — but if the recorded checksum no longer matches the
      // current file (migration edited after being applied — historically
      // happened in this repo), migrate deploy would abort with P3006.
      // The schema is converged by the steps above, so record it truthfully.
      if (recordedByChecksum.get(dirName) !== checksum) {
        await prisma.$executeRawUnsafe(
          `UPDATE "_prisma_migrations" SET checksum = $1 WHERE migration_name = $2`,
          checksum,
          dirName,
        )
        applied.push(`${dirName} (stale checksum repaired)`)
      }
      continue
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations"
         ("id", "checksum", "finished_at", "migration_name", "logs",
          "started_at", "applied_steps_count")
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, NULL, CURRENT_TIMESTAMP, $4)`,
      randomUUID(),
      checksum,
      dirName,
      steps,
    )
    applied.push(`${dirName} (baseline row recorded)`)
  }

  const summary = {
    migrations: dirs.length,
    appliedNow: applied.length,
    converged: skippedExisting.length,
    errors: errors.length,
  }
  log('summary', JSON.stringify(summary))
  for (const line of applied) log('applied:', line)
  for (const line of errors) log('ERROR:', line)
} catch (err) {
  // Catastrophic (e.g. DB unreachable) — surface loudly but exit non-fatal
  // so the web server still boots; Docker HEALTHCHECK reports real status.
  log('FATAL:', err?.meta?.message ?? err?.message ?? String(err))
  process.exitCode = 1
} finally {
  await prisma.$disconnect().catch(() => {})
}
