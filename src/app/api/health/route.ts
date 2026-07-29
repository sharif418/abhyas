import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Force dynamic — health must always reflect live state, never be cached.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const START_TIME = Date.now()

/**
 * Health check endpoint.
 * GET /api/health
 *
 * Returns 200 when the app + database are healthy, 503 otherwise.
 * Used by the Docker HEALTHCHECK directive and load balancers.
 *
 * No authentication required — this endpoint only exposes operational
 * metadata (uptime, DB reachability, version), never user data.
 */
export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; detail?: string }> = {}
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
