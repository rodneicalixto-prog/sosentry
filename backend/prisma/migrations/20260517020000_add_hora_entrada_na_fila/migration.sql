-- Adiciona valor 'na_fila' ao enum StatusRegistro
ALTER TYPE "StatusRegistro" ADD VALUE IF NOT EXISTS 'na_fila' BEFORE 'na_empresa';

-- Adiciona coluna hora_entrada (momento real de autorização de entrada)
ALTER TABLE "registros" ADD COLUMN IF NOT EXISTS "hora_entrada" TIMESTAMP(3);

-- Atualiza o default de status para na_fila
ALTER TABLE "registros" ALTER COLUMN "status" SET DEFAULT 'na_fila';
