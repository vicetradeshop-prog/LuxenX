@echo off
rem ============================================================
rem  LuxenX - PUBLIER.BAT : publier une mise a jour en un
rem  double-clic. Arret propre des qu'une etape obligatoire echoue.
rem  Aucun jeton n'est ecrit dans ce fichier ni dans l'application.
rem
rem  1 controle initial   2 choix de version   3 notes de version
rem  4 verifications      5 compilation        6 release GitHub
rem  7 recapitulatif
rem ============================================================
setlocal enabledelayedexpansion
call "%~dp0_common.bat" || exit /b 1

set "LOG=%LUX_LOGS%\publier-%LUX_STAMP%.log"
set "NOTES=%LUX_ROOT%\RELEASE-NOTES.md"
echo.
echo  ==========================================================
echo   LuxenX - Publication d'une nouvelle version
echo  ==========================================================
echo   Journal : %LOG%
echo.

rem ================= ETAPE 1 : CONTROLE INITIAL ==============
echo   [1/7] Controle initial...
where git >nul 2>&1
if errorlevel 1 (
  echo         [ERREUR] Git est requis. Installez-le depuis git-scm.com
  goto :fail
)
where gh >nul 2>&1
if errorlevel 1 (
  echo         [ERREUR] GitHub CLI est requis pour publier simplement.
  echo                  Installez-le depuis cli.github.com fichier .msi
  echo                  puis authentifiez-vous une fois : gh auth login
  goto :fail
)
gh auth status >>"%LOG%" 2>&1
if errorlevel 1 (
  echo         [ERREUR] GitHub CLI n'est pas authentifie.
  echo                  Lancez une fois : gh auth login
  echo                  repondez GitHub.com, HTTPS, Yes, navigateur.
  goto :fail
)
if not exist "%LUX_ROOT%\.env" (
  echo         [ERREUR] .env absent : lancez installer.bat d'abord.
  goto :fail
)
set "GH_OWNER="
set "GH_REPO=LuxenX"
for /f "tokens=1,2 delims==" %%a in ('findstr /b "GITHUB_OWNER=" "%LUX_ROOT%\.env"') do set "GH_OWNER=%%b"
for /f "tokens=1,2 delims==" %%a in ('findstr /b "GITHUB_REPO=" "%LUX_ROOT%\.env"') do set "GH_REPO=%%b"
if not defined GH_OWNER (
  echo         [ERREUR] GITHUB_OWNER absent du .env : configurez-le avec
  echo                  assistant-config.bat puis relancez publier.bat
  goto :fail
)
echo         Depot cible : %GH_OWNER% / %GH_REPO%
git -C "%LUX_ROOT%" rev-parse --is-inside-work-tree >>"%LOG%" 2>&1
if errorlevel 1 (
  echo         [ATTENTION] Ce dossier n'est pas un depot Git : initialisation...
  git -C "%LUX_ROOT%" init -b main >>"%LOG%" 2>&1
)
git -C "%LUX_ROOT%" remote get-url origin >>"%LOG%" 2>&1
if errorlevel 1 (
  echo         Depot distant absent : connexion automatique a origin...
  git -C "%LUX_ROOT%" remote add origin "https://github.com/%GH_OWNER%/%GH_REPO%.git" >>"%LOG%" 2>&1
)
echo         Controle initial OK.

rem ================= ETAPE 2 : NOTES ========================
echo.
echo   [2/7] Notes de version...
if not exist "%NOTES%" (
  echo ## Nouveautes> "%NOTES%"
  echo.>> "%NOTES%"
  echo - Premiere version publique : comptes, cartes, tendances,>> "%NOTES%"
  echo   Script musique spotDL, mises a jour automatiques.>> "%NOTES%"
  echo.>> "%NOTES%"
  echo ## Corrections>> "%NOTES%"
  echo.>> "%NOTES%"
  echo - >> "%NOTES%"
)
echo         Le Bloc-notes s'ouvre : redigez ou completez les notes,
echo         ENREGISTREZ puis FERMES le Bloc-notes.
start /wait notepad.exe "%NOTES%"
node "%LUX_SCRIPTS%\tools\notes-check.mjs" "%NOTES%"
if errorlevel 1 (
  echo         [ERREUR] Notes vides ou modele non rempli : publication refusee.
  echo                  Ouvrez %NOTES% et redigez au moins une ligne de
  echo                  contenu - n'importe quel style de redaction convient.
  goto :fail
)
echo         Notes validees.

rem ================= ETAPE 3 : VERSION ======================
echo.
echo   [3/7] Choix de la version...
for /f %%v in ('node "%LUX_SCRIPTS%\tools\bump-version.mjs" read') do set "CUR=%%v"
for /f %%v in ('node "%LUX_SCRIPTS%\tools\bump-version.mjs" next patch') do set "V_PATCH=%%v"
for /f %%v in ('node "%LUX_SCRIPTS%\tools\bump-version.mjs" next minor') do set "V_MINOR=%%v"
for /f %%v in ('node "%LUX_SCRIPTS%\tools\bump-version.mjs" next major') do set "V_MAJOR=%%v"
echo         Version actuelle : v%CUR%
echo.
echo           [1] Corrective            --^> v%V_PATCH%
echo           [2] Nouvelle fonctionnalite --^> v%V_MINOR%
echo           [3] Version majeure       --^> v%V_MAJOR%
echo           [4] Saisie manuelle
echo.
set /p VCHOIX="         Votre choix, defaut 1 : "
if "%VCHOIX%"=="" set "VCHOIX=1"
if "%VCHOIX%"=="1" set "NEWV=%V_PATCH%"
if "%VCHOIX%"=="2" set "NEWV=%V_MINOR%"
if "%VCHOIX%"=="3" set "NEWV=%V_MAJOR%"
if "%VCHOIX%"=="4" set /p NEWV="         Numero de version, ex. 1.4.0 : "
if not defined NEWV (
  echo         [ERREUR] Version vide : publication annulee.
  goto :fail
)

