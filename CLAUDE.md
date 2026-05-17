# SOS Entry — Documentação Técnica

Sistema de controle de entrada e saída de veículos em portarias industriais. Notificações em tempo real via SSE, WhatsApp, webhooks para automação e painel administrativo completo.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 20 + Express 4 |
| ORM | Prisma 5 + PostgreSQL |
| Banco | Supabase (projeto `yshvniyhtnyhnjcecbft`, sa-east-1) |
| Frontend | React 18 + Vite + Tailwind CSS v3 + React Router v6 + Axios |
| Tempo real | Server-Sent Events (SSE) — EventSource nativo |
| WhatsApp | Evolution API (evogo.sosbot.online) |
| Infra | Docker multi-stage build + docker-compose + Nginx |
| PWA | manifest.json + Service Worker + push notifications |

## Estrutura de arquivos

```
sosentry/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         Modelos, enums, directUrl
│   │   └── migrations/           Histórico de migrations
│   └── src/
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── dashboard.controller.js
│       │   ├── portaria.controller.js
│       │   ├── registro.controller.js    entrada, saída (lacre + obs), SSE broadcast
│       │   ├── user.controller.js
│       │   └── webhook.controller.js     CRUD + test endpoint
│       ├── middleware/
│       │   └── auth.middleware.js        JWT + roles + ?token= para SSE
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── dashboard.routes.js
│       │   ├── eventos.routes.js         GET /api/eventos (SSE)
│       │   ├── portaria.routes.js
│       │   ├── registro.routes.js
│       │   ├── user.routes.js
│       │   ├── webhook.routes.js
│       │   └── whatsapp.routes.js
│       ├── services/
│       │   ├── evolution.service.js      Integração WhatsApp
│       │   ├── sse.service.js            Gerencia clientes SSE + broadcast
│       │   └── webhook.service.js        Disparo de webhooks externos (assíncrono)
│       └── server.js
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js               Axios, BASE_URL='', refresh token automático
│   │   ├── components/
│   │   │   ├── InstallBanner.jsx       Banner PWA "Instalar" — evento beforeinstallprompt
│   │   │   ├── Layout.jsx              Header + sidebar + outlet + Toasts
│   │   │   ├── NotificationBell.jsx    Sino com badge bounce + dropdown histórico
│   │   │   ├── ProtectedRoute.jsx      minRole + fallback prop
│   │   │   ├── Sidebar.jsx             Navegação com roles
│   │   │   ├── StatusBadge.jsx         Chips coloridos de status
│   │   │   └── Toasts.jsx              Slide-in notifications (verde/laranja), 6s
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx         Login, logout, user state
│   │   │   └── RealtimeContext.jsx     Notificações SSE globais (até 50), naoLidas
│   │   ├── hooks/
│   │   │   └── useRealtime.js          EventSource com ?token=, reconexão automática
│   │   └── pages/
│   │       ├── Dashboard.jsx           Stats + últimos registros, auto-refresh via SSE
│   │       ├── Login.jsx
│   │       ├── NovaEntrada.jsx         Form completo de entrada
│   │       ├── RegistrarSaida.jsx      Busca por protocolo/placa + lacre + ocorrências
│   │       ├── RegistroDetalhe.jsx     Detalhe + SaidaModal (lacre + obs)
│   │       ├── Registros.jsx           Lista: cards mobile / tabela tablet+
│   │       └── admin/
│   │           ├── Usuarios.jsx        CRUD de usuários (admin+)
│   │           ├── Webhooks.jsx        CRUD + guia n8n + botão testar
│   │           └── Whatsapp.jsx        Status, QR Code, envio de teste
│   ├── public/
│   │   ├── manifest.json               PWA: nome, tema, atalhos, ícones
│   │   ├── sw.js                       Service worker: cache-first + push handler
│   │   ├── favicon.svg                 Ícone SVG do app
│   │   └── icons/                      PNG 72/96/128/144/152/192/384/512px
│   ├── nginx.conf                      SPA + proxy /api + SSE sem buffer
│   └── Dockerfile                      Multi-stage: Node 20 → Nginx Alpine
├── infra/
│   ├── docker-compose.yml              Backend + Frontend em rede interna
│   └── setup.sh                        Instalação automática em VPS (1 comando)
├── CLAUDE.md                           Este arquivo
└── README.md                           Documentação de instalação e uso
```

## Rodar localmente

```bash
# Backend
cd backend
cp .env.example .env   # preencher variáveis
npm install
npm run dev            # porta 3001

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev            # porta 5173 — Vite proxy /api → localhost:3001
```

Não é necessário definir `VITE_API_URL` em desenvolvimento — o Vite já proxia `/api`.

## Variáveis de ambiente (backend/.env)

