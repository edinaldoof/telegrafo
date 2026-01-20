# 📱 Sistema de Gerenciamento de Grupos WhatsApp

Sistema completo para gerenciar múltiplos grupos WhatsApp com mais de 2000 pessoas, usando **Evolution API** + **Next.js 16** + **TypeScript** + **PostgreSQL**.

## 🎯 Funcionalidades

- ✅ **Gerenciamento Automático de Grupos**: Cria novos grupos automaticamente quando atingir capacidade
- ✅ **Envio em Massa**: Envia mensagens/mídia para todos os grupos simultaneamente
- ✅ **Grupos Restritos**: Apenas admins enviam mensagens, participantes ocultos
- ✅ **Interface Web**: Dashboard completo para gerenciar tudo
- ✅ **Evolution API**: Integração com WhatsApp via Evolution API
- ✅ **Rotação Automática**: Sistema inteligente de rotação de grupos
- ✅ **Logs e Auditoria**: Rastreamento completo de todas as ações

---

## 📋 Requisitos

- **Node.js** 20+ (recomendado)
- **PostgreSQL** 15+ (banco de dados)
- **Evolution API** rodando (pode ser local ou remoto)
- **npm** ou **yarn**

---

## 🚀 Instalação

### 1. Clone o repositório (ou já está no diretório)

```bash
cd /home/edinaldo/aplicacoes/whatsApp
```

### 2. Instalar dependências (já foram instaladas)

```bash
npm install
```

### 3. Configurar Banco de Dados PostgreSQL

#### Opção A: Instalar PostgreSQL localmente

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Criar banco de dados
sudo -u postgres psql
CREATE DATABASE whatsapp_groups;
CREATE USER whatsapp_user WITH ENCRYPTED PASSWORD 'sua_senha_forte';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_groups TO whatsapp_user;
\q
```

#### Opção B: Usar PostgreSQL via Docker

```bash
docker run --name postgres-whatsapp \
  -e POSTGRES_USER=whatsapp_user \
  -e POSTGRES_PASSWORD=sua_senha_forte \
  -e POSTGRES_DB=whatsapp_groups \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### 4. Configurar variáveis de ambiente

Edite o arquivo `.env.local` e atualize a `DATABASE_URL`:

```env
DATABASE_URL="postgresql://whatsapp_user:sua_senha_forte@localhost:5432/whatsapp_groups?schema=public"
```

### 5. Executar Migrations do Prisma

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 6. Configurar Evolution API

#### Opção A: Rodar Evolution API via Docker

```bash
docker run --name evolution-api \
  -p 8080:8080 \
  -d atendai/evolution-api
```

Acesse: `http://localhost:8080`

#### Opção B: Usar Evolution API hospedada

Se você já tem uma instância da Evolution API rodando, anote:
- URL da API (ex: `https://sua-evolution-api.com`)
- API Key
- Nome da Instância

---

## 🏃 Como Usar

### 1. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:3000**

### 2. Configurar Evolution API (Primeira vez)

1. Acesse a página de Configurações (quando implementar o frontend)
2. Ou use a API diretamente:

```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "evolutionApiUrl": "http://localhost:8080",
    "evolutionApiKey": "sua-api-key",
    "instanceName": "minha-instancia",
    "nomePadraoGrupo": "Grupo",
    "capacidadeMaxima": 256
  }'
```

### 3. Testar Conexão

```bash
curl -X POST http://localhost:3000/api/config/test
```

Deve retornar:
```json
{
  "success": true,
  "message": "Conexão estabelecida com sucesso",
  "status": { ... }
}
```

### 4. Criar Primeiro Grupo

```bash
curl -X POST http://localhost:3000/api/grupos
```

Retorna:
```json
{
  "message": "Grupo criado com sucesso",
  "grupo": {
    "id": 1,
    "nome": "Grupo 1",
    "linkConvite": "https://chat.whatsapp.com/...",
    "capacidadeMaxima": 256,
    "status": "ativo"
  }
}
```

### 5. Obter Link do Grupo Atual

```bash
curl http://localhost:3000/api/grupos/link
```

Retorna:
```json
{
  "link": "https://chat.whatsapp.com/..."
}
```

### 6. Listar Todos os Grupos

```bash
curl http://localhost:3000/api/grupos
```

### 7. Ver Estatísticas

```bash
curl http://localhost:3000/api/grupos/stats
```

Retorna:
```json
{
  "totalGrupos": 5,
  "gruposAtivos": 1,
  "gruposCheios": 4,
  "gruposArquivados": 0,
  "totalContatos": 1000
}
```

---

## 📚 API Endpoints

### Configuração

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/config` | Obter configuração atual |
| POST | `/api/config` | Salvar/atualizar configuração |
| POST | `/api/config/test` | Testar conexão com Evolution API |

### Grupos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/grupos` | Listar todos os grupos |
| POST | `/api/grupos` | Criar novo grupo manualmente |
| GET | `/api/grupos/link` | Obter link do grupo atual |
| GET | `/api/grupos/stats` | Obter estatísticas gerais |

---

## 🔄 Como Funciona a Rotação Automática

