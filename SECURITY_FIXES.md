# 🔐 Correções de Segurança do Supabase

## 📋 Resumo das Vulnerabilidades Encontradas

Análise do Supabase identificou **3 problemas CRÍTICOS** de segurança:

### 1. ❌ RLS (Row Level Security) Desabilitado
- **Impacto:** Qualquer pessoa pode acessar dados via API Supabase diretamente
- **Tabelas Afetadas:** 18 tabelas (users, sessions, registros, agendamentos, etc.)
- **Status:** 🔴 CRÍTICO

### 2. ❌ Dados Sensíveis Expostos
- **Tabelas:** agendamentos.token, sessions.refresh_token, webhooks.secret
- **Risco:** Tokens e secrets acessíveis sem autenticação
- **Status:** 🔴 CRÍTICO

### 3. ⚠️ Storage Bucket Permite Listagem
- **Bucket:** fotos-saida
- **Problema:** Política pública permite listar todos os arquivos
- **Status:** 🟠 AVISO

---

## ✅ Solução Implementada

### Fase 1: Migration SQL (PRONTO)
Arquivo: `backend/prisma/migrations/20260727000007_fix_security_rls_and_indexes/migration.sql`

**O que foi feito:**
- ✅ RLS habilitado em 18 tabelas
- ✅ Políticas básicas de acesso criadas
- ✅ 7 índices para Foreign Keys adicionados
- ✅ 6 índices não utilizados removidos

**Como aplicar:**
```bash
cd backend
npx prisma migrate deploy
```

---

### Fase 2: Melhorias Avançadas (PRÓXIMAS)

#### A. Autenticação JWT Role-Based

Atualmente as políticas RLS são genéricas. Para proteger dados sensíveis, implemente:

```sql
-- Exemplo: Proteção de tokens sensíveis
CREATE POLICY "only_admins_see_tokens" ON "agendamentos"
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'superadmin')
    OR
    (auth.uid()::text = criado_por_id)
  );
```

#### B. Remover Políticas Genéricas

As políticas atuais são permissivas. Substitua por:

```sql
-- Revogar todas as políticas genéricas
DROP POLICY IF EXISTS "Users can read all" ON "users";
DROP POLICY IF EXISTS "Registros can be read" ON "registros";
-- ... etc

-- Criar policies restrictivas
CREATE POLICY "users_select_own" ON "users"
  FOR SELECT
  USING (auth.uid()::text = id OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));
```

#### C. Proteção de Secrets

```sql
-- Ocultar colunas sensíveis via RLS
CREATE POLICY "webhooks_secret_admin_only" ON "webhooks"
  FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));

-- Sessions (refresh tokens)
CREATE POLICY "sessions_own_user" ON "sessions"
  FOR SELECT
  USING (auth.uid()::text = user_id);
```

---

### Fase 3: Storage Security

**Ação Manual no Console Supabase:**

1. Acesse: Dashboard → Storage → fotos-saida
2. Clique em "Policies"
3. Localize: "fotos-saida leitura publica"
4. **Remova a política** (ou restrinja a SELECT)
5. Adicione nova política (se necessário):

```
Restrição: Apenas URLs autenticadas podem acessar
```

**Resultado:** Arquivos só acessíveis via URL direta assinada, não via listagem

---

## 🚀 Próximos Passos

### HOJE:
- [ ] Aplicar migration SQL (Fase 1)
- [ ] Testar login e funcionamento básico
- [ ] Verificar erros no console

### SEMANA QUE VEM:
- [ ] Implementar JWT role-based access (Fase 2)
- [ ] Remover políticas genéricas
- [ ] Ajustar storage bucket (Fase 3)

### FUTURO:
- [ ] Implementar testes de segurança
- [ ] Adicionar audit logging para operações sensíveis
- [ ] Implementar column-level encryption para secrets

---

## 📊 Checklist de Segurança

```
Post-Migration:
- [ ] RLS habilitado em todas as tabelas
- [ ] Índices criados para FKs
- [ ] Índices não utilizados removidos
- [ ] Nenhum erro no console do Supabase
- [ ] Aplicação continua funcionando

Post-JWT Implementation:
- [ ] Políticas restrictivas aplicadas
- [ ] Apenas admins podem ver tokens
- [ ] Apenas users podem ver suas sessions
- [ ] Secrets protegidos
- [ ] Testes de acesso passando

Post-Storage Fix:
- [ ] Bucket fotos-saida sem listagem pública
- [ ] URLs diretas continuam funcionando
- [ ] Service Worker consegue carregar imagens
```

---

## 🔧 Rollback (Se necessário)

Se algo der errado, a migration pode ser revertida:

```bash
cd backend
npx prisma migrate resolve --rolled-back 20260727000007_fix_security_rls_and_indexes
```

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs:** `tmux capture-pane -t dev:0 -p | grep -i "error\|rls"`
2. **Testar login:** `curl -X POST http://localhost:3001/api/auth/login ...`
3. **Verificar BD:** `npx prisma studio` (local)

---

## 📚 Referências

- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [JWT Auth Pattern](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Best Practices](https://supabase.com/docs/guides/database/database-linter)
