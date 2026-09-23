import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSqlite } from '@/lib/db-compat'

// Force dynamic — health must always reflect live state, never be cached.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const START_TIME = Date.now()

/** Tables the running code requires (Prisma model → table name). */
const REQUIRED_TABLES = [
  'User',
  'Habit',
  'HabitCompletion',
  'PrayerRecord',
  'QuranSession',
  'Achievement',
  'PrayerTimeCache',
  'MoodEntry',
  'FocusSession',
  'Goal',
  'PlannerTask',
  'PushSubscription',
] as const

/** Columns added by later migrations — the exact objects whose absence
 *  previously caused silent 500s on /api/habits, /api/goals, /api/planner. */
const REQUIRED_COLUMNS: Array<{ table: string; column: string }> = [
  { table: 'Habit', column: 'note' },
  { table: 'Habit', column: 'nameEn' },
]

type CheckBase = { status: 'ok' | 'error'; latencyMs?: number; detail?: string }
type SchemaDrift = {
  status: 'ok' | 'error'
  provider: 'postgresql' | 'sqlite'
  missingTables: string[]
  missingColumns: string[]
  migrationsRecorded?: number
  migrationsFailed?: number
  detail?: string
}

type Checks = Record<string, CheckBase> & { schemaDrift?: SchemaDrift }

/**
 * Read-only schema diagnostics. Queries catalog views only — never touches
 * user data. Reveals drift between the running code and the actual database
 * (the exact failure mode that broke /api/habits & /api/goals in production).
 */
async function checkSchema(): Promise<SchemaDrift> {
  try {
    if (isSqlite) {
      const tables = (await db.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table'`,
      )) as Array<{ name: string }>
      const present = new Set(tables.map((t) => t.name))
      const missingTables = REQUIRED_TABLES.filter((t) => !present.has(t))
      const missingColumns = (
        await Promise.all(
          REQUIRED_COLUMNS.map(async ({ table, column }) => {
            if (!present.has(table)) return `${table}.${column}`
            const cols = (await db.$queryRawUnsafe(`PRAGMA table_info("${table}")`)) as Array<{
              name: string
            }>
            return cols.some((c) => c.name === column) ? null : `${table}.${column}`
          }),
        )
      ).filter((x): x is string => x !== null)
      return { status: missingTables.length || missingColumns.length ? 'error' : 'ok', provider: 'sqlite', missingTables, missingColumns }
    }

    // PostgreSQL path
    const tables = (await db.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    )) as Array<{ table_name: string }>
    const present = new Set(tables.map((t) => t.table_name))
    const missingTables = REQUIRED_TABLES.filter((t) => !present.has(t))

    const missingColumns: string[] = []
    for (const { table, column } of REQUIRED_COLUMNS) {
      if (!present.has(table)) {
        missingColumns.push(`${table}.${column}`)
        continue
      }
      const cols = (await db.$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        table,
      )) as Array<{ column_name: string }>
      if (!cols.some((c) => c.column_name === column)) missingColumns.push(`${table}.${column}`)
    }

    // Migration bookkeeping (absent table simply means "db push" was used —
    // the selfheal entrypoint script creates/repairs it on postgres).
    let migrationsRecorded: number | undefined
    let migrationsFailed: number | undefined
    if (present.has('_prisma_migrations')) {
      const rows = (await db.$queryRawUnsafe(
        `SELECT
           COUNT(*) FILTER (WHERE finished_at IS NOT NULL) AS recorded,
           COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS failed
         FROM "_prisma_migrations"`,
      )) as Array<{ recorded: bigint | number; failed: bigint | number }>
      migrationsRecorded = Number(rows[0]?.recorded ?? 0)
      migrationsFailed = Number(rows[0]?.failed ?? 0)
    }

    return {
      status: missingTables.length || missingColumns.length ? 'error' : 'ok',
      provider: 'postgresql',
      missingTables,
      missingColumns,
      migrationsRecorded,
      migrationsFailed,
    }
  } catch (err) {
    return {
      status: 'error',
      provider: isSqlite ? 'sqlite' : 'postgresql',
      missingTables: [],
      missingColumns: [],
      detail: err instanceof Error ? err.message.slice(0, 200) : 'schema check failed',
    }
  }
}

/**
 * Health check endpoint.
 * GET /api/health
 *
 * Returns 200 when the app + database + schema are healthy, 503 otherwise.
 * Used by the Docker HEALTHCHECK directive and load balancers.
 *
 * No authentication required — this endpoint only exposes operational
 * metadata (uptime, DB reachability, schema drift state), never user data.
 */
export async function GET() {
  const checks: Checks = {}
  let allOk = true

  // --- Database connectivity check ---
  const dbStart = Date.now()
  try {
    // Lightweight round-trip query. SELECT 1 is the canonical DB liveness probe.
    await db.$queryRaw`SELECT 1`
    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
    }
  } catch (err) {
    allOk = false
    checks.database = {
      status: 'error',
      detail: err instanceof Error ? err.message : 'Unknown database error',
    }
  }

  // --- Schema drift check (connectivity implies this is affordable) ---
  if (checks.database.status === 'ok') {
    const schema = await checkSchema()
    if (schema.status !== 'ok') allOk = false
    checks.schema = {
      status: schema.status,
      detail:
        schema.status === 'ok'
          ? undefined
          : `missing tables: [${schema.missingTables.join(', ')}] columns: [${schema.missingColumns.join(', ')}]${schema.detail ? ` — ${schema.detail}` : ''}`,
    }
    // Drift details are safe operational metadata (Prisma-standard names).
    checks.schemaDrift = schema
  }

  const body = {
    status: allOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - START_TIME) / 1000),
    env: process.env.NODE_ENV ?? 'unknown',
    checks,
  }

  return NextResponse.json(body, {
    status: allOk ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Health-Status': allOk ? 'healthy' : 'unhealthy',
    },
  })
}
