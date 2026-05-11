-- CreateEnum
CREATE TYPE "Role" AS ENUM ('superadmin', 'admin', 'supervisor', 'operador');

-- CreateEnum
CREATE TYPE "StatusRegistro" AS ENUM ('na_empresa', 'saiu', 'cancelado');

-- CreateEnum
CREATE TYPE "TipoPortaria" AS ENUM ('transportes', 'pedestres');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'operador',
    "turno" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portarias" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoPortaria" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "portaria_id" TEXT NOT NULL,
    "operador_entrada_id" TEXT NOT NULL,
    "operador_saida_id" TEXT,
    "nome_motorista" TEXT NOT NULL,
    "cpf_motorista" TEXT NOT NULL,
    "telefone_motorista" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipo_veiculo" TEXT NOT NULL,
    "empresa" TEXT,
    "nota_fiscal" TEXT,
    "tipo_operacao" TEXT NOT NULL,
    "tipo_material" TEXT,
    "obs_material" TEXT,
    "obs_geral" TEXT,
    "tem_ajudante" BOOLEAN NOT NULL DEFAULT false,
    "ajudante_nome" TEXT,
    "ajudante_cpf" TEXT,
    "ajudante_telefone" TEXT,
    "ajudante_rg" TEXT,
    "data_entrada" TIMESTAMP(3) NOT NULL,
    "hora_saida" TIMESTAMP(3),
    "foto_url" TEXT,
    "foto_thumb_url" TEXT,
    "status" "StatusRegistro" NOT NULL DEFAULT 'na_empresa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT,
    "detalhes" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "portarias_numero_key" ON "portarias"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "registros_protocolo_key" ON "registros"("protocolo");

-- CreateIndex
CREATE INDEX "registros_protocolo_idx" ON "registros"("protocolo");

-- CreateIndex
CREATE INDEX "registros_placa_idx" ON "registros"("placa");

-- CreateIndex
CREATE INDEX "registros_status_idx" ON "registros"("status");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_portaria_id_fkey" FOREIGN KEY ("portaria_id") REFERENCES "portarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_operador_entrada_id_fkey" FOREIGN KEY ("operador_entrada_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_operador_saida_id_fkey" FOREIGN KEY ("operador_saida_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
