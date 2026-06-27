-- Add AGUARDANDO_LIBERACAO to AgendamentoStatus enum
-- Must be done before NA_PORTARIA in logical ordering
ALTER TYPE "AgendamentoStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_LIBERACAO';
