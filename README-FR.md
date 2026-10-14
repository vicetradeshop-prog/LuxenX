# LuxenX — Guide complet (français)

LuxenX est une suite de deux applications Windows premium (**LuxenX** pour les
utilisateurs, **LuxenX Admin** pour l'administration) adossées à un backend
Node.js sécurisé utilisant **Upstash Redis**, avec mises à jour automatiques
via GitHub Releases et publication en un double-clic.

> Tout se fait en double-cliquant sur des fichiers `.bat` à la racine du
> projet. Vous n'avez jamais besoin de mémoriser une commande.

| Fichier | Rôle |
|---|---|
| `installer.bat` | Première installation de l'environnement (outils, dépendances, configuration guidée) |
| `lancer.bat` | Démarrer le backend, LuxenX, LuxenX Admin (menu simple) |
| `verifier.bat` | TypeScript, lint, tests, secrets, structure — rapport clair |
| `construire.bat` | Produire `dist/LuxenX-Setup-*.exe` et `dist/LuxenX-Admin-Setup-*.exe` |
| `publier.bat` | Publier une mise à jour sur GitHub (version, notes, build, release) |
| `deployer-backend.bat` | Déployer le backend sur Render (ou procédure guidée) |
| `diagnostic.bat` | Rapport complet de l'environnement (sans aucun secret) |
| `assistant-config.bat` | Relancer l'assistant de configuration à tout moment |

---

## Partie A — Première installation

### 1. Extraire l'archive
Décompressez `LuxenX-Complete.zip` dans un dossier de votre choix
(les chemins contenant des espaces sont pris en charge).

### 2. Vérifier les prérequis
- **Windows 10/11 64 bits**
- **Node.js 20 ou plus récent** : <https://nodejs.org> (version LTS)
- **Git** : <https://git-scm.com> (requis pour publier)
- **GitHub CLI** (recommandé pour publier) : <https://cli.github.com> ou `winget install GitHub.cli`

`installer.bat` vérifie ces outils et vous explique quoi installer s'il en
manque un.

### 3. Double-cliquer sur `installer.bat`
Le script :
1. vérifie Node.js / Git / GitHub CLI ;
2. installe toutes les dépendances npm ;
3. compile les packages partagés ;
4. crée `.env` depuis `.env.example` **sans jamais écraser** un `.env` existant ;
5. lance l'**assistant de configuration** ;
6. initialise le backend (contenu par défaut + compte administrateur) ;
7. affiche un résumé clair.

### 4. Configurer Upstash (base de données)
1. Créez un compte sur <https://console.upstash.com> puis **Create database**
   (région proche de vos utilisateurs, type *Regional*).
2. Ouvrez la base créée, onglet **REST API**.
3. Copiez `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`.
4. Collez-les quand l'assistant vous les demande (ou dans le fichier `.env`).
5. L'assistant **teste la connexion** (`/ping`) et affiche le résultat réel.
   Sans ces valeurs, le backend démarre en mémoire **volatile** (développement
   uniquement) et le signale clairement.

### 5. Configurer GitHub (mises à jour)
1. Créez un dépôt public (ou privé) nommé par exemple `LuxenX` sur GitHub.
2. Indiquez votre compte (`GITHUB_OWNER`) et le nom du dépôt (`GITHUB_REPO`)
   à l'assistant.
3. Authentifiez GitHub CLI une seule fois : `gh auth login`
   (navigateur, compte personnel). Plus aucun jeton à manipuler ensuite.
4. La première publication se fait avec `publier.bat` (Partie D).

### 6. Terminer
Quand l'assistant se termine, l'installation est prête. Vous pouvez lancer
`lancer.bat`.

---

## Partie B — Lancer le projet

Double-cliquez sur **`lancer.bat`** puis choisissez :

| Choix | Effet |
|---|---|
| 1 | Backend seul (nouvelle fenêtre, `http://localhost:8787`) |
| 2 | LuxenX (mode développement : Vite + Electron) |
| 3 | LuxenX Admin (console d'administration) |
| 4 | Backend + LuxenX *(défaut)* |
| 5 | Tout (backend + LuxenX + Admin) |

- Le backend s'ouvre dans sa propre fenêtre console : la fermer l'arrête.
- LuxenX et LuxenX Admin sont **deux applications indépendantes** : chacune a
  sa fenêtre, son processus, son exécutable.
- Première connexion : créez un compte depuis l'écran de connexion de LuxenX.
- Pour LuxenX Admin : le compte administrateur initial est celui défini par
  `ADMIN_EMAIL` / `ADMIN_PASSWORD` dans `.env` (créé par le seed, voir Partie E).

---

## Partie C — Générer les installateurs

Double-cliquez sur **`construire.bat`** :

1. exécute `verifier.bat` (sauf option `--rapide`) ;
2. **nettoie les artefacts précédents** (jamais de fichiers périmés) ;
3. compile LuxenX puis son installateur NSIS ;
4. compile LuxenX Admin puis son installateur NSIS ;
5. vérifie que les `.exe` existent réellement et les copie dans `dist\`.

Résultats :

```
dist\LuxenX-Setup-<version>.exe
dist\LuxenX-Admin-Setup-<version>.exe
```

> La compilation Windows fonctionne sur Windows. Sur un autre système, le
> script explique que la compilation doit être faite sur une machine Windows.
> Si la compilation échoue, le script **ne déclare jamais de succès** : il
> affiche l'erreur et le journal (`logs\construire-*.log`).
>
> *Note d'environnement* : la chaîne complète (package Electron → `win-unpacked\LuxenX.exe`)
> a été vérifiée lors du développement ; l'étape finale NSIS (compression 7z de
> ~200 Mo) exige davantage de mémoire vive que certains environnements sans
> Windows/sans swap. Sur une machine Windows normale (8 Go+), `construire.bat`
> produit les deux Setup sans étape manuelle.

Installation côté utilisateur : lancer `LuxenX-Setup-*.exe`, lire l'accord
relatif aux données, accepter, terminer. Désinstallation propre via
*Paramètres Windows > Applications* (le démarrage automatique est retiré).

---

## Partie D — Publier une mise à jour

1. **Modifiez le projet** comme vous le souhaitez.
2. Double-cliquez sur **`verifier.bat`**, corrigez les éventuelles erreurs.
3. Double-cliquez sur **`publier.bat`** :
   - **Étape 1** : contrôle des outils, de `.env`, de l'authentification
     GitHub (`gh auth status`), du dépôt cible.
   - **Étape 2** : choisissez la version — corrective / fonctionnalité /
     majeure / saisie manuelle. Le script refuse une version **déjà publiée**.
   - **Étape 3** : le Bloc-notes s'ouvre avec `RELEASE-NOTES.md` : rédigez les
     notes, enregistrez, fermez. Des notes vides bloquent la publication.
   - **Étape 4** : vérifications complètes (tests inclus). Échec = arrêt.
   - **Étape 5** : compilation **fraîche** des installateurs. Échec = arrêt.
   - **Étape 6** : commit Git + tag `vX.Y.Z` + création de la release GitHub
     avec les artefacts (via `gh`). Rien n'est publié en cas d'échec.
   - **Étape 7** : récapitulatif avec le lien de la release.
4. Ouvrez **LuxenX Admin > Versions** et enregistrez la release dans le
   registre (checklist : semver, brouillon, existence GitHub, doublons), puis
   « Publier » : les clients connaîtront alors la version officielle.
5. Vérifiez le lien GitHub affiché.
6. Sur une installation de test : lancez LuxenX, ouvrez
   **Paramètres > Mises à jour > Vérifier maintenant** : la mise à jour doit
   être proposée, téléchargée, puis installée au redémarrage.

Sécurité : aucun jeton GitHub n'est écrit dans les `.bat` ni dans les
applications. `gh` utilise votre session locale ; le jeton `GITHUB_TOKEN` du
`.env` ne sert qu'au backend (vérification d'existence des releases).

---

## Partie E — Déployer le backend

### Option 1 — Render automatisé
1. Dans `.env`, renseignez `RENDER_API_KEY` (dashboard Render > Account >
   API Keys) et `RENDER_SERVICE_ID` (page du service Web).
2. Double-cliquez sur **`deployer-backend.bat`** : vérifications, tests,
   contrôle Upstash, puis déclenchement du déploiement via l'API Render et
   suivi de l'état jusqu'à `live`.

### Option 2 — Render manuel (première fois)
1. Dashboard Render > **New > Web Service**, reliez votre dépôt Git.
2. Build command :
   `npm ci --include=dev --workspace apps/backend --workspace packages/shared --workspace packages/validation --workspace packages/api-client --workspace packages/ui && npm run build:packages && npm run build --workspace apps/backend`
   (le `--include=dev` est indispensable si NODE_ENV=production est défini :
   sinon npm n'installe pas TypeScript ni @types/node et le build échoue)
3. Start command : `npm run start --workspace apps/backend`
   (ne JAMAIS utiliser --env-file sur Render : les variables viennent de
   l'environnement du service, pas d'un fichier .env)
4. Recopiez les variables d'environnement du `.env` côté Render :
   `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SESSION_SECRET`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NODE_ENV=production`, `BACKEND_URL`.
5. Chaque `git push` redéploiera automatiquement.
6. Renseignez ensuite `BACKEND_URL` (URL publique Render) dans le `.env`
   local **et** dans LuxenX (Paramètres > Serveur) / LuxenX Admin (Configuration).

### Compte administrateur initial
- Définissez `ADMIN_EMAIL` et `ADMIN_PASSWORD` (10 caractères minimum) dans
  `.env`, puis double-cliquez sur `installer.bat` (ou lancez le seed) : le
  compte admin est créé **une seule fois**, avec journalisation d'audit.
- Aucun mot de passe administrateur universel n'existe dans le projet.

---

---

## Partie E bis — Backend local ou backend hébergé : comment ça marche

Deux modes, mêmes applications, rien à réinstaller :

| Mode | Pour qui | Adresse du backend |
|---|---|---|
| **Local** (`lancer.bat`) | vos propres tests, sur votre PC | `http://localhost:8787` |
| **Hébergé** (Render, partie E) | vos utilisateurs réels, partout | `https://votre-service.onrender.com` |

- Tant que le backend n'est pas déployé, LuxenX ne fonctionne que sur la
  machine où tourne `lancer.bat` : c'est normal et suffisant pour développer
  et tester.
- L'URL à utiliser est celle affichée EN HAUT de la page de votre service
  Render (ex. https://luxenx.onrender.com) : copiez-la exactement, ne la
  devinez pas. Un service inexistant répond 404 et l'app affiche
  « injoignable ».
- Pour distribuer : déployez le backend (partie E), puis :
  1. mettez son URL publique dans `.env` (`BACKEND_URL=...`) ;
  2. lancez `construire.bat` : l'URL est **intégrée automatiquement** dans les
     installateurs produits (fichier `default-backend.json`) ;
  3. les utilisateurs installent ces Setup : leur LuxenX pointe directement
     vers votre backend hébergé, sans rien configurer.
- Une installation existante peut changer d'adresse à tout moment :
  LuxenX > Paramètres > Serveur LuxenX (ou LuxenX Admin > Configuration).
- Le compte utilisateur créé en local reste en local : la base réelle est
  Upstash, donc les comptes créés après déploiement sont visibles partout ;
  ceux créés pendant vos tests locaux en mode mémoire volatile disparaissent
  au redémarrage du backend local (avec Upstash configuré, ils persistent).

### Dépannage express d'une application installée

- « Impossible de joindre le serveur » après une réinstallation : les
  préférences locales survivent à la désinstallation. Fermez LuxenX puis
  supprimez `%APPDATA%\LuxenX\luxenx-settings.json` (les préférences
  locales repartent à neuf ; l'adresse du serveur intégrée à l'installateur
  redevient active). Aucun fichier personnel ni compte n'est touché.
- Premier lancement après une période d'inactivité : un serveur Render
  gratuit met 30 à 50 s à se réveiller. L'application attend 30 s et le
  message le rappelle : réessayez une fois avant de conclure à une panne.
- Depuis la version 0.1.6, l'adresse du backend intégrée à la compilation
  fait toujours foi dans l'application utilisateur : une ancienne
  préférence ne peut plus la remplacer.

## Partie F — Problèmes courants

| Problème | Solution |
|---|---|
| `Node.js est introuvable` | Installez la LTS depuis nodejs.org, rouvrez une session Windows, relancez. |
| `Dépendances absentes` | Double-cliquez sur `installer.bat`. |
| Backend en « mémoire volatile » | Upstash non configuré : relancez `assistant-config.bat` et renseignez URL + jeton REST. |
| `Upstash : HTTP 401/403` | Jeton REST incorrect ou base supprimée : recopiez-le depuis la console Upstash. |
| `GitHub CLI n'est pas authentifié` | Lancez `gh auth login` puis relancez `publier.bat`. |
| `Absence d'autorisation de publication` | Votre compte GitHub n'a pas le droit d'écrire sur le dépôt : vérifiez rôle/propriété du dépôt. |
| Erreur de compilation | Ouvrez `logs\construire-*.log`, corrigez, relancez `verifier.bat` puis `construire.bat`. |
| Backend inaccessible depuis LuxenX | Vérifiez `BACKEND_URL` (Paramètres > Serveur) et que le backend tourne (`lancer.bat` choix 1). |
| Échec de mise à jour | Paramètres > Mises à jour > Réessayer. Vérifiez que la release GitHub contient bien `latest.yml` + les `.exe`. |
| Erreur d'installation du Setup | Exécutez l'installateur en tant qu'utilisateur normal (pas admin requis). Antivirus : autorisez une fois. |
| spotDL / FFmpeg manquants | Script musique > Installer les dépendances (pip officiel), puis `winget install Gyan.FFmpeg` si demandé. |
| Fenêtres Electron blanches en dev | Laissez le serveur Vite démarrer (quelques secondes) ; ne fermez pas sa fenêtre. |

---

## Organisation du projet

```
LuxenX/
├── apps/
│   ├── luxenx-desktop/        Application Windows utilisateur (Electron+React)
│   ├── luxenx-admin-desktop/  Application Windows d'administration (indépendante)
│   └── backend/               API Node.js/TypeScript + Upstash Redis
├── packages/
│   ├── shared/                Types et constantes du domaine
│   ├── validation/            Schémas Zod partagés (validation stricte)
│   ├── api-client/            Client HTTP typé (refresh automatique)
│   └── ui/                    Design system cartoon sombre + illustrations 2D
├── scripts/                   Scripts .bat + outils Node des scripts
├── tests/                     Contrôles transverses (secrets, structure)
├── docs/                      ARCHITECTURE, SECURITY, PUBLISHING, PRIVACY
├── installer.bat … diagnostic.bat   (raccourcis vers scripts\)
└── .env.example               Modèle de configuration (aucun secret réel)
```

Documentation technique : `docs/ARCHITECTURE.md`, `docs/SECURITY.md`,
`docs/PUBLISHING.md`, `docs/PRIVACY-DATA.md`.

---

## Partie G — Journaux et débogage

Tout incident laisse une trace exploitable, sans jamais contenir de secret :

| Où | Quoi |
|---|---|
| Fenêtre console du backend | Journal temps réel du backend (requêtes en erreur, avertissements) |
| `%APPDATA%\\LuxenX\\logs\\main.log` | Journal du processus principal LuxenX : mises à jour, service musique, démarrage automatique, **et erreurs du renderer** (interface) remontées automatiquement |
| `%APPDATA%\\LuxenX Admin\\logs\\main.log` |idem pour LuxenX Admin |
| `projets\\logs\\*.log` | Journaux des scripts .bat (installer, verifier, construire, publier, deployer) |
| `projets\\logs\\diagnostic-*.txt` | Rapport complet généré par `diagnostic.bat` |

Mécanismes de sécurité ajoutés :
- **Garde d'erreur React** : si l'interface rencontre une exception, un panneau
  explicite s'affiche avec le message et les actions « Recharger / Réessayer »
  — plus jamais d'écran noir muet.
- **Remontée automatique** : erreurs globales, promesses non gérées, erreurs
  React, console du renderer (warnings/erreurs), crash du processus rendu et
  erreurs de preload sont écrites dans `main.log`.
- **CSP adaptée au mode** : stricte en version installée, compatible Vite en
  développement (cause de l'ancien écran noir, corrigée et couverte par test).
