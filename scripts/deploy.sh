#!/usr/bin/env bash
# Deploys PUBG Tracker to GitHub + Vercel in one shot.
#
# Prerequisites (run these ONCE in your own terminal, since they need a browser):
#   "/c/Program Files/GitHub CLI/gh.exe" auth login --web
#   vercel login
#
# Then run:
#   bash scripts/deploy.sh

set -e
set -o pipefail

REPO_NAME="${REPO_NAME:-pubg-tracker}"
GH="/c/Program Files/GitHub CLI/gh.exe"
VERCEL=""

echo ">>> deploy.sh starting"

# ---------- locate gh ----------

if [ ! -x "$GH" ]; then
  if command -v gh >/dev/null 2>&1; then
    GH=$(command -v gh)
  else
    echo "ERROR: gh CLI not found. Install via: winget install GitHub.cli" >&2
    exit 1
  fi
fi
echo ">>> gh: $GH"

# ---------- locate vercel ----------

# command -v gives priority to functions/aliases — use `type -P` to check $PATH only.
if type -P vercel >/dev/null 2>&1; then
  VERCEL=$(type -P vercel)
else
  NPM_PREFIX_RAW=$(npm config get prefix 2>/dev/null | tr -d '\r' || true)
  NPM_PREFIX_BASH=""
  if [ -n "$NPM_PREFIX_RAW" ]; then
    NPM_PREFIX_BASH=$(echo "$NPM_PREFIX_RAW" | sed -E 's|^([A-Za-z]):|/\L\1|; s|\\|/|g')
  fi
  for cand in \
    "$NPM_PREFIX_BASH/vercel.cmd" \
    "$APPDATA/npm/vercel.cmd" \
    "/c/Users/$USERNAME/AppData/Roaming/npm/vercel.cmd" \
    "$HOME/AppData/Roaming/npm/vercel.cmd" \
    "$USERPROFILE/AppData/Roaming/npm/vercel.cmd"
  do
    [ -z "$cand" ] && continue
    if [ -f "$cand" ]; then
      VERCEL="$cand"
      break
    fi
  done
fi

if [ -z "$VERCEL" ]; then
  echo ">>> vercel CLI not found, attempting auto-install via npm i -g vercel..."
  npm i -g vercel
  if type -P vercel >/dev/null 2>&1; then
    VERCEL=$(type -P vercel)
  else
    NPM_PREFIX_RAW=$(npm config get prefix 2>/dev/null | tr -d '\r')
    NPM_PREFIX_BASH=$(echo "$NPM_PREFIX_RAW" | sed -E 's|^([A-Za-z]):|/\L\1|; s|\\|/|g')
    for cand in "$NPM_PREFIX_BASH/vercel.cmd" "$NPM_PREFIX_BASH/vercel"; do
      if [ -f "$cand" ]; then
        VERCEL="$cand"
        break
      fi
    done
  fi
  if [ -z "$VERCEL" ]; then
    echo "ERROR: vercel installed but binary still not found. Try restarting your shell." >&2
    exit 1
  fi
fi
echo ">>> vercel: $VERCEL"

# ---------- auth checks ----------

echo ">>> checking gh auth..."
if ! "$GH" auth status >/dev/null 2>&1; then
  echo "ERROR: gh CLI not authenticated. Run: \"$GH\" auth login --web" >&2
  exit 1
fi

echo ">>> checking vercel auth..."
if ! "$VERCEL" whoami >/dev/null 2>&1; then
  echo "ERROR: vercel CLI not authenticated. Run: vercel login" >&2
  exit 1
fi

# ---------- env check ----------

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
echo ">>> Vercel user: $("$VERCEL" whoami 2>&1 | tail -1)"
echo ">>> Repo name:   $REPO_NAME"
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
  "$VERCEL" link --yes --project="$REPO_NAME"
else
  echo ">>> Vercel project already linked."
fi

echo ">>> Setting PUBG_API_KEY env var (production)..."
echo "y" | "$VERCEL" env rm PUBG_API_KEY production 2>/dev/null || true
printf '%s' "$PUBG_API_KEY_VALUE" | "$VERCEL" env add PUBG_API_KEY production

echo ""
echo ">>> Deploying to production (this can take 1-2 min)..."
"$VERCEL" deploy --prod --yes 2>&1 | tee /tmp/vercel-deploy.log
DEPLOY_URL=$(grep -oE 'https://[^ ]+\.vercel\.app' /tmp/vercel-deploy.log | tail -1)

echo ""
echo "============================================================"
echo "  LIVE: $DEPLOY_URL"
echo "  REPO: https://github.com/$GH_USER/$REPO_NAME"
echo "============================================================"
echo ""
echo "Next:"
echo "  - Visit $DEPLOY_URL/ru"
echo "  - Future deploys auto-trigger on \`git push\`."
