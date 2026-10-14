@echo off
rem ============================================================
rem  LuxenX - INSTALLER.BAT : premiere installation de
rem  l'environnement de developpement.
rem  Toutes les erreurs affichent un message et attendent une touche.
rem ============================================================
setlocal enabledelayedexpansion
call "%~dp0_common.bat" || exit /b 1

set "LOG=%LUX_LOGS%\installer-%LUX_STAMP%.log"
echo.
echo  ==========================================================
echo   LuxenX - Installation de l'environnement de developpement
echo  ==========================================================
echo   Journal : %LOG%
echo.

rem --- 1. Outils ---
echo   [1/7] Verification des outils...
node -v >"%LOG%" 2>&1
if errorlevel 1 (
  echo   [ERREUR] Node.js introuvable.
  goto :fail
)
for /f "delims=" %%v in ('node -v') do echo        Node.js %%v
where git >nul 2>&1
if errorlevel 1 (
  echo        [ATTENTION] Git est absent : le clonage et la publication
  echo        GitHub seront indisponibles. Installez-le depuis git-scm.com
) else (
  for /f "tokens=1,2,3" %%a in ('git --version') do echo        %%a %%b %%c
)
where gh >nul 2>&1
if errorlevel 1 (
  echo        [ATTENTION] GitHub CLI absent : publier.bat vous proposera
  echo        de l'installer. Site : cli.github.com
) else (
  echo        GitHub CLI present
)

rem --- 2. Dependances ---
echo.
echo   [2/7] Installation des dependances npm, patientez quelques minutes...
call npm install >>"%LOG%" 2>&1
if errorlevel 1 (
  echo        [ERREUR] npm install a echoue. Detail : %LOG%
  goto :fail
)
echo        Dependances installees.

rem --- 3. Packages partages ---
echo.
echo   [3/7] Compilation des packages partages...
call npm run build:packages >>"%LOG%" 2>&1
if errorlevel 1 (
  echo        [ERREUR] Compilation des packages echouee. Detail : %LOG%
  goto :fail
)
echo        Packages compiles.

rem --- 4. Fichier .env ---
echo.
echo   [4/7] Preparation du fichier de configuration...
if exist "%LUX_ROOT%\.env" (
  echo        .env existe deja : il est conserve tel quel.
) else (
  copy "%LUX_ROOT%\.env.example" "%LUX_ROOT%\.env" >nul
  echo        .env cree depuis .env.example.
)

rem --- 5. Assistant ---
echo.
echo   [5/7] Assistant de configuration : Upstash, backend, admin, GitHub...
node "%LUX_SCRIPTS%\tools\setup-wizard.mjs"
if errorlevel 1 (
  echo        [ATTENTION] Assistant interrompu. Relancez-le plus tard avec
  echo        assistant-config.bat - ce n'est pas bloquant pour la suite.
)

rem --- 6. Seed backend ---
echo.
echo   [6/7] Initialisation du backend : contenu par defaut + compte admin...
node "%LUX_SCRIPTS%\tools\backend-seed.mjs" >>"%LOG%" 2>&1
if errorlevel 1 (
  echo        [ATTENTION] Seed impossible pour le moment, probablement
  echo        parce que Upstash n'est pas encore configure dans .env.
  echo        Relancez installer.bat apres avoir complete la configuration.
) else (
  echo        Backend initialise.
)

rem --- 7. Resultat ---
echo.
echo   [7/7] Resultat
echo  ----------------------------------------------------------
echo   Installation terminee avec succes.
echo   - Lancer le projet      : double-cliquez sur lancer.bat
echo   - Construire les .exe   : double-cliquez sur construire.bat
echo   - Publier une version   : double-cliquez sur publier.bat
echo   - Verifier le projet    : double-cliquez sur verifier.bat
echo   Journal complet : %LOG%
echo  ----------------------------------------------------------
echo.
pause
exit /b 0

:fail
echo.
echo  ==========================================================
echo   L'installation s'est arretee proprement.
echo   Consultez le journal : %LOG%
echo  ==========================================================
pause
exit /b 1
