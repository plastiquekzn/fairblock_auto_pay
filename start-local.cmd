@echo off
cd /d "%~dp0"
start "Stabletrust UI" cmd /k "npm.cmd run dev"
start "Stabletrust API Agent" cmd /k "npm.cmd run agent"
echo Local Fairblock demo is starting.
echo UI: http://127.0.0.1:3000
echo Payment tools: http://127.0.0.1:3000/payment.html
echo API agent: http://127.0.0.1:8787/health
pause
