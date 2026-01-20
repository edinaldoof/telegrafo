-- CreateTable
CREATE TABLE "configuracoes" (
    "id" SERIAL NOT NULL,
    "evolution_api_url" TEXT NOT NULL,
    "evolution_api_key" TEXT NOT NULL,
    "instance_name" TEXT NOT NULL,
    "nome_padrao_grupo" TEXT NOT NULL DEFAULT 'Grupo',
    "capacidade_maxima" INTEGER NOT NULL DEFAULT 256,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos" (
    "id" SERIAL NOT NULL,
    "whatsapp_group_id" TEXT,
    "numero_grupo" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "link_convite" TEXT,
    "total_membros" INTEGER NOT NULL DEFAULT 0,
    "capacidade_maxima" INTEGER NOT NULL DEFAULT 256,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "eh_grupo_atual" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos" (
    "id" SERIAL NOT NULL,
    "numero_whatsapp" TEXT NOT NULL,
    "nome_contato" TEXT,
    "grupo_id" INTEGER,
    "data_adicao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "conteudo" TEXT,
    "caminho_arquivo" TEXT,
    "nome_arquivo" TEXT,
    "mime_type" TEXT,
    "grupo_ids" INTEGER[],
    "total_grupos" INTEGER NOT NULL,
    "total_enviados" INTEGER NOT NULL DEFAULT 0,
    "total_erros" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fila_envio" (
    "id" SERIAL NOT NULL,
    "mensagem_id" INTEGER NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro_mensagem" TEXT,
    "enviado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fila_envio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_eventos" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "grupo_id" INTEGER,
    "descricao" TEXT NOT NULL,
    "dados_json" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_instance_name_key" ON "configuracoes"("instance_name");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_whatsapp_group_id_key" ON "grupos"("whatsapp_group_id");

-- CreateIndex
CREATE INDEX "grupos_status_idx" ON "grupos"("status");

-- CreateIndex
CREATE INDEX "grupos_eh_grupo_atual_idx" ON "grupos"("eh_grupo_atual");

-- CreateIndex
CREATE INDEX "grupos_numero_grupo_idx" ON "grupos"("numero_grupo");

-- CreateIndex
CREATE INDEX "contatos_numero_whatsapp_idx" ON "contatos"("numero_whatsapp");

-- CreateIndex
CREATE INDEX "contatos_grupo_id_idx" ON "contatos"("grupo_id");

-- CreateIndex
CREATE INDEX "mensagens_status_idx" ON "mensagens"("status");

-- CreateIndex
CREATE INDEX "mensagens_enviado_em_idx" ON "mensagens"("enviado_em");

-- CreateIndex
CREATE INDEX "fila_envio_status_idx" ON "fila_envio"("status");

-- CreateIndex
CREATE INDEX "fila_envio_mensagem_id_idx" ON "fila_envio"("mensagem_id");

-- CreateIndex
CREATE INDEX "fila_envio_grupo_id_idx" ON "fila_envio"("grupo_id");

-- CreateIndex
CREATE INDEX "logs_eventos_tipo_idx" ON "logs_eventos"("tipo");

-- CreateIndex
CREATE INDEX "logs_eventos_criado_em_idx" ON "logs_eventos"("criado_em");

-- AddForeignKey
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_envio" ADD CONSTRAINT "fila_envio_mensagem_id_fkey" FOREIGN KEY ("mensagem_id") REFERENCES "mensagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_envio" ADD CONSTRAINT "fila_envio_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_eventos" ADD CONSTRAINT "logs_eventos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
