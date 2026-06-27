-- CreateEnum
CREATE TYPE "AgendamentoStatus" AS ENUM ('AGUARDANDO_NF', 'NF_RECEBIDA', 'APROVADO', 'NA_PORTARIA', 'CONCLUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "agendamentos" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "token"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "token_expira_em" TIMESTAMP(3) NOT NULL,
    "status"          "AgendamentoStatus" NOT NULL DEFAULT 'AGUARDANDO_NF',
    "criado_por_id"   TEXT NOT NULL,
    "departamento"    TEXT NOT NULL,
    "pedido_interno"  TEXT,
    "empresa"         TEXT,
    "cnpj"            TEXT,
    "motorista"       TEXT,
    "cpf_motorista"   TEXT,
    "placa"           TEXT,
    "tipo_veiculo"    TEXT,
    "numero_nf"       TEXT,
    "valor_nf"        DECIMAL(15,2),
    "nf_arquivo_url"  TEXT,
    "data_entrega"    TIMESTAMP(3),
    "horario_pref"    TEXT,
    "observacoes"     TEXT,
    "aprovado_por_id" TEXT,
    "aprovado_em"     TIMESTAMP(3),
    "chegada_em"      TIMESTAMP(3),
    "registro_id"     TEXT,
    "portaria_id"     TEXT NOT NULL,
    "criado_em"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agendamentos_token_key" ON "agendamentos"("token");
CREATE INDEX "agendamentos_status_idx" ON "agendamentos"("status");
CREATE INDEX "agendamentos_token_idx" ON "agendamentos"("token");
CREATE INDEX "agendamentos_criado_por_id_idx" ON "agendamentos"("criado_por_id");

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_criado_por_id_fkey"
    FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_aprovado_por_id_fkey"
    FOREIGN KEY ("aprovado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_portaria_id_fkey"
    FOREIGN KEY ("portaria_id") REFERENCES "portarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
