ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "troca_senha_obrigatoria" BOOLEAN NOT NULL DEFAULT false;
