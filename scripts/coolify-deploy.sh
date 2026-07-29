#!/usr/bin/env bash
# =============================================================================
# অভ্যাস (Abhyas) — Coolify Production Deployment Script
# =============================================================================
# Provisions and deploys the full stack to Coolify via API:
#   1. PostgreSQL 16 database (abhyas-db)
#   2. Next.js application from GitHub (Dockerfile-based)
#   3. Environment variables (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
#   4. Production domain (abhyas.ailearnersbd.com)
#   5. Deployment trigger + health verification
#
# PREREQUISITE:
#   export COOLIFY_TOKEN="your-api-token-here"
#
# USAGE:
#   COOLIFY_TOKEN="1|xxxxx" bash scripts/coolify-deploy.sh
#
# The script is idempotent: it checks for existing resources before creating
# new ones, so it can be re-run safely.
# =============================================================================
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
COOLIFY_IP="${COOLIFY_IP:-207.180.198.236}"
COOLIFY_PORT="${COOLIFY_PORT:-8000}"
COOLIFY_API="http://${COOLIFY_IP}:${COOLIFY_PORT}/api/v1"

# REQUIRED: Coolify API token (generate at Coolify → Profile → API Tokens)
: "${COOLIFY_TOKEN:?COOLIFY_TOKEN is required. Generate one at Coolify → Profile → API Tokens.}"

# Application config
GITHUB_REPO="sharif418/abhyas"
GITHUB_BRANCH="main"
APP_NAME="abhyas"
DB_NAME="abhyas-db"
PRODUCTION_DOMAIN="abhyas.ailearnersbd.com"

# Generate a secure NEXTAUTH_SECRET if not provided
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}"

# ── Helpers ──────────────────────────────────────────────────────────────────
CURL="curl -sk --connect-timeout 15 --max-time 60"
AUTH_HEADER="Authorization: Bearer ${COOLIFY_TOKEN}"

log()  { echo -e "\033[1;34m[$(date '+%H:%M:%S')]\033[0m $*"; }
ok()   { echo -e "\033[1;32m  ✓\033[0m $*"; }
err()  { echo -e "\033[1;31m  ✗\033[0m $*"; }
die()  { err "$*"; exit 1; }

