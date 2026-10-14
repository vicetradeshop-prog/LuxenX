# Architecture technique de LuxenX

## 1. Vue d'ensemble

```
┌───────────────────────┐     ┌───────────────────────────┐
│  LuxenX (Windows)     │     │  LuxenX Admin (Windows)   │
│  Electron + React     │     │  Electron + React         │
│  LuxenX-Setup.exe     │     │  LuxenX-Admin-Setup.exe   │
│  renderer sandboxé    │     │  renderer sandboxé        │
│  main: IPC minimal    │     │  main: IPC minimal        │
└──────────┬────────────┘     └─────────────┬─────────────┘
           │ HTTPS (API REST, JSON)         │ HTTPS
           ▼                                ▼
        ┌──────────────────────────────────────┐
        │        Backend Node.js + Express      │
        │  routes /api/v1/*  (validation Zod,   │
        │  middlewares auth + rate limit,       │
        │  journalisation expurgée)             │
        └──────────────┬───────────────────────┘
                       │ REST (HTTPS)
                       ▼
              ┌──────────────────┐        ┌───────────────────┐
              │  Upstash Redis   │        │  GitHub Releases  │
              │  (comptes,       │        │  (artefacts .exe, │
              │  cartes,         │        │  latest.yml pour  │
              │  tendances,      │        │  electron-updater)│
              │  releases, audit)│        └───────────────────┘
              └──────────────────┘
```

## 2. Monorepo

- **npm workspaces** : `packages/*` puis `apps/*`.
- Les packages sont compilés en ESM (`dist/`) et consommés par le backend
  (NodeNext) et les renderers (Vite).
- `@luxenx/shared` : types du domaine (UserRecord, FeatureCard, TrendingConfig,
  ReleaseInfo, HelpContent, MusicTask…), constantes (statuts de cartes,
  identifiants d'illustrations).
- `@luxenx/validation` : schémas Zod — **toutes** les entrées du backend sont
  validées par ces schémas ; les clients peuvent réutiliser les mêmes règles.
- `@luxenx/api-client` : client fetch typé, rafraîchissement automatique du
  jeton d'accès avec file d'attente, erreurs typées (`ApiClientError`),
  callback d'expiration de session.
- `@luxenx/ui` : design system CSS (`styles/luxenx.css`) + composants React
  (boutons à états réels, champs, modales, toasts, toggles, progression
  déterminée/indéterminée) + illustrations vectorielles 2D + `FeatureCardView`
  (le même composant rend les cartes dans LuxenX **et** dans la prévisualisation
  de LuxenX Admin).

## 3. Backend (`apps/backend`)

Architecture modulaire :

- `config.ts` : lecture/validation des variables d'environnement ; en
  production une configuration incomplète **empêche le démarrage**.
- `lib/kv.ts` : abstraction clé/valeur. Production = Upstash Redis REST
  (`@upstash/redis`) ; développement/test = `MemoryKv` volatile (signalé dans
  `/health` : `storage: "memory-volatile"`).
- `lib/keys.ts` : schéma de clés versionné `lux:v1:*` (stratégie de migration).
- `lib/password.ts` : **Argon2id** (hash-wasm, paramètres OWASP : m=64 Mo,
  t=3, p=1). Les hachés ne quittent jamais le backend.
- `lib/tokens.ts` : jetons d'accès signés HMAC-SHA256 (format JWT minimal,
  comparaison à temps constant) ; refresh tokens aléatoires 48 octets,
  **stockés hachés SHA-256** ; rotation à chaque refresh.
- `lib/ratelimit.ts` : compteurs Redis par IP (global 300/min) et par
  IP+email pour login/register/forgot/reset.
- `middleware/auth.ts` : `authenticate` relit le compte **en base** à chaque
  requête (révocation immédiate, compte désactivé bloqué) ; `requireAdmin`
  vérifie le rôle stocké serveur — jamais une déclaration du client.
- `services/` : users (comptes, sessions, préférences), content (cartes,
  tendances, paramètres, aide), releases (registre + vérification GitHub),
  audit (liste Redis bornée à 500 entrées).
- `routes/` : `health`, `auth`, `account`, contenu (`dashboard`, `cards`,
  `trending`, `settings`, `help`, `releases`), `admin/*`.

### Routes principales

```
GET  /api/v1/health
POST /api/v1/auth/register | login | refresh | logout | forgot-password | reset-password
GET  /api/v1/auth/me
GET/PATCH/DELETE /api/v1/account   (+ /password, /sessions)
GET  /api/v1/dashboard  (cartes + tendances + paramètres + aide en 1 requête)
GET  /api/v1/cards | trending | settings | help | releases | releases/latest
GET  /api/v1/admin/stats | users | cards | trending | settings | help | releases | audit
PUT  /api/v1/admin/cards | trending | settings | help
POST /api/v1/admin/cards/reorder | releases | releases/:v/publish
DELETE /api/v1/admin/users/:id | users/:id/sessions | cards/:id | releases/:v
GET  /api/v1/admin/releases/:v/github-check
```

### Modèle de données (clés Redis)

