@echo off
rem ============================================================
rem  LuxenX - DIAGNOSTIC.BAT : rapport complet de l'environnement.
rem  Outils, versions, configuration masquee, acces backend,
rem  Upstash, GitHub, dossiers de sortie, journaux recents.
rem  Aucun secret n'est ecrit dans le rapport.
rem ============================================================
setlocal enabledelayedexpansion
call "%~dp0_common.bat" || exit /b 1

set "RAPPORT=%LUX_LOGS%\diagnostic-%LUX_STAMP%.txt"
echo.
echo  ==========================================================
echo   LuxenX - Diagnostic de l'environnement
echo  ==========================================================
echo   Rapport : %RAPPORT%
echo.

node "%LUX_SCRIPTS%\tools\diagnostic.mjs" "%RAPPORT%"
set "CODE=%errorlevel%"

echo.
echo   Rapport complet enregistre : %RAPPORT%
echo.
pause
exit /b %CODE%
