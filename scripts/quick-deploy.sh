#!/bin/bash

# Script de deploy rápido
echo "🚀 Deploy Rápido - WhatsApp Manager"

SUDO_PASS="@Odlanide"

# Parar e remover containers
echo "📦 Parando containers..."
echo "$SUDO_PASS" | sudo -S docker compose down

# Rebuild e iniciar
echo "🔨 Rebuild e iniciando..."
echo "$SUDO_PASS" | sudo -S docker compose up -d --build

echo "✅ Deploy iniciado! Aguarde alguns minutos para os serviços ficarem prontos."
echo ""
echo "Comandos para monitorar:"
echo "  sudo docker logs -f whatsapp_manager_app"
echo "  sudo docker logs -f evolution_api_server"
