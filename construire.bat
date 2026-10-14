@echo off
rem Raccourci LuxenX : execute scripts\construire.bat
rem Si cette fenetre se fermait seule : message + pause garantis desormais.
if not exist "%~dp0scripts\construire.bat" (
  echo [ERREUR] Le dossier scripts est introuvable a cote de ce fichier.
  echo          Extrayez TOUTE l archive LuxenX-Complete.zip avant utilisation.
  pause
  exit /b 1
)
call "%~dp0scripts\construire.bat" %*
exit /b %errorlevel%
