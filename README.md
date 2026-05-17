# SOS Entry

Sistema de controle de entrada e saída de veículos em portarias industriais com notificações em tempo real, WhatsApp e integração com automações.

**Funcionalidades:**
- Registro de entradas e saídas com protocolo único gerado automaticamente
- Campos de saída: nº do lacre e observações/ocorrências
- **Notificações em tempo real** via SSE — toasts, sino com badge e indicador "Ao vivo"
- Notificações automáticas via WhatsApp (Evolution API)
- Webhooks para integração com n8n, Zapier e automações
- Painel administrativo com gestão de usuários e portarias
- Roles hierárquicos: `superadmin → admin → supervisor → operador`
- Interface responsiva: mobile, tablet e desktop

---

## Instalação rápida (VPS)

### Pré-requisitos
- Ubuntu 20.04+ ou Debian 11+
- 1 GB RAM mínimo (2 GB recomendado)
- Projeto no [Supabase](https://supabase.com) criado e com as credenciais em mãos

### Um comando

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/rodneicalixto-prog/sosentry/main/infra/setup.sh)"
```

O script instala Docker automaticamente, clona o repositório, configura o `.env` de forma interativa, faz o build e sobe os containers.

---

## Instalação manual

### 1. Clonar

```bash
git clone https://github.com/rodneicalixto-prog/sosentry.git /opt/sosentry
cd /opt/sosentry
```

### 2. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Veja a seção [Variáveis de ambiente](#variáveis-de-ambiente).

### 3. Subir com Docker

```bash
cd infra
docker compose up -d --build
```

O sistema fica acessível na porta **80**. Para outra porta:

```bash
PORT=8080 docker compose up -d --build
```

### 4. Seed inicial (apenas na primeira instalação)

```bash
docker compose exec backend node src/config/seed.js
```

Cria 2 portarias e o usuário `superadmin` com a senha definida em `SEED_SUPERADMIN_SENHA`.

---

## Variáveis de ambiente

Arquivo: `backend/.env` — copiar de `backend/.env.example`

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `DATABASE_URL` | ✅ | Connection string Supabase via pooler (pgbouncer) |
| `DIRECT_URL` | ✅ | Connection string direta (para migrations Prisma) |
| `JWT_SECRET` | ✅ | Secret do access token JWT |
| `JWT_REFRESH_SECRET` | ✅ | Secret do refresh token |
| `FRONTEND_URL` | ✅ | URL do frontend (para CORS) |
| `PORT` | — | Porta do backend (padrão: `3001`) |
| `NODE_ENV` | — | `production` em produção |
| `EVOLUTION_API_URL` | — | URL da Evolution API (WhatsApp) |
| `EVOLUTION_API_KEY` | — | Chave da Evolution API |
| `EVOLUTION_INSTANCE` | — | Nome da instância Evolution |
| `WHATSAPP_RESPONSAVEL` | — | Número do responsável (`5511999999999`) |
| `SEED_SUPERADMIN_SENHA` | — | Senha do superadmin criado pelo seed |

### Formato do DATABASE_URL (Supabase)

> **Atenção:** se a senha contiver `@`, substitua por `%40` na URL.

```
# Pooler — para queries normais
DATABASE_URL="postgresql://postgres.SEU_REF:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direto — para migrations
DIRECT_URL="postgresql://postgres:SUA_SENHA@db.SEU_REF.supabase.co:5432/postgres"
```

---

## Arquitetura Docker

```
Internet
    │ porta 80 (ou 443 com HTTPS)
    ▼
┌──────────────────────────────────────────┐
│  Container: sosentry-frontend            │
│  Nginx                                   │
│  ├── /          → serve React SPA        │
│  ├── /api/      → proxy → backend:3001   │
│  └── /api/eventos → SSE sem buffer       │
└──────────────────────────────────────────┘
    │ rede Docker interna (backend não exposto)
    ▼
┌──────────────────────────────────────────┐
│  Container: sosentry-backend             │
│  Node.js :3001                           │
└──────────────────────────────────────────┘
    │
    ▼
Supabase (PostgreSQL — cloud)
```

O backend **não expõe porta para o mundo** — toda comunicação passa pelo nginx. Basta abrir portas 80 e 443 no firewall.

---

## HTTPS com Certbot

### Nginx externo como proxy reverso (recomendado)

```bash
apt install nginx certbot python3-certbot-nginx