```env
# Supabase — pooler para queries normais
DATABASE_URL="postgresql://postgres.{ref}:{senha}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Supabase — conexão direta para migrations Prisma
DIRECT_URL="postgresql://postgres:{senha}@db.{ref}.supabase.co:5432/postgres"

JWT_SECRET="secret-longo-aleatorio"
JWT_REFRESH_SECRET="outro-secret-longo"
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://seudominio.com"

# Evolution API (WhatsApp) — opcional
EVOLUTION_API_URL="https://evogo.sosbot.online"
EVOLUTION_API_KEY="sua-chave"
EVOLUTION_INSTANCE="portaria"
WHATSAPP_RESPONSAVEL="5511999999999"

# Seed
SEED_SUPERADMIN_SENHA="sua-senha-forte"
```

> **Atenção:** se a senha contiver `@`, substitua por `%40` na URL de conexão.

## Banco de dados

Projeto Supabase: `yshvniyhtnyhnjcecbft` (sa-east-1)

### Tabelas

| Tabela | Campos relevantes |
|--------|------------------|
| `users` | id, login, nome, senha (bcrypt), role, ativo, portariaId |
| `sessions` | id, userId, refreshToken, expiresAt |
| `portarias` | id, nome, ativa |
| `registros` | protocolo, placa, nomeMotorista, empresa, tipoVeiculo, dataEntrada, dataSaida, **lacre**, **obsOcorrencia**, status, operadorId, portariaId |
| `webhooks` | id, nome, url, secret, eventos (array), ativo |
| `audit_logs` | id, userId, acao, tabela, registroId, detalhes, ip |

### Migrations

```bash
cd backend
npx prisma migrate dev --name nome_da_migration   # desenvolvimento
npx prisma migrate deploy                          # produção (Docker)
npx prisma generate                                # regenerar client
```

### Seed inicial

```bash
# Docker
docker compose exec backend node src/config/seed.js

# Local
node src/config/seed.js
```

Cria: Portaria 1 (Transportes), Portaria 2 (Pedestres), usuário `superadmin`.

## Roles e permissões

| Role | Nível | Acesso |
|------|-------|--------|
| `superadmin` | 4 | Tudo |
| `admin` | 3 | Usuários, webhooks, WhatsApp, dashboard |
| `supervisor` | 2 | Dashboard, lista de registros, detalhes |
| `operador` | 1 | Nova entrada, registrar saída, detalhe do próprio registro |

`ProtectedRoute` aceita `minRole` e `fallback` (rota padrão quando role insuficiente — operador vai para `/saida`).

## API Endpoints

### Auth
```
POST   /api/auth/login               Autenticar (retorna access + refresh token)
POST   /api/auth/refresh             Renovar access token
POST   /api/auth/logout              Invalidar sessão
GET    /api/auth/me                  Dados do usuário logado
```

### Registros
```
GET    /api/registros                Listar (supervisor+) — ?page,limit,status,busca,dataInicio,dataFim
POST   /api/registros                Nova entrada (operador+) — dispara SSE + webhook + WhatsApp
GET    /api/registros/:id            Detalhes (operador+)
PATCH  /api/registros/:protocolo/saida   Registrar saída (operador+) — aceita lacre, obsOcorrencia
```

### Portarias
```
GET    /api/portarias                Listar portarias ativas (autenticado)
```

### Dashboard
```
GET    /api/dashboard/resumo         Estatísticas: naEmpresa, entradaHoje, saidaHoje, total (supervisor+)
```

### Usuários
```
GET    /api/users                    Listar (admin+)
POST   /api/users                    Criar (admin+)
PATCH  /api/users/:id                Atualizar (admin+)
DELETE /api/users/:id                Desativar (admin+)
```

### Webhooks
```
GET    /api/webhooks                 Listar (admin+)
POST   /api/webhooks                 Criar (admin+)
PATCH  /api/webhooks/:id             Atualizar (admin+)
DELETE /api/webhooks/:id             Deletar (admin+)
POST   /api/webhooks/:id/test        Disparar evento de teste (admin+)
```

### WhatsApp (Evolution API)
```
GET    /api/whatsapp/status          Status da instância (admin+)
GET    /api/whatsapp/qr              QR Code para conectar (admin+)
POST   /api/whatsapp/send            Enviar mensagem de teste (admin+)
DELETE /api/whatsapp/logout          Desconectar instância (admin+)
```

### SSE — Tempo real
```
GET    /api/eventos                  Stream SSE (operador+) — auth via ?token=JWT
```

EventSource não suporta headers customizados, portanto o JWT é passado como query param. O middleware `auth.middleware.js` aceita tanto `Authorization: Bearer <token>` quanto `?token=<token>`.

Eventos emitidos:
- `event: conectado` — imediatamente ao conectar
- `event: atividade` — a cada entrada ou saída registrada
- `:keepalive` — comentário a cada 25s para manter conexão viva

## Notificações em tempo real (SSE)

### Frontend

`useRealtime.js` → `RealtimeContext.jsx` → componentes

