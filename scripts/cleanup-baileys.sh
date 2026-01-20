#!/bin/bash

echo "🧹 Limpando sessões corrompidas do Baileys..."

# Limpar diretório de autenticação do Baileys
if [ -d "baileys-auth" ]; then
    echo "📁 Removendo baileys-auth..."
    rm -rf baileys-auth/*
    echo "✅ baileys-auth limpo"
fi

# Recriar estrutura de diretórios
mkdir -p baileys-auth
chmod 755 baileys-auth

echo "✅ Limpeza concluída! Agora você pode gerar novos QR codes."
