# À table ✳

Un carnet de recettes de saison pour décider plus facilement quoi manger, préparer les menus et regrouper les courses. Application personnelle pour un foyer, auto-hébergeable avec Docker et Portainer.

## Ce que fait l’application

- **Recettes** : création et modification, favoris, recherche par ingrédient, mois et saisons en Belgique, végétarien/poisson/viande, temps de préparation et de cuisson séparés, marques facultatives et matériel utilisé.
- **Menus** : planning hebdomadaire avec petit déjeuner/déjeuner/dîner, portions ajustables, choix des ingrédients à acheter, proposition de cinq soirs et repas répétés pour cuisiner en plus grandes quantités.
- **Courses** : ingrédients regroupés par nom et unité, classement par rayon, cases à cocher, extras et impression.
- **Budget** : coût estimé par portion et par menu, repère hebdomadaire, historique des dépenses par mois.
- **Tickets** : photos JPG/PNG/WebP ou PDF jusqu’à 8 Mo, montant total et saisie facultative des articles. Les prix relevés alimentent automatiquement l’historique et actualisent les recettes utilisant le même aliment et la même marque.
- **Sauvegarde** : export/import JSON du carnet et stockage persistant des pièces jointes sur le serveur.

Douze recettes de départ sont fournies. Les prix initiaux sont **des exemples indicatifs**, pas des relevés de magasin. Les mois peuvent être modifiés selon les légumes principaux et leur origine. Repères : [calendrier Apaq-W / Biowallonie](https://www.apaqw.be/fr/calendrier-des-fruits-et-legumes-de-saison-en-wallonie).

**Limites actuelles** : saisie manuelle des tickets, sans OCR ; un carnet partagé et un mot de passe pour le foyer ; pas de comptes individuels ; les prix portent sur les quantités utilisées, sans arrondi aux conditionnements. Les pièces jointes ne sont pas incluses dans l’export JSON.

## Nouveautés : aliments, prix et repas

### Configurer les aliments et suivre les prix

La page **Prix des aliments** rassemble les ingrédients des recettes, les aliments ajoutés manuellement et ceux des tickets détaillés. Rechercher un aliment ou une marque, puis saisir une **quantité de référence**, son **prix total** et la **date du relevé**. Exemple : 1 000 g de carottes pour 1,49 €. Un nouvel aliment peut être créé sans recette associée.

Chaque saisie ajoute un point à l’historique. Le graphique et le tableau présentent les relevés par date (puis par ordre de saisie le même jour). Les montants sont ramenés au kilo, au litre ou à la pièce pour être comparables. Les estimations initiales des recettes ne créent pas de faux points dans l’historique. Les relevés manuels peuvent être corrigés ou supprimés ; le prix précédent prend alors le relais.

Les articles détaillés d’un ticket alimentent désormais **automatiquement** cet historique à l’enregistrement. Corriger le ticket remplace ses relevés, sans les dupliquer. Les prix relevés restent disponibles si le ticket est supprimé. Les anciennes références de prix sont reprises lors de l’ouverture du carnet. Le prix daté le plus récent est utilisé pour les estimations ; un relevé ancien saisi plus tard n’écrase pas un relevé plus récent.

La **marque**, facultative, distingue les références d’un même aliment. Une marque différente ou un aliment sans marque possède son propre historique et son propre prix. Le nom et la marque sont comparés sans tenir compte des majuscules ou des espaces en début et fin.

Unités disponibles : **g, ml, pièce, càc, càs**. Les cuillères sont des mesures de volume : **1 càc = 5 ml**, **1 càs = 15 ml**. Les volumes sont regroupés en ml dans les courses. Aucune conversion automatique entre grammes et cuillères n’est effectuée, car elle dépend de l’aliment. Un changement d’unité entre volume et poids remet la quantité et le prix estimé à saisir.

### Préparation et cuisson

Chaque recette distingue le **temps de préparation** du **temps de cuisson**. Les deux sont visibles sur la fiche et dans le carnet ; le planning les rappelle également. Une cuisson de 0 minute représente une recette sans cuisson. Les anciennes recettes sans cette information affichent « Cuisson à préciser » : aucun temps n’est inventé lors de la reprise des données.

### Petit déjeuner, déjeuner et dîner

Chaque journée possède trois créneaux. Dans **On la met au menu ?**, choisir la date, le repas, les portions et les ingrédients à ajouter aux courses : **Tous**, **Aucun**, ou cocher les ingrédients un à un. Les quantités se recalculent selon les portions. Le bouton **Modifier** du planning permet de revenir sur la date, le repas et la sélection.

Un nouveau plat remplace celui du même créneau après indication explicite dans la fenêtre. La proposition de cinq soirs remplit uniquement les dîners libres. Pour un repas de restes déjà cuisinés, choisir **Aucun** afin de ne pas compter deux fois les ingrédients. Le coût du menu correspond au plat complet ; le montant restant à acheter dépend des ingrédients sélectionnés et des cases déjà cochées dans les courses.

**Reprise des données existantes** : les anciens repas sont classés au dîner et continuent d’inclure tous leurs ingrédients. Les recettes, tickets et prix sont conservés. Aucune recréation du volume Docker n’est nécessaire.

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
2. Vérifie les calculs, les trois repas, les sélections d’ingrédients, les marques, les conversions de cuillères, les historiques de prix et la reprise des données, puis l’authentification, la persistance, les conflits de sauvegarde et les pièces jointes.
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
