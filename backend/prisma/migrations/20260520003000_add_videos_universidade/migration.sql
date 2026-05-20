CREATE TABLE IF NOT EXISTS "videos_universidade" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "titulo"       TEXT NOT NULL,
  "descricao"    TEXT,
  "categoria"    TEXT NOT NULL DEFAULT 'Geral',
  "video_url"    TEXT NOT NULL,
  "thumb_url"    TEXT,
  "destaque"     BOOLEAN NOT NULL DEFAULT false,
  "ordem"        INTEGER NOT NULL DEFAULT 0,
  "ativo"        BOOLEAN NOT NULL DEFAULT true,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criado_por_id" TEXT,
  CONSTRAINT "videos_universidade_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "videos_universidade_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE SET NULL
);
