#!/usr/bin/env bash
# One-shot: publish THIS folder as a brand-new public GitHub repo with a live,
# playable GitHub Pages URL — without touching your existing martohell-game site.
#
# Requires the GitHub CLI (https://cli.github.com), logged in once:
#     gh auth login
#
# Then, from inside this martorell-quest/ folder:
#     ./create-new-repo.sh                 # repo name defaults to "martorell-quest"
#     ./create-new-repo.sh my-cool-name    # or pick your own name
set -euo pipefail

REPO_NAME="${1:-martorell-quest}"

command -v gh >/dev/null 2>&1 || {
  echo "❌ GitHub CLI (gh) not found. Install it from https://cli.github.com then run: gh auth login"
  exit 1
}

# Start a fresh git history that contains only this game folder.
[ -d .git ] || git init -b main
git add .
git commit -m "Martorell Quest: a SNES-style Zelda-like of Martorell (ES/CA/EN)" || true

OWNER="$(gh api user -q .login)"

# Create the repo under your account and push (or just push if it already exists).
if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "ℹ️  $OWNER/$REPO_NAME already exists — pushing to it."
  git remote add origin "https://github.com/$OWNER/$REPO_NAME.git" 2>/dev/null || true
  git push -u origin main
else
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
fi

# Enable GitHub Pages, served from the bundled Actions workflow. Harmless if already on.
gh api -X POST "repos/$OWNER/$REPO_NAME/pages" -f build_type=workflow >/dev/null 2>&1 \
  && echo "✅ GitHub Pages enabled (source: GitHub Actions)." \
  || echo "ℹ️  Pages may already be enabled (or needs Settings → Pages → Source: GitHub Actions)."

echo
echo "✅ Pushed:   https://github.com/$OWNER/$REPO_NAME"
echo "⏳ Deploying: first Pages build takes ~1 minute (watch the Actions tab)."
echo "🎮 Play at:  https://$OWNER.github.io/$REPO_NAME/"
