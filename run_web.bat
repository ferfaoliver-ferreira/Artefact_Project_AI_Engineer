@echo off
setlocal
cd /d "%~dp0"

set "BUNDLED_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%BUNDLED_PYTHON%" (
    "%BUNDLED_PYTHON%" --version >nul 2>nul
    if errorlevel 1 goto try_launcher
    start "Emporio da Musica - servidor" /D "%~dp0" cmd /k ""%BUNDLED_PYTHON%" -u -m app.web"
    goto open_browser
)

:try_launcher
where py >nul 2>nul
if not errorlevel 1 (
    py -3 --version >nul 2>nul
    if not errorlevel 1 (
        start "Emporio da Musica - servidor" /D "%~dp0" cmd /k "py -3 -u -m app.web"
        goto open_browser
    )
)

python --version >nul 2>nul
if not errorlevel 1 (
    start "Emporio da Musica - servidor" /D "%~dp0" cmd /k "python -u -m app.web"
    goto open_browser
)

echo Python 3.10 or newer was not found.
echo Install Python, or run this file on the computer where Codex is installed.
pause
exit /b 1

:open_browser
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8000"
exit /b 0
