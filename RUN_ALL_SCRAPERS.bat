@echo off
setlocal

rem Run a single app when this file is called internally by a worker window.
if /I "%~1"=="--service" goto service

where node.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was not found in PATH.
  echo Install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm was not found in PATH.
  echo Install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)

echo Starting all USA scraper UIs...

start "eBay US Scraper" cmd.exe /k call "%~f0" --service "ebay-us-scraper" "ui"
start "Best Buy US Scraper" cmd.exe /k call "%~f0" --service "bestbuy-us-scraper" "ui"
start "Amazon US Scraper" cmd.exe /k call "%~f0" --service "amazon-us-scraper" "start"
start "Walmart US Scraper" cmd.exe /k call "%~f0" --service "walmart-us-scraper" "ui"
start "Newegg US Scraper" cmd.exe /k call "%~f0" --service "newegg-us-scraper" "ui"
start "US Product Mapper" cmd.exe /k call "%~f0" --service "us-product-mapper-ui" "start"

echo Waiting briefly for the servers to start...
timeout /t 4 /nobreak >nul

start "" "http://127.0.0.1:4001"
start "" "http://127.0.0.1:4002"
start "" "http://127.0.0.1:4003"
start "" "http://127.0.0.1:4004"
start "" "http://127.0.0.1:4005"
start "" "http://127.0.0.1:4006"

echo All apps were launched. Close their console windows to stop them.
exit /b 0

:service
set "APP_DIR=%~2"
set "NPM_SCRIPT=%~3"

cd /d "%~dp0%APP_DIR%"
if errorlevel 1 (
  echo ERROR: Could not open %~dp0%APP_DIR%
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies for %APP_DIR%...
  call npm.cmd install
  if errorlevel 1 (
    echo ERROR: Dependency installation failed for %APP_DIR%.
    exit /b 1
  )
)

echo Starting %APP_DIR%...
call npm.cmd run %NPM_SCRIPT%
if errorlevel 1 echo ERROR: %APP_DIR% stopped with an error.
exit /b %errorlevel%
