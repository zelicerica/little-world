@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 22.9 or newer, then try again.
  pause
  exit /b 1
)
if not exist ".env.local" (
  copy ".env.example" ".env.local" >nul
  echo Created .env.local. You can edit it locally to enable hosted AI.
)
if not exist "node_modules\ai\package.json" (
  echo Installing project dependencies...
  call npm ci
  if errorlevel 1 (
    echo Installation failed. Check your connection and try again.
    pause
    exit /b 1
  )
)
echo Open http://127.0.0.1:4173 after the server starts.
echo Close this window or press Ctrl+C to stop Little World.
call npm start
pause
