@echo off
rem ============================================================
rem  LuxenX - LANCER.BAT : demarrer le projet en developpement.
rem  Menu simple, aucune commande a saisir.
rem  Chaque service s'ouvre dans sa propre fenetre : la fermer
rem  arrete le service correspondant.
rem ============================================================
setlocal enabledelayedexpansion
call "%~dp0_common.bat" || exit /b 1

echo.
echo  ==========================================================
echo   LuxenX - Lancement
echo  ==========================================================
echo.
echo   [1] Backend seulement
echo   [2] LuxenX application utilisateur, mode developpement
echo   [3] LuxenX Admin console d'administration
echo   [4] Backend + LuxenX
echo   [5] Tout backend + LuxenX + Admin
echo   [Q] Quitter
echo.
set /p CHOIX="   Votre choix (defaut : 4) : "
if "%CHOIX%"=="" set "CHOIX=4"

if not exist "%LUX_ROOT%\node_modules" (
  echo.
  echo   [ERREUR] Les dependances ne sont pas installees.
  echo            Double-cliquez d'abord sur installer.bat
  echo.
  pause
  exit /b 1
)
if not exist "%LUX_ROOT%\.env" (
  echo.
  echo   [ATTENTION] .env absent : creation depuis .env.example...
  copy "%LUX_ROOT%\.env.example" "%LUX_ROOT%\.env" >nul
)

if /i "%CHOIX%"=="Q" exit /b 0

if "%CHOIX%"=="1" (
  echo   Demarrage du backend dans une nouvelle fenetre...
  start "LuxenX Backend" "%LUX_SCRIPTS%\_backend-window.bat"
  echo   Backend demarre : http://localhost:8787
  echo   Fermez sa fenetre pour l'arreter.
  pause
  exit /b 0
)
if "%CHOIX%"=="3" (
  call :ensure_backend
  echo   Demarrage de LuxenX Admin dans une nouvelle fenetre...
  start "LuxenX Admin" "%LUX_SCRIPTS%\_admin-window.bat"
  echo   LuxenX Admin demarre dans sa fenetre.
  pause
  exit /b 0
)
if "%CHOIX%"=="4" (
  call :ensure_backend
  goto :desktop
)
if "%CHOIX%"=="5" (
  call :ensure_backend
  start "LuxenX Admin" "%LUX_SCRIPTS%\_admin-window.bat"
  goto :desktop
)
if "%CHOIX%"=="2" (
  call :ensure_backend
  goto :desktop
)

echo.
echo   [ERREUR] Choix invalide : tapez 1, 2, 3, 4, 5 ou Q.
pause
exit /b 1

rem --- Demarre le backend seulement s'il ne repond pas deja ---
:ensure_backend
node "%LUX_SCRIPTS%\tools\backend-running.mjs" >nul 2>&1
if not errorlevel 1 (
  echo   Backend deja en cours d'execution : rien a demarrer.
  exit /b 0
)
echo   Backend absent : demarrage automatique dans une nouvelle fenetre...
start "LuxenX Backend" "%LUX_SCRIPTS%\_backend-window.bat"
node "%LUX_SCRIPTS%\tools\wait-backend.mjs"
exit /b 0

:desktop
echo   Demarrage de LuxenX Vite + Electron dans cette fenetre...
echo   Laissez cette fenetre ouverte pendant l'utilisation de LuxenX.
echo.
cd /d "%LUX_ROOT%\apps\luxenx-desktop" || ( echo   [ERREUR] Dossier introuvable. & pause & exit /b 1 )
call npm run dev
echo.
echo   LuxenX s'est arrete.
pause
exit /b 0
