@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: =============================================================================
:: TELEGRAFO - Script de Instalação (Windows CMD)
:: =============================================================================

title TELEGRAFO - Instalação

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    TELEGRAFO - INSTALAÇÃO                      ║
echo ║              Sistema de Disparo WhatsApp                       ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js não encontrado!
    echo     Instale o Node.js 18+ em: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [✓] Node.js encontrado: %NODE_VERSION%

:: Verificar npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] npm não encontrado!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [✓] npm encontrado: %NPM_VERSION%

:: Criar diretório de logs
if not exist "logs" mkdir logs
echo [✓] Diretório de logs criado

echo.

:: Verificar se .env existe
if not exist ".env" (
    echo Configurando variáveis de ambiente...
    echo.

    echo === Configuração do Banco de Dados PostgreSQL ===
    set /p DB_HOST="Host do banco [localhost]: "
    if "!DB_HOST!"=="" set DB_HOST=localhost

    set /p DB_PORT="Porta do banco [5432]: "
    if "!DB_PORT!"=="" set DB_PORT=5432

    set /p DB_NAME="Nome do banco [telegrafo]: "
    if "!DB_NAME!"=="" set DB_NAME=telegrafo

    set /p DB_USER="Usuário do banco [postgres]: "
    if "!DB_USER!"=="" set DB_USER=postgres

    set /p DB_PASS="Senha do banco: "

    echo.
    echo === Configuração do Administrador ===
    set /p ADMIN_USER="Usuário admin [admin]: "
    if "!ADMIN_USER!"=="" set ADMIN_USER=admin

    set /p ADMIN_PASS="Senha admin [admin123]: "
    if "!ADMIN_PASS!"=="" set ADMIN_PASS=admin123

    set /p APP_PORT="Porta da aplicação [3000]: "
    if "!APP_PORT!"=="" set APP_PORT=3000

    :: Gerar secrets simples (Windows não tem openssl por padrão)
    set "CHARS=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    set "JWT_SECRET="
    for /L %%i in (1,1,64) do (
        set /a "idx=!random! %% 62"
        for %%j in (!idx!) do set "JWT_SECRET=!JWT_SECRET!!CHARS:~%%j,1!"
    )

    set "RANDOM_KEY="
    for /L %%i in (1,1,32) do (
        set /a "idx=!random! %% 62"
        for %%j in (!idx!) do set "RANDOM_KEY=!RANDOM_KEY!!CHARS:~%%j,1!"
    )
    set "ADMIN_API_KEY=sk_!RANDOM_KEY!"

    set "RANDOM_KEY2="
    for /L %%i in (1,1,32) do (
        set /a "idx=!random! %% 62"
        for %%j in (!idx!) do set "RANDOM_KEY2=!RANDOM_KEY2!!CHARS:~%%j,1!"
    )
    set "API_KEY=sk_!RANDOM_KEY2!"

    set "WEBHOOK_SECRET="
    for /L %%i in (1,1,32) do (
        set /a "idx=!random! %% 62"
        for %%j in (!idx!) do set "WEBHOOK_SECRET=!WEBHOOK_SECRET!!CHARS:~%%j,1!"
    )

    :: Criar arquivo .env
    (
        echo # =============================================================================
        echo # TELEGRAFO - Configuração Gerada Automaticamente
        echo # =============================================================================
        echo.
        echo # Database ^(PostgreSQL^)
        echo DATABASE_URL="postgresql://!DB_USER!:!DB_PASS!@!DB_HOST!:!DB_PORT!/!DB_NAME!"
        echo.
        echo # Security
        echo JWT_SECRET="!JWT_SECRET!"
        echo JWT_ISSUER="telegrafo"
        echo JWT_AUDIENCE="telegrafo-api"
        echo ADMIN_API_KEY="!ADMIN_API_KEY!"
        echo API_KEY="!API_KEY!"
        echo WEBHOOK_SECRET="!WEBHOOK_SECRET!"
        echo CONFIG_PASSWORD="!ADMIN_PASS!"
        echo.
        echo # Admin Credentials
        echo ADMIN_USERNAME="!ADMIN_USER!"
        echo ADMIN_PASSWORD="!ADMIN_PASS!"
        echo.
        echo # Application
        echo NEXT_PUBLIC_APP_URL="http://localhost:!APP_PORT!"
        echo NODE_ENV="production"
        echo PORT=!APP_PORT!
        echo LOG_LEVEL="info"
        echo.
        echo # Rate Limiting
        echo RATE_LIMIT_PER_MINUTE="120"
        echo MAX_MESSAGES_PER_MINUTE="30"
        echo MAX_MESSAGES_PER_HOUR="500"
        echo MAX_MESSAGES_PER_DAY="2000"
        echo MESSAGE_DELAY_MS="2000"
    ) > .env

    echo [✓] Arquivo .env criado
) else (
    echo [✓] Arquivo .env já existe
)

