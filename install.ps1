# =============================================================================
# TELEGRAFO - Script de Instalação (Windows PowerShell)
# =============================================================================
# Execute como Administrador:
# Set-ExecutionPolicy Bypass -Scope Process -Force; .\install.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

function Write-Header {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                    TELEGRAFO - INSTALAÇÃO                      ║" -ForegroundColor Cyan
    Write-Host "║              Sistema de Disparo WhatsApp                       ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
}

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Generate-RandomString {
    param([int]$Length = 32)
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    $result = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $result += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $result
}

# Diretório do script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Header

Write-Host "Verificando requisitos do sistema..." -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
if (Test-Command "node") {
    $nodeVersion = node -v
    Write-Step "Node.js encontrado: $nodeVersion"
} else {
    Write-Error "Node.js não encontrado!"
    Write-Host "Instale o Node.js 18+ em: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar npm
if (Test-Command "npm") {
    $npmVersion = npm -v
    Write-Step "npm encontrado: $npmVersion"
} else {
    Write-Error "npm não encontrado!"
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar PostgreSQL
if (Test-Command "psql") {
    Write-Step "PostgreSQL client encontrado"
} else {
    Write-Warning "PostgreSQL client não encontrado. Certifique-se de ter um banco PostgreSQL disponível."
}

Write-Host ""

# Criar diretório de logs
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}
Write-Step "Diretório de logs criado"

# Configurar variáveis de ambiente
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "Configurando variáveis de ambiente..." -ForegroundColor Cyan
    Write-Host ""

    # Gerar secrets
    $JWT_SECRET = Generate-RandomString -Length 64
    $ADMIN_API_KEY = "sk_$(Generate-RandomString -Length 32)"
    $API_KEY = "sk_$(Generate-RandomString -Length 32)"
    $WEBHOOK_SECRET = Generate-RandomString -Length 32

    # Solicitar informações do banco
    Write-Host "Configuração do Banco de Dados PostgreSQL" -ForegroundColor Yellow
    $DB_HOST = Read-Host "Host do banco [localhost]"
    if ([string]::IsNullOrEmpty($DB_HOST)) { $DB_HOST = "localhost" }

    $DB_PORT = Read-Host "Porta do banco [5432]"
    if ([string]::IsNullOrEmpty($DB_PORT)) { $DB_PORT = "5432" }

    $DB_NAME = Read-Host "Nome do banco [telegrafo]"
    if ([string]::IsNullOrEmpty($DB_NAME)) { $DB_NAME = "telegrafo" }

    $DB_USER = Read-Host "Usuário do banco [postgres]"
    if ([string]::IsNullOrEmpty($DB_USER)) { $DB_USER = "postgres" }

    $DB_PASS = Read-Host "Senha do banco" -AsSecureString
    $DB_PASS_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASS))

    # Solicitar credenciais admin
    Write-Host ""
    Write-Host "Configuração do Administrador" -ForegroundColor Yellow
    $ADMIN_USER = Read-Host "Usuário admin [admin]"
    if ([string]::IsNullOrEmpty($ADMIN_USER)) { $ADMIN_USER = "admin" }

    $ADMIN_PASS = Read-Host "Senha admin [admin123]" -AsSecureString
    $ADMIN_PASS_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ADMIN_PASS))
    if ([string]::IsNullOrEmpty($ADMIN_PASS_PLAIN)) { $ADMIN_PASS_PLAIN = "admin123" }

    # Solicitar porta
    $APP_PORT = Read-Host "Porta da aplicação [3000]"
    if ([string]::IsNullOrEmpty($APP_PORT)) { $APP_PORT = "3000" }

    # Criar arquivo .env
    $envContent = @"
# =============================================================================
# TELEGRAFO - Configuração Gerada Automaticamente
# =============================================================================

# Database (PostgreSQL)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS_PLAIN}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Security
JWT_SECRET="${JWT_SECRET}"
JWT_ISSUER="telegrafo"
JWT_AUDIENCE="telegrafo-api"
ADMIN_API_KEY="${ADMIN_API_KEY}"
API_KEY="${API_KEY}"
WEBHOOK_SECRET="${WEBHOOK_SECRET}"
CONFIG_PASSWORD="${ADMIN_PASS_PLAIN}"

# Admin Credentials
ADMIN_USERNAME="${ADMIN_USER}"
ADMIN_PASSWORD="${ADMIN_PASS_PLAIN}"

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
"@

    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Step "Arquivo .env criado"
} else {
    Write-Step "Arquivo .env já existe"
}

# Copiar para .env.local
Copy-Item ".env" ".env.local" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Instalando dependências..." -ForegroundColor Cyan
Write-Host ""
npm install
Write-Step "Dependências instaladas"

Write-Host ""
Write-Host "Configurando banco de dados..." -ForegroundColor Cyan
Write-Host ""
Write-Warning "Certifique-se de que o banco de dados PostgreSQL está rodando"

# Rodar migrations do Prisma
npx prisma generate
npx prisma db push
Write-Step "Banco de dados configurado"

Write-Host ""
Write-Host "Fazendo build da aplicação..." -ForegroundColor Cyan
Write-Host ""
npm run build
Write-Step "Build concluído"

# Criar ecosystem.config.js
$ecosystemContent = @"
module.exports = {
  apps: [
    {
      name: 'telegrafo',
      script: 'npm',
      args: 'start',
      cwd: '$($ScriptDir -replace '\\', '/')',
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
"@
$ecosystemContent | Out-File -FilePath "ecosystem.config.js" -Encoding UTF8
Write-Step "Arquivo PM2 configurado"

# Instalar PM2 se não existir
if (-not (Test-Command "pm2")) {
    Write-Host ""
    Write-Host "Instalando PM2..." -ForegroundColor Cyan
    npm install -g pm2
    # Instalar pm2-windows-startup para iniciar com Windows
    npm install -g pm2-windows-startup
    Write-Step "PM2 instalado"
} else {
    Write-Step "PM2 já está instalado"
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "                    INSTALAÇÃO CONCLUÍDA!                        " -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "Para iniciar a aplicação:" -ForegroundColor White
Write-Host ""
Write-Host "  Modo desenvolvimento:" -ForegroundColor Yellow
Write-Host "    npm run dev"
Write-Host ""
Write-Host "  Modo produção (PM2):" -ForegroundColor Yellow
Write-Host "    pm2 start ecosystem.config.js"
Write-Host "    pm2 save"
Write-Host "    pm2-startup install  # Para iniciar com Windows"
Write-Host ""
Write-Host "  Modo produção (simples):" -ForegroundColor Yellow
Write-Host "    npm start"
Write-Host ""

# Perguntar se quer iniciar agora
$startNow = Read-Host "Deseja iniciar a aplicação agora? (S/n)"
if ($startNow -eq "" -or $startNow -match "^[Ss]") {
    Write-Host ""
    Write-Host "Iniciando aplicação..." -ForegroundColor Cyan
    Write-Host ""
    pm2 start ecosystem.config.js
    pm2 save
    Write-Host ""
    Write-Host "Aplicação iniciada!" -ForegroundColor Green
    Write-Host "Acesse: http://localhost:${APP_PORT}" -ForegroundColor Yellow
    Write-Host ""
    pm2 status
}

Write-Host ""
Read-Host "Pressione Enter para sair"
