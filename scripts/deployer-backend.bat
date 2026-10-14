@echo off
rem ============================================================
rem  LuxenX - DEPLOYER-BACKEND.BAT
rem  Verifie et teste le backend, puis declenche le deploiement
rem  Render si RENDER_API_KEY et RENDER_SERVICE_ID sont definis.
rem  Sinon : procedure manuelle exacte, affichee clairement.
rem ============================================================
setlocal enabledelayedexpansion
call "%~dp0_common.bat" || exit /b 1

set "LOG=%LUX_LOGS%\deployer-backend-%LUX_STAMP%.log"
echo.
echo  ==========================================================
echo   LuxenX - Deploiement du backend
echo  ==========================================================
echo   Journal : %LOG%
echo.

if not exist "%LUX_ROOT%\.env" (
  echo   [ERREUR] .env absent : lancez installer.bat d'abord.
  pause
  exit /b 1
)

echo   [1/4] Verification du backend : types puis tests...
call npm run build:packages >>"%LOG%" 2>&1
if errorlevel 1 (
  echo   [ERREUR] Compilation des packages en echec. Journal : %LOG%
  goto :fail
)
call npm run typecheck --workspace apps/backend >>"%LOG%" 2>&1
if errorlevel 1 (
  echo   [ERREUR] TypeScript du backend en echec. Journal : %LOG%
  goto :fail
)
call npm run test --workspace apps/backend >>"%LOG%" 2>&1
if errorlevel 1 (
  echo   [ERREUR] Tests du backend en echec. Journal : %LOG%
  goto :fail
)
echo         Backend verifie.

echo   [2/4] Lecture des identifiants Render...
set "RENDER_KEY="
set "RENDER_SVC="
for /f "tokens=1,2 delims==" %%a in ('findstr /b "RENDER_API_KEY=" "%LUX_ROOT%\.env"') do set "RENDER_KEY=%%b"
for /f "tokens=1,2 delims==" %%a in ('findstr /b "RENDER_SERVICE_ID=" "%LUX_ROOT%\.env"') do set "RENDER_SVC=%%b"

echo   [3/4] Controle de la configuration Upstash...
findstr /b "UPSTASH_REDIS_REST_URL=https" "%LUX_ROOT%\.env" >nul
if errorlevel 1 (
  echo         [ERREUR] UPSTASH_REDIS_REST_URL manquant ou non https.
  echo                  Un backend en production sans base persistente
  echo                  refuserait de demarrer.
  goto :fail
)
findstr /b "UPSTASH_REDIS_REST_TOKEN=" "%LUX_ROOT%\.env" >nul
if errorlevel 1 (
  echo         [ERREUR] UPSTASH_REDIS_REST_TOKEN manquant.
  goto :fail
)
echo         Upstash configure.

echo   [4/4] Declenchement du deploiement...
if not defined RENDER_KEY goto :manuel
if not defined RENDER_SVC goto :manuel

node "%LUX_SCRIPTS%\tools\render-deploy.mjs" "%RENDER_KEY%" "%RENDER_SVC%"
if errorlevel 1 (
  echo         [ERREUR] Le deploiement Render a echoue. Journal : %LOG%
  goto :fail
)
echo         Deploiement declenche et suivi jusqu'a mise en ligne.
echo.
pause
exit /b 0

:manuel
echo.
echo   Automatisation impossible sans identifiants Render.
echo   Procedure manuelle, une seule fois :
echo     1. dashboard.render.com, New, Web Service, reliez votre depot Git
echo     2. Build command :
echo        npm ci ^&^& npm run build:packages ^&^& npm run build --workspace apps/backend
echo     3. Start command :
echo        npm run start --workspace apps/backend
echo     4. Copiez cote Render les variables du .env : UPSTASH_*,
echo        SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, NODE_ENV=production
echo     5. Chaque git push redeploiera automatiquement.
echo     6. Pour automatiser depuis ce script : renseignez RENDER_API_KEY
echo        et RENDER_SERVICE_ID dans .env, puis relancez-le.
echo.
pause
exit /b 0

:fail
echo.
echo   Deploiement INTERROMPU : le backend n'a PAS ete declare deploye.
echo   Journal : %LOG%
pause
exit /b 1
