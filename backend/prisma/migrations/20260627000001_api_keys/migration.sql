-- CreateTable
CREATE TABLE "api_keys" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "nome"         TEXT NOT NULL,
    "chave"        TEXT NOT NULL,
    "descricao"    TEXT,
    "escopos"      TEXT[] NOT NULL DEFAULT '{}',
    "ativo"        BOOLEAN NOT NULL DEFAULT true,
    "ultimo_uso"   TIMESTAMP(3),
    "criado_por_id" TEXT NOT NULL,
    "criado_em"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "api_keys_chave_key" ON "api_keys"("chave");

ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_criado_por_id_fkey"
    FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
