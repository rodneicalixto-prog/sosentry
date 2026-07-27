-- AlterTable contatos_notificacao: add usuario cascata
ALTER TABLE "contatos_notificacao" ADD COLUMN "usuario_id" TEXT;
ALTER TABLE "contatos_notificacao" ADD COLUMN "setor" TEXT;

-- Add foreign key constraint
ALTER TABLE "contatos_notificacao" ADD CONSTRAINT "contatos_notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indices
CREATE INDEX "contatos_notificacao_usuario_id_idx" ON "contatos_notificacao"("usuario_id");

-- AlterTable agendamentos: add fila liberacao fields
ALTER TABLE "agendamentos" ADD COLUMN "razao_social" TEXT;
ALTER TABLE "agendamentos" ADD COLUMN "cnpj_empresa" TEXT;
ALTER TABLE "agendamentos" ADD COLUMN "liberacao_status" TEXT NOT NULL DEFAULT 'aguardando';
ALTER TABLE "agendamentos" ADD COLUMN "liberado_em" TIMESTAMP(3);
