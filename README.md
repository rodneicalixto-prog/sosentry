# SOS Entry

Sistema de controle de entrada e saída de veículos em portarias industriais.

- Registro de entradas e saídas com protocolo único
- Notificações automáticas via WhatsApp (Evolution API)
- Webhooks para integração com n8n e automações
- Painel administrativo com gestão de usuários e portarias
- Roles hierárquicos: `superadmin → admin → supervisor → operador`

## Instalação rápida (VPS)

### Pré-requisitos
- Ubuntu 20.04+ ou Debian 11+
- 1 GB RAM mínimo (2 GB recomendado)
- Docker instalado (o script instala automaticamente se necessário)
- Projeto no [Supabase](https://supabase.com) com as credenciais em mãos

### Um comando

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/rodneicalixto-prog/sosentry/main/infra/setup.sh)"
```

O script instala Docker, clona o repositório, configura o `.env` interativamente, faz o build e sobe os containers.

---

## Instalação manual passo a passo

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

Preencha todas as variáveis — veja a seção [Variáveis de ambiente](#variáveis-de-ambiente).

### 3. Subir com Docker

```bash
cd infra
docker compose up -d --build
```

O frontend fica acessível na porta **80**. Para outra porta:

```bash
PORT=8080 docker compose up -d --build
```

### 4. Seed inicial (primeira instalação)

```bash
docker compose exec backend node src/config/seed.js
```

Cria 2 portarias e o usuário `superadmin`.

---

## Variáveis de ambiente

Arquivo: `backend/.env`

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `DATABASE_URL` | ✅ | Connection string Supabase via pooler (pgbouncer) |
| `DIRECT_URL` | ✅ | Connection string direta (para migrations) |
| `JWT_SECRET` | ✅ | Secret do access token JWT |
| `JWT_REFRESH_SECRET` | ✅ | Secret do refresh token |
| `FRONTEND_URL` | ✅ | URL do frontend (para CORS) |
| `PORT` | — | Porta do backend (padrão: `3001`) |
| `NODE_ENV` | — | `production` em produção |
| `EVOLUTION_API_URL` | — | URL da Evolution API (WhatsApp) |
| `EVOLUTION_API_KEY` | — | Chave da Evolution API |
| `EVOLUTION_INSTANCE` | — | Nome da instância Evolution |
| `WHATSAPP_RESPONSAVEL` | — | Número do responsável (ex: `5511999999999`) |
| `SEED_SUPERADMIN_SENHA` | — | Senha do superadmin criado pelo seed |

### Formato do DATABASE_URL (Supabase)

```
# Pooler — use para queries normais (substitua @ da senha por %40)
DATABASE_URL="postgresql://postgres.SEU_REF:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direto — use para migrations
DIRECT_URL="postgresql://postgres:SUA_SENHA@db.SEU_REF.supabase.co:5432/postgres"
```

> **Atenção:** se a senha contiver `@`, substitua por `%40` na URL.

---

## Arquitetura Docker

```
┌─────────────────────────────────────────┐
│              VPS / Servidor             │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Container: sosentry-frontend     │  │
│  │  Nginx :80                        │  │
│  │                                   │  │
│  │  / → serve React SPA             │  │
│  │  /api → proxy → backend:3001     │  │
│  └───────────────────────────────────┘  │
│                   ↓ rede Docker         │
│  ┌───────────────────────────────────┐  │
│  │  Container: sosentry-backend      │  │
│  │  Node.js :3001 (não exposto)      │  │
│  └───────────────────────────────────┘  │
│                   ↓                     │
│         Supabase (PostgreSQL)           │
└─────────────────────────────────────────┘
```

O backend **não expõe porta para fora** — toda comunicação passa pelo nginx do frontend. Isso simplifica firewall (apenas porta 80/443 abertas).

---

## HTTPS com Certbot (recomendado para produção)

### Opção A — Nginx externo como proxy reverso

```bash
apt install nginx certbot python3-certbot-nginx

# Criar config do site
cat > /etc/nginx/sites-available/sosentry << 'EOF'
server {
    server_name seudominio.com.br;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/sosentry /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Gerar certificado SSL
certbot --nginx -d seudominio.com.br
```

### Opção B — Docker na porta 80, Nginx externo na 443

Altere o `docker-compose.yml` para `PORT=8080` e ajuste o proxy reverso apontando para `localhost:8080`.

---

## Comandos úteis

```bash
# Ver logs em tempo real
cd /opt/sosentry/infra && docker compose logs -f

# Reiniciar
docker compose restart

# Atualizar para nova versão
cd /opt/sosentry
git pull origin main
cd infra && docker compose up -d --build

# Acessar shell do backend
docker compose exec backend sh

# Rodar migration manual
docker compose exec backend npx prisma migrate deploy

# Backup do banco (via Supabase Dashboard ou pg_dump)
```

---

## Desenvolvimento local

### Backend

```bash
cd backend
cp .env.example .env   # preencher variáveis
npm install
npm run dev            # nodemon na porta 3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # Vite na porta 5173 com proxy /api → localhost:3001
```

O Vite já está configurado para proxiar `/api` para `http://localhost:3001` em desenvolvimento. Não é necessário definir `VITE_API_URL`.

---

## Estrutura do projeto

```
sosentry/
├── backend/              Node.js + Express + Prisma
│   ├── prisma/           Schema e migrations
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/  Lógica de negócio
│   │   ├── middleware/   Autenticação JWT + roles
│   │   ├── routes/       Definição de endpoints
│   │   └── services/     Evolution API, Webhooks
│   ├── .env.example
│   └── Dockerfile
├── frontend/             React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/          Axios client com refresh token
│   │   ├── components/   Layout, Sidebar, StatusBadge
│   │   ├── contexts/     AuthContext
│   │   └── pages/        Todas as telas
│   ├── nginx.conf        Serve SPA + proxy /api
│   └── Dockerfile
├── infra/
│   ├── docker-compose.yml
│   └── setup.sh          Script de instalação VPS
├── CLAUDE.md             Documentação técnica detalhada
└── README.md             Este arquivo
```

---

## Roles e permissões

| Tela | operador | supervisor | admin | superadmin |
|------|:--------:|:----------:|:-----:|:----------:|
| Dashboard | — | ✅ | ✅ | ✅ |
| Lista de registros | — | ✅ | ✅ | ✅ |
| Nova entrada | ✅ | ✅ | ✅ | ✅ |
| Registrar saída | ✅ | ✅ | ✅ | ✅ |
| Gestão de usuários | — | — | ✅ | ✅ |
| Webhooks | — | — | ✅ | ✅ |
| WhatsApp status | — | — | ✅ | ✅ |

---

## Suporte

Abra uma issue em [github.com/rodneicalixto-prog/sosentry/issues](https://github.com/rodneicalixto-prog/sosentry/issues)
