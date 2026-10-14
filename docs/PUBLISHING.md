# Publication des mises à jour — procédure et diagnostic

## 1. Chaîne de publication complète

```
publier.bat
  ├─ 1. Contrôle initial : node, git, gh auth, .env, GITHUB_OWNER/REPO, dépôt Git
  ├─ 2. Version : patch | minor | major | manuel  (refus si déjà publiée sur GitHub)
  ├─ 3. Notes : RELEASE-NOTES.md ouvert dans le Bloc-notes (notes vides = blocage)
  ├─ 4. verifier.bat : typecheck, lint, tests, secrets, structure
  ├─ 5. construire.bat : nettoyage + compilation NSIS des deux applications
  ├─ 6. Git : init si besoin, origin ajouté automatiquement, commit + tag vX.Y.Z + push
  │       gh release create vX.Y.Z avec LuxenX-Setup-*.exe (+ Admin) + notes
  └─ 7. Récapitulatif : lien de release, artefacts, journal
puis (optionnel, recommandé) :
LuxenX Admin > Versions > vérifications > « Publier »  → registre Upstash
```

Les clients LuxenX détectent la mise à jour via electron-updater qui lit
`latest.yml` + blockmaps de la release GitHub (source configurée à la
compilation). Le registre Upstash sert d'information officielle (version
publiée, notes, caractère obligatoire) pour l'application et l'admin.

## 2. Ce qui bloque volontairement une publication

| Contrôle | Effet en cas d'échec |
|---|---|
| GitHub CLI non authentifié | arrêt + instruction `gh auth login` |
| `GITHUB_OWNER` absent | arrêt + renvoi vers l'assistant |
| Release `vX.Y.Z` déjà existante sur GitHub | arrêt (jamais de remplacement silencieux) |
| Version saisie ≤ version courante | refus (`bump-version.mjs`) |
| Notes de version vides | arrêt |
| `verifier.bat` en échec (tests, lint, types) | arrêt + journal |
| Compilation en échec | arrêt + journal |
| Artefact attendu absent de `dist\` | arrêt |
| `gh release create` en échec | arrêt : rien n'est déclaré publié |
| Release GitHub introuvable au moment du « Publier » admin | 502 `upstream_error`, registre inchangé |

## 3. Diagnostiquer un échec

1. Ouvrir le journal indiqué à l'écran : `logs\publier-*.log`,
   `logs\construire-*.log`, `logs\verifier-*.log`.
2. `diagnostic.bat` : état des outils, de `.env` (masqué), du backend,
   d'Upstash, de `gh`, des dossiers de sortie et des journaux récents.
3. Erreurs fréquentes :
   - `gh: not authenticated` → `gh auth login`.
   - `refusing to publish: tag exists` → choisissez une version supérieure.
   - `resource not accessible by personal access token` → droits du compte
     sur le dépôt insuffisants (rôle write/admin requis).
   - `NSIS error / wine` sur machine non Windows → compilez sur Windows.
   - Release créée mais clients non informés → vérifier la présence de
     `latest.yml` dans la release et que `publish.owner/repo` correspondent
     au dépôt réel (variables `LUXENX_GITHUB_OWNER/REPO` à la compilation).

## 4. Canal bêta et mise à jour obligatoire

- Canal : choisi à la création du brouillon dans LuxenX Admin (stable/bêta).
- `mandatory: true` : l'application affiche un message bloquant les
  fonctionnalités incompatibles (champ `minClientVersion` des paramètres
  globaux, administrable depuis LuxenX Admin > Configuration).

## 5. Rétrogradation / récupération

- Une release GitHub peut être supprimée manuellement ; le registre Upstash
  se corrige depuis LuxenX Admin (suppression du brouillon/entrée).
- electron-updater n'installe jamais une version inférieure
  (`allowDowngrade: false`).
- En cas d'artefact défectueux : publiez une version corrective supérieure
  (procédure normale) plutôt que de remplacer la release.