api_get()  { $CURL -s -H "$AUTH_HEADER" "$COOLIFY_API/$1"; }
api_post() { $CURL -s -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" -d "$2" "$COOLIFY_API/$1"; }
api_patch(){ $CURL -s -X PATCH -H "$AUTH_HEADER" -H "Content-Type: application/json" -d "$2" "$COOLIFY_API/$1"; }

check_code() {
  local resp="$1" expected="$2" label="$3"
  local code
  code=$(echo "$resp" | tail -1)
  if [ "$code" = "$expected" ]; then ok "$label"; else err "$label (got HTTP $code)"; echo "  Response: $(echo "$resp" | head -1)"; return 1; fi
}

# ── Pre-flight: verify API connectivity + token ─────────────────────────────
log "Pre-flight: verifying Coolify API connectivity..."
HEALTH=$(api_get "health" -o /dev/null -w "%{http_code}" 2>/dev/null || true)
if ! $CURL -s -H "$AUTH_HEADER" -o /dev/null -w "%{http_code}" "$COOLIFY_API/version" 2>/dev/null | grep -q "200"; then
  die "Cannot authenticate to Coolify API. Check COOLIFY_TOKEN."
fi
ok "Coolify API reachable and token valid."

# ── Step 1: Resolve team + server ────────────────────────────────────────────
log "Step 1: Resolving team and server..."
TEAMS=$(api_get "teams")
TEAM_UUID=$(echo "$TEAMS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['uuid'] if d else '')" 2>/dev/null || echo "")
[ -n "$TEAM_UUID" ] || die "No team found. Create a team in Coolify first."
ok "Team: $TEAM_UUID"

SERVERS=$(api_get "servers")
SERVER_UUID=$(echo "$SERVERS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['uuid'] if d else '')" 2>/dev/null || echo "")
[ -n "$SERVER_UUID" ] || die "No server found. Add a server in Coolify first."
ok "Server: $SERVER_UUID"

# ── Step 2: Create or find project ───────────────────────────────────────────
log "Step 2: Ensuring project exists..."
PROJECTS=$(api_get "projects")
PROJECT_UUID=$(echo "$PROJECTS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data:
    if p.get('name') == 'Abhyas':
        print(p['uuid']); break
" 2>/dev/null || echo "")

if [ -z "$PROJECT_UUID" ]; then
  log "  Creating project 'Abhyas'..."
  RESP=$(api_post "projects" "{\"name\":\"Abhyas\",\"team_uuid\":\"$TEAM_UUID\"}")
  PROJECT_UUID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['uuid'])" 2>/dev/null || echo "")
  [ -n "$PROJECT_UUID" ] || die "Failed to create project."
  ok "Project created: $PROJECT_UUID"
else
  ok "Project exists: $PROJECT_UUID"
fi

# ── Step 3: Provision PostgreSQL 16 database ─────────────────────────────────
log "Step 3: Provisioning PostgreSQL 16 database ($DB_NAME)..."
DATABASES=$(api_get "databases")
DB_UUID=$(echo "$DATABASES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for d in data:
    if d.get('name') == '$DB_NAME':
        print(d['uuid']); break
" 2>/dev/null || echo "")

if [ -z "$DB_UUID" ]; then
  log "  Creating PostgreSQL database..."
  RESP=$(api_post "databases/postgresql" "{
    \"name\": \"$DB_NAME\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"project_uuid\": \"$PROJECT_UUID\",
    \"postgres_user\": \"abhyas\",
    \"postgres_password\": \"$(openssl rand -hex 16)\",
    \"postgres_db\": \"abhyas\",
    \"postgres_version\": \"16\",
    \"is_public\": false
  }")
  DB_UUID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['uuid'])" 2>/dev/null || echo "")
  [ -n "$DB_UUID" ] || die "Failed to create database. Response: $RESP"
  ok "Database created: $DB_UUID"
else
  ok "Database exists: $DB_UUID"
fi

# Start the database
log "  Starting database..."
api_post "databases/$DB_UUID/start" "{}" > /dev/null || true
sleep 5
ok "Database start requested."

# Retrieve connection details
DB_DETAILS=$(api_get "databases/$DB_UUID")
DB_INTERNAL_URL=$(echo "$DB_DETAILS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
# Coolify exposes internal connection string for same-server apps
print(d.get('internal_db_url', '') or d.get('connection_string', ''))
" 2>/dev/null || echo "")

# Fallback: construct from known params if internal URL not exposed
if [ -z "$DB_INTERNAL_URL" ]; then
  DB_USER=$(echo "$DB_DETAILS" | python3 -c "import sys,json;print(json.load(sys.stdin).get('postgres_user','abhyas'))" 2>/dev/null)
  DB_PASS=$(echo "$DB_DETAILS" | python3 -c "import sys,json;print(json.load(sys.stdin).get('postgres_password',''))" 2>/dev/null)
  DB_INTERNAL_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_NAME}:5432/abhyas?schema=public"
fi
ok "Database URL resolved (internal): ${DB_INTERNAL_URL%%@*}@***"

# ── Step 4: Create application from GitHub ───────────────────────────────────
log "Step 4: Provisioning Next.js application from GitHub..."
APPS=$(api_get "applications")
APP_UUID=$(echo "$APPS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for a in data:
    if a.get('name') == '$APP_NAME':
        print(a['uuid']); break
" 2>/dev/null || echo "")

if [ -z "$APP_UUID" ]; then
  log "  Creating application (Dockerfile build pack)..."
  RESP=$(api_post "applications" "{
    \"name\": \"$APP_NAME\",
    \"project_uuid\": \"$PROJECT_UUID\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"git_repository\": \"$GITHUB_REPO\",
    \"git_branch\": \"$GITHUB_BRANCH\",
    \"build_pack\": \"dockerfile\",
    \"ports_exposes\": \"3000\",
    \"destination_uuid\": \"\",
    \"environment_name\": \"production\"
  }")
  APP_UUID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['uuid'])" 2>/dev/null || echo "")
  [ -n "$APP_UUID" ] || die "Failed to create application. Response: $RESP"
  ok "Application created: $APP_UUID"
else
  ok "Application exists: $APP_UUID"
fi

# ── Step 5: Set environment variables ────────────────────────────────────────
log "Step 5: Setting environment variables..."

set_env() {
  local key="$1" val="$2"
  # Delete existing (ignore errors if not found)
  api_post "applications/$APP_UUID/envs/delete" "{\"key\":\"$key\"}" > /dev/null 2>&1 || true
  # Create new
  api_post "applications/$APP_UUID/envs" "{\"key\":\"$key\",\"value\":\"$val\",\"is_preview\":false}" > /dev/null
  ok "  $key set"
}

set_env "DATABASE_URL" "$DB_INTERNAL_URL"
set_env "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
set_env "NEXTAUTH_URL" "https://${PRODUCTION_DOMAIN}/"
set_env "NODE_ENV" "production"

# ── Step 6: Configure production domain ──────────────────────────────────────
log "Step 6: Configuring production domain ($PRODUCTION_DOMAIN)..."
api_patch "applications/$APP_UUID/settings" "{
  \"domains\": \"https://${PRODUCTION_DOMAIN}/\",
  \"is_auto_deploy_enabled\": true
}" > /dev/null
ok "Domain configured."

# ── Step 7: Trigger deployment ───────────────────────────────────────────────
log "Step 7: Triggering deployment..."
api_post "applications/$APP_UUID/deploy" "{}" > /dev/null
ok "Deployment triggered. Build will take ~3-5 minutes."

# ── Step 8: Monitor deployment ───────────────────────────────────────────────
log "Step 8: Monitoring deployment (this may take several minutes)..."
for i in $(seq 1 60); do
  sleep 10
  STATUS=$(api_get "applications/$APP_UUID" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('status', 'unknown'))
" 2>/dev/null || echo "unknown")
  log "  [$i/60] Application status: $STATUS"
  if echo "$STATUS" | grep -qi "running\|healthy"; then
    ok "Application is running!"
    break
  fi
  if echo "$STATUS" | grep -qi "error\|failed"; then
    err "Deployment failed. Check Coolify logs."
    exit 1
  fi
done

# ── Step 9: Verify production health ─────────────────────────────────────────
log "Step 9: Verifying production health endpoint..."
sleep 10
for i in $(seq 1 12); do
  HEALTH_RESP=$($CURL -s -w "\n%{http_code}" "https://${PRODUCTION_DOMAIN}/api/health" 2>/dev/null || echo "")
  CODE=$(echo "$HEALTH_RESP" | tail -1)
  if [ "$CODE" = "200" ]; then
    ok "Production health check PASSED!"
    echo "$HEALTH_RESP" | head -1
    echo ""
    log "============================================================"
    log "  🎉 অভ্যাস is LIVE at https://${PRODUCTION_DOMAIN}/"
    log "============================================================"
    exit 0
  fi
  log "  Waiting for production to respond (HTTP $CODE)... [$i/12]"
  sleep 10
done

err "Production endpoint not responding. Check Coolify deployment logs."
exit 1
