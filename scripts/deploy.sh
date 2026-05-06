#!/usr/bin/env bash
# Deploys PUBG Tracker to GitHub + Vercel in one shot.
#
# Prerequisites (run these ONCE in your own terminal, since they need a browser):
#   "/c/Program Files/GitHub CLI/gh.exe" auth login --web
#   vercel login
#
# Then run:
#   bash scripts/deploy.sh
#
# What this script does:
#   1. Verifies gh + vercel are authenticated.
#   2. Creates a public GitHub repo (default name: pubg-tracker) and pushes main.
#   3. Reads PUBG_API_KEY from .env.local.
#   4. Links the local dir to a Vercel project.
#   5. Adds PUBG_API_KEY as a production env var on Vercel.
#   6. Deploys to production.
#   7. Prints the live URL.

set -e

REPO_NAME="${REPO_NAME:-pubg-tracker}"
GH="/c/Program Files/GitHub CLI/gh.exe"
VERCEL=""

# ---------- step 1: tooling + auth checks ----------

if [ ! -x "$GH" ]; then
  if command -v gh >/dev/null 2>&1; then
    GH=$(command -v gh)
  else
    echo "ERROR: gh CLI not found. Install via: winget install GitHub.cli" >&2
    exit 1
  fi
fi

# Locate vercel CLI. On Git Bash + Windows, npm globals live in AppData/Roaming/npm
# but that's not on the bash PATH by default — fall back to the npm-known locations.
# Use -f (not -x) because Git Bash doesn't always set the execute bit on .cmd files.
NPM_PREFIX_BASH=""
if command -v npm >/dev/null 2>&1; then
  NPM_PREFIX_RAW=$(npm config get prefix 2>/dev/null | tr -d '\r')
  if [ -n "$NPM_PREFIX_RAW" ]; then
    # Convert C:\foo\bar -> /c/foo/bar for Git Bash.
    NPM_PREFIX_BASH=$(echo "$NPM_PREFIX_RAW" | sed -E 's|^([A-Za-z]):|/\L\1|; s|\\|/|g')
  fi
fi

CANDIDATES=(
  "$NPM_PREFIX_BASH/vercel.cmd"
  "$APPDATA/npm/vercel.cmd"
  "/c/Users/$USERNAME/AppData/Roaming/npm/vercel.cmd"
  "$HOME/AppData/Roaming/npm/vercel.cmd"
  "$USERPROFILE/AppData/Roaming/npm/vercel.cmd"
)

if command -v vercel >/dev/null 2>&1; then
  VERCEL="vercel"
else
  for cand in "${CANDIDATES[@]}"; do
    [ -z "$cand" ] && continue
    if [ -f "$cand" ]; then
      VERCEL="$cand"
      break
    fi
  done
fi

if [ -z "$VERCEL" ]; then
  echo ">>> vercel CLI not found, attempting auto-install via npm i -g vercel..." >&2
  if ! npm i -g vercel >&2; then
    echo "ERROR: auto-install failed. Run \`npm i -g vercel\` manually." >&2
    exit 1
  fi
  # Re-scan candidates after install.
  if command -v vercel >/dev/null 2>&1; then
    VERCEL="vercel"
  else
    NPM_PREFIX_RAW=$(npm config get prefix 2>/dev/null | tr -d '\r')
    NPM_PREFIX_BASH=$(echo "$NPM_PREFIX_RAW" | sed -E 's|^([A-Za-z]):|/\L\1|; s|\\|/|g')
    if [ -f "$NPM_PREFIX_BASH/vercel.cmd" ]; then
      VERCEL="$NPM_PREFIX_BASH/vercel.cmd"
    elif [ -f "$NPM_PREFIX_BASH/vercel" ]; then
      VERCEL="$NPM_PREFIX_BASH/vercel"
    fi
  fi
  if [ -z "$VERCEL" ]; then
    echo "ERROR: vercel installed but binary still not found. Try restarting your shell." >&2
    exit 1
  fi
fi

# Wrapper alias so the rest of the script just calls $VERCEL.
vercel() { "$VERCEL" "$@"; }

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "ERROR: gh CLI not authenticated. Run: \"$GH\" auth login --web" >&2
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "ERROR: vercel CLI not authenticated. Run: vercel login" >&2
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "ERROR: .env.local not found in $(pwd). It must contain PUBG_API_KEY." >&2
  exit 1
fi

PUBG_API_KEY_VALUE=$(grep -E '^PUBG_API_KEY=' .env.local | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
if [ -z "$PUBG_API_KEY_VALUE" ]; then
  echo "ERROR: PUBG_API_KEY is empty in .env.local." >&2
  exit 1
fi

GH_USER=$("$GH" api user --jq .login)
echo ">>> GitHub user: $GH_USER"
echo ">>> Vercel user: $(vercel whoami 2>&1 | tail -1)"
echo ">>> Repo name: $REPO_NAME"
echo ""

# ---------- step 2: github repo + push ----------

if "$GH" repo view "$GH_USER/$REPO_NAME" >/dev/null 2>&1; then
  echo ">>> GitHub repo already exists: github.com/$GH_USER/$REPO_NAME"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
  fi
  git push -u origin main
else
  echo ">>> Creating GitHub repo $GH_USER/$REPO_NAME (public)..."
  "$GH" repo create "$REPO_NAME" --public --source=. --remote=origin --push
fi
echo ">>> Pushed to https://github.com/$GH_USER/$REPO_NAME"
echo ""

# ---------- step 3: vercel link + env + deploy ----------

if [ ! -f .vercel/project.json ]; then
  echo ">>> Linking to Vercel project (will create new if needed)..."
  vercel link --yes --project="$REPO_NAME"
else
  echo ">>> Vercel project already linked."
fi

# Remove existing env (idempotent), then add fresh.
echo ">>> Setting PUBG_API_KEY env var (production)..."
echo "y" | vercel env rm PUBG_API_KEY production 2>/dev/null || true
printf '%s' "$PUBG_API_KEY_VALUE" | vercel env add PUBG_API_KEY production

echo ""
echo ">>> Deploying to production..."
DEPLOY_URL=$(vercel deploy --prod --yes 2>&1 | tee /tmp/vercel-deploy.log | grep -oE 'https://[^ ]+\.vercel\.app' | tail -1)

echo ""
echo "============================================================"
echo "  LIVE: $DEPLOY_URL"
echo "  REPO: https://github.com/$GH_USER/$REPO_NAME"
echo "============================================================"
echo ""
echo "Next:"
echo "  - Visit $DEPLOY_URL/ru to test."
echo "  - To redeploy, just \`git push\` — Vercel auto-builds on push."
