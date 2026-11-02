#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v gh >/dev/null || { echo 'Installer GitHub CLI (gh) avant de continuer.' >&2; exit 1; }
command -v git >/dev/null || { echo 'Git est requis.' >&2; exit 1; }
login="$(gh api user --jq .login)"
if [[ "$(printf '%s' "$login" | tr '[:upper:]' '[:lower:]')" != 'agatolies' ]]; then
  echo "Le compte GitHub actif est $login. Activer Agatolies avec gh auth switch ou gh auth login." >&2
  exit 1
fi
if gh repo view Agatolies/a-table >/dev/null 2>&1; then
  echo 'Agatolies/a-table existe déjà. Aucune modification automatique effectuée.' >&2
  exit 1
fi
if git rev-parse --show-toplevel >/dev/null 2>&1; then
  repo_root="$(git rev-parse --show-toplevel)"
  [[ "$repo_root" == "$PWD" ]] || { echo 'Le dossier est dans un autre dépôt Git. Extraire dans un dossier indépendant.' >&2; exit 1; }
  if git remote get-url origin >/dev/null 2>&1; then
    echo 'Un remote origin existe déjà. Aucune modification automatique effectuée.' >&2
    exit 1
  fi
else
  git init -b main
fi
git add .
if ! git diff --cached --quiet; then
  git -c user.name='À table' -c user.email='noreply@users.noreply.github.com' commit -m 'Add self-hosted meal planner with Docker and CI'
fi
git branch -M main
gh repo create Agatolies/a-table --private --description 'Recettes de saison, menus, courses et budget du foyer — Docker' --source . --remote origin --push
echo 'Dépôt créé et source publiée. La CI construit et publie l’image sur GHCR.'
gh run list --repo Agatolies/a-table --limit 1
