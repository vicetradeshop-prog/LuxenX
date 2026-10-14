/**
 * Contenu par défaut livré avec le backend : cartes, tendances,
 * paramètres globaux, aide (FAQ + guides MP3/MP4).
 *
 * Ces valeurs sont utilisées au seed initial et comme repli lorsque
 * la base ne contient rien. Elles sont administrables à distance depuis
 * LuxenX Admin — les clients les reçoivent via l'API, sans recompilation.
 *
 * NOTE SÉCURITÉ : ce contenu est purement déclaratif (textes, états,
 * routes internes validées). Aucun code distant n'est jamais exécuté.
 */
import type { FeatureCard, GlobalSettings, HelpContent, TrendingConfig } from "@luxenx/shared";

const now = new Date().toISOString();

export const DEFAULT_CARDS: FeatureCard[] = [
  {
    id: "script-musique",
    title: "Script musique",
    description:
      "Collez un lien Spotify, Deezer, SoundCloud, YouTube ou un fichier direct : métadonnées réelles, téléchargement spotDL avec progression et choix du dossier.",
    category: "Multimédia",
    illustration: "music",
    accent: "violet",
    order: 10,
    status: "available",
    badge: null,
    featured: true,
    destination: "/features/script-musique",
    publishedAt: now,
    updatedAt: now,
  },
  {
    id: "sauvegarde-cloud",
    title: "Sauvegarde cloud",
    description: "Sauvegardez et synchronisez vos dossiers importants vers vos services cloud en toute confiance.",
    category: "Données",
    illustration: "cloud",
    accent: "blue",
    order: 20,
    status: "coming_soon",
    badge: "ARRIVE PROCHAINEMENT",
    featured: false,
    destination: "/features/sauvegarde-cloud",
    publishedAt: null,
    updatedAt: now,
  },
  {
    id: "bouclier-systeme",
    title: "Bouclier système",
    description: "Un tableau de bord de santé pour votre PC : espace disque, démarrage, fichiers temporaires et conseils.",
    category: "Système",
    illustration: "shield",
    accent: "pink",
    order: 30,
    status: "coming_soon",
    badge: "BIENTÔT DISPONIBLE",
    featured: false,
    destination: "/features/bouclier-systeme",
    publishedAt: null,
    updatedAt: now,
  },
  {
    id: "lanceur-rapide",
    title: "Lanceur rapide",
    description: "Lancez vos outils et scripts favoris depuis un raccourci clavier, avec un moteur de recherche instantané.",
    category: "Productivité",
    illustration: "rocket",
    accent: "lavender",
    order: 40,
    status: "coming_soon",
    badge: "ARRIVE PROCHAINEMENT",
    featured: false,
    destination: "/features/lanceur-rapide",
    publishedAt: null,
    updatedAt: now,
  },
  {
    id: "atelier-scripts",
    title: "Atelier scripts",
    description: "Composez, testez et planifiez vos scripts d'automatisation dans un éditeur intégré et sécurisé.",
    category: "Développement",
    illustration: "terminal",
    accent: "blue",
    order: 50,
    status: "coming_soon",
    badge: null,
    featured: false,
    destination: "/features/atelier-scripts",
    publishedAt: null,
    updatedAt: now,
  },
  {
    id: "veille-reseau",
    title: "Veille réseau",
    description: "Surveillez votre connexion et vos appareils : latence, disponibilité et alertes en temps réel.",
    category: "Réseau",
    illustration: "network",
    accent: "violet",
    order: 60,
    status: "coming_soon",
    badge: null,
    featured: false,
    destination: "/features/veille-reseau",
    publishedAt: null,
    updatedAt: now,
  },
  {
    id: "assistant-microsoft-365",
    title: "Assistant Microsoft 365",
    description: "Installation, activation et dépannage guidés de Microsoft 365 : Word, Excel, Outlook et OneDrive, sans jargon.",
    category: "Bureautique",
    illustration: "tools",
    accent: "blue",
    order: 70,
    status: "coming_soon",
    badge: "ARRIVE PROCHAINEMENT",
    featured: false,
    destination: "/features/assistant-microsoft-365",
    publishedAt: null,
    updatedAt: now,
  },
  {
    id: "nettoyeur-disque",
    title: "Nettoyeur de disque",
    description: "Libérez de l'espace en un clic : fichiers temporaires, caches et doublons détectés en toute sécurité, avec résumé avant suppression.",
    category: "Système",
    illustration: "drive",
    accent: "lavender",
    order: 80,
    status: "coming_soon",
    badge: "BIENTÔT DISPONIBLE",
    featured: false,
    destination: "/features/nettoyeur-disque",
    publishedAt: null,
    updatedAt: now,
  },
];

