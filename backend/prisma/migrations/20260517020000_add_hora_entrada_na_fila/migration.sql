-- Adiciona valor 'na_fila' ao enum StatusRegistro
-- NOTA: precisa rodar fora de transação no PostgreSQL
ALTER TYPE "StatusRegistro" ADD VALUE IF NOT EXISTS 'na_fila';

-- Adiciona coluna hora_entrada (momento real de autorização de entrada)
ALTER TABLE "registros" ADD COLUMN IF NOT EXISTS "hora_entrada" TIMESTAMP(3);
