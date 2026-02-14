#!/bin/bash

# ============================================
# E-Commerce Quick Start Script
# ============================================
# Este script inicia o projeto completo

echo "🚀 Iniciando E-Commerce..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
echo "📋 Verificando requisitos..."

# Check .NET
if ! command -v dotnet &> /dev/null; then
    echo -e "${RED}❌ .NET CLI não está instalado${NC}"
    echo "   Instale em: https://dotnet.microsoft.com/download"
    exit 1
fi
echo -e "${GREEN}✅ .NET $(dotnet --version)${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não está instalado${NC}"
    echo "   Instale em: https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

echo ""
echo "🔨 Iniciando componentes..."
echo ""

# Check if we should start services
read -p "Deseja iniciar a API Backend? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}→ Iniciando API Backend...${NC}"
    cd src/Ecommerce.API
    dotnet run &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Backend iniciado (PID: $BACKEND_PID)${NC}"
    echo "   📍 http://localhost:5071"
    echo "   📍 Swagger: http://localhost:5071/swagger"
    cd ../..
    echo ""
fi

read -p "Deseja iniciar o Admin Dashboard? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}→ Instalando dependências do Frontend...${NC}"
    cd admin-frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    echo -e "${GREEN}✅ Dependências instaladas${NC}"
    
    echo -e "${YELLOW}→ Iniciando Admin Dashboard...${NC}"
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ Dashboard iniciado (PID: $FRONTEND_PID)${NC}"
    echo "   📍 http://localhost:3000"
    cd ..
    echo ""
fi

echo -e "${GREEN}✅ Sistema iniciado com sucesso!${NC}"
echo ""
echo "📱 URLs:"
echo "   API: http://localhost:5071"
echo "   Swagger: http://localhost:5071/swagger"
echo "   Dashboard: http://localhost:3000"
echo ""
echo "🛑 Para parar, pressione Ctrl+C"
echo ""

# Keep script running
wait
