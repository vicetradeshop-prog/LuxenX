# Sécurité de LuxenX

## 1. Gestion des secrets

| Secret | Emplacement | Jamais présent dans |
|---|---|---|
| `UPSTASH_REDIS_REST_TOKEN` | `.env` du backend / variables Render | clients, ZIP, journaux |
| `SESSION_SECRET` | `.env` du backend | clients, journaux |
| `GITHUB_TOKEN` (optionnel) | `.env` local / backend | applications distribuées |
| `ADMIN_PASSWORD` | `.env` (seed uniquement) | base de données, journaux |
| Jetons de session utilisateur | chiffrés sur le poste (safeStorage/DPAPI) + hash côté serveur | fichiers de configuration en clair |

- `.env` est ignoré par Git (`.gitignore`) et exclu de l'archive livrée
  (`tests/check-secrets.mjs` échoue si un `.env` réel est présent).
- Aucun secret fictif « fonctionnel » n'est fourni : `.env.example` ne
  contient que des valeurs vides.
- Les journaux (backend, Electron, `.bat`) sont expurgés : motifs
  `token|secret|password|authorization|hash` remplacés par `[expurgé]`.

## 2. Authentification

- Inscription/connexion validées par Zod ; mots de passe hachés **Argon2id**
  (hash-wasm, m=64 Mo, t=3, p=1) avec sel aléatoire 16 octets.
- Anti-énumération : une adresse déjà inscrite reçoit une erreur générique ;
  une adresse inconnue reçoit le même message de réinitialisation qu'une
  adresse connue ; hachage factice pour lisser les temps de réponse.
- Limitation de débit : 8 tentatives de connexion / 15 min / IP+email ;
  6 inscriptions / h / IP ; 5 réinitialisations / h ; 300 req/min globales.
- Comptes désactivés : refus explicite (`account_disabled`) à la connexion,
  au refresh et sur chaque requête authentifiée.

## 3. Sessions

- Jeton d'accès signé HMAC-SHA256, TTL 15 min (configurable).
- Refresh token 48 octets aléatoires, **stocké haché SHA-256**, TTL 30 j,
  **rotation** à chaque usage (rejeu impossible).
- Révocation : par session, par utilisateur (changement de mot de passe,
  désactivation, suppression, action admin) — vérifiée en base à chaque
  requête authentifiée.
- Côté client : stockage chiffré via `safeStorage` (DPAPI Windows) ; repli
  non chiffré **uniquement en mode développement non packagé**.

## 4. Permissions administratives

- Le rôle est lu **en base** à chaque requête (`authenticate` + `requireAdmin`).
- Modifier le frontend, les fichiers locaux ou le corps d'une requête ne
  donne aucun droit : toutes les routes `/api/v1/admin/*` renvoient 403 aux
  non-admins (test automatisé).
- Garde-fous : un admin ne peut ni se désactiver, ni se rétrograder, ni se
  supprimer lui-même.
- Premier compte admin : créé une seule fois par le seed via
  `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Aucun mot de passe universel.
- Chaque opération sensible est journalisée (audit) : acteur, action, cible,
  horodatage — sans secret.

## 5. Sécurité Electron (les deux applications)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- CSP stricte appliquée par le processus principal (`webRequest`) **et** par
  la balise meta du renderer : `default-src 'self'; object-src 'none'…`
- Navigation sortante bloquée ; `setWindowOpenHandler` refuse les popups et
  n'ouvre que des URL `https://` via le shell.
- Passerelle IPC minimale ; chaque entrée est validée (URL http(s), chemins
  bornés au dossier de téléchargement, booléens stricts).
- Aucun accès général du renderer au système de fichiers ni aux commandes.
- Processus externes (spotDL, pip, ffmpeg) : `spawn` **sans shell**, arguments
  séparés, URL jamais concaténée dans une chaîne de commande.

## 6. Mises à jour

- Source unique : GitHub Releases du dépôt configuré à la compilation
  (`electron-builder.yml`). Aucune URL fournie par l'utilisateur n'est
  utilisée.
- Intégrité vérifiée par electron-updater (sommes de contrôle `latest.yml` /
  blockmaps).
- Signature du code : **non configurée par défaut**. Le projet ne prétend
  jamais être signé ; pour signer, fournissez un certificat via les options
  electron-builder (`win.certificateFile` etc.) hors dépôt.
- En mode arrière-plan (`--background-check`) : aucune fenêtre, aucun blocage,
  filet de sécurité de sortie (90 s), échecs réseau non fatals.

## 7. Publication

- `publier.bat` n'écrit aucun jeton ; il s'appuie sur la session GitHub CLI
  locale. Le jeton `GITHUB_TOKEN` éventuel reste côté backend/local.
- Une release n'est marquée publiée dans le registre que si la release GitHub
  existe réellement (vérification serveur) ; une version déjà publiée n'est
  jamais remplacée silencieusement.
- Les configurations distantes (cartes, tendances, aide) sont **déclaratives**
  et validées par Zod : aucune chaîne de code n'est distribuée pour exécution
  côté client (destinations = routes internes en minuscules, illustrations =
  identifiants d'une liste fermée).

## 8. Données personnelles

- Collecte minimale : compte, sessions, préférences locales, journaux
  techniques. Aucun fichier personnel, aucun presse-papiers, aucune capture.
- Accord présenté à l'installation (`installer/ACCORD-DONNEES.txt`) : modèle de
  travail à faire relire avant publication (voir `docs/PRIVACY-DATA.md`).
- Droits : accès/rectification dans « Mon compte », suppression de compte
  (confirmation par mot de passe + recopie de « SUPPRIMER »), révocation de
  sessions.

## 9. Contrôles automatisés

- `tests/check-secrets.mjs` : détection de jetons Upstash/GitHub, clés PEM,
  secrets codés en dur, fichiers `.env` réels dans l'archive.
- Tests backend : permissions, rate limit, révocation, anti-énumération.
- `verifier.bat` exécute l'ensemble avant toute compilation/publication.
