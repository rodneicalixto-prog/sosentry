-- Add data_saida and AGUARDANDO_LIBERACAO support
ALTER TABLE "agendamentos" ADD COLUMN IF NOT EXISTS "data_saida" TIMESTAMP(3);
