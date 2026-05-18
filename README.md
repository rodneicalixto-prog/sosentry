# SOS Entry — Sistema de Controle de Portaria

Sistema web para controle de entrada e saída de veículos e visitantes em portarias industriais, com notificações automáticas via WhatsApp.

## Funcionalidades

- **Registro de entrada/saída** com geração automática de protocolo
- **Suporte a dois tipos de portaria**: transportes (veículos pesados) e pedestres
- **Notificações WhatsApp** automáticas a cada registro via Evolution API
- **Painel administrativo** com dashboard, busca e filtros
- **Gestão de usuários** com hierarquia de permissões (superadmin, admin, supervisor, operador)
- **Foto da placa** capturada diretamente pelo celular
- **Audit log** de todas as ações do sistema
- **Autenticação JWT** com access token + refresh token

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Express |
| ORM | Prisma |
| Banco de dados | PostgreSQL |
| Frontend | HTML/CSS/JS (single file, mobile-first) |
| Servidor web | Nginx |
| Notificações | Evolution API (WhatsApp) |
| Infraestrutura | Docker + Docker Compose |

## Estrutura

```
sosentry/
├── backend/
│   ├── src/
│   │   ├── controllers/   # auth, user, portaria, registro, dashboard
│   │   ├── routes/        # rotas da API REST
│   │   ├── middleware/     # autenticação JWT
│   │   ├── services/      # integração Evolution API (WhatsApp)
│   │   └── config/        # seed do banco
│   └── prisma/
│       └── schema.prisma  # modelos: User, Session, Portaria, Registro, AuditLog
├── frontend/
│   ├── dist/index.html    # aplicação completa (SPA single-file)
│   └── nginx.conf
└── infra/
    └── docker-compose.yml
```

## API

Base URL: `https://sosentryapi.sosbot.online/api`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Autenticação |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/logout` | Encerrar sessão |
| GET/POST | `/users` | Listar / criar usuários |
| PATCH | `/users/:id` | Editar usuário |
| GET/POST | `/portarias` | Listar / criar portarias |
| GET/POST | `/registros` | Listar / criar registros |
| PATCH | `/registros/:protocolo/saida` | Registrar saída |
| GET | `/dashboard/resumo` | Totais em tempo real |
| GET/POST | `/whatsapp/*` | Status e controle WhatsApp |

## Configuração

Crie o arquivo `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/sosentry
JWT_SECRET=seu_secret_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_aqui
PORT=3001
FRONTEND_URL=https://seudominio.com

# Evolution API (WhatsApp)
EVOLUTION_URL=https://sua-instancia.com
EVOLUTION_KEY=sua_api_key
EVOLUTION_INSTANCE=portaria
WHATSAPP_NOTIFY_NUMBER=5511999990000
```

## Rodando com Docker

```bash
cd infra
docker-compose up -d
```

O backend sobe na porta `3001`. Health check disponível em `/health`.

## Desenvolvimento local

```bash
cd backend
npm install
npx prisma migrate deploy
npm run db:seed   # cria usuário superadmin padrão
npm run dev
```

## Perfis de acesso

| Perfil | Acesso |
|--------|--------|
| `superadmin` | Acesso total, não pode ser desativado |
| `admin` | Painel admin completo + portaria |
| `supervisor` | Visualização e relatórios |
| `operador` | Somente registro de entrada/saída |

## Fluxo de uso

1. Operador faz login e seleciona a portaria do turno
2. Preenche os dados do motorista, veículo e tipo de operação (4 etapas)
3. Fotografa a placa e confirma o registro
4. Sistema gera protocolo e envia notificação via WhatsApp
5. Na saída, o operador busca pelo protocolo e registra a saída