```
lux:v1:user:{id}                  JSON du compte (haché inclus, jamais renvoyé)
lux:v1:user:email:{email}         id du compte (anti-doublon)
lux:v1:users:index                set des id
lux:v1:session:{sid}              session (hash du refresh + métadonnées, TTL)
lux:v1:session:{tokenHash}:sid    index inverse refresh -> sid (TTL identique)
lux:v1:user:{id}:sessions         set des sid de l'utilisateur
lux:v1:reset:{hash}               jeton de réinitialisation (TTL 30 min)
lux:v1:card:{id} / cards:index    cartes de fonctionnalités
lux:v1:trending                   configuration des tendances
lux:v1:settings                   paramètres globaux (maintenance, minClientVersion…)
lux:v1:help                       FAQ + guides (éditables depuis Admin)
lux:v1:release:{version} / index  registre des versions
lux:v1:audit                      journal borné (500 entrées)
lux:v1:rate:{bucket}              compteurs de limitation
lux:v1:stats:signups:{jour}       statistiques réelles d'inscription
```

Redis n'offrant pas de transactions multi-clés garanties ici, chaque écriture
est clé par clé et les lectures tolèrent les états partiels (réparation au
besoin : ex. `resolveTrendingCards` filtre les entrées dont la carte a disparu).

## 4. LuxenX (`apps/luxenx-desktop`)

- **Processus principal** (`electron/main.ts`) : instance unique, fenêtre
  (titleBar overlay), CSP stricte injectée via `webRequest`, navigation
  sortante bloquée, `contextIsolation: true`, `nodeIntegration: false`,
  `sandbox: true`.
- **Preload** (`electron/preload.ts`) : passerelle `window.luxenx` minimale et
  validée (paramètres, jetons chiffrés, dialogues natifs, shell borné au
  dossier de téléchargement, service musique, mises à jour, fenêtre).
- **Mises à jour** (`electron/updater.ts`) : electron-updater, source unique
  GitHub Releases configurée à la compilation ; états propagés à l'UI ;
  mode arrière-plan sans fenêtre.
- **Démarrage automatique** (`electron/autostart.ts`) : login item Windows
  avec l'argument `--background-check` (vérification silencieuse puis
  fermeture). Visible dans les paramètres Windows ; retiré à la
  désinstallation (NSIS).
- **Service musique** (`electron/music-service.ts`) : file de tâches hors du
  renderer ; téléchargements directs avec progression réelle (content-length)
  ; sources compatibles via **spotDL lancé en arguments séparés, sans shell** ;
  annulation, doublons, espace disque (`statfs`), erreurs réseau explicites ;
  politique de droits : Spotify/Deezer/Apple Music = explication des modes
  officiels, jamais de contournement.
- **Stockage local** (`electron/store.ts`) : préférences JSON ; jetons chiffrés
  `safeStorage` (DPAPI sur Windows). Aucun mot de passe stocké.
- **Renderer** : React 19 + framer-motion ; introduction 2D en 4 phases
  (complète à la première utilisation, courte ensuite, désactivable,
  esquissable) ; authentification ; tableau de bord ; cartes verrouillées
  expliquées ; tendances ; historique réel ; Script musique ; compte ;
  paramètres fonctionnels ; centre d'aide alimenté par le serveur.

## 5. LuxenX Admin (`apps/luxenx-admin-desktop`)

Application **distincte** : autre `appId`, autre exécutable
(`LuxenX-Admin-Setup-*.exe`), autre fenêtre, autre configuration locale, aucun
code partagé d'exécution avec LuxenX hors packages UI/API. Ce n'est pas un
panel web : aucune URL, aucun navigateur. Le rôle admin est revérifié par le
serveur à chaque appel `/api/v1/admin/*` (403 sinon).

Sections : tableau de bord (statistiques réelles), comptes (pagination,
recherche, désactivation, révocation, suppression avec confirmation), cartes
(édition + prévisualisation exacte), tendances (épinglage, priorité, fenêtre
temporelle, prévisualisation), FAQ/guides (édition à distance), versions
(checklist de publication + registre), journal d'audit, configuration.

## 6. Mises à jour et publication

- `electron-builder` produit les NSIS par application ; la section `publish`
  de LuxenX pointe vers GitHub (`owner`/`repo` injectés par variables
  d'environnement au moment de la compilation).
- `publier.bat` orchestre : contrôle → version → notes → vérifications →
  compilation fraîche → tag + release GitHub (`gh`) avec artefacts →
  récapitulatif. Arrêt propre à la première étape obligatoire en échec.
- Le registre Upstash (`lux:v1:release:*`) est mis à jour depuis LuxenX Admin
  après vérification serveur de l'existence réelle de la release GitHub.

## 7. Scripts `.bat`

Tous les scripts calculent leurs chemins depuis leur propre emplacement
(`%~dp0`), écrivent leurs journaux dans `logs\`, vérifient les codes de retour
et s'arrêtent proprement en cas d'échec. `_common.bat` centralise
l'environnement (racine, horodatage, vérification Node ≥ 20).

## 8. Tests

- Backend : 49 tests (auth, sessions, rate limit, permissions admin, comptes,
  cartes, tendances, releases, audit, contenu) sur `MemoryKv` + supertest.
- `@luxenx/validation` : 17 tests de schémas (anti-injection de destinations,
  semver, pagination…).
- `@luxenx/api-client` : 6 tests (refresh, erreurs réseau, codes backend).
- Transverses : `tests/check-secrets.mjs`, `tests/check-structure.mjs`.
- Lancement : `verifier.bat` ou `npm test`.
