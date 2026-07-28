-- ============================================================================
-- SECURITY: Enable RLS (Row Level Security) nas tabelas da aplicação
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
-- (bucket fotos-saida), subsistema separado que não é afetado por políticas
-- de tabela. Por isso NÃO criamos policies: sem policy, anon e authenticated
-- ficam sem nenhum acesso, que é exatamente o desejado.
--
-- A migration é defensiva por dois motivos:
--
--  1. Tabelas ausentes. Nem todo modelo do schema.prisma tem tabela no banco
--     (`webhooks` é declarado no schema mas nunca foi criado por migration
--     alguma). Referenciar uma tabela inexistente aborta a migration inteira
--     com 42P01 — `DROP POLICY IF EXISTS` protege contra a policy ausente,
--     não contra a tabela ausente.
--
--  2. Reexecução. A primeira versão desta migration falhou no meio, deixando
--     policies soltas. Aqui elas são removidas antes de habilitar o RLS.
-- ============================================================================

DO $$
DECLARE
  tabela  text;
  pol     record;
  tabelas text[] := ARRAY[
    'users', 'sessions', 'portarias', 'registros', 'ocorrencias', 'webhooks',
    'audit_logs', 'configuracoes', 'contatos_notificacao', 'notificacoes_setor',
    'api_keys', 'agendamentos', 'empresas', 'videos_universidade'
  ];
BEGIN
  FOREACH tabela IN ARRAY tabelas LOOP
    IF to_regclass(format('public.%I', tabela)) IS NULL THEN
      RAISE NOTICE 'RLS: tabela % nao existe no banco, ignorando', tabela;
      CONTINUE;
    END IF;

    -- Remove qualquer policy existente. Estas tabelas não têm policy
    -- intencional: o acesso legítimo vem do dono (Prisma), que ignora RLS.
    FOR pol IN
      SELECT policyname
        FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = tabela
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, tabela);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabela);
  END LOOP;
END $$;

-- ============================================================================
-- PERFORMANCE: Índices de cobertura para Foreign Keys sem índice
-- ============================================================================
-- Mesma proteção: pula a entrada se a tabela ou a coluna não existir.

DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('agendamentos',        'criado_por_id',       'idx_agendamentos_criado_por'),
      ('agendamentos',        'aprovado_por_id',     'idx_agendamentos_aprovado_por'),
      ('agendamentos',        'portaria_id',         'idx_agendamentos_portaria'),
      ('agendamentos',        'empresa_id',          'idx_agendamentos_empresa'),
      ('registros',           'portaria_id',         'idx_registros_portaria'),
      ('registros',           'operador_entrada_id', 'idx_registros_operador_entrada'),
      ('registros',           'operador_saida_id',   'idx_registros_operador_saida'),
      ('sessions',            'user_id',             'idx_sessions_user'),
      ('ocorrencias',         'registrado_por_id',   'idx_ocorrencias_registrado_por'),
      ('api_keys',            'criado_por_id',       'idx_api_keys_criado_por'),
      ('audit_logs',          'user_id',             'idx_audit_logs_user'),
      ('videos_universidade', 'criado_por_id',       'idx_videos_universidade_criado_por')
    ) AS t(tabela, coluna, indice)
  LOOP
    IF to_regclass(format('public.%I', item.tabela)) IS NULL THEN
      RAISE NOTICE 'Indice: tabela % nao existe, ignorando', item.tabela;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = item.tabela
         AND column_name  = item.coluna
    ) THEN
      RAISE NOTICE 'Indice: coluna %.% nao existe, ignorando', item.tabela, item.coluna;
      CONTINUE;
    END IF;

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
      item.indice, item.tabela, item.coluna
    );
  END LOOP;
END $$;

-- NOTA: contatos_notificacao.usuario_id não aparece na lista acima porque a
-- migration 20260727000006 já cria contatos_notificacao_usuario_id_idx sobre
-- essa coluna — um segundo índice seria redundante.

-- ============================================================================
-- NOTA sobre "índices não utilizados"
-- ============================================================================
-- O linter do Supabase apontou 6 índices como não utilizados
-- (ocorrencias_status_idx, ocorrencias_categoria_idx, registros_placa_idx,
-- contatos_notificacao_ativo_idx, agendamentos_token_idx,
-- agendamentos_criado_por_id_idx). Eles NÃO são removidos aqui: esse
-- diagnóstico vem das estatísticas de uso do Postgres (pg_stat_user_indexes),
-- zeradas em um banco recém-criado/restaurado. Vários cobrem filtros reais da
-- aplicação (busca por placa, filtro de ocorrências por status/categoria).
-- Removê-los agora degradaria as consultas sem ganho. Reavaliar após algumas
-- semanas de uso em produção.
--
-- Além disso são declarados no schema.prisma (@@index), então removê-los só no
-- SQL criaria divergência entre schema e banco.

-- ============================================================================
-- Storage (ação manual no Console Supabase)
-- ============================================================================
-- O bucket `fotos-saida` tem uma policy pública que permite LISTAR os arquivos.
-- Remova essa policy no Console (Storage → fotos-saida → Policies) mantendo
-- apenas o acesso por URL direta. Policies de Storage não podem ser alteradas
-- por migration porque storage.objects pertence ao papel supabase_admin.
