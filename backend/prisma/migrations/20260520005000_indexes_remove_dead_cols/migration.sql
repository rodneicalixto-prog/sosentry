-- Remove colunas foto_url e foto_thumb_url que nunca foram usadas (substituídas por lacre_image_url e foto_carroceria_url)
ALTER TABLE "registros"
  DROP COLUMN IF EXISTS "foto_url",
  DROP COLUMN IF EXISTS "foto_thumb_url";

-- Índice em audit_logs.entidade_id para queries por registro específico
CREATE INDEX IF NOT EXISTS "audit_logs_entidade_id_idx" ON "audit_logs"("entidade_id");

-- Índice composto em videos_universidade para o query padrão (ativo + destaque + ordem)
CREATE INDEX IF NOT EXISTS "videos_universidade_ativo_destaque_ordem_idx" ON "videos_universidade"("ativo", "destaque", "ordem");
