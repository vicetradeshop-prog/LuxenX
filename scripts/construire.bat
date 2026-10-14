@echo off
rem ============================================================
rem  LuxenX - CONSTRUIRE.BAT : produit les installateurs Windows.
rem  Ne dclare jamais un succs si les .exe attendus sont absents.
rem  Appel interne : construire.bat --no-pause   depuis publier.bat
rem  Option :        construire.bat --rapide    sans vrifications
rem ============================================================
setlocal enabledelayedexpansion
call "%~dp0_common.bat" || exit /b 1

set "LOG=%LUX_LOGS%\construire-%LUX_STAMP%.log"
echo.
echo  ==========================================================
echo   LuxenX - Construction des installateurs Windows
echo  ==========================================================
echo   Journal : %LOG%
echo.

if not exist "%LUX_ROOT%\node_modules" (
  echo   [ERREUR] Dependances absentes : lancez d'abord installer.bat
  pause
  exit /b 1
)

rem --- 1. Vrifications ---
if /i "%~1"=="--rapide" (
  echo   [1/5] Verifications ignorees : option --rapide.
) else (
  echo   [1/5] Verifications du projet...
  call "%LUX_SCRIPTS%\verifier.bat" --no-pause >>"%LOG%" 2>&1
  if errorlevel 1 (
    echo         [ERREUR] Verifications en echec : construction annulee.
    echo         Journal : %LOG%
    pause
    exit /b 1
  )
  echo         Verifications OK.
)

rem --- 2. Nettoyage : jamais d'artefacts prims ---
echo   [2/5] Nettoyage des artefacts precedents...
if exist "%LUX_ROOT%\apps\luxenx-desktop\release" rmdir /s /q "%LUX_ROOT%\apps\luxenx-desktop\release"
if exist "%LUX_ROOT%\apps\luxenx-admin-desktop\release" rmdir /s /q "%LUX_ROOT%\apps\luxenx-admin-desktop\release"
if exist "%LUX_ROOT%\dist" rmdir /s /q "%LUX_ROOT%\dist"
mkdir "%LUX_ROOT%\dist"

rem --- URL backend qui sera integree aux installateurs ---
set "BAKED_URL=http://localhost:8787"
for /f "tokens=1,2 delims==" %%a in ('findstr /b "BACKEND_URL=" "%LUX_ROOT%\.env" 2^>nul') do set "BAKED_URL=%%b"
echo.
echo   Adresse du backend qui sera INTEGREE aux installateurs :
echo        %BAKED_URL%
echo   Les utilisateurs ne pourront pas la changer dans l'application.
echo.
rem Confirmation UNIQUEMENT en double-clic direct : quand ce script est
rem appele par publier.bat - sortie redirigee vers un journal -, un set /p
rem attendrait une saisie invisible et donnerait l'impression de bloquer.
set "CONFIRM=O"
if "%~1"=="" (
  set /p CONFIRM="   Continuer avec cette adresse ? [O/N] : "
)
if /i not "!CONFIRM!"=="O" (
  echo   Construction annulee : corrigez BACKEND_URL via assistant-config.bat
  pause
  exit /b 1
)

rem --- 3. LuxenX ---
echo   [3/5] Compilation de LuxenX puis de son installateur NSIS...
set "LUXENX_GITHUB_OWNER="
set "LUXENX_GITHUB_REPO=LuxenX"
for /f "tokens=1,2 delims==" %%a in ('findstr /b "GITHUB_OWNER=" "%LUX_ROOT%\.env" 2^>nul') do set "LUXENX_GITHUB_OWNER=%%b"
for /f "tokens=1,2 delims==" %%a in ('findstr /b "GITHUB_REPO=" "%LUX_ROOT%\.env" 2^>nul') do set "LUXENX_GITHUB_REPO=%%b"
if not defined LUXENX_GITHUB_OWNER set "LUXENX_GITHUB_OWNER=luxenx-app"
cd /d "%LUX_ROOT%\apps\luxenx-desktop"
call npm run dist >>"%LOG%" 2>&1
if errorlevel 1 (
  echo         [ERREUR] Compilation LuxenX echouee. Journal : %LOG%
  pause
  exit /b 1
)
echo         LuxenX compile.

rem --- 4. LuxenX Admin ---
echo   [4/5] Compilation de LuxenX Admin puis de son installateur NSIS...
cd /d "%LUX_ROOT%\apps\luxenx-admin-desktop"
call npm run dist >>"%LOG%" 2>&1
if errorlevel 1 (
  echo         [ERREUR] Compilation LuxenX Admin echouee. Journal : %LOG%
  pause
  exit /b 1
)
echo         LuxenX Admin compile.

rem --- 5. Vrification des artefacts ---
echo   [5/5] Verification des installateurs...
set "FOUND=0"
for %%f in ("%LUX_ROOT%\apps\luxenx-desktop\release\LuxenX-Setup-*.exe") do (
  copy "%%f" "%LUX_ROOT%\dist\" >nul
  echo         Trouve : %%~nxf - %%~zf octets
  set "FOUND=1"
)
for %%f in ("%LUX_ROOT%\apps\luxenx-admin-desktop\release\LuxenX-Admin-Setup-*.exe") do (
  copy "%%f" "%LUX_ROOT%\dist\" >nul
  echo         Trouve : %%~nxf - %%~zf octets
  set /a FOUND+=2
)
if not "%FOUND%"=="3" (
  echo         [ERREUR] Installateurs introuvables : la construction a echoue.
  echo         Journal : %LOG%
  pause
  exit /b 1
)

echo.
echo  ----------------------------------------------------------
echo   SUCCES : installateurs disponibles dans le dossier dist\
echo     - dist\LuxenX-Setup-*.exe
echo     - dist\LuxenX-Admin-Setup-*.exe
echo  ----------------------------------------------------------
if /i not "%~1"=="--no-pause" pause
exit /b 0
