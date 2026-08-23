@echo off
title Hastane Uygulamasi

cd /d "%~dp0"

set "PATH=C:\Program Files\nodejs;%PATH%"

echo.
echo Hastane uygulamasi baslatiliyor...
echo.

start "" cmd /c "timeout /t 4 >nul && start http://localhost:5173"

npm run dev

pause