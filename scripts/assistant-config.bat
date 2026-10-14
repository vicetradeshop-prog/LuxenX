@echo off
rem Relance l'assistant de configuration a tout moment.
setlocal enabledelayedexpansion
call "%~dp0_common.bat" || exit /b 1
node "%LUX_SCRIPTS%\tools\setup-wizard.mjs"
echo.
pause
exit /b 0
