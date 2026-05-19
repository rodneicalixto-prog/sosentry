-- CreateTable
CREATE TABLE IF NOT EXISTS "contatos_notificacao" (
  "id"         TEXT NOT NULL,
  "nome"       TEXT NOT NULL,
  "telefone"   TEXT NOT NULL,
  "eventos"    TEXT[] NOT NULL DEFAULT '{}',
  "ativo"      BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contatos_notificacao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contatos_notificacao_ativo_idx" ON "contatos_notificacao"("ativo");
