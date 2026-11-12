@echo off
title ABISO - Barangay Cambalo
cd /d "%~dp0"
if not exist node_modules (
  echo Nag-i-install ng kailangan... (isang beses lang ito)
  call npm install
)
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
echo ABISO is running. Huwag isara ang window na ito habang ginagamit ang app.
node server.js
pause
