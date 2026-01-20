#!/bin/sh
set -e

echo "🚀 WhatsApp Manager - Iniciando..."

# Aguardar banco de dados estar pronto
echo "⏳ Aguardando banco de dados..."
sleep 5

# Executar migrações do Prisma
echo "📊 Executando migrações do banco de dados..."
npx prisma migrate deploy || echo "⚠️  Migrações falharam (pode ser normal na primeira execução)"

# Gerar Prisma Client
echo "🔧 Gerando Prisma Client..."
npx prisma generate

# Iniciar aplicação
echo "✅ Iniciando aplicação Next.js..."
exec node server.js
