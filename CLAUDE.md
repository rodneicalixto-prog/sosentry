# SOS Entry — Documentação do Projeto

Sistema de controle de entrada e saída de veículos em portarias industriais com notificações WhatsApp e integração via webhooks (n8n e similares).

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 20 + Express 4 |
| ORM | Prisma 5 + PostgreSQL |
| Banco | Supabase (projeto `yshvniyhtnyhnjcecbft`, região sa-east-1) |
| Frontend | React 18 + Vite + Tailwind CSS |
| WhatsApp | Evolution API (evogo.sosbot.online) |
| Infra | Docker + docker-compose |

## Estrutura

```
sosentry/
├── backend/          Node.js API
│   ├── prisma/       Schema e migrations
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       └── services/
├── frontend/         React SPA
│   └── src/
├── infra/            docker-compose.yml
└── CLAUDE.md
```

## Rodar localmente

```bash
# Backend
cd backend
cp .env.example .env   # preencher variáveis
npm install
npm run dev            # porta 3001

# Frontend
cd frontend
npm install
npm run dev            # porta 5173
```

## Variáveis de ambiente (backend/.env)

```env
DATABASE_URL="postgresql://postgres.{ref}:{senha}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:{senha}@db.{ref}.supabase.co:5432/postgres"
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
PORT=3001
NODE_ENV=production
FRONTEND_URL="http://localhost:5173"
EVOLUTION_API_URL="https://evogo.sosbot.online"
EVOLUTION_API_KEY="b55d5d85-456b-464f-a418-a97e34cb3d8f"
EVOLUTION_INSTANCE="portaria"
WHATSAPP_RESPONSAVEL="5511999999999"
SEED_SUPERADMIN_SENHA="..."
```

## Banco de dados

Projeto Supabase: `yshvniyhtnyhnjcecbft` (sa-east-1)

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `sessions` | Sessões JWT (refresh tokens) |
| `portarias` | Portarias cadastradas |
| `registros` | Registros de entrada/saída de veículos |
| `webhooks` | Webhooks para integração com n8n e automações |
| `audit_logs` | Log de auditoria de ações |

### Migrations

```bash
cd backend
npx prisma migrate dev --name nome_da_migration   # desenvolvimento
npx prisma migrate deploy                          # produção
npx prisma db seed                                 # seed inicial
```

## Roles e permissões

| Role | Nível | Permissões |
|------|-------|------------|
| `superadmin` | 4 | Tudo |
| `admin` | 3 | Usuários, webhooks, dashboard completo |
| `supervisor` | 2 | Listar registros, dashboard |
| `operador` | 1 | Criar entrada/saída |

## API Endpoints

### Auth
```
POST   /api/auth/login          Autenticar
POST   /api/auth/refresh        Renovar token
POST   /api/auth/logout         Encerrar sessão
GET    /api/auth/me             Dados do usuário logado
```

### Registros
```
GET    /api/registros           Listar (supervisor+) — query: page,limit,status,busca,dataInicio,dataFim
POST   /api/registros           Nova entrada (operador+)
GET    /api/registros/:id       Detalhes (operador+)
PATCH  /api/registros/:protocolo/saida   Registrar saída (operador+)
```

### Portarias
```
GET    /api/portarias           Listar portarias ativas (autenticado)
```

### Dashboard
```
GET    /api/dashboard/resumo    Estatísticas (supervisor+)
```

### Usuários
```
GET    /api/users               Listar (admin+)
POST   /api/users               Criar (admin+)
PATCH  /api/users/:id           Atualizar (admin+)
DELETE /api/users/:id           Desativar (admin+)
```

### Webhooks
```
GET    /api/webhooks            Listar (admin+)
POST   /api/webhooks            Criar (admin+)
PATCH  /api/webhooks/:id        Atualizar (admin+)
DELETE /api/webhooks/:id        Deletar (admin+)
POST   /api/webhooks/:id/test   Testar (admin+)
```

### WhatsApp / Evolution API
```
GET    /api/dashboard/whatsapp/status    Status da instância (admin+)
GET    /api/dashboard/whatsapp/qr        QR Code (admin+)
POST   /api/dashboard/whatsapp/send      Enviar mensagem (admin+)
DELETE /api/dashboard/whatsapp/logout    Logout (admin+)
```

## Sistema de Webhooks

Webhooks são disparados de forma assíncrona (não bloqueiam a requisição) nos eventos:

| Evento | Quando dispara |
|--------|----------------|
| `entrada` | Ao criar um novo registro de entrada |
| `saida` | Ao registrar a saída de um veículo |
| `cancelado` | Ao cancelar um registro |

### Payload enviado

```json
{
  "evento": "entrada",
  "ts": "2026-05-17T12:00:00.000Z",
  "dados": { ...camposDoRegistro }
}
```

### Headers enviados

```
Content-Type: application/json
X-SOS-Event: entrada
X-SOS-Webhook-Id: uuid-do-webhook
X-SOS-Signature: sha256=hmac-hex   (apenas se secret configurado)
```

### Verificar assinatura (n8n / receptor)

```javascript
const crypto = require('crypto');
const assinatura = req.headers['x-sos-signature'];
const esperado = 'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
const valido = crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperado));
```

## Integração n8n

1. Criar webhook no n8n (Webhook node → HTTP Method: POST)
2. Copiar a URL gerada pelo n8n
3. No SOS Entry (admin → Webhooks): criar webhook com a URL do n8n e selecionar eventos desejados
4. O n8n receberá o payload automaticamente a cada entrada/saída

## Deploy com Docker

```bash
cd infra
docker-compose up -d
```

O `docker-compose.yml` sobe o backend na porta 3001. O frontend deve ser servido separadamente (Nginx, Vercel, etc.) ou adicionado ao compose.

## Seed inicial

Credenciais padrão após `npm run db:seed`:
- Login: `superadmin`
- Senha: definida em `SEED_SUPERADMIN_SENHA` no `.env`

Portarias criadas: Portaria 1 (Transportes) e Portaria 2 (Pedestres).
