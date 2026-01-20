# Telegrafo - Guia de Instalação

Sistema de Disparo de Mensagens WhatsApp

## Requisitos

### Obrigatórios
- **Node.js** 18.x ou superior
- **PostgreSQL** 14.x ou superior
- **npm** 8.x ou superior

### Opcionais
- **Redis** (para cache e rate limiting avançado)
- **PM2** (gerenciador de processos - instalado automaticamente)

## Instalação Rápida

### Linux/macOS

```bash
# Dar permissão de execução
chmod +x install.sh

# Executar o instalador
./install.sh
```

### Windows (PowerShell)

```powershell
# Abrir PowerShell como Administrador e executar:
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install.ps1
```

### Windows (CMD)

```cmd
# Executar como Administrador:
install.bat
```

## Instalação Manual

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Banco de dados PostgreSQL (OBRIGATÓRIO)
DATABASE_URL="postgresql://usuario:senha@localhost:5432/telegrafo"

# Credenciais do administrador
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="sua-senha-segura"

# JWT Secret (gere com: openssl rand -hex 32)
JWT_SECRET="sua-chave-secreta-muito-longa-aqui"

# Porta da aplicação
PORT=3000
```

### 3. Configurar banco de dados

```bash
# Criar banco de dados (se necessário)
createdb telegrafo

# Aplicar schema
npx prisma db push
```

### 4. Build da aplicação

```bash
npm run build
```

### 5. Iniciar aplicação

```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm start

# Com PM2 (recomendado para produção)
pm2 start ecosystem.config.js
pm2 save
```

## Configurações Adicionais

### Evolution API (WhatsApp via Baileys)

Para usar conexão direta com WhatsApp:

```env
EVOLUTION_API_URL="https://sua-evolution-api.com"
EVOLUTION_API_KEY="sua-chave-api"
EVOLUTION_INSTANCE_NAME="telegrafo"
```

### Twilio (WhatsApp Business API)

Para usar Twilio:

```env
TWILIO_ACCOUNT_SID="ACxxxxxxxxx"
TWILIO_AUTH_TOKEN="seu-token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
```

### WhatsApp Business Cloud API (Meta)

```env
WHATSAPP_BUSINESS_PHONE_ID="seu-phone-id"
WHATSAPP_BUSINESS_TOKEN="seu-access-token"
```

### Cloudinary (Upload de mídia)

```env
CLOUDINARY_CLOUD_NAME="seu-cloud-name"
CLOUDINARY_API_KEY="sua-api-key"
CLOUDINARY_API_SECRET="seu-api-secret"
```

## Comandos Úteis

```bash
# Iniciar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar em produção
npm start

# PM2 - Iniciar
pm2 start ecosystem.config.js

# PM2 - Ver status
pm2 status

# PM2 - Ver logs
pm2 logs telegrafo

# PM2 - Reiniciar
pm2 restart telegrafo

# PM2 - Parar
pm2 stop telegrafo

# PM2 - Deletar
pm2 delete telegrafo

# Prisma - Visualizar banco
npx prisma studio

# Prisma - Aplicar alterações
npx prisma db push

# Prisma - Gerar cliente
npx prisma generate
```

## Iniciar com o Sistema (Linux)

```bash
# Configurar PM2 para iniciar com o sistema
pm2 startup
# Execute o comando que aparecer

# Salvar configuração atual
pm2 save
```

## Iniciar com o Sistema (Windows)

```powershell
# Instalar pm2-windows-startup
npm install -g pm2-windows-startup

# Configurar para iniciar com Windows
pm2-startup install
pm2 save
```

## Estrutura de Portas

| Serviço | Porta Padrão |
|---------|--------------|
| Telegrafo | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## Solução de Problemas

### Erro de conexão com banco de dados

1. Verifique se o PostgreSQL está rodando
2. Verifique as credenciais no `.env`
3. Verifique se o banco existe

```bash
# Linux
sudo systemctl status postgresql

# Criar banco manualmente
psql -U postgres -c "CREATE DATABASE telegrafo;"
```

### Erro de permissão no Windows

Execute o terminal como Administrador.

### Build falha

```bash
# Limpar cache
rm -rf .next node_modules
npm install
npm run build
```

### PM2 não encontrado

```bash
npm install -g pm2
```

## Suporte

Em caso de problemas, verifique:
1. Os logs em `./logs/`
2. Logs do PM2: `pm2 logs telegrafo`
3. Console do navegador (F12)
