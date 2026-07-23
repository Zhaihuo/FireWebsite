@echo off
setlocal

cd /d "%~dp0"

set "PORT=3100"
set "URL=http://localhost:%PORT%/"

echo.
echo [1/5] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  echo Please install Node.js first, then run this file again.
  pause
  exit /b 1
)

echo.
echo [2/5] Checking dependencies...
if not exist "node_modules" (
  echo node_modules not found. Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Failed to install dependencies.
    pause
    exit /b 1
  )
)

echo.
echo [3/5] Building frontend...
call npm.cmd run build
if errorlevel 1 (
  echo Frontend build failed.
  pause
  exit /b 1
)

echo.
echo [4/5] Starting backend server on port %PORT%...
start "FireWebsite Server" cmd /k "cd /d "%~dp0" && set PORT=%PORT% && npm.cmd start"

echo.
echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo.
echo [5/5] Opening website...
start "" "%URL%"

echo.
echo FireWebsite is starting.
echo Open this address if the browser did not open automatically:
echo %URL%
echo.
echo Tips:
echo - Keep the "FireWebsite Server" window open while using the site.
echo - Close that window to stop the backend service.
echo.
pause
