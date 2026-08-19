#!/usr/bin/env bash
# Publish this site to GitHub Pages (run once after: gh auth login)
set -euo pipefail
cd "$(dirname "$0")"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI first: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Log in to GitHub, then re-run this script:"
  echo "  gh auth login -h github.com -p https -w"
  exit 1
fi

USER=$(gh api user --jq .login)
REPO="brownsville-wait-times"

if ! gh repo view "$USER/$REPO" >/dev/null 2>&1; then
  echo "Creating public repo $USER/$REPO ..."
  gh repo create "$REPO" --public --source=. --remote=origin --description "Brownsville Port of Entry CBP wait times"
else
  echo "Repo exists: $USER/$REPO"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/$USER/$REPO.git"
  fi
fi

git push -u origin main

echo "Enabling GitHub Pages (deploy from main branch / root)..."
gh api -X POST "repos/$USER/$REPO/pages" \
  -f build_type=legacy \
  -f source='{"branch":"main","path":"/"}' 2>/dev/null \
  || gh api -X PUT "repos/$USER/$REPO/pages" \
       -f build_type=legacy \
       -f source='{"branch":"main","path":"/"}' 2>/dev/null \
  || echo "If Pages API failed, enable manually: Settings → Pages → Deploy from branch → main → / (root)"

echo ""
echo "Site URL: https://$USER.github.io/$REPO/"
echo "Actions will refresh data/bwt.xml about every 10 minutes (only when CBP times change)."
echo "Trigger now: gh workflow run update-wait-times.yml -R $USER/$REPO"
