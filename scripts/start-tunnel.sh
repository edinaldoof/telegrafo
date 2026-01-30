#!/bin/bash
#
# start-tunnel.sh - Inicia Cloudflare Tunnel e atualiza a URL no Telegrafo
#
# Uso:
#   ./scripts/start-tunnel.sh           # Inicia tunnel na porta 3000
#   ./scripts/start-tunnel.sh 3000      # Porta customizada
#
# O script:
# 1. Mata qualquer cloudflared anterior
# 2. Inicia um novo Quick Tunnel
# 3. Captura a URL gerada (*.trycloudflare.com)
# 4. Atualiza NEXT_PUBLIC_APP_URL no banco via API /api/config
# 5. Salva a URL em /tmp/cloudflare-tunnel-url.txt para referência

set -euo pipefail

PORT="${1:-3000}"
LOG_FILE="/tmp/cloudflared-tunnel.log"
URL_FILE="/tmp/cloudflare-tunnel-url.txt"
APP_URL="http://localhost:${PORT}"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}[Tunnel] Iniciando Cloudflare Tunnel para ${APP_URL}...${NC}"

# 1. Parar tunnel anterior
if pgrep -f "cloudflared tunnel" > /dev/null 2>&1; then
    echo -e "${YELLOW}[Tunnel] Parando tunnel anterior...${NC}"
    pkill -f "cloudflared tunnel" 2>/dev/null || true
    sleep 2
fi

# 2. Iniciar novo tunnel em background
echo -e "${YELLOW}[Tunnel] Iniciando novo tunnel...${NC}"
cloudflared tunnel --url "${APP_URL}" > "${LOG_FILE}" 2>&1 &
TUNNEL_PID=$!
echo "[Tunnel] PID: ${TUNNEL_PID}"

# 3. Aguardar e capturar a URL
echo -e "${YELLOW}[Tunnel] Aguardando URL do tunnel...${NC}"
TUNNEL_URL=""
MAX_WAIT=30
WAITED=0

while [ -z "${TUNNEL_URL}" ] && [ "${WAITED}" -lt "${MAX_WAIT}" ]; do
    sleep 2
    WAITED=$((WAITED + 2))
    TUNNEL_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "${LOG_FILE}" 2>/dev/null | head -1 || true)
done

if [ -z "${TUNNEL_URL}" ]; then
    echo -e "${RED}[Tunnel] ERRO: Nao foi possivel obter a URL do tunnel apos ${MAX_WAIT}s${NC}"
    echo -e "${RED}[Tunnel] Verifique os logs em: ${LOG_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}[Tunnel] URL detectada: ${TUNNEL_URL}${NC}"

# 4. Salvar URL em arquivo para referencia
echo "${TUNNEL_URL}" > "${URL_FILE}"
echo "[Tunnel] URL salva em: ${URL_FILE}"

# 5. Aguardar a app estar pronta
echo -e "${YELLOW}[Tunnel] Aguardando aplicacao ficar pronta...${NC}"
APP_READY=false
for i in $(seq 1 20); do
    if curl -sf "${APP_URL}/api/health" > /dev/null 2>&1; then
        APP_READY=true
        break
    fi
    sleep 3
done

if [ "${APP_READY}" = false ]; then
    echo -e "${RED}[Tunnel] AVISO: App nao respondeu em /api/health. A URL sera atualizada quando a app estiver pronta.${NC}"
    echo -e "${YELLOW}[Tunnel] Execute manualmente depois: curl -X POST ${APP_URL}/api/config -H 'Content-Type: application/json' -d '{\"NEXT_PUBLIC_APP_URL\": \"${TUNNEL_URL}\"}'${NC}"
else
    # 6. Atualizar URL no banco de dados via API
    echo -e "${YELLOW}[Tunnel] Atualizando NEXT_PUBLIC_APP_URL no banco...${NC}"
    RESPONSE=$(curl -sf -X POST "${APP_URL}/api/config" \
        -H "Content-Type: application/json" \
        -d "{\"NEXT_PUBLIC_APP_URL\": \"${TUNNEL_URL}\"}" 2>&1 || true)

    if echo "${RESPONSE}" | grep -q '"success":true'; then
        echo -e "${GREEN}[Tunnel] URL atualizada com sucesso no banco de dados!${NC}"
    else
        echo -e "${RED}[Tunnel] AVISO: Falha ao atualizar URL no banco. Resposta: ${RESPONSE}${NC}"
        echo -e "${YELLOW}[Tunnel] A URL do tunnel esta funcionando, mas NEXT_PUBLIC_APP_URL nao foi atualizada.${NC}"
    fi
fi

echo ""
echo -e "${GREEN}======================================"
echo -e "  Cloudflare Tunnel Ativo"
echo -e "======================================"
echo -e "${NC}"
echo -e "  URL Publica:  ${GREEN}${TUNNEL_URL}${NC}"
echo -e "  URL Local:    ${APP_URL}"
echo -e "  PID:          ${TUNNEL_PID}"
echo -e "  Log:          ${LOG_FILE}"
echo -e "  URL File:     ${URL_FILE}"
echo ""
echo -e "${YELLOW}Para parar: kill ${TUNNEL_PID}${NC}"
echo -e "${YELLOW}Para ver logs: tail -f ${LOG_FILE}${NC}"
