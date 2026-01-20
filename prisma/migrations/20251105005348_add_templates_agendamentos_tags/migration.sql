-- AlterTable
ALTER TABLE "contatos" ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "dados_extras" JSONB,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "empresa" TEXT;

-- CreateTable
CREATE TABLE "providers" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "conteudo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'texto',
    "categoria" TEXT,
    "provider_id" INTEGER,
    "media_url" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_variaveis" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "exemplo" TEXT,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "template_variaveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "template_id" INTEGER,
    "conteudo_personalizado" TEXT,
    "contatos_ids" INTEGER[],
    "filtros" JSONB,
    "attachment_id" INTEGER,
    "data_agendamento" TIMESTAMP(3) NOT NULL,
    "fuso_horario" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "resultado" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executado_em" TIMESTAMP(3),

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "caminho_local" TEXT,
    "url" TEXT,
    "tipo_mime" TEXT NOT NULL,
    "tamanho" BIGINT NOT NULL,
    "largura" INTEGER,
    "altura" INTEGER,
    "duracao" INTEGER,
    "uploaded_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contato_tags" (
    "contato_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contato_tags_pkey" PRIMARY KEY ("contato_id","tag_id")
);

-- CreateIndex
CREATE INDEX "templates_ativo_idx" ON "templates"("ativo");

-- CreateIndex
CREATE INDEX "templates_tipo_idx" ON "templates"("tipo");

-- CreateIndex
CREATE INDEX "agendamentos_status_idx" ON "agendamentos"("status");

-- CreateIndex
CREATE INDEX "agendamentos_data_agendamento_idx" ON "agendamentos"("data_agendamento");

-- CreateIndex
CREATE UNIQUE INDEX "tags_nome_key" ON "tags"("nome");

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_variaveis" ADD CONSTRAINT "template_variaveis_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contato_tags" ADD CONSTRAINT "contato_tags_contato_id_fkey" FOREIGN KEY ("contato_id") REFERENCES "contatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contato_tags" ADD CONSTRAINT "contato_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
