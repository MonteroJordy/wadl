#!/usr/bin/env bash
# WADL prod-readiness check.
# Runs four gates against the working tree and the production build.
# Exit non-zero on any gate failure. Designed to be safe in CI and locally.
#
# Gates:
#   1. No stray console.log/warn/error in app/, lib/, components/.
#      (lib/sms.ts dev-mode fallback is allowlisted.)
#   2. Every process.env.X referenced in code is also present in
#      .env.local.example (so Vercel deploy doesn't miss a var).
#   3. No TODO/FIXME/XXX comments in app/, lib/, components/.
#   4. `npx next build` succeeds, with no actionable warnings.

set -uo pipefail
cd "$(dirname "$0")/.."

red()    { printf '\033[31m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n' "$*"; }

FAIL=0

bold "==> WADL prod-ready check"

# --- 1. Stray console.* ---------------------------------------------------
bold "[1/4] No stray console.* in app/lib/components"
ALLOW='lib/sms.ts'
HITS=$(grep -RIn 'console\.\(log\|warn\|error\|debug\|info\)' app lib components \
       --include='*.ts' --include='*.tsx' 2>/dev/null \
       | grep -v "$ALLOW" || true)
if [ -n "$HITS" ]; then
  red "  FAIL — stray console statements:"
  echo "$HITS" | sed 's/^/    /'
  FAIL=1
else
  green "  ok"
fi

# --- 2. Env vars referenced ⊆ .env.local.example --------------------------
bold "[2/4] Every process.env.X is documented in .env.local.example"
EXAMPLE_FILE=".env.local.example"
if [ ! -f "$EXAMPLE_FILE" ]; then
  red "  FAIL — $EXAMPLE_FILE missing"
  FAIL=1
else
  REFERENCED=$(grep -RhoE 'process\.env\.[A-Z][A-Z0-9_]+' app lib components \
              --include='*.ts' --include='*.tsx' 2>/dev/null \
              | sed 's/process\.env\.//' | sort -u)
  # Allowlist of vars the runtime injects automatically (Vercel/Next).
  AUTOMATIC='^(NODE_ENV|VERCEL|VERCEL_ENV|VERCEL_URL|npm_package_version)$'
  MISSING=""
  for var in $REFERENCED; do
    if echo "$var" | grep -qE "$AUTOMATIC"; then continue; fi
    if ! grep -qE "^${var}=" "$EXAMPLE_FILE"; then
      MISSING="$MISSING $var"
    fi
  done
  if [ -n "$MISSING" ]; then
    red "  FAIL — referenced but not in $EXAMPLE_FILE:"
    for v in $MISSING; do echo "    $v"; done
    FAIL=1
  else
    green "  ok ($(echo $REFERENCED | wc -w | tr -d ' ') env vars referenced, all documented)"
  fi
fi

# --- 3. TODO / FIXME / XXX -----------------------------------------------
bold "[3/4] No TODO / FIXME / XXX in app/lib/components"
TODOS=$(grep -RIn 'TODO\|FIXME\|XXX' app lib components \
        --include='*.ts' --include='*.tsx' 2>/dev/null || true)
if [ -n "$TODOS" ]; then
  red "  FAIL — open markers:"
  echo "$TODOS" | sed 's/^/    /'
  FAIL=1
else
  green "  ok"
fi

# --- 4. next build clean -------------------------------------------------
bold "[4/4] npx next build (clean)"
BUILD_OUT=$(SKIP_ENV_VALIDATION=1 npx next build 2>&1)
BUILD_RC=$?

if [ $BUILD_RC -ne 0 ]; then
  red "  FAIL — next build exited $BUILD_RC"
  echo "$BUILD_OUT" | tail -40 | sed 's/^/    /'
  FAIL=1
else
  # Filter known-benign noise:
  # - webpack PackFileCacheStrategy size warnings (informational)
  # - "Compiled successfully" / route table content
  CONCERNING=$(echo "$BUILD_OUT" \
               | grep -iE 'warn|error' \
               | grep -ivE 'PackFileCacheStrategy|Big strings|optimized production build|Compiled successfully' \
               || true)
  if [ -n "$CONCERNING" ]; then
    yellow "  warnings present:"
    echo "$CONCERNING" | sed 's/^/    /'
    # Warnings don't fail the check by default — but they're surfaced.
  fi
  ROUTE_COUNT=$(echo "$BUILD_OUT" | grep -cE '^[├└┌] [ƒ○]' || true)
  green "  ok ($ROUTE_COUNT routes compiled)"
fi

# --- Summary --------------------------------------------------------------
echo
if [ $FAIL -eq 0 ]; then
  green "==> ALL GATES GREEN. Safe to deploy."
  exit 0
else
  red "==> $FAIL gate(s) failed. Fix before deploying."
  exit 1
fi
