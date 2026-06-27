-- Add email column to notificacoes_setor (nullable, for alerting via email)
ALTER TABLE "notificacoes_setor" ADD COLUMN "email" TEXT;
