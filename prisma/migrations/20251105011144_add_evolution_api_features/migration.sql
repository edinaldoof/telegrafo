-- CreateTable
CREATE TABLE "instances" (
    "id" SERIAL NOT NULL,
    "instance_name" TEXT NOT NULL,
    "display_name" TEXT,
    "numero" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "qr_code" TEXT,
    "qr_code_url" TEXT,
    "profile_pic_url" TEXT,
    "config" JSONB,
    "webhook_url" TEXT,
    "webhook_by_events" BOOLEAN NOT NULL DEFAULT false,
    "webhook_base64" BOOLEAN NOT NULL DEFAULT true,
    "webhook_events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chatwoot_config" JSONB,
    "typebot_config" JSONB,
    "dify_config" JSONB,
    "openai_config" JSONB,
    "rabbitmq_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rabbitmq_events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "websocket_enabled" BOOLEAN NOT NULL DEFAULT false,
    "websocket_events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "ultima_conexao" TIMESTAMP(3),

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "evento" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "headers" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimo_status" INTEGER,
    "ultimo_erro" TEXT,
    "ultimo_disparo" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_instance" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "remote_jid" TEXT NOT NULL,
    "conteudo" JSONB NOT NULL,
    "message_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "erro" TEXT,
    "metadata" JSONB,
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatwoot_integrations" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER,
    "account_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sign_msg" BOOLEAN NOT NULL DEFAULT false,
    "reopen_conversation" BOOLEAN NOT NULL DEFAULT false,
    "conversation_pending" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatwoot_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "typebot_integrations" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER,
    "url" TEXT NOT NULL,
    "typebot" TEXT NOT NULL,
    "expire" INTEGER,
    "keyword_finish" TEXT,
    "delay_message" INTEGER,
    "unknown_message" TEXT,
    "listening_from_me" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "typebot_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openai_integrations" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER,
    "api_key" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "max_tokens" INTEGER NOT NULL DEFAULT 1000,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "system_message" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "openai_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_history" (
    "id" SERIAL NOT NULL,
    "instance_name" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "detalhes" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instances_instance_name_key" ON "instances"("instance_name");

-- CreateIndex
CREATE INDEX "instances_status_idx" ON "instances"("status");

-- CreateIndex
CREATE INDEX "instances_ativo_idx" ON "instances"("ativo");

-- CreateIndex
CREATE INDEX "webhooks_instance_id_idx" ON "webhooks"("instance_id");

-- CreateIndex
CREATE INDEX "webhooks_evento_idx" ON "webhooks"("evento");

-- CreateIndex
CREATE INDEX "mensagens_instance_instance_id_idx" ON "mensagens_instance"("instance_id");

-- CreateIndex
CREATE INDEX "mensagens_instance_status_idx" ON "mensagens_instance"("status");

-- CreateIndex
CREATE INDEX "mensagens_instance_remote_jid_idx" ON "mensagens_instance"("remote_jid");

-- CreateIndex
CREATE INDEX "connection_history_instance_name_idx" ON "connection_history"("instance_name");

-- CreateIndex
CREATE INDEX "connection_history_timestamp_idx" ON "connection_history"("timestamp");

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_instance" ADD CONSTRAINT "mensagens_instance_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
