-- Adiciona coluna hora_entrada (momento real de autorização de entrada)
ALTER TABLE "registros" ADD COLUMN IF NOT EXISTS "hora_entrada" TIMESTAMP(3);
