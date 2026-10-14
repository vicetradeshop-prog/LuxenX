@echo off
rem Fenetre dediee a LuxenX Admin - ouverte par lancer.bat.
setlocal enabledelayedexpansion
call "%~dp0_common.bat" || exit /b 1
cd /d "%LUX_ROOT%\apps\luxenx-admin-desktop"
echo   LuxenX Admin en cours de demarrage dans cette fenetre.
echo.
call npm run dev
echo.
echo   LuxenX Admin s'est arrete.
pause
