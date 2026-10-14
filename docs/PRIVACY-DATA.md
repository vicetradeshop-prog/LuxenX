# Données personnelles — modèle d'accord et registre de traitement

> **Avertissement honnête** : ce document est un **modèle de travail** destiné
> à être vérifié, complété et adapté (notamment par un professionnel du droit
> si votre usage l'exige) avant toute publication publique. Il ne constitue
> pas une garantie de conformité au RGPD ou à toute autre législation.

## 1. Registre des traitements

| Donnée | Finalité | Base | Durée | Lieu |
|---|---|---|---|---|
| Adresse électronique | Identification du compte, réinitialisation | Contrat (service) | Jusqu'à suppression du compte | Backend (Upstash Redis, région choisie) |
| Nom d'utilisateur | Affichage, personnalisation | Contrat | Jusqu'à suppression | Backend |
| Haché Argon2id du mot de passe | Authentification | Contrat | Jusqu'à suppression | Backend (jamais renvoyé) |
| Sessions (sid, hash du refresh, dates, user-agent) | Sécurité, révocation | Contrat / intérêt légitime | TTL 30 j, suppression à la révocation | Backend |
| Adresse IP | Limitation d'abus | Intérêt légitime (sécurité) | Compteurs TTL ≤ 1 h | Backend (mémoire/Redis) |
| Journal d'audit admin | Traçabilité des opérations sensibles | Intérêt légitime | 500 dernières opérations | Backend |
| Préférences locales (dossier, animations…) | Confort d'utilisation | Consentement local | Jusqu'à désinstallation | Poste utilisateur (chiffré si jetons) |
| Fichiers téléchargés par l'utilisateur | Fonctionnalité Script musique | Action de l'utilisateur | Décision de l'utilisateur | Poste utilisateur |

## 2. Ce que LuxenX ne fait pas

- Aucune collecte de fichiers personnels, du presse-papiers, des navigations
  hors application, aucune capture d'écran, aucun traceur publicitaire.
- Aucun téléchargement démarré sans confirmation explicite de l'utilisateur
  (case « je dispose des droits »).
- Aucune revente, aucun partage à des tiers.

## 3. Démarrage automatique

- Optionnel, activable/désactivable dans LuxenX (Paramètres > Lancement) et
  dans Windows (Paramètres > Applications > Démarrage).
- En mode automatique : aucune fenêtre, aucune interface, uniquement une
  vérification de mise à jour, puis fermeture. Aucune donnée supplémentaire
  n'est collectée dans ce mode.

## 4. Droits de l'utilisateur

- Accès et rectification : écran « Mon compte ».
- Suppression du compte : Paramètres / écran Mon compte (confirmation par mot
  de passe) — les fichiers locaux restent la propriété de l'utilisateur.
- Révocation des sessions : Mon compte / administration.
- Contact : adresse à compléter par l'exploitant avant publication.

## 5. Sous-traitants

- Hébergement de la base : Upstash (région au choix de l'exploitant).
- Hébergement du backend : plateforme choisie (ex. Render, région au choix).
- Distribution des mises à jour : GitHub Releases.
- À mentionner dans l'accord final avec les liens vers leurs politiques.

## 6. Accord affiché à l'installation

Le texte présenté par l'installateur NSIS est
`apps/luxenx-desktop/installer/ACCORD-DONNEES.txt` (copie identique pour
LuxenX Admin). Modifiez ce fichier avant compilation pour publier votre
version définitive de l'accord.
