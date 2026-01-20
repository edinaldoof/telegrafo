#!/bin/bash

echo "🚀 Deploy Automático - WhatsApp Manager"
echo "======================================"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Senha sudo
SUDO_PASS="@Odlanide"

# Função para executar comandos com sudo
run_sudo() {
    echo "$SUDO_PASS" | sudo -S "$@"
}

# 1. Parar containers existentes
echo -e "${YELLOW}📦 Parando containers existentes...${NC}"
echo "$SUDO_PASS" | sudo -S docker compose down 2>/dev/null || true

# 2. Limpar sessões corrompidas do Baileys (opcional - descomentar se necessário)
# echo -e "${YELLOW}🧹 Limpando sessões antigas do Baileys...${NC}"
# rm -rf baileys-auth/* 2>/dev/null || true

# 3. Rebuild e iniciar containers
echo -e "${YELLOW}🔨 Fazendo rebuild e iniciando containers...${NC}"
echo "$SUDO_PASS" | sudo -S docker compose up -d --build

# 4. Aguardar serviços ficarem prontos
echo -e "${YELLOW}⏳ Aguardando serviços ficarem prontos...${NC}"
sleep 10

# 5. Verificar status dos containers
echo -e "${YELLOW}📊 Status dos containers:${NC}"
echo "$SUDO_PASS" | sudo -S docker compose ps

# 6. Verificar logs para erros
echo -e "${YELLOW}📋 Verificando logs recentes...${NC}"
echo "$SUDO_PASS" | sudo -S docker logs whatsapp_manager_app --tail 20

# 7. Testar conectividade
echo -e "${YELLOW}🔍 Testando conectividade...${NC}"
sleep 5

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Aplicação está rodando em http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Aplicação não está respondendo${NC}"
    echo -e "${YELLOW}Verifique os logs com: sudo docker logs whatsapp_manager_app${NC}"
    exit 1
fi

if curl -f http://localhost:8080/instance/fetchInstances -H "apikey: B6D711FCDE4D4FD5936544120E713976" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Evolution API está rodando em http://localhost:8080${NC}"
else
    echo -e "${RED}❌ Evolution API não está respondendo${NC}"
    echo -e "${YELLOW}Verifique os logs com: sudo docker logs evolution_api_server${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}======================================"
echo -e "✅ Deploy concluído com sucesso!"
echo -e "======================================"
echo -e "${NC}"
echo "📱 Aplicação: http://localhost:3000"
echo "🔌 Evolution API: http://localhost:8080"
echo "🗄️  PostgreSQL App: localhost:5434"
echo "🗄️  PostgreSQL Evolution: localhost:5433"
echo ""
echo -e "${YELLOW}Comandos úteis:${NC}"
echo "  • Ver logs da aplicação: sudo docker logs -f whatsapp_manager_app"
echo "  • Ver logs da Evolution API: sudo docker logs -f evolution_api_server"
echo "  • Parar serviços: sudo docker compose down"
echo "  • Reiniciar serviços: sudo docker compose restart"
echo "  • Limpar sessões do Baileys: ./scripts/cleanup-baileys.sh"
