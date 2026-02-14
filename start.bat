@echo off
setlocal enabledelayedexpansion

REM ============================================
REM E-Commerce Quick Start Script (Windows)
REM ============================================

echo.
echo 🚀 Iniciando E-Commerce...
echo.

REM Check if .NET is installed
dotnet --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ❌ .NET CLI não está instalado
    echo    Instale em: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)
echo ✅ .NET instalado

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ❌ Node.js não está instalado
    echo    Instale em: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js instalado

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ❌ npm não está instalado
    pause
    exit /b 1
)
echo ✅ npm instalado

echo.
color 0A
echo 🔨 Iniciando componentes...
echo.

REM Start Backend
echo [1] Backend API
echo [2] Admin Dashboard
echo [3] Ambos
echo.
set /p choice="Qual deseja iniciar? (1/2/3): "

if "%choice%"=="1" goto backend
if "%choice%"=="2" goto frontend
if "%choice%"=="3" goto both
goto end

:backend
echo.
echo → Iniciando API Backend...
cd src\Ecommerce.API
start "E-Commerce API" cmd /k "dotnet run"
timeout /t 3
echo.
echo ✅ Backend iniciado!
echo    📍 http://localhost:5071
echo    📍 Swagger: http://localhost:5071/swagger
echo.
goto end

:frontend
echo.
echo → Preparando Admin Dashboard...
cd admin-frontend
if not exist "node_modules" (
    echo → Instalando dependências...
    call npm install
)
echo.
echo → Iniciando Admin Dashboard...
start "Admin Dashboard" cmd /k "npm run dev"
timeout /t 3
echo.
echo ✅ Dashboard iniciado!
echo    📍 http://localhost:3000
echo.
goto end

:both
echo.
echo → Iniciando API Backend...
cd src\Ecommerce.API
start "E-Commerce API" cmd /k "dotnet run"
timeout /t 3
cd ..\..
echo.
echo → Preparando Admin Dashboard...
cd admin-frontend
if not exist "node_modules" (
    echo → Instalando dependências...
    call npm install
)
echo.
echo → Iniciando Admin Dashboard...
start "Admin Dashboard" cmd /k "npm run dev"
timeout /t 3
cd ..
echo.
color 0A
echo ✅ Sistema iniciado com sucesso!
echo.
echo 📱 URLs:
echo    API: http://localhost:5071
echo    Swagger: http://localhost:5071/swagger
echo    Dashboard: http://localhost:3000
echo.
goto end

:end
echo.
color 07
pause
