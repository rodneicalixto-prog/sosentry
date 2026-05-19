-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "StatusOcorrencia" AS ENUM ('aberta', 'em_analise', 'resolvida', 'encaminhada', 'arquivada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ocorrencias" (
  "id"                TEXT NOT NULL,
  "protocolo"         TEXT NOT NULL,
  "categoria"         TEXT NOT NULL,
  "tipo"              TEXT NOT NULL,
  "local"             TEXT NOT NULL,
  "data_hora"         TIMESTAMP(3) NOT NULL,
  "descricao"         TEXT NOT NULL,
  "envolvidos"        JSONB NOT NULL DEFAULT '[]',
  "testemunhas"       JSONB NOT NULL DEFAULT '[]',
  "acionamentos"      JSONB NOT NULL DEFAULT '[]',
  "danos_materiais"   TEXT,
  "estimativa_danos"  DECIMAL(12,2),
  "anexos"            JSONB NOT NULL DEFAULT '[]',
  "providencias"      TEXT,
  "status"            "StatusOcorrencia" NOT NULL DEFAULT 'aberta',
  "registrado_por_id" TEXT NOT NULL,
  "criado_em"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ocorrencias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ocorrencias_protocolo_key" ON "ocorrencias"("protocolo");
CREATE INDEX IF NOT EXISTS "ocorrencias_status_idx"    ON "ocorrencias"("status");
CREATE INDEX IF NOT EXISTS "ocorrencias_categoria_idx" ON "ocorrencias"("categoria");
CREATE INDEX IF NOT EXISTS "ocorrencias_data_hora_idx" ON "ocorrencias"("data_hora");

ALTER TABLE "ocorrencias" DROP CONSTRAINT IF EXISTS "ocorrencias_registrado_por_id_fkey";
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_registrado_por_id_fkey"
  FOREIGN KEY ("registrado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