:: Copiar para .env.local
copy .env .env.local >nul 2>&1

echo.
echo Instalando dependências...
echo.
call npm install
if %errorlevel% neq 0 (
    echo [X] Erro ao instalar dependências!
    pause
    exit /b 1
)
echo [✓] Dependências instaladas

echo.
echo Configurando banco de dados...
echo [!] Certifique-se de que o PostgreSQL está rodando
echo.
call npx prisma generate
call npx prisma db push
if %errorlevel% neq 0 (
    echo [X] Erro ao configurar banco de dados!
    echo     Verifique se o PostgreSQL está rodando e as credenciais estão corretas.
    pause
    exit /b 1
)
echo [✓] Banco de dados configurado

echo.
echo Fazendo build da aplicação...
echo.
call npm run build
if %errorlevel% neq 0 (
    echo [X] Erro no build!
    pause
    exit /b 1
)
echo [✓] Build concluído

:: Criar ecosystem.config.js
echo module.exports = { > ecosystem.config.js
echo   apps: [ >> ecosystem.config.js
echo     { >> ecosystem.config.js
echo       name: 'telegrafo', >> ecosystem.config.js
echo       script: 'npm', >> ecosystem.config.js
echo       args: 'start', >> ecosystem.config.js
echo       cwd: '%CD:\=/%', >> ecosystem.config.js
echo       instances: 1, >> ecosystem.config.js
echo       autorestart: true, >> ecosystem.config.js
echo       watch: false, >> ecosystem.config.js
echo       max_memory_restart: '1G', >> ecosystem.config.js
echo       env: { NODE_ENV: 'production', PORT: process.env.PORT ^|^| 3000 }, >> ecosystem.config.js
echo       error_file: './logs/pm2-error.log', >> ecosystem.config.js
echo       out_file: './logs/pm2-out.log', >> ecosystem.config.js
echo       time: true >> ecosystem.config.js
echo     } >> ecosystem.config.js
echo   ] >> ecosystem.config.js
echo } >> ecosystem.config.js
echo [✓] Arquivo PM2 configurado

:: Verificar/Instalar PM2
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Instalando PM2...
    call npm install -g pm2
    echo [✓] PM2 instalado
) else (
    echo [✓] PM2 já está instalado
)

echo.
echo ════════════════════════════════════════════════════════════════
echo                     INSTALAÇÃO CONCLUÍDA!
echo ════════════════════════════════════════════════════════════════
echo.
echo Para iniciar a aplicação:
echo.
echo   Modo desenvolvimento:
echo     npm run dev
echo.
echo   Modo produção (PM2):
echo     pm2 start ecosystem.config.js
echo     pm2 save
echo.
echo   Modo produção (simples):
echo     npm start
echo.

set /p START_NOW="Deseja iniciar a aplicação agora? (S/n): "
if /i "!START_NOW!"=="" set START_NOW=S
if /i "!START_NOW!"=="S" (
    echo.
    echo Iniciando aplicação...
    call pm2 start ecosystem.config.js
    call pm2 save
    echo.
    echo Aplicação iniciada!
    if defined APP_PORT (
        echo Acesse: http://localhost:!APP_PORT!
    ) else (
        echo Acesse: http://localhost:3000
    )
    echo.
    call pm2 status
)

echo.
pause
