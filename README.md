# À table ✳

Un carnet de recettes de saison pour décider plus facilement quoi manger, préparer les menus et regrouper les courses. Application personnelle pour un foyer, auto-hébergeable avec Docker et Portainer.

## Ce que fait l’application

- **Recettes** : création et modification, favoris, recherche par ingrédient, mois et saisons en Belgique, végétarien/poisson/viande, temps de préparation et matériel utilisé.
- **Menus** : planning hebdomadaire, portions ajustables, proposition de cinq soirs et repas répétés pour cuisiner en plus grandes quantités.
- **Courses** : ingrédients regroupés par nom et unité, classement par rayon, cases à cocher, extras et impression.
- **Budget** : coût estimé par portion et par menu, repère hebdomadaire, historique des dépenses par mois.
- **Tickets** : photos JPG/PNG/WebP ou PDF jusqu’à 8 Mo, montant total et saisie facultative des articles. Les prix relevés peuvent actualiser toutes les recettes utilisant le même nom et la même unité.
- **Sauvegarde** : export/import JSON du carnet et stockage persistant des pièces jointes sur le serveur.

Douze recettes de départ sont fournies. Les prix initiaux sont **des exemples indicatifs**, pas des relevés de magasin. Les mois peuvent être modifiés selon les légumes principaux et leur origine. Repères : [calendrier Apaq-W / Biowallonie](https://www.apaqw.be/fr/calendrier-des-fruits-et-legumes-de-saison-en-wallonie).

**Limites actuelles** : saisie manuelle des tickets, sans OCR ; un carnet partagé et un mot de passe pour le foyer ; pas de comptes individuels ; les prix portent sur les quantités utilisées, sans arrondi aux conditionnements. Les pièces jointes ne sont pas incluses dans l’export JSON.

## Créer le dépôt depuis cette archive

Si le projet n’a pas encore été publié : installer Git et [GitHub CLI](https://cli.github.com/), se connecter au compte **Agatolies** avec `gh auth login`, puis lancer depuis le dossier extrait :

```bash
bash scripts/publish-github.sh
```

Le script vérifie le compte actif, crée **Agatolies/a-table en privé**, pousse le code et déclenche la CI. Il refuse de modifier un dépôt distant déjà existant. Ce script n’a pas été exécuté tant que l’accès au compte Agatolies n’est pas disponible.

## Déployer avec Docker Compose

Prérequis : Docker Engine et le plugin Docker Compose. Un proxy HTTPS (Caddy, Traefik ou Nginx Proxy Manager) est recommandé pour un accès depuis Internet.

```bash
git clone https://github.com/Agatolies/a-table.git
cd a-table
cp .env.example .env
```

Dans `.env`, renseigner :

- `ADMIN_PASSWORD` : mot de passe du foyer, au moins 16 caractères.
- `SESSION_SECRET` : secret aléatoire d’au moins 32 caractères ; sa modification déconnecte les sessions.
- `PUBLIC_URL` : URL exacte utilisée dans le navigateur, par exemple `https://repas.exemple.be`. Pas de sous-chemin.
- `BIND_ADDRESS` : `127.0.0.1` par défaut pour un proxy installé sur l’hôte ; `0.0.0.0` pour publier le port sur toutes les interfaces.
- `HTTP_PORT` : port publié, `8080` par défaut.

Générer un secret avec `openssl rand -hex 32`. Si Node.js 24 est disponible, `npm run setup` crée directement un `.env` avec deux secrets aléatoires, sans les afficher dans le terminal (ne pas copier `.env.example` avant dans ce cas). Ne jamais committer `.env`.

### Construire localement

```bash
docker compose up -d --build
docker compose ps
```

En local, conserver `PUBLIC_URL=http://localhost:8080` et ouvrir `http://localhost:8080`. Le mot de passe se trouve dans votre `.env`. Pour un accès LAN, adapter `PUBLIC_URL` à l’adresse réellement utilisée et `BIND_ADDRESS=0.0.0.0`.

### Utiliser l’image publiée par la CI

Après un premier workflow réussi sur `main`, l’image est disponible sous :

```text
ghcr.io/agatolies/a-table:latest
```

```bash
docker compose pull
docker compose up -d --no-build
```

L’image est construite pour **linux/amd64 et linux/arm64**. Les versions `v1.0.0` produisent les tags `1.0.0` et `1.0`. Chaque publication fournit aussi un tag `sha-…`. `latest` suit uniquement la branche par défaut. Pour fixer une version, définir `ATABLE_IMAGE=ghcr.io/agatolies/a-table:1.0.0` dans `.env` après création du tag correspondant.

La première publication GHCR est généralement privée. Si le package est privé, le serveur doit s’authentifier à GHCR avec un accès `read:packages` ; saisir le jeton via `docker login ghcr.io -u Agatolies --password-stdin`. Ne pas placer le jeton dans le dépôt ou le fichier Compose. Le workflow utilise le `GITHUB_TOKEN` fourni automatiquement et ne nécessite pas de secret de publication supplémentaire. Il ne change pas la visibilité du dépôt ou du package.

## Portainer

Dans **Stacks → Add stack**, utiliser `compose.yaml` (via le dépôt ou Web editor). Si l’image est déjà publiée, retirer la ligne `build: .` pour une stack créée avec le Web editor, puis définir les variables `PUBLIC_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `BIND_ADDRESS`, `HTTP_PORT` et `ATABLE_IMAGE`.

Pour une image privée, ajouter `ghcr.io` aux registries de Portainer avec un accès en lecture. Pour Nginx Proxy Manager sur le même réseau Docker, joindre la stack à ce réseau et pointer le proxy sur `app:3000` avec un alias unique, par exemple `a-table`. Sur un proxy installé directement sur l’hôte, utiliser `127.0.0.1:8080`.

`PUBLIC_URL` doit correspondre exactement au domaine HTTPS public : il contrôle les vérifications d’origine et le cookie de session sécurisé. Ne pas publier l’application sous `/a-table` sans adapter le code.

## Données et sauvegardes

Le volume Docker nommé **`a-table-data`**, monté en `/data`, contient :

```text
/data/a-table.sqlite       carnet, menus, courses, prix et tickets
/data/a-table.sqlite-wal   journal SQLite éventuel
/data/a-table.sqlite-shm   fichier de coordination éventuel
/data/receipts/            pièces jointes et leurs métadonnées
```

Une mise à jour du conteneur conserve le volume. Ne pas utiliser `docker compose down -v` pour une mise à jour : cette option supprime les données. Le conteneur fonctionne sans privilèges, avec un système de fichiers en lecture seule hors volume et `/tmp`.

Pour une sauvegarde cohérente de la base **et** des tickets, arrêter brièvement l’application :

```bash
mkdir -p backups
docker compose stop app
docker run --rm \
  -v a-table-data:/data:ro \
  -v "$PWD/backups:/backup" \
  alpine:3.22 tar czf /backup/a-table-backup.tar.gz -C /data .
docker compose start app
```

Redémarrer aussi l’application si la commande de sauvegarde échoue. Conserver séparément `.env` ou les secrets utilisés. Sauvegarder le volume avant toute mise à jour ; après une évolution future du schéma, une ancienne image peut refuser une base plus récente.

Pour restaurer sur un nouvel hôte, créer un volume vide nommé `a-table-data`, y extraire l’archive avec un conteneur temporaire, puis démarrer la stack avec sa configuration. Les fichiers doivent appartenir à l’UID/GID `1000:1000`. Ne pas extraire sur une application en cours d’exécution.

Les fichiers joints d’un ticket supprimé restent dans le volume : aucune purge automatique n’est effectuée. L’export JSON est pratique pour le carnet, mais ne remplace pas la sauvegarde du volume.

### Reprendre le carnet de la version ChatGPT

Dans l’ancienne application : **Mon carnet & sauvegarde → Exporter le carnet**. Dans cette version : importer le JSON depuis le même écran. Recettes, menus, courses et prix seront repris. Télécharger les anciennes photos/PDF séparément puis les joindre de nouveau aux tickets : leurs anciennes références Cloudflare ne sont pas portables.

## CI GitHub Actions

Le workflow `.github/workflows/ci.yaml` :

1. Installe les dépendances verrouillées avec Node.js 24 et `npm ci`.
2. Vérifie les calculs, l’authentification, la persistance, les conflits de sauvegarde et les pièces jointes.
3. Vérifie TypeScript et compile le frontend.
4. Construit un conteneur AMD64 et vérifie sa santé, la page de connexion et le refus des accès anonymes.
5. Sur `main`, les tags `v*` ou un lancement manuel, publie l’image AMD64/ARM64 sur GHCR avec provenance et SBOM. Les pull requests ne publient rien.

Permissions : `contents: read` et `packages: write` uniquement pour le job Docker. Les publications ne déploient pas automatiquement sur votre VPS. Pour utiliser votre propre runner, adapter `runs-on` dans le workflow ; ne pas exposer un runner privé aux pull requests non fiables.

## Développement

Node.js **24.x**, npm.

```bash
npm ci
npm run setup
npm run build
node --env-file=.env server/index.mjs
```

Pour ce lancement direct, adapter `.env` à `PUBLIC_URL=http://localhost:3000`, puis ouvrir `http://localhost:3000`. Sans Docker, les données vont dans `./data` (modifiable avec `DATA_DIR`). Le serveur lit `ADMIN_PASSWORD_FILE` et `SESSION_SECRET_FILE` si vous préférez des secrets montés en fichiers.

Développement avec rechargement à chaud : lancer le backend sur 3000 et `npm run dev` dans un autre terminal. Utiliser `PUBLIC_URL=http://localhost:5173` pour l’origine du navigateur, puis ouvrir Vite sur 5173.

```bash
npm test
npm run build
```

## Architecture

React + TypeScript + Vite pour l’interface ; serveur HTTP Node.js sans dépendance de production externe ; SQLite intégré à Node.js ; fichiers locaux pour les tickets. Sessions signées valables sept jours, cookie HttpOnly et SameSite Strict, vérification d’origine des écritures et limitation des tentatives de connexion. Le cookie utilise `Secure` lorsque `PUBLIC_URL` commence par `https://`.

Les sauvegardes utilisent un numéro de version : deux onglets ne peuvent pas écraser silencieusement leurs modifications respectives. En cas de conflit, exporter les modifications affichées avant de recharger.
