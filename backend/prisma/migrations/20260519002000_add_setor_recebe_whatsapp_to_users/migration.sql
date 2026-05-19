-- AlterTable: adiciona setor e recebe_whatsapp à tabela users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "setor" TEXT,
  ADD COLUMN IF NOT EXISTS "recebe_whatsapp" BOOLEAN NOT NULL DEFAULT false;
