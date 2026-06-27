-- CreateTable
CREATE TABLE "empresas" (
    "id"           TEXT NOT NULL,
    "nome"         TEXT NOT NULL,
    "cnpj"         TEXT,
    "email"        TEXT NOT NULL,
    "whatsapp"     TEXT NOT NULL,
    "contato"      TEXT,
    "observacoes"  TEXT,
    "ativo"        BOOLEAN NOT NULL DEFAULT true,
    "criado_em"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add empresa_id to agendamentos
ALTER TABLE "agendamentos" ADD COLUMN "empresa_id" TEXT;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_empresa_id_fkey"
    FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
