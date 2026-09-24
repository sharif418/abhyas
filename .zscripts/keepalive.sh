#!/bin/bash
# Keepalive: ensures dev server (3000) + social service (3003) stay up.
# Safe to run repeatedly — only starts what's missing (no duplicates).

# Social service (port 3003)
if ! ss -ltn 2>/dev/null | grep -q ":3003 "; then
  cd /home/z/my-project/mini-services/social
  setsid nohup bun --hot index.ts >> /tmp/social.log 2>&1 < /dev/null &
  echo "[$(date '+%H:%M:%S')] social service started"
fi

# Dev server (port 3000)
if ! ss -ltn 2>/dev/null | grep -q ":3000 "; then
  cd /home/z/my-project
  setsid nohup bun run dev >> /home/z/my-project/dev.log 2>&1 < /dev/null &
  echo "[$(date '+%H:%M:%S')] dev server started"
fi
