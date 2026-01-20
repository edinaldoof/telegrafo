#!/bin/bash

# =============================================================================
# TELEGRAFO - Script de Instalação (Linux/macOS)
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    TELEGRAFO - INSTALAÇÃO                      ║"
    echo "║              Sistema de Disparo WhatsApp                       ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_command() {
    if command -v $1 &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_header

echo -e "${BLUE}Verificando requisitos do sistema...${NC}\n"

# Verificar Node.js
if check_command node; then
    NODE_VERSION=$(node -v)
    print_step "Node.js encontrado: $NODE_VERSION"
else
    print_error "Node.js não encontrado!"
    echo "Instale o Node.js 18+ em: https://nodejs.org/"
    exit 1
fi

# Verificar npm
if check_command npm; then
    NPM_VERSION=$(npm -v)
    print_step "npm encontrado: $NPM_VERSION"
else
    print_error "npm não encontrado!"
    exit 1
fi

# Verificar PostgreSQL
if check_command psql; then
    print_step "PostgreSQL client encontrado"
else
    print_warning "PostgreSQL client não encontrado. Certifique-se de ter um banco PostgreSQL disponível."
fi

echo ""

# Criar diretório de logs
mkdir -p logs
print_step "Diretório de logs criado"

# Configurar variáveis de ambiente
if [ ! -f .env ]; then
    echo -e "\n${BLUE}Configurando variáveis de ambiente...${NC}\n"

    # Gerar secrets
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    ADMIN_API_KEY="sk_$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)"
    API_KEY="sk_$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)"
    WEBHOOK_SECRET=$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)

    # Solicitar informações do banco
    echo -e "${YELLOW}Configuração do Banco de Dados PostgreSQL${NC}"
    read -p "Host do banco [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}

    read -p "Porta do banco [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}

    read -p "Nome do banco [telegrafo]: " DB_NAME
    DB_NAME=${DB_NAME:-telegrafo}

    read -p "Usuário do banco [postgres]: " DB_USER
    DB_USER=${DB_USER:-postgres}

    read -sp "Senha do banco: " DB_PASS
    echo ""

    # Solicitar credenciais admin
    echo -e "\n${YELLOW}Configuração do Administrador${NC}"
    read -p "Usuário admin [admin]: " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-admin}

    read -sp "Senha admin [admin123]: " ADMIN_PASS
    echo ""
    ADMIN_PASS=${ADMIN_PASS:-admin123}

    # Solicitar porta
    read -p "Porta da aplicação [3000]: " APP_PORT
    APP_PORT=${APP_PORT:-3000}

    # Criar arquivo .env
    cat > .env << EOF
# =============================================================================
# TELEGRAFO - Configuração Gerada Automaticamente
# =============================================================================

# Database (PostgreSQL)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Security
JWT_SECRET="${JWT_SECRET}"
JWT_ISSUER="telegrafo"
JWT_AUDIENCE="telegrafo-api"
ADMIN_API_KEY="${ADMIN_API_KEY}"
API_KEY="${API_KEY}"
WEBHOOK_SECRET="${WEBHOOK_SECRET}"
CONFIG_PASSWORD="${ADMIN_PASS}"

# Admin Credentials
ADMIN_USERNAME="${ADMIN_USER}"
ADMIN_PASSWORD="${ADMIN_PASS}"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:${APP_PORT}"
NODE_ENV="production"
PORT=${APP_PORT}
LOG_LEVEL="info"

# Rate Limiting
RATE_LIMIT_PER_MINUTE="120"
MAX_MESSAGES_PER_MINUTE="30"
MAX_MESSAGES_PER_HOUR="500"
MAX_MESSAGES_PER_DAY="2000"
MESSAGE_DELAY_MS="2000"

# =============================================================================
# CONFIGURAÇÕES OPCIONAIS (configure conforme necessário)
# =============================================================================

# Redis (opcional)
# REDIS_URL="redis://localhost:6379"

# Evolution API (WhatsApp via Baileys)
# EVOLUTION_API_URL=""
# EVOLUTION_API_KEY=""
# EVOLUTION_INSTANCE_NAME=""

# Twilio
# TWILIO_ACCOUNT_SID=""
# TWILIO_AUTH_TOKEN=""
# TWILIO_WHATSAPP_NUMBER=""

# WhatsApp Business Cloud API (Meta)
# WHATSAPP_BUSINESS_PHONE_ID=""
# WHATSAPP_BUSINESS_TOKEN=""

# Cloudinary
# CLOUDINARY_CLOUD_NAME=""
# CLOUDINARY_API_KEY=""
# CLOUDINARY_API_SECRET=""
EOF

    print_step "Arquivo .env criado"
else
    print_step "Arquivo .env já existe"
fi

# Copiar para .env.local também
cp .env .env.local 2>/dev/null || true

echo -e "\n${BLUE}Instalando dependências...${NC}\n"
npm install
print_step "Dependências instaladas"

echo -e "\n${BLUE}Configurando banco de dados...${NC}\n"

# Criar banco se não existir (opcional)
if check_command psql; then
    source .env 2>/dev/null || true
    DB_NAME_ONLY=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    if [ -n "$DB_NAME_ONLY" ]; then
        print_warning "Certifique-se de que o banco '$DB_NAME_ONLY' existe no PostgreSQL"
    fi
fi

# Rodar migrations do Prisma
npx prisma generate
npx prisma db push
print_step "Banco de dados configurado"

echo -e "\n${BLUE}Fazendo build da aplicação...${NC}\n"
npm run build
print_step "Build concluído"

# Criar ecosystem.config.js dinâmico
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'telegrafo',
      script: 'npm',
      args: 'start',
      cwd: '${SCRIPT_DIR}',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}
EOF
print_step "Arquivo PM2 configurado"

# Instalar PM2 se não existir
if ! check_command pm2; then
    echo -e "\n${BLUE}Instalando PM2...${NC}\n"
    npm install -g pm2
    print_step "PM2 instalado"
else
    print_step "PM2 já está instalado"
fi

echo -e "\n${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    INSTALAÇÃO CONCLUÍDA!                        ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}\n"

echo -e "Para iniciar a aplicação:\n"
echo -e "  ${YELLOW}Modo desenvolvimento:${NC}"
echo -e "    npm run dev\n"
echo -e "  ${YELLOW}Modo produção (PM2):${NC}"
echo -e "    pm2 start ecosystem.config.js"
echo -e "    pm2 save\n"
echo -e "  ${YELLOW}Modo produção (simples):${NC}"
echo -e "    npm start\n"

# Perguntar se quer iniciar agora
read -p "Deseja iniciar a aplicação agora? (s/N): " START_NOW
if [[ "$START_NOW" =~ ^[Ss]$ ]]; then
    echo -e "\n${BLUE}Iniciando aplicação...${NC}\n"
    pm2 start ecosystem.config.js
    pm2 save
    echo -e "\n${GREEN}Aplicação iniciada!${NC}"
    echo -e "Acesse: ${YELLOW}http://localhost:${APP_PORT:-3000}${NC}\n"
    pm2 status
fi
