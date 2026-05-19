CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "configuracoes_chave_key" ON "configuracoes"("chave");

CREATE TABLE "notificacoes_setor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "criterio_tipo" TEXT NOT NULL,
    "criterio_valor" TEXT NOT NULL,
    "eventos" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notificacoes_setor_pkey" PRIMARY KEY ("id")
);
