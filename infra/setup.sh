#!/usr/bin/env bash
# SOS Entry — script de instalação para VPS Ubuntu/Debian
# Uso: curl -fsSL https://raw.githubusercontent.com/rodneicalixto-prog/sosentry/main/infra/setup.sh | bash
set -euo pipefail

REPO="https://github.com/rodneicalixto-prog/sosentry.git"
DIR="/opt/sosentry"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*"; exit 1; }
ask()     { read -rp "$(echo -e "${YELLOW}[?]${NC} $*: ")" REPLY; echo "$REPLY"; }

echo ""
echo "  ███████╗ ██████╗ ███████╗    ███████╗███╗   ██╗████████╗██████╗ ██╗   ██╗"
echo "  ██╔════╝██╔═══██╗██╔════╝    ██╔════╝████╗  ██║╚══██╔══╝██╔══██╗╚██╗ ██╔╝"
echo "  ███████╗██║   ██║███████╗    █████╗  ██╔██╗ ██║   ██║   ██████╔╝ ╚████╔╝ "
echo "  ╚════██║██║   ██║╚════██║    ██╔══╝  ██║╚██╗██║   ██║   ██╔══██╗  ╚██╔╝  "
echo "  ███████║╚██████╔╝███████║    ███████╗██║ ╚████║   ██║   ██║  ██║   ██║   "
echo "  ╚══════╝ ╚═════╝ ╚══════╝    ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝  "
echo ""
echo "  Instalação automática — VPS Ubuntu/Debian"
echo ""

# ─── Verificar root ─────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Execute como root: sudo bash setup.sh"

# ─── Instalar dependências ───────────────────────────────────────────────────
info "Atualizando pacotes..."
apt-get update -qq

if ! command -v docker &>/dev/null; then
  info "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  info "Docker já instalado: $(docker --version)"
fi

if ! command -v git &>/dev/null; then
  apt-get install -y -qq git
fi

# ─── Clonar repositório ──────────────────────────────────────────────────────
if [[ -d "$DIR" ]]; then
  warn "Diretório $DIR já existe. Atualizando..."
  git -C "$DIR" pull origin main
else
  info "Clonando repositório em $DIR..."
  git clone "$REPO" "$DIR"
fi

cd "$DIR"

# ─── Configurar .env ─────────────────────────────────────────────────────────
if [[ ! -f backend/.env ]]; then
  info "Configurando variáveis de ambiente..."
  echo ""
  warn "Você precisará das seguintes informações do Supabase:"
  warn "  Project Settings → Database → Connection string"
  echo ""

  DB_URL=$(ask "DATABASE_URL (postgresql://postgres.xxx:senha@pooler.supabase.com:6543/postgres)")
  DIRECT=$(ask "DIRECT_URL (postgresql://postgres:senha@db.xxx.supabase.co:5432/postgres)")
  JWT_S=$(openssl rand -hex 32)
  JWT_R=$(openssl rand -hex 32)
  FRONT=$(ask "URL do frontend (ex: http://meusite.com.br ou http://IP_DA_VPS)")
  EVO_KEY=$(ask "Evolution API Key (deixe vazio se não usar WhatsApp)")
  EVO_URL=$(ask "Evolution API URL [https://evogo.sosbot.online]")
  EVO_URL=${EVO_URL:-https://evogo.sosbot.online}
  EVO_INS=$(ask "Evolution Instance [portaria]")
  EVO_INS=${EVO_INS:-portaria}
  WAPP=$(ask "Número WhatsApp do responsável (ex: 5511999999999) [opcional]")
  SEED_PASS=$(ask "Senha do superadmin [Trocar@123]")
  SEED_PASS=${SEED_PASS:-Trocar@123}
  PORT=$(ask "Porta para o frontend [80]")
  PORT=${PORT:-80}

  cat > backend/.env <<EOF
DATABASE_URL="${DB_URL}"
DIRECT_URL="${DIRECT}"
JWT_SECRET="${JWT_S}"
JWT_REFRESH_SECRET="${JWT_R}"
PORT=3001
NODE_ENV=production
FRONTEND_URL="${FRONT}"
EVOLUTION_API_URL="${EVO_URL}"
EVOLUTION_API_KEY="${EVO_KEY}"
EVOLUTION_INSTANCE="${EVO_INS}"
WHATSAPP_RESPONSAVEL="${WAPP}"
SEED_SUPERADMIN_SENHA="${SEED_PASS}"
EOF

  echo "PORT=${PORT}" >> infra/.env 2>/dev/null || echo "PORT=${PORT}" > infra/.env

  info ".env criado com sucesso."
else
  warn "backend/.env já existe — pulando configuração."
fi

# ─── Build e subir ────────────────────────────────────────────────────────────
info "Construindo e subindo containers..."
cd infra
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

info "Aguardando backend ficar saudável..."
for i in {1..30}; do
  if docker compose exec backend curl -sf http://localhost:3001/health &>/dev/null; then
    break
  fi
  sleep 2
done

# ─── Seed ────────────────────────────────────────────────────────────────────
info "Executando seed do banco de dados..."
docker compose exec backend node src/config/seed.js 2>/dev/null && info "Seed concluído." || warn "Seed falhou (banco pode já estar populado)."

# ─── Resumo ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "SOS Entry instalado com sucesso!"
echo ""
echo "  🌐 Frontend: http://$(curl -s ifconfig.me 2>/dev/null || echo 'SEU_IP')"
echo "  🔧 Backend:  porta 3001 (somente interno)"
echo "  👤 Login:    superadmin"
echo "  🔑 Senha:    definida durante instalação"
echo ""
warn "Recomendado: configure HTTPS com Certbot + Nginx"
warn "  apt install certbot python3-certbot-nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
