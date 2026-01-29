# Documentacao - Sistema Telegrafo (Twilio WhatsApp)

**Data:** 23/01/2026
**Versao:** 1.0.0

---

## Indice

1. [Visao Geral](#visao-geral)
2. [Funcionalidades Implementadas](#funcionalidades-implementadas)
3. [Configuracao do Twilio](#configuracao-do-twilio)
4. [APIs Disponiveis](#apis-disponiveis)
5. [Paginas do Sistema](#paginas-do-sistema)
6. [Acesso Externo (Cloudflare Tunnel)](#acesso-externo-cloudflare-tunnel)
7. [Banco de Dados](#banco-de-dados)
8. [Custos e Precos](#custos-e-precos)
9. [Comandos Uteis](#comandos-uteis)

---

## Visao Geral

O Sistema Telegrafo e uma aplicacao Next.js para gerenciamento de mensagens WhatsApp via Twilio Business API. Permite envio de templates aprovados, recebimento de mensagens, e gerenciamento de contatos.

### Stack Tecnologica

- **Frontend/Backend:** Next.js 16 (App Router)
- **Banco de Dados:** PostgreSQL
- **ORM:** Prisma
- **API WhatsApp:** Twilio Business API
- **Gerenciador de Processos:** PM2
- **Acesso Externo:** Cloudflare Tunnel

---

## Funcionalidades Implementadas

### 1. Configuracoes Dinamicas
- Credenciais Twilio salvas no banco (nao em .env)
- Alteracoes aplicadas em tempo real sem reiniciar
- Tabela: `DynamicConfig`

### 2. WhatsApp Senders
- Visualizar numeros WhatsApp disponiveis
- Alternar entre numeros para envio
- Numeros de producao cadastrados:
  - `whatsapp:+558695148163` (Fadex)
  - `whatsapp:+558698097060` (Projeto Acredita - Ativo)

### 3. Templates WhatsApp
- Listar templates do Twilio
- Visualizar status de aprovacao (Aprovado/Pendente/Rejeitado)
- Coluna WhatsApp Eligibility (Business/User initiated)
- Criar novos templates pela aplicacao
- Templates enviados automaticamente para aprovacao do Meta

### 4. Envio de Mensagens
- **Contatos (Twilio):** Envio via templates aprovados
- **Grupos (Baileys):** Envio de texto livre
- Selecao por contatos individuais ou tags
- Previsao de custos antes do envio
- Calculo de mensagens possiveis com saldo atual

### 5. Inbox (Mensagens Recebidas)
- Visualizar mensagens recebidas via webhook
- Marcar como lida/nao lida
- Responder dentro da janela de 24h (texto livre)
- Auto-refresh a cada 30 segundos
- Filtro por mensagens nao lidas

### 6. Webhook Twilio
- Endpoint para receber mensagens
- Salva automaticamente no banco
- Registra logs de eventos

---

## Configuracao do Twilio

### Credenciais Necessarias

| Chave | Descricao | Onde Encontrar |
|-------|-----------|----------------|
| `TWILIO_ACCOUNT_SID` | ID da conta | Console Twilio > Account Info |
| `TWILIO_AUTH_TOKEN` | Token de autenticacao | Console Twilio > Account Info |
| `TWILIO_WHATSAPP_NUMBER` | Numero de envio | Formato: `whatsapp:+5586XXXXXXXX` |

### Configurar Webhook no Twilio

1. Acesse: https://console.twilio.com
2. Va em **Messaging** > **WhatsApp senders**
3. Clique no seu numero
4. Em **Webhook URL for incoming messages**, configure:
   - **URL:** `https://seu-dominio.com/api/twilio/webhook`
   - **Metodo:** POST
5. Salve

---

## APIs Disponiveis

### Templates

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/twilio/templates` | Listar todos os templates |
| GET | `/api/twilio/templates?sid=XXX` | Detalhes de um template |
| POST | `/api/twilio/templates/criar` | Criar novo template |

### Envio

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/twilio/enviar` | Enviar mensagem individual |
| POST | `/api/twilio/enviar-massa` | Envio em massa via template |
| POST | `/api/twilio/responder` | Responder mensagem (24h) |

### Inbox

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/twilio/inbox` | Listar mensagens recebidas |
| PATCH | `/api/twilio/inbox` | Marcar como lida |

### Configuracao

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/twilio/saldo` | Consultar saldo da conta |
| GET | `/api/twilio/senders` | Listar numeros disponiveis |
| POST | `/api/twilio/senders` | Alterar numero ativo |
| GET | `/api/twilio/status` | Status da conexao |

### Webhook

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/twilio/webhook` | Receber mensagens do Twilio |
| GET | `/api/twilio/webhook` | Verificar se endpoint esta ativo |

---

## Paginas do Sistema

| Rota | Descricao |
|------|-----------|
| `/` | Dashboard principal |
| `/enviar` | Enviar mensagens (Twilio/Baileys) |
| `/inbox` | Mensagens recebidas |
| `/templates` | Listar templates |
| `/templates/criar` | Criar novo template |
| `/contatos` | Gerenciar contatos |
| `/tags` | Gerenciar tags |
| `/grupos` | Gerenciar grupos |
| `/configuracoes` | Configuracoes do sistema |
| `/historico` | Historico de envios |

---

## Acesso Externo (Cloudflare Tunnel)

### Instalacao

O Cloudflare Tunnel esta instalado em:
```
/home/edinaldo/cloudflared
```

### Executar com PM2

```bash
pm2 start /home/edinaldo/cloudflared --name "cloudflare-tunnel" --interpreter none -- tunnel --url http://localhost:3000
```

### Verificar Status

```bash
pm2 status cloudflare-tunnel
pm2 logs cloudflare-tunnel --lines 20
```

### Obter URL Atual

```bash
pm2 logs cloudflare-tunnel --nostream | grep "trycloudflare.com"
```

### Importante

- A URL do tunel **muda** quando o processo reinicia (versao gratuita)
- Para URL fixa, e necessario um dominio proprio
- O tunel expoe `http://localhost:3000` para a internet

### URLs de Acesso

| Tipo | URL |
|------|-----|
| Interno | `http://192.168.3.31:3000` |
| Externo | `https://[subdominio].trycloudflare.com` |

---

## Banco de Dados

### Modelo: MensagemRecebida

```prisma
model MensagemRecebida {
  id              Int       @id @default(autoincrement())
  sid             String    @unique  // MessageSid do Twilio
  de              String              // From - numero do remetente
  para            String              // To - numero que recebeu
  corpo           String    @db.Text  // Body - conteudo da mensagem
  nomeRemetente   String?             // ProfileName
  whatsappId      String?             // WaId do remetente
  numMidia        Int       @default(0)
  dadosCompletos  Json?               // Todos os dados do webhook
  lida            Boolean   @default(false)
  respondida      Boolean   @default(false)
  recebidaEm      DateTime  @default(now())

  @@map("mensagens_recebidas")
}
```

### Modelo: DynamicConfig

```prisma
model DynamicConfig {
  id           Int       @id @default(autoincrement())
  key          String    @unique  // Ex: "TWILIO_ACCOUNT_SID"
  value        String    @db.Text
  category     String    @default("general")
  description  String?   @db.Text
  isSecret     Boolean   @default(false)
  criadoEm     DateTime  @default(now())
  atualizadoEm DateTime  @updatedAt

  @@map("dynamic_configs")
}
```

### Executar Migrations

```bash
cd /home/edinaldo/aplicacoes/evolution-research/frontend
npx prisma db push
```

---

## Custos e Precos

### Twilio WhatsApp Business API (Brasil)

| Tipo | Custo (USD) |
|------|-------------|
| Business-initiated (template) | $0.0625 por conversa |
| User-initiated (resposta 24h) | Incluido na conversa |

### Janela de 24 Horas

- Ao enviar um template, abre-se uma janela de 24h
- Dentro dessa janela, pode-se trocar mensagens sem custo adicional
- Respostas podem ser texto livre (sem template)
- Apos 24h, precisa de novo template para iniciar conversa

### Calculo de Custos (no sistema)

O sistema calcula automaticamente:
- Custo estimado do envio
- Saldo atual
- Saldo apos envio
- Quantidade de mensagens possiveis com saldo atual

---

## Comandos Uteis

### PM2

```bash
# Ver status de todos os processos
pm2 status

# Reiniciar Telegrafo
pm2 restart telegrafo

# Ver logs do Telegrafo
pm2 logs telegrafo --lines 50

# Reiniciar Cloudflare Tunnel
pm2 restart cloudflare-tunnel

# Salvar configuracao PM2
pm2 save
```

### Build e Deploy

```bash
cd /home/edinaldo/aplicacoes/evolution-research/frontend

# Build
npm run build

# Reiniciar apos build
pm2 restart telegrafo
```

### Prisma

```bash
cd /home/edinaldo/aplicacoes/evolution-research/frontend

# Sincronizar schema com banco
npx prisma db push

# Gerar client
npx prisma generate

# Abrir Prisma Studio
npx prisma studio
```

### Cloudflare Tunnel

```bash
# Iniciar tunel manualmente
/home/edinaldo/cloudflared tunnel --url http://localhost:3000

# Ver URL atual
pm2 logs cloudflare-tunnel --nostream | grep trycloudflare

# Parar tunel
pm2 stop cloudflare-tunnel
```

---

## Arquivos Importantes

| Arquivo | Descricao |
|---------|-----------|
| `/lib/services/twilio.service.ts` | Servico principal do Twilio |
| `/app/api/twilio/*` | Rotas da API Twilio |
| `/app/(dashboard)/enviar/page.tsx` | Pagina de envio |
| `/app/(dashboard)/inbox/page.tsx` | Pagina de inbox |
| `/app/(dashboard)/templates/page.tsx` | Pagina de templates |
| `/app/(dashboard)/configuracoes/page.tsx` | Pagina de configuracoes |
| `/prisma/schema.prisma` | Schema do banco de dados |

---

## Suporte

Para duvidas ou problemas:
1. Verificar logs: `pm2 logs telegrafo`
2. Verificar status do tunel: `pm2 logs cloudflare-tunnel`
3. Verificar conexao Twilio: `/api/twilio/status`

---

*Documentacao gerada em 23/01/2026*