export const DEFAULT_TRENDING: TrendingConfig = {
  enabled: true,
  maxCards: 3,
  entries: [{ cardId: "script-musique", pinned: true, priority: 100, startsAt: null, endsAt: null }],
  updatedAt: now,
};

export const DEFAULT_SETTINGS: GlobalSettings = {
  maintenanceMode: false,
  maintenanceMessage: null,
  registrationsOpen: true,
  minClientVersion: null,
  announcements: [],
  updatedAt: now,
};

export const DEFAULT_HELP: HelpContent = {
  faq: [
    {
      id: "faq-fonctionnement",
      question: "Comment fonctionne Script musique ?",
      answer:
        "Vous collez une URL compatible et autorisée, LuxenX récupère les métadonnées réellement disponibles (titre, artiste, durée, source), puis vous propose le téléchargement si le contenu est libre de droits ou si vous disposez des autorisations nécessaires. La progression s'affiche en temps réel et les tâches longues s'exécutent en arrière-plan sans ralentir l'interface.",
    },
    {
      id: "faq-sources",
      question: "Quelles sources sont prises en charge ?",
      answer:
        "Les liens directs vers des fichiers audio/vidéo libres, les plateformes de musique libre et les dépôts de contenus sous licence ouverte. Les plateformes avec DRM ou abonnements (Spotify, Deezer, Apple Music…) ne permettent PAS le téléchargement direct de leurs fichiers : LuxenX vous expliquera alors comment utiliser leurs modes d'écoute ou d'export officiels.",
    },
    {
      id: "faq-lien-invalide",
      question: "Pourquoi certains liens ne fonctionnent pas ?",
      answer:
        "Un lien peut être invalide, expiré, réservé aux abonnés, protégé par DRM, ou pointer vers une plateforme non prise en charge. Le message affiché précise la raison. Vérifiez aussi votre connexion Internet et que le lien est complet (copiez-le depuis la barre d'adresse ou le bouton « Partager »).",
    },
    {
      id: "faq-fichiers",
      question: "Où se trouvent mes fichiers téléchargés ?",
      answer:
        "Dans le dossier choisi dans Script musique (par défaut : Musique\\LuxenX). Utilisez le bouton « Ouvrir le dossier » de la page ou de chaque téléchargement terminé pour y accéder directement dans l'Explorateur Windows.",
    },
    {
      id: "faq-dossier",
      question: "Comment modifier le dossier de destination ?",
      answer:
        "Dans Script musique ou dans Paramètres > Téléchargements, cliquez sur « Modifier le dossier » : la boîte de dialogue Windows s'ouvre, choisissez l'emplacement, et LuxenX mémorise votre choix pour les prochains téléchargements.",
    },
    {
      id: "faq-erreurs",
      question: "Comment traiter les erreurs de téléchargement ?",
      answer:
        "Chaque téléchargement indique son état (attente, progression, réussite, erreur). En cas d'échec : vérifiez l'espace disque, la connexion réseau, puis relancez la tâche. Les téléchargements interrompus peuvent être repris. Si l'erreur persiste, le message technique affiché peut être communiqué à l'assistance.",
    },
    {
      id: "faq-droits",
      question: "Quelles sont les limites liées aux droits ?",
      answer:
        "LuxenX ne contourne aucune protection : pas de DRM, pas de contournement d'abonnement. Ne téléchargez que des contenus libres de droits, ou pour lesquels vous disposez d'une autorisation (copie privée légitime, licence ouverte, contenu dont vous êtes l'auteur). L'utilisation du logiciel relève de votre responsabilité.",
    },
    {
      id: "faq-support",
      question: "Comment contacter l'assistance ?",
      answer:
        "Via la page Centre d'aide > Contacter l'assistance, ou par courriel à l'adresse indiquée par votre administrateur LuxenX. Décrivez le problème, la version de l'application (visible dans Paramètres > À propos) et le message d'erreur exact.",
    },
  ],
  guides: [
    {
      id: "guide-mp3",
      title: "Transférer des fichiers sur un lecteur MP3",
      category: "Transfert",
      illustration: "music",
      steps: [
        { title: "Branchez votre lecteur", body: "Connectez le lecteur MP3 à un port USB de l'ordinateur avec son câble. Attendez le signal sonore de Windows." },
        { title: "Ouvrez le dossier du lecteur", body: "Dans l'Explorateur Windows (touche Windows + E), votre lecteur apparaît sous « Ce PC » comme un disque amovible." },
        { title: "Repérez le dossier Music", body: "Ouvrez le lecteur et cherchez le dossier « Music », « Musique » ou « Media ». C'est là que l'appareil cherche les titres." },
        { title: "Copiez vos fichiers", body: "Ouvrez le dossier LuxenX (bouton « Ouvrir le dossier »), sélectionnez les fichiers, copiez-les (Ctrl + C), puis collez-les dans le dossier Music du lecteur (Ctrl + V)." },
        { title: "Éjectez proprement", body: "Utilisez l'icône « Éjecter » en bas à droite de Windows avant de débrancher, pour éviter toute corruption." },
        { title: "Vérifiez sur le lecteur", body: "Allumez le lecteur : les titres doivent apparaître dans la bibliothèque. Formats compatibles courants : MP3, WMA, FLAC (selon l'appareil)." },
      ],
    },
    {
      id: "guide-mp4",
      title: "Transférer des fichiers sur un lecteur MP4",
      category: "Transfert",
      illustration: "drive",
      steps: [
        { title: "Branchez le lecteur MP4", body: "Connectez l'appareil en USB. Certains lecteurs demandent de choisir un mode : sélectionnez « Disque » ou « Mass Storage »." },
        { title: "Ouvrez le dossier Video", body: "Dans l'Explorateur, ouvrez le disque amovible puis le dossier « Video », « Vidéo » ou « Media »." },
        { title: "Copiez les fichiers", body: "Glissez-déposez ou copiez-collez vos fichiers depuis le dossier LuxenX vers le dossier Video." },
        { title: "Formats compatibles", body: "La plupart des lecteurs acceptent MP4 (H.264 + AAC) et AVI. En cas de vidéo illisible, convertissez-la au format MP4 standard." },
        { title: "Éjectez et testez", body: "Éjectez l'appareil proprement, puis vérifiez la lecture depuis le menu Vidéo du lecteur." },
      ],
    },
    {
      id: "guide-usb",
      title: "Connecter un appareil par USB",
      category: "Connexion",
      illustration: "network",
      steps: [
        { title: "Utilisez un câble de données", body: "Certains câbles ne chargent que la batterie sans transférer de données. Essayez un autre câble si l'appareil n'apparaît pas." },
        { title: "Déverrouillez l'appareil", body: "Les appareils verrouillés refusent souvent le transfert. Déverrouillez l'écran avant de brancher." },
        { title: "Autorisez l'accès", body: "Si l'appareil affiche « Autoriser l'accès aux données ? », acceptez." },
        { title: "Vérifiez dans l'Explorateur", body: "L'appareil doit apparaître sous « Ce PC ». Sinon : autre port USB, redémarrage de l'appareil, ou pilote manquant (voir l'assistance)." },
      ],
    },
    {
      id: "guide-reconnaissance",
      title: "Résoudre un problème de reconnaissance",
      category: "Dépannage",
      illustration: "tools",
      steps: [
        { title: "Changez de port USB", body: "Préférez un port arrière (PC fixe) ou testez un autre port. Évitez les hubs non alimentés." },
        { title: "Redémarrez les deux appareils", body: "Un simple redémarrage du lecteur et de l'ordinateur règle la majorité des cas." },
        { title: "Vérifiez le mode USB", body: "Sur le lecteur, sélectionnez le mode « Disque amovible » / « MSC » plutôt que « Charge seule »." },
        { title: "Testez avec un autre câble", body: "Les câbles endommagés provoquent des déconnexions intermittentes." },
        { title: "Consultez le gestionnaire de périphériques", body: "Touche Windows + X > Gestionnaire de périphériques : un point d'exclamation jaune indique un pilote à réinstaller." },
      ],
    },
    {
      id: "guide-bibliotheque",
      title: "Organiser sa bibliothèque musicale",
      category: "Organisation",
      illustration: "sparkle",
      steps: [
        { title: "Classez par dossiers", body: "Créez un dossier par artiste, puis par album : la plupart des lecteurs affichent la bibliothèque selon cette structure." },
        { title: "Noms de fichiers lisibles", body: "Préférez « 01 - Titre.mp3 » pour conserver l'ordre des pistes." },
        { title: "Évitez les doublons", body: "LuxenX signale les fichiers déjà présents dans le dossier de destination avant de retélécharger." },
        { title: "Sauvegardez", body: "Conservez une copie de votre bibliothèque sur un disque externe ou dans le cloud." },
      ],
    },
  ],
  updatedAt: now,
};
