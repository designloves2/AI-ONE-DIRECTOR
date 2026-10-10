@echo off
title AI ONE DIRECTOR MCP Server
cd /d "%~dp0"

echo ========================================================
echo       AI ONE DIRECTOR - Autonomous MCP Server
echo ========================================================
echo Starting server on http://0.0.0.0:3210 ...
echo MCP SSE Endpoint: http://127.0.0.1:3210/sse
echo.

:loop
node src/server.mjs
echo [WARNING] Server stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto loop
