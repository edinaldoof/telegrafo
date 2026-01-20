#!/bin/bash

echo "🧪 Testando APIs do Sistema WhatsApp Group Manager"
echo "=================================================="
echo ""

BASE_URL="http://localhost:3000"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3

    echo -e "${YELLOW}Testando:${NC} $description"
    echo "  $method $endpoint"

    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✓ Sucesso${NC} (HTTP $http_code)"
    else
        echo -e "  ${RED}✗ Erro${NC} (HTTP $http_code)"
        echo "  Resposta: $body"
    fi
    echo ""
}

# Testar endpoints
echo "1. Testando Configuração..."
test_endpoint "GET" "/api/config" "Obter configuração atual"

echo "2. Testando Grupos..."
test_endpoint "GET" "/api/grupos" "Listar grupos"
test_endpoint "GET" "/api/grupos/stats" "Estatísticas de grupos"

echo "3. Testando Contatos..."
test_endpoint "GET" "/api/contatos" "Listar contatos"
test_endpoint "GET" "/api/contatos/stats" "Estatísticas de contatos"

echo "4. Testando Mensagens..."
test_endpoint "GET" "/api/mensagens/historico" "Histórico de mensagens"
test_endpoint "GET" "/api/mensagens/fila" "Fila de envio"

echo "=================================================="
echo -e "${GREEN}✓ Testes concluídos!${NC}"
echo ""
echo "Para testar funcionalidades completas:"
echo "  1. Configure a Evolution API em /configuracoes"
echo "  2. Crie um grupo: curl -X POST $BASE_URL/api/grupos"
echo "  3. Veja o GUIA_COMPLETO.md para mais exemplos"