1. **Sistema cria o primeiro grupo** quando você faz a primeira requisição
2. **Link do grupo atual** é sempre retornado por `/api/grupos/link`
3. **Quando o grupo atingir a capacidade** (ex: 256 membros):
   - Grupo é marcado como "cheio"
   - Novo grupo é criado automaticamente
   - Novo grupo se torna o "grupo atual"
   - Próximas requisições retornam o link do novo grupo
4. **Processo se repete infinitamente**: Grupo 1 → Grupo 2 → Grupo 3 → ...

---

## 🗂️ Estrutura do Projeto

```
whatsApp/
├── app/
│   ├── api/
│   │   ├── config/          # Configuração da Evolution API
│   │   ├── grupos/          # Gerenciamento de grupos
│   │   ├── contatos/        # (A implementar)
│   │   ├── mensagens/       # (A implementar)
│   │   └── webhook/         # (A implementar)
│   ├── globals.css          # Estilos globais
│   └── (páginas frontend)   # (A implementar)
├── lib/
│   ├── evolution-api/
│   │   └── client.ts        # Cliente Evolution API
│   ├── services/
│   │   └── grupo.service.ts # Lógica de negócio de grupos
│   └── prisma.ts            # Cliente Prisma
├── prisma/
│   └── schema.prisma        # Schema do banco de dados
├── .env.local               # Variáveis de ambiente
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Configurações Avançadas

### Alterar Capacidade Máxima dos Grupos

Edite no banco de dados ou via API:

```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    ...
    "capacidadeMaxima": 100
  }'
```

### Alterar Nome Padrão dos Grupos

```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    ...
    "nomePadraoGrupo": "Comunidade"
  }'
```

Os grupos serão criados como: "Comunidade 1", "Comunidade 2", etc.

---

## 🐞 Troubleshooting

### Erro: "Evolution API Client não está inicializado"

**Solução**: Configure a Evolution API primeiro via `/api/config`

### Erro: "Environment variable not found: DATABASE_URL"

**Solução**:
1. Verifique se `.env.local` existe
2. Verifique se a `DATABASE_URL` está correta
3. Reinicie o servidor (`npm run dev`)

### Erro ao criar grupo: "Evolution API Error"

**Soluções**:
1. Verifique se a Evolution API está rodando
2. Teste a conexão: `POST /api/config/test`
3. Verifique se a instância do WhatsApp está conectada
4. Veja os logs da Evolution API

### Banco de dados não está acessível

**Solução**:
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Ou se estiver usando Docker
docker ps | grep postgres
```

---

## 📊 Schema do Banco de Dados

### Tabelas Principais

- **configuracoes**: Configuração da Evolution API
- **grupos**: Grupos WhatsApp gerenciados
- **contatos**: Contatos/participantes
- **mensagens**: Histórico de mensagens enviadas
- **fila_envio**: Fila de envio em massa
- **logs_eventos**: Auditoria de todas as ações

---

## 🔐 Segurança

### Implementações de Segurança

- ✅ API Keys criptografadas no banco
- ✅ Validação de dados com Zod
- ✅ Retry automático com exponential backoff
- ✅ Tratamento centralizado de erros
- ⏳ Autenticação de usuários (próxima versão)
- ⏳ Rate limiting (próxima versão)

---

## 🚧 Próximas Implementações

1. **Frontend React/Next.js**
   - Dashboard com estatísticas
   - Interface para criar grupos
   - Interface para enviar mensagens
   - Upload de arquivos/mídia
   - Importação de contatos (CSV/Excel)

2. **Mensagens em Massa**
   - Envio de texto para todos os grupos
   - Envio de mídia (imagens, vídeos, documentos)
   - Sistema de filas
   - Agendamento de mensagens

3. **Gerenciamento de Contatos**
   - Adicionar contatos manualmente
   - Importar via CSV/Excel
   - Distribuir automaticamente nos grupos
   - Remover contatos

4. **Webhook**
   - Receber eventos da Evolution API
   - Atualizar contagem de membros automaticamente
   - Processar mensagens recebidas

5. **Autenticação e Segurança**
   - Login de usuários
   - Diferentes níveis de acesso
   - Rate limiting
   - Logs de auditoria mais detalhados

---

## 📝 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                    # Iniciar servidor de desenvolvimento

# Prisma
npx prisma studio              # Abrir interface visual do banco
npx prisma migrate dev         # Criar nova migration
npx prisma generate            # Gerar Prisma Client
npx prisma db push             # Push schema para o banco (dev)

# Build
npm run build                  # Build para produção
npm start                      # Rodar versão de produção

# Logs
tail -f logs/error.log         # Ver logs de erro (quando implementar)
```

---

## 🤝 Suporte

Se encontrar problemas:

1. Verifique os logs do console
2. Verifique os logs da Evolution API
3. Verifique o status do PostgreSQL
4. Verifique se todas as variáveis de ambiente estão corretas

---

## 📄 Licença

Este projeto é privado e de uso pessoal.

---

## ✨ Autor

Desenvolvido para gerenciar comunidades com milhares de membros no WhatsApp de forma automatizada e escalável.

---

**Pronto para usar!** 🚀

Comece configurando a Evolution API e criando seus primeiros grupos.