```
EventSource /api/eventos?token=JWT
    │
    ├── event: conectado  → setConectado(true)
    ├── event: atividade  → adiciona à lista notificacoes (max 50)
    │                     → exibe Toast (6s)
    │                     → incrementa naoLidas
    └── onerror           → setConectado(false), EventSource reconecta sozinho
```

### Elementos visuais

| Elemento | Localização | Comportamento |
|----------|-------------|---------------|
| **● Ao vivo** | Header | Verde pulsando = conectado; cinza = offline |
| **Toast** | Canto superior direito | Slide-in verde (entrada) / laranja (saída), some em 6s, max 3 simultâneos |
| **Sino** | Header | Badge vermelho com bounce; dropdown com até 50 notificações |
| **Dashboard** | Página inicial | Stats e lista atualizam automaticamente ao receber evento SSE |

## Sistema de Webhooks

Disparados de forma **assíncrona** (não bloqueiam a requisição) em:

| Evento | Quando |
|--------|--------|
| `entrada` | Nova entrada registrada |
| `saida` | Saída registrada |
| `cancelado` | Registro cancelado |

### Payload

```json
{
  "evento": "entrada",
  "ts": "2026-05-17T12:00:00.000Z",
  "dados": { ...camposDoRegistro }
}
```

### Headers

```
Content-Type: application/json
X-SOS-Event: entrada
X-SOS-Webhook-Id: uuid
X-SOS-Signature: sha256=hmac   (apenas se secret configurado)
```

### Verificar assinatura no receptor (n8n / Zapier)

```js
const crypto = require('crypto')
const esperado = 'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex')
const valido = crypto.timingSafeEqual(Buffer.from(req.headers['x-sos-signature']), Buffer.from(esperado))
```

## PWA (Progressive Web App)

O frontend é um PWA completo — instalável na tela inicial do celular sem loja.

### Arquivos

| Arquivo | Função |
|---------|--------|
| `public/manifest.json` | Nome, tema (`#1d4ed8`), ícones, atalhos (Nova Entrada / Saída) |
| `public/sw.js` | Cache-first para estáticos, rede para `/api/`, push handler |
| `public/icons/*.png` | 8 tamanhos: 72, 96, 128, 144, 152, 192, 384, 512px |
| `src/components/InstallBanner.jsx` | Banner "Instalar" via `beforeinstallprompt` (Android/Chrome) |

### Service Worker — estratégia de cache

```
GET /api/*   → sempre rede (nunca cacheia dados da API)
GET outros   → cache-first; fallback /index.html quando offline
push event   → exibe notificação nativa com ícone e vibração
notificationclick → foca/abre o app na URL correta
```

### Instalação no celular

- **Android:** Chrome exibe o banner automaticamente; pressionar o ícone do app mostra atalhos (Entrada/Saída)
- **iOS Safari:** Menu → "Adicionar à Tela de Início" — funciona em standalone, push notifications a partir do iOS 16.4

### Push notifications (futuro)

O service worker já tem o handler `push` implementado. Para ativá-las:
1. Gerar chaves VAPID no backend (`web-push` npm package)
2. Chamar `registration.pushManager.subscribe()` no frontend após login
3. Salvar a subscription no backend e disparar via `webpush.sendNotification()`

## Arquitetura Docker

```
Internet
    │ porta 80 (ou 443 com HTTPS)
    ▼
┌──────────────────────────────────────────┐
│  Container: sosentry-frontend            │
│  Nginx                                   │
│  ├── /api/eventos → SSE sem buffer       │
│  ├── /api/        → proxy → backend:3001 │
│  └── /            → React SPA            │
└──────────────────────────────────────────┘
    │ rede interna Docker (backend não exposto)
    ▼
┌──────────────────────────────────────────┐
│  Container: sosentry-backend             │
│  Node.js :3001                           │
└──────────────────────────────────────────┘
    │
    ▼
Supabase PostgreSQL (cloud)
```

A localização `/api/eventos` tem bloco próprio no nginx com `proxy_buffering off` **antes** do bloco geral `/api/` — nginx usa o match mais específico.

### Deploy em nova VPS (1 comando)

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/rodneicalixto-prog/sosentry/main/infra/setup.sh)"
```

O script instala Docker, clona o repositório, solicita as variáveis de ambiente interativamente (incluindo geração automática de JWT secrets com openssl), faz o build e sobe os containers.

### Build manual

```bash
cd infra
docker compose up -d --build
PORT=8080 docker compose up -d --build   # porta alternativa
```

A imagem frontend usa `VITE_API_URL=''` (string vazia) — o nginx proxy lida com o roteamento. **A mesma imagem funciona em qualquer VPS sem rebuild.**

## Comandos úteis

```bash
# Logs em tempo real
cd infra && docker compose logs -f

# Acessar shell do backend
docker compose exec backend sh

# Migration manual
docker compose exec backend npx prisma migrate deploy

# Seed (idempotente — não duplica dados)
docker compose exec backend node src/config/seed.js

# Atualizar para nova versão
git pull origin main
cd infra && docker compose up -d --build
```
