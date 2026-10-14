@echo off
rem ============================================================
rem  LuxenX - Environnement commun aux scripts .bat
rem  Usage : call "%~dp0_common.bat"
rem  Definit : LUX_ROOT, LUX_SCRIPTS, LUX_LOGS, LUX_STAMP
rem  Chemins calcules depuis l'emplacement du script : aucun chemin
rem  personnel code en dur, chemins avec espaces pris en charge.
rem
rem  REGLE : pas de setlocal ici, les variables doivent rester chez
rem  l'appelant. Toute erreur affiche un message puis attend une
rem  touche : jamais de fenetre qui se ferme seule.
rem  REGLE 2 : aucune parenthese dans les messages des blocs if.
rem ============================================================
chcp 65001 >nul 2>&1

rem --- Racine du projet : parent du dossier scripts\ ---
pushd "%~dp0.."
set "LUX_ROOT=%CD%"
popd

set "LUX_SCRIPTS=%LUX_ROOT%\scripts"
set "LUX_LOGS=%LUX_ROOT%\logs"
if not exist "%LUX_LOGS%" mkdir "%LUX_LOGS%"

rem --- Horodatage pour les journaux ---
set "LUX_STAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%%time:~3,2%"
set "LUX_STAMP=%LUX_STAMP: =0%"

rem --- Node.js : detection, avec rattrapage du PATH si Windows n'a pas
rem     encore pris en compte une installation recente ---
where node >nul 2>&1
if errorlevel 1 (
  if exist "C:\Program Files\nodejs\node.exe" set "PATH=%PATH%;C:\Program Files\nodejs"
)
where node >nul 2>&1
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%PATH%;%LOCALAPPDATA%\Programs\nodejs"
)
where node >nul 2>&1
if errorlevel 1 goto :node_missing

for /f "delims=" %%w in ('node -v') do set "LUX_NODE_RAW=%%w"
for /f "tokens=1 delims=." %%v in ('node -v') do set "LUX_NODE_MAJOR=%%v"
set "LUX_NODE_MAJOR=%LUX_NODE_MAJOR:v=%"
rem --- Controle du nombre sans tube ni findstr : on retire tous les
rem     chiffres, s'il reste quelque chose ce n'est pas un nombre ---
if not defined LUX_NODE_MAJOR goto :node_ilisible
set "LUX_NODE_CHECK=%LUX_NODE_MAJOR%"
for /f "delims=0123456789" %%x in ("%LUX_NODE_MAJOR%") do set "LUX_NODE_CHECK="
if not defined LUX_NODE_CHECK goto :node_ilisible
if %LUX_NODE_MAJOR% LSS 20 goto :node_old

set "LUX_NODE_OK=1"
exit /b 0

:node_missing
echo.
echo   ========================================================
echo   [ERREUR] Node.js est introuvable sur cet ordinateur.
echo   ========================================================
echo   Si Node.js est DEJA installe : c'est que Windows n'a pas
echo   encore recharge le PATH. Fermez votre session Windows
echo   puis rouvrez-la, ou redemarrez, et relancez ce script.
echo   Sinon :
echo   1. Telechargez la version LTS sur https://nodejs.org
echo   2. Installez-la en laissant toutes les options par defaut
echo   3. Double-cliquez a nouveau sur ce script
echo.
pause
exit /b 1

:node_ilisible
echo.
echo   ========================================================
echo   [ERREUR] Reponse de node -v incomprehensible : %LUX_NODE_RAW%
echo   ========================================================
echo   Reinstallez Node.js LTS depuis https://nodejs.org
echo   installation par defaut, puis relancez ce script.
echo.
pause
exit /b 1

:node_old
echo.
echo   ========================================================
echo   [ERREUR] Node.js est trop ancien : version %LUX_NODE_MAJOR%.x
echo            La version 20 ou plus recente est requise.
echo   ========================================================
echo   Mettez a jour depuis https://nodejs.org version LTS,
echo   puis double-cliquez a nouveau sur ce script.
echo.
pause
exit /b 1
