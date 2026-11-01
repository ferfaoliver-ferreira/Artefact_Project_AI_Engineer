@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
    py -3 -u -m app.web
) else (
    python -u -m app.web
)

if errorlevel 1 (
    echo.
    echo The web app stopped. Check the error above and make sure Python 3.10+ is installed.
    pause
)
