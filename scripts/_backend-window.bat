@echo off
rem Fenetre dediee au backend - ouverte par lancer.bat.
setlocal enabledelayedexpansion
call "%~dp0_common.bat" || exit /b 1
cd /d "%LUX_ROOT%"
echo   Backend LuxenX en cours d'execution dans cette fenetre.
echo   Fermez cette fenetre pour arreter le backend.
echo.
call npm run dev:backend
echo.
echo   Le backend s'est arrete.
pause