cat > /etc/nginx/sites-available/sosentry << 'EOF'
server {
    server_name seudominio.com.br;

    # SSE — sem buffer para tempo real
    location /api/eventos {
        proxy_pass http://localhost:80;
        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/sosentry /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d seudominio.com.br
```

---

## Notificações em tempo real

O sistema usa **Server-Sent Events (SSE)** — conexão HTTP persistente do browser com o servidor.

| Elemento | Localização | Comportamento |
|----------|------------|---------------|
| **● Ao vivo** | Header | Verde pulsando = conectado; cinza = offline |
| **Toast** | Canto superior direito | Slide-in com borda verde (entrada) ou laranja (saída), some em 6s |
| **Sino 🔔** | Header | Badge com contagem de não lidas; dropdown com histórico de até 50 |
| **Dashboard** | Página inicial | Stats e lista atualizam automaticamente ao receber evento |

Reconexão automática em caso de queda de rede — comportamento nativo do `EventSource`.

---

## Webhooks para n8n / automações

1. Crie um nó **Webhook** no n8n (método POST) e copie a URL
2. No SOS Entry: **Admin → Webhooks → Novo Webhook**
3. Cole a URL e selecione os eventos: `entrada`, `saida`, `cancelado`
4. O payload chegará automaticamente com `evento`, `ts` e `dados`

**Verificar assinatura HMAC (opcional):**

```js
const crypto = require('crypto')
const esperado = 'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex')
const valido = crypto.timingSafeEqual(Buffer.from(req.headers['x-sos-signature']), Buffer.from(esperado))
```

---

## Comandos úteis

```bash
# Ver logs em tempo real
cd /opt/sosentry/infra && docker compose logs -f

# Reiniciar containers
docker compose restart

# Atualizar para nova versão
cd /opt/sosentry && git pull origin main
cd infra && docker compose up -d --build

# Acessar shell do backend
docker compose exec backend sh

# Executar migration manual
docker compose exec backend npx prisma migrate deploy

# Re-executar seed (não duplica dados)
docker compose exec backend node src/config/seed.js
```

---

## Desenvolvimento local

```bash
# Backend (porta 3001)
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (porta 5173)
cd frontend
npm install
npm run dev
```

O Vite já proxy `/api` para `localhost:3001`. Não é necessário definir `VITE_API_URL`.

---

## Estrutura do projeto

```
sosentry/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         Modelos e enums
│   │   └── migrations/           Histórico de migrations
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── dashboard.controller.js
│   │   │   ├── portaria.controller.js
│   │   │   ├── registro.controller.js
│   │   │   ├── user.controller.js
│   │   │   └── webhook.controller.js
│   │   ├── middleware/
│   │   │   └── auth.middleware.js  JWT + roles + suporte a ?token= (SSE)
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── eventos.routes.js   SSE tempo real
│   │   │   ├── portaria.routes.js
│   │   │   ├── registro.routes.js
│   │   │   ├── user.routes.js
│   │   │   ├── webhook.routes.js
│   │   │   └── whatsapp.routes.js
│   │   ├── services/
│   │   │   ├── evolution.service.js  WhatsApp
│   │   │   ├── sse.service.js        Gerencia clientes SSE
│   │   │   └── webhook.service.js    Disparo de webhooks externos
│   │   └── server.js
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           Axios + refresh token automático
│   │   ├── components/
│   │   │   ├── Layout.jsx          Header + sidebar + outlet
│   │   │   ├── NotificationBell.jsx  Sino com badge e dropdown
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── Toasts.jsx          Notificações flutuantes
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   └── RealtimeContext.jsx  Estado global de notificações SSE
│   │   ├── hooks/
│   │   │   └── useRealtime.js      Hook EventSource → SSE
│   │   └── pages/
│   │       ├── Dashboard.jsx       Auto-refresh ao receber evento
│   │       ├── Login.jsx
│   │       ├── NovaEntrada.jsx
│   │       ├── RegistrarSaida.jsx  Busca por protocolo/placa + lacre + ocorrências
│   │       ├── RegistroDetalhe.jsx
│   │       ├── Registros.jsx       Cards no mobile, tabela em tablet/desktop
│   │       └── admin/
│   │           ├── Usuarios.jsx
│   │           ├── Webhooks.jsx    CRUD + guia n8n
│   │           └── Whatsapp.jsx    Status, QR Code, envio de teste
│   ├── nginx.conf                  SPA + proxy /api + SSE sem buffer
│   └── Dockerfile                  Build multi-stage Node → Nginx
├── infra/
│   ├── docker-compose.yml          Backend + Frontend em rede interna
│   └── setup.sh                    Instalação automática em VPS
├── CLAUDE.md                       Documentação técnica para desenvolvimento
└── README.md                       Este arquivo
```

---

## Roles e permissões

| Tela / Recurso | operador | supervisor | admin | superadmin |
|----------------|:--------:|:----------:|:-----:|:----------:|
| Dashboard | — | ✅ | ✅ | ✅ |
| Lista de registros | — | ✅ | ✅ | ✅ |
| Nova entrada | ✅ | ✅ | ✅ | ✅ |
| Registrar saída (lacre + ocorrências) | ✅ | ✅ | ✅ | ✅ |
| Detalhe do registro | ✅ | ✅ | ✅ | ✅ |
| Gestão de usuários | — | — | ✅ | ✅ |
| Webhooks | — | — | ✅ | ✅ |
| WhatsApp status | — | — | ✅ | ✅ |
| Notificações em tempo real | ✅ | ✅ | ✅ | ✅ |

---

## Banco de dados (Supabase)

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `sessions` | Sessões JWT (refresh tokens) |
| `portarias` | Portarias cadastradas |
| `registros` | Registros de entrada/saída (inclui `lacre` e `obs_ocorrencia`) |
| `webhooks` | Webhooks para automações externas |
| `audit_logs` | Auditoria de todas as ações |

---

## Suporte

Abra uma issue em [github.com/rodneicalixto-prog/sosentry/issues](https://github.com/rodneicalixto-prog/sosentry/issues)
