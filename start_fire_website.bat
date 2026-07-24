@echo off
setlocal

cd /d "%~dp0"

set "PORT=3100"
set "URL=http://localhost:%PORT%/"
set "LAN_IP="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$udp = New-Object System.Net.Sockets.UdpClient; $udp.Connect('8.8.8.8', 80); $ip = $udp.Client.LocalEndPoint.Address.IPAddressToString; $udp.Close(); $ip"`) do set "LAN_IP=%%I"
if defined LAN_IP (
  set "LAN_URL=http://%LAN_IP%:%PORT%/"
) else (
  set "LAN_URL="
)

echo.
echo [1/6] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  echo Please install Node.js first, then run this file again.
  pause
  exit /b 1
)

echo.
echo [2/6] Checking dependencies...
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
echo [3/6] Stopping any old server using port %PORT%...
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$conn = Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess; if ($conn) { $conn }"`) do (
  echo Found old process %%P on port %PORT%. Stopping it...
  taskkill /PID %%P /T /F >nul 2>nul
)

echo.
echo [4/6] Building frontend...
call npm.cmd run build
if errorlevel 1 (
  echo Frontend build failed.
  pause
  exit /b 1
)

echo.
echo [5/6] Opening website...
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process '%URL%'"

echo.
echo [6/6] Starting local server on port %PORT%...
echo.
echo FireWebsite is starting.
echo Open this address if the browser did not open automatically:
echo %URL%
if defined LAN_URL (
  echo.
  echo LAN access for other computers on the same network:
  echo %LAN_URL%
)
echo.
echo Tips:
echo - Keep this window open while using the site.
echo - Closing this window will stop the local website server.
if defined LAN_URL echo - If another computer cannot open the site, allow Node.js or port %PORT% through Windows Firewall.
echo.
set "PORT=%PORT%"
node server.mjs
