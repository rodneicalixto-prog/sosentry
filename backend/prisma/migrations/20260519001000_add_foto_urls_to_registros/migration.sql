-- AlterTable
ALTER TABLE "registros"
  DROP COLUMN IF EXISTS "lacre",
  ADD COLUMN IF NOT EXISTS "lacre_image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "foto_carroceria_url" TEXT;