gh release view "v%NEWV%" --repo "%GH_OWNER%/%GH_REPO%" >>"%LOG%" 2>&1
if not errorlevel 1 (
  echo         [ERREUR] La release v%NEWV% existe deja sur GitHub.
  echo                  Choisissez un autre numero : une version publiee
  echo                  n'est jamais remplacee silencieusement.
  goto :fail
)

node "%LUX_SCRIPTS%\tools\bump-version.mjs" set "%NEWV%"
if errorlevel 1 (
  echo         [ERREUR] Numero de version refuse : doit etre superieur a v%CUR%
  goto :fail
)
echo         Version retenue : v%NEWV%

rem ================= ETAPE 4 : VERIFICATIONS =================
echo.
echo   [4/7] Verifications completes du projet...
call "%LUX_SCRIPTS%\verifier.bat" --no-pause >>"%LOG%" 2>&1
if errorlevel 1 (
  echo         [ERREUR] Verifications en echec : publication annulee.
  echo                  Journal : %LOG%
  goto :fail
)
echo         Verifications OK.

rem ================= ETAPE 5 : COMPILATION ===================
echo.
echo   [5/7] Compilation des installateurs, artefacts frais...
call "%LUX_SCRIPTS%\construire.bat" --no-pause >>"%LOG%" 2>&1
if errorlevel 1 (
  echo         [ERREUR] Compilation echouee : publication annulee.
  echo                  Journal : %LOG%
  goto :fail
)
echo         Installateurs compiles.

rem ================= ETAPE 6 : PUBLICATION GITHUB ============
echo.
echo   [6/7] Publication sur GitHub...
set "ART1="
set "ART2="
for %%f in ("%LUX_ROOT%\dist\LuxenX-Setup-%NEWV%.exe") do set "ART1=%%f"
for %%f in ("%LUX_ROOT%\dist\LuxenX-Admin-Setup-%NEWV%.exe") do set "ART2=%%f"
if not defined ART1 (
  echo         [ERREUR] Artefact LuxenX-Setup-%NEWV%.exe introuvable dans dist.
  goto :fail
)

git -C "%LUX_ROOT%" add -A >>"%LOG%" 2>&1
git -C "%LUX_ROOT%" commit -m "release: v%NEWV%" >>"%LOG%" 2>&1
git -C "%LUX_ROOT%" tag -a "v%NEWV%" -m "Version %NEWV%" >>"%LOG%" 2>&1
if errorlevel 1 (
  echo         [ERREUR] Le tag v%NEWV% existe deja localement.
  goto :fail
)
git -C "%LUX_ROOT%" push origin main --follow-tags >>"%LOG%" 2>&1
if errorlevel 1 (
  echo         [ATTENTION] push impossible : depot distant inaccessible.
  echo                     La release sera creee, le push se refera plus
  echo                     tard avec : git push origin main --follow-tags
)

if defined ART2 (
  gh release create "v%NEWV%" "%ART1%" "%ART2%" --repo "%GH_OWNER%/%GH_REPO%" --title "LuxenX v%NEWV%" --notes-file "%NOTES%" >>"%LOG%" 2>&1
) else (
  gh release create "v%NEWV%" "%ART1%" --repo "%GH_OWNER%/%GH_REPO%" --title "LuxenX v%NEWV%" --notes-file "%NOTES%" >>"%LOG%" 2>&1
)
if errorlevel 1 (
  echo         [ERREUR] Echec de creation de la release GitHub.
  echo                  Journal : %LOG%
  echo                  Aucune version incomplete n'a ete publiee.
  goto :fail
)

echo         Release GitHub creee.
echo         Rappel : ouvrez LuxenX Admin, section Versions, pour
echo         enregistrer la release dans le registre Upstash.

rem ================= ETAPE 7 : RECAPITULATIF =================
echo.
echo   [7/7] Recapitulatif
echo  ----------------------------------------------------------
echo   Version publiee : v%NEWV%
echo   Release         : https://github.com/%GH_OWNER%/%GH_REPO%/releases/tag/v%NEWV%
echo   Artefacts       :
echo      - dist\LuxenX-Setup-%NEWV%.exe
if defined ART2 echo      - dist\LuxenX-Admin-Setup-%NEWV%.exe
echo   Notes           : %NOTES%
echo   Journal         : %LOG%
echo.
echo   Prochaine etape conseillee : sur une installation de test,
echo   ouvrez LuxenX, Parametres, Mises a jour, Verifier maintenant.
echo  ----------------------------------------------------------
echo.
pause
exit /b 0

:fail
echo.
echo  ==========================================================
echo   Publication INTERROMPUE proprement : rien n'a ete publie
echo   de maniere incomplete. Consultez le journal : %LOG%
echo  ==========================================================
pause
exit /b 1
