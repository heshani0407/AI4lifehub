@echo off
title AI4Life Backend Server
color 0A
echo.
echo  ==========================================
echo    AI4Life Backend Server
echo    Running on http://localhost:5000
echo  ==========================================
echo.
echo  Keep this window OPEN while using the site.
echo  Close it to stop the server.
echo.
cd /d "%~dp0backend"
npm start
pause
