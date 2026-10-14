@echo off
rem ============================================================
rem  LuxenX - VERIFIER.BAT : toutes les verifications du projet.
rem  Un test non execute n'est jamais presente comme reussi.
rem  Appel interne : verifier.bat --no-pause  depuis construire/publier
rem ============================================================
setlocal enabledelayedexpansion
call "%~dp0_common.bat" || exit /b 1

set "LOG=%LUX_LOGS%\verifier-%LUX_STAMP%.log"
set "ECHECS=0"
echo.
echo  ==========================================================
echo   LuxenX - Verification complete du projet
echo  ==========================================================
echo   Journal : %LOG%
echo.

if not exist "%LUX_ROOT%\node_modules" (
  echo   [ERREUR] Dependances absentes : lancez d'abord installer.bat
  pause
  exit /b 1
)

call :etape "Compilation TypeScript - packages, backend, applications" "npm run typecheck"
call :etape "Lint ESLint" "npm run lint"
call :etape "Tests unitaires et d'integration - backend et packages" "npm test"
call :etape "Tests des outils Node des scripts .bat" "npm run test:tools"
call :etape "Controle des secrets - aucun jeton dans les sources" "npm run check:secrets"
call :etape "Controle de la structure du projet" "npm run check:structure"

echo.
echo  ----------------------------------------------------------
if %ECHECS%==0 (
  echo   RESULTAT : TOUTES LES VERIFICATIONS SONT PASSEES.
) else (
  echo   RESULTAT : %ECHECS% verification s EN ECHEC.
  echo   Consultez le journal : %LOG%
)
echo  ----------------------------------------------------------
if /i not "%~1"=="--no-pause" pause
exit /b %ECHECS%

:etape
rem --- %~1 = libelle, %~2 = commande ---
echo   [....] %~1
echo.>> "%LOG%"
echo === %~1 ===>> "%LOG%"
call %~2 >>"%LOG%" 2>&1
if errorlevel 1 (
  echo   [ECHEC] %~1  -- detail dans %LOG%
  set /a ECHECS+=1
) else (
  echo   [OK]    %~1
)
exit /b 0
