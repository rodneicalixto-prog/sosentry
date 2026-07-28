-- ============================================================================
-- SECURITY: Enable RLS (Row Level Security) on all application tables
-- ============================================================================
--
-- Contexto: o backend acessa o banco via Prisma com o papel `postgres`, que é
-- o DONO das tabelas. No PostgreSQL o dono da tabela NÃO é afetado por RLS
-- (a menos que FORCE ROW LEVEL SECURITY seja usado), portanto habilitar RLS
-- não altera em nada o funcionamento da aplicação.
--
-- O que RLS bloqueia aqui é o acesso via PostgREST (API REST do Supabase) com
-- as chaves `anon` / `authenticated` — que hoje leem qualquer tabela sem
-- autenticação. O frontend usa a chave anon APENAS para o Storage
-- (bucket fotos-saida), que é um subsistema separado e não é afetado por
-- políticas de tabela. Por isso NÃO criamos policies permissivas: sem policy,
-- anon e authenticated ficam sem nenhum acesso, que é exatamente o desejado.
--
-- Idempotente: remove as policies criadas pela execução parcial anterior
-- (a migration falhou no meio por usar `FOR INSERT USING`, sintaxe inválida).
-- ============================================================================

-- Limpeza das policies permissivas da tentativa anterior ----------------------
DROP POLICY IF EXISTS "Users can read all"              ON "users";
DROP POLICY IF EXISTS "Users can update own"            ON "users";
DROP POLICY IF EXISTS "Sessions private"                ON "sessions";
DROP POLICY IF EXISTS "Registros can be read"           ON "registros";
DROP POLICY IF EXISTS "Registros can be created"        ON "registros";
DROP POLICY IF EXISTS "Registros can be updated"        ON "registros";
DROP POLICY IF EXISTS "Portarias can be read"           ON "portarias";
DROP POLICY IF EXISTS "Ocorrencias can be read"         ON "ocorrencias";
DROP POLICY IF EXISTS "Ocorrencias can be created"      ON "ocorrencias";
DROP POLICY IF EXISTS "Ocorrencias can be updated"      ON "ocorrencias";
DROP POLICY IF EXISTS "Webhooks admin only"             ON "webhooks";
DROP POLICY IF EXISTS "Webhooks admin create"           ON "webhooks";
DROP POLICY IF EXISTS "Webhooks admin update"           ON "webhooks";
DROP POLICY IF EXISTS "Audit logs can be read"          ON "audit_logs";
DROP POLICY IF EXISTS "Audit logs can be created"       ON "audit_logs";
DROP POLICY IF EXISTS "Configurations can be read"      ON "configuracoes";
DROP POLICY IF EXISTS "Configurations admin only"       ON "configuracoes";
DROP POLICY IF EXISTS "Contatos can be read"            ON "contatos_notificacao";
DROP POLICY IF EXISTS "Contatos can be created"         ON "contatos_notificacao";
DROP POLICY IF EXISTS "Contatos can be updated"         ON "contatos_notificacao";
DROP POLICY IF EXISTS "Notificacoes setor can be read"    ON "notificacoes_setor";
DROP POLICY IF EXISTS "Notificacoes setor can be created" ON "notificacoes_setor";
DROP POLICY IF EXISTS "Notificacoes setor can be updated" ON "notificacoes_setor";
DROP POLICY IF EXISTS "Api keys admin only"             ON "api_keys";
DROP POLICY IF EXISTS "Api keys admin create"           ON "api_keys";
DROP POLICY IF EXISTS "Agendamentos can be read"        ON "agendamentos";
DROP POLICY IF EXISTS "Agendamentos can be created"     ON "agendamentos";
DROP POLICY IF EXISTS "Agendamentos can be updated"     ON "agendamentos";
DROP POLICY IF EXISTS "Empresas can be read"            ON "empresas";
DROP POLICY IF EXISTS "Empresas can be created"         ON "empresas";
DROP POLICY IF EXISTS "Empresas can be updated"         ON "empresas";
DROP POLICY IF EXISTS "Videos can be read"              ON "videos_universidade";

-- Habilitar RLS ---------------------------------------------------------------
ALTER TABLE "users"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portarias"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "registros"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ocorrencias"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhooks"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "configuracoes"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contatos_notificacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notificacoes_setor"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agendamentos"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "empresas"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "videos_universidade"  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PERFORMANCE: Índices de cobertura para Foreign Keys sem índice
-- ============================================================================

CREATE INDEX IF NOT EXISTS "idx_agendamentos_criado_por"   ON "agendamentos"("criado_por_id");
CREATE INDEX IF NOT EXISTS "idx_agendamentos_aprovado_por" ON "agendamentos"("aprovado_por_id");
CREATE INDEX IF NOT EXISTS "idx_agendamentos_portaria"     ON "agendamentos"("portaria_id");
CREATE INDEX IF NOT EXISTS "idx_agendamentos_empresa"      ON "agendamentos"("empresa_id");

CREATE INDEX IF NOT EXISTS "idx_registros_portaria"          ON "registros"("portaria_id");
CREATE INDEX IF NOT EXISTS "idx_registros_operador_entrada"  ON "registros"("operador_entrada_id");
CREATE INDEX IF NOT EXISTS "idx_registros_operador_saida"    ON "registros"("operador_saida_id");

CREATE INDEX IF NOT EXISTS "idx_sessions_user"                  ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_ocorrencias_registrado_por"     ON "ocorrencias"("registrado_por_id");
CREATE INDEX IF NOT EXISTS "idx_api_keys_criado_por"            ON "api_keys"("criado_por_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user"                ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_videos_universidade_criado_por" ON "videos_universidade"("criado_por_id");
CREATE INDEX IF NOT EXISTS "idx_contatos_notificacao_usuario"   ON "contatos_notificacao"("usuario_id");

-- ============================================================================
-- NOTA sobre "índices não utilizados"
-- ============================================================================
-- O linter do Supabase apontou 6 índices como não utilizados
-- (ocorrencias_status_idx, ocorrencias_categoria_idx, registros_placa_idx,
-- contatos_notificacao_ativo_idx, agendamentos_token_idx,
-- agendamentos_criado_por_id_idx). Eles NÃO são removidos aqui: esse
-- diagnóstico vem das estatísticas de uso do Postgres (pg_stat_user_indexes),
-- que estão zeradas em um banco recém-criado/restaurado. Vários deles cobrem
-- filtros reais da aplicação (busca por placa, filtro de ocorrências por
-- status/categoria). Removê-los agora degradaria as consultas sem ganho.
-- Reavaliar depois de algumas semanas de uso em produção.
--
-- Além disso, esses índices são declarados no schema.prisma (@@index), então
-- removê-los apenas no SQL criaria divergência entre schema e banco.

-- ============================================================================
-- Storage (ação manual no Console Supabase)
-- ============================================================================
-- O bucket `fotos-saida` tem uma policy pública que permite LISTAR os arquivos.
-- Remova essa policy no Console (Storage → fotos-saida → Policies) mantendo
-- apenas o acesso por URL direta. Policies de Storage não podem ser alteradas
-- por migration porque a tabela storage.objects pertence ao papel supabase_admin.
