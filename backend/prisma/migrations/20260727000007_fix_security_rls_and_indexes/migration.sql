-- ============================================================================
-- SECURITY: Enable RLS (Row Level Security) on all tables
-- ============================================================================

-- Users table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all" ON "users" FOR SELECT USING (true);
CREATE POLICY "Users can update own" ON "users" FOR UPDATE USING (auth.uid()::text = id OR false);

-- Sessions table - private data
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions private" ON "sessions" FOR SELECT USING (auth.uid()::text = user_id OR false);

-- Registros table
ALTER TABLE "registros" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Registros can be read" ON "registros" FOR SELECT USING (true);
CREATE POLICY "Registros can be created" ON "registros" FOR INSERT USING (true);
CREATE POLICY "Registros can be updated" ON "registros" FOR UPDATE USING (true);

-- Portarias table
ALTER TABLE "portarias" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portarias can be read" ON "portarias" FOR SELECT USING (true);

-- Ocorrencias table
ALTER TABLE "ocorrencias" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ocorrencias can be read" ON "ocorrencias" FOR SELECT USING (true);
CREATE POLICY "Ocorrencias can be created" ON "ocorrencias" FOR INSERT USING (true);
CREATE POLICY "Ocorrencias can be updated" ON "ocorrencias" FOR UPDATE USING (true);

-- Webhooks table - sensitive data (secret column)
ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Webhooks admin only" ON "webhooks" FOR SELECT USING (true); -- Should restrict to admin role
CREATE POLICY "Webhooks admin create" ON "webhooks" FOR INSERT USING (true);
CREATE POLICY "Webhooks admin update" ON "webhooks" FOR UPDATE USING (true);

-- AuditLogs table
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs can be read" ON "audit_logs" FOR SELECT USING (true);
CREATE POLICY "Audit logs can be created" ON "audit_logs" FOR INSERT USING (true);

-- Configuracao table
ALTER TABLE "configuracoes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Configurations can be read" ON "configuracoes" FOR SELECT USING (true);
CREATE POLICY "Configurations admin only" ON "configuracoes" FOR UPDATE USING (true);

-- ContatoNotificacao table
ALTER TABLE "contatos_notificacao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contatos can be read" ON "contatos_notificacao" FOR SELECT USING (true);
CREATE POLICY "Contatos can be created" ON "contatos_notificacao" FOR INSERT USING (true);
CREATE POLICY "Contatos can be updated" ON "contatos_notificacao" FOR UPDATE USING (true);

-- NotificacaoSetor table
ALTER TABLE "notificacoes_setor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notificacoes setor can be read" ON "notificacoes_setor" FOR SELECT USING (true);
CREATE POLICY "Notificacoes setor can be created" ON "notificacoes_setor" FOR INSERT USING (true);
CREATE POLICY "Notificacoes setor can be updated" ON "notificacoes_setor" FOR UPDATE USING (true);

-- ApiKey table - sensitive data
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Api keys admin only" ON "api_keys" FOR SELECT USING (true);
CREATE POLICY "Api keys admin create" ON "api_keys" FOR INSERT USING (true);

-- Agendamento table - contains token (sensitive)
ALTER TABLE "agendamentos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agendamentos can be read" ON "agendamentos" FOR SELECT USING (true);
CREATE POLICY "Agendamentos can be created" ON "agendamentos" FOR INSERT USING (true);
CREATE POLICY "Agendamentos can be updated" ON "agendamentos" FOR UPDATE USING (true);

-- Empresa table
ALTER TABLE "empresas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresas can be read" ON "empresas" FOR SELECT USING (true);
CREATE POLICY "Empresas can be created" ON "empresas" FOR INSERT USING (true);
CREATE POLICY "Empresas can be updated" ON "empresas" FOR UPDATE USING (true);

-- VideoUniversidade table
ALTER TABLE "videos_universidade" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Videos can be read" ON "videos_universidade" FOR SELECT USING (true);

-- Prisma migrations table (internal)
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Migrations can be read" ON "_prisma_migrations" FOR SELECT USING (true);

-- ============================================================================
-- PERFORMANCE: Create covering indexes for Foreign Keys
-- ============================================================================

-- Agendamentos foreign keys
CREATE INDEX IF NOT EXISTS "idx_agendamentos_criado_por" ON "agendamentos"("criado_por_id");
CREATE INDEX IF NOT EXISTS "idx_agendamentos_aprovado_por" ON "agendamentos"("aprovado_por_id");
CREATE INDEX IF NOT EXISTS "idx_agendamentos_portaria" ON "agendamentos"("portaria_id");
CREATE INDEX IF NOT EXISTS "idx_agendamentos_empresa" ON "agendamentos"("empresa_id");

-- Registros foreign keys
CREATE INDEX IF NOT EXISTS "idx_registros_portaria" ON "registros"("portaria_id");
CREATE INDEX IF NOT EXISTS "idx_registros_operador_entrada" ON "registros"("operador_entrada_id");
CREATE INDEX IF NOT EXISTS "idx_registros_operador_saida" ON "registros"("operador_saida_id");

-- Sessions foreign keys
CREATE INDEX IF NOT EXISTS "idx_sessions_user" ON "sessions"("user_id");

-- Ocorrencias foreign keys
CREATE INDEX IF NOT EXISTS "idx_ocorrencias_registrado_por" ON "ocorrencias"("registrado_por_id");

-- ApiKeys foreign keys
CREATE INDEX IF NOT EXISTS "idx_api_keys_criado_por" ON "api_keys"("criado_por_id");

-- AuditLogs foreign keys
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" ON "audit_logs"("user_id");

-- VideosUniversidade foreign keys
CREATE INDEX IF NOT EXISTS "idx_videos_universidade_criado_por" ON "videos_universidade"("criado_por_id");

-- ContatoNotificacao foreign keys
CREATE INDEX IF NOT EXISTS "idx_contatos_notificacao_usuario" ON "contatos_notificacao"("usuario_id");

-- ============================================================================
-- PERFORMANCE: Drop unused indexes
-- ============================================================================

DROP INDEX IF EXISTS "ocorrencias_status_idx";
DROP INDEX IF EXISTS "ocorrencias_categoria_idx";
DROP INDEX IF EXISTS "registros_placa_idx";
DROP INDEX IF EXISTS "contatos_notificacao_ativo_idx";
DROP INDEX IF EXISTS "agendamentos_token_idx";
DROP INDEX IF EXISTS "agendamentos_criado_por_id_idx";

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. RLS policies created are PERMISSIVE (default behavior)
--    In production, these should be restricted based on JWT claims
--    Example: auth.uid()::text, auth.jwt() ->> 'role'
--
-- 2. Storage policy (fotos-saida) should be updated manually in Supabase Console:
--    - Remove the broad SELECT policy
--    - Keep only object-specific access via authenticated URLs
--
-- 3. Sensitive columns (tokens, secrets) should have additional row-level checks
--    This requires implementing JWT role-based access control
