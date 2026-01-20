# Telegrafo

Sistema de disparo de mensagens WhatsApp com suporte a múltiplos provedores.

## Stack

- Next.js 16 + React 19
- PostgreSQL + Prisma
- Tailwind CSS

## Provedores suportados

- Twilio
- Evolution API (Baileys)
- WhatsApp Business Cloud API (Meta)

## Instalação

```bash
# Linux/macOS
./install.sh

# Windows (PowerShell como Admin)
.\install.ps1

# Windows (CMD como Admin)
install.bat

# Universal (Node.js)
node install.js
```

O instalador vai pedir as configurações do banco de dados e credenciais de admin.

## Instalação manual

```bash
npm install
cp .env.example .env
# editar .env com suas configurações
npx prisma db push
npm run build
npm start
```

## Executar

```bash
# Desenvolvimento
npm run dev

# Produção
pm2 start ecosystem.config.js
```

## Configuração

Edite o arquivo `.env` com:

- `DATABASE_URL` - conexão PostgreSQL
- `JWT_SECRET` - chave para tokens
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - credenciais de acesso

Para configurar provedores de WhatsApp, veja a seção correspondente no `.env.example`.

## Licença

Proprietário
