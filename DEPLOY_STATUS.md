# Status do deploy — branch `claude/quirky-newton-b5k6s6`

Última atualização: 28/07/2026

Documento de retomada. Descreve o que está pronto, o que está pendente e as
armadilhas já mapeadas. Segredos **não** estão aqui — ficam nos `.env` da VPS.

---

## Onde as coisas estão rodando

| Instância | URL | Como sobe | Banco | Código |
|-----------|-----|-----------|-------|--------|
| **Produção** | `sosentry.openwave.online` | Coolify (Traefik na porta 80/443) | Supabase antigo | `main` |
| **Teste** | `http://187.77.3.213:8090` | `docker compose` em `/opt/sosentry` | Supabase novo | esta branch |

> A VPS roda **Coolify**. A porta 80 pertence ao `coolify-proxy` (Traefik), que
> também serve n8n, Evolution API, georadar, nexofamiliar e o próprio Coolify.
> **Não derrube o Traefik para liberar a porta 80** — derruba tudo isso junto,
> inclusive a Evolution API, que é quem envia as notificações do WhatsApp.
>
> Os containers de produção do SOS Entry são `f1rkfoztl0xwlyiqtys1o9jz_backend`
> e `_frontend`, gerenciados pelo Coolify.

---

## O que foi entregue

### 1. Cascata de contatos de notificação — `a44f57b`

Ao cadastrar quem recebe notificações, um dropdown lista os usuários e
preenche nome, telefone e setor automaticamente. Os campos seguem editáveis.

- `schema.prisma`: `ContatoNotificacao.usuarioId` + `setor`
- `contato.controller.js`: aceita `usuarioId` e copia os dados do usuário
- `Configuracoes.jsx`: dropdown + `handleUsuarioChange()`
- Migration `20260727000006`

**Onde testar:** Admin → Configurações → Novo Contato.

### 2. Fila de liberação de clientes — `a44f57b`, `b1e178f`

Quando o fornecedor envia a nota fiscal pelo link público, o cliente entra
numa fila de aprovação e ganha pré-cadastro automático em Fornecedores.

- `agendamentoPublico.controller.js:72` — cria/reaproveita a `Empresa`
- `agendamento.controller.js` — `filaLiberacao()` e `aprovarLiberacao()`
- `FilaLiberacao.jsx` — dashboard com busca, paginação e botão Liberar
- Rotas: `GET /api/agendamentos/fila/liberacao`, `PATCH /api/agendamentos/:id/liberar-fila`

**Como testar (o pré-cadastro NÃO aparece só abrindo a tela):**

1. Admin → Agendamentos → criar agendamento (gera link público com token)
2. Abrir o link público em aba anônima e preencher a NF **com o CNPJ**
   — a condição de disparo é `if (cnpj && !ag.empresaId)`
3. Conferir Fornecedores (empresa com `Pré-cadastro automático via NF #…`)
   e Fila de Liberação (cliente com status `aguardando`)

### 3. Segurança do Supabase — `595e156`, `be12fc1`, `9153434`

RLS habilitado em 13 tabelas, **sem policies permissivas**. O backend usa
Prisma com o papel `postgres`, dono das tabelas, que não é afetado por RLS —
então a aplicação funciona normalmente enquanto `anon`/`authenticated` ficam
sem acesso via PostgREST. Mais 12 índices de cobertura para FKs.

Detalhes e fases seguintes em `SECURITY_FIXES.md`.

### 4. Remoção do ref hardcoded do Supabase — `780bfdc`

O ref do projeto antigo estava embutido como fallback em 4 arquivos do
frontend e na validação de URL do backend, junto com uma anon key commitada.
Centralizado em `frontend/src/lib/supabaseStorage.js`, agora lendo de
variável de ambiente sem fallback.

---

## Configuração exigida (além do que já existia)

| Arquivo | Variável | Para quê |
|---------|----------|----------|
| `backend/.env` | `SUPABASE_URL` | valida o prefixo das URLs de foto |
| `infra/.env` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | build args do frontend |

**O Vite injeta `VITE_*` em build time.** Trocar a anon key exige
`docker compose build`, não basta `up -d`. Modelos em `infra/.env.example` e
`frontend/.env.example`.

### Conexão com o Supabase

Projetos novos **não têm IPv4** na conexão direta (`db.<ref>.supabase.co`).
Use o pooler nas duas URLs — foi isso que quebrou o deploy por horas:

```env
DATABASE_URL="...@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="...@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
```

Confira `aws-0` vs `aws-1` no painel: Project Settings → Database.
Senha com `@` vira `%40`.

---

## Pendências

### Bloqueante para produção

- [ ] **Redeploy pelo Coolify.** Produção não roda por `docker compose` — o
      `README.md` e o `CLAUDE.md` descrevem um fluxo que não é o real. Apontar
      a app do Coolify para esta branch, adicionar `SUPABASE_URL` no backend e
      os build args `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` no frontend.
- [ ] **Decidir o banco.** Produção está no Supabase antigo e tem os registros
      reais. O projeto novo está vazio. Manter o antigo evita migrar dados —
      basta rodar as migrations novas nele.

### Validação na instância de teste (8090)

- [ ] Login, dashboard e indicador **● Ao vivo**
- [ ] Cascata de contatos
- [ ] Fluxo completo da fila de liberação (passo a passo acima)
- [ ] Upload de foto do lacre — depende do bucket `fotos-saida` existir no
      projeto novo (Storage → New bucket, público). **Ainda não criado.**

### Dívida encontrada no caminho

- [ ] **A tabela `webhooks` não existe.** O modelo `Webhook` está no
      `schema.prisma`, mas nenhuma migration jamais a criou. Controller, rotas,
      tela em Admin → Webhooks e o disparo em entradas/saídas existem, mas
      qualquer chamada falha com `42P01`. **As integrações com n8n nunca
      funcionaram.** A migration de RLS agora pula a tabela sem quebrar. Falta
      escrever a migration que a cria — o modelo já está definido.
- [ ] Storage: remover a policy de listagem pública do bucket `fotos-saida`
      (ação manual no Console, ver `SECURITY_FIXES.md` fase 3).
- [ ] Reavaliar os 6 índices que o linter do Supabase marcou como não
      utilizados, depois de semanas de uso real — hoje as estatísticas estão
      zeradas e vários cobrem filtros de verdade.

---

## Comandos da instância de teste

```bash
cd /opt/sosentry && git pull origin claude/quirky-newton-b5k6s6
cd infra && docker compose build --no-cache && PORT=8090 docker compose up -d
docker compose logs -f backend
```

Migration falhada (`P3009`) trava o backend em loop. Para destravar, **com os
containers parados**:

```bash
docker compose down
docker compose run --rm --entrypoint npx backend \
  prisma migrate resolve --rolled-back <nome_da_migration>
```

Rode um comando por vez: colar vários blocos de uma vez faz as linhas
seguintes serem engolidas como stdin do container. Use `tmux` — o build
demora e é quando a conexão SSH costuma cair.
