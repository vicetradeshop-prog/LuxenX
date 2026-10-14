/**
 * Démarrage automatique avec Windows — transparent et configurable.
 *
 * Mécanisme : "login item" standard (app.setLoginItemSettings), visible
 * dans Paramètres > Applications > Démarrage de Windows. LuxenX est
 * lancé avec l'argument --background-check : aucune fenêtre, aucune
 * introduction, vérification des mises à jour puis fermeture.
 *
 * Ce n'est pas un service caché : l'utilisateur peut l'activer/désactiver
 * dans LuxenX (Paramètres > Lancement) et dans Windows. La désinstallation
 * (NSIS) supprime le login item.
 */
import { app } from "electron";
import { logger } from "./logger.js";

const BACKGROUND_ARG = "--background-check";

export function isBackgroundLaunch(argv: string[] = process.argv): boolean {
  return argv.includes(BACKGROUND_ARG);
}

export function getAutostartEnabled(): boolean {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return false;
  }
}

export function setAutostartEnabled(enabled: boolean): boolean {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      args: enabled ? [BACKGROUND_ARG] : [],
    });
    logger.info("autostart", enabled ? "démarrage automatique activé (mode vérification des mises à jour)" : "démarrage automatique désactivé");
    return true;
  } catch (err) {
    logger.error("autostart", `échec : ${String(err)}`);
    return false;
  }
}

export function onUninstallCleanup(): void {
  // Appelée à la fermeture : rien à faire ici — NSIS supprime le login
  // item via la clé Run lors de la désinstallation (voir electron-builder.yml).
}
