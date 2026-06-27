require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const prisma = require('./lib/prisma');
const app = express();

// Necessário para req.ip ser o IP real do cliente (Traefik → Nginx → Express)
app.set('trust proxy', 1);

// Limpa sessões expiradas a cada 6 horas
setInterval(async () => {
  try {
    const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (count > 0) console.log(`[session-cleanup] ${count} sessão(ões) expirada(s) removida(s)`);
  } catch (e) { console.error('[session-cleanup] Erro:', e.message); }
}, 6 * 60 * 60 * 1000).unref();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    }
  }
}));
const corsOrigins = (process.env.FRONTEND_URL || '').split(/[,;]/).map(s => s.trim().replace(/\/$/, '')).filter(s => s.startsWith('http'))
if (!corsOrigins.length) {
  console.warn('[aviso] FRONTEND_URL não configurado — CORS aceitará qualquer origem. Configure a variável em produção.');
}
app.use(cors({ origin: corsOrigins.length ? (corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins) : true, credentials: true }));
// Morgan sem expor o token JWT passado via ?token= (SSE)
app.use(morgan((tokens, req, res) => {
  try {
    const u = new URL(req.originalUrl, `http://x`)
    u.searchParams.delete('token')
    return `${req.method} ${u.pathname}${u.search} ${tokens.status(req, res)} ${tokens['response-time'](req, res)}ms`
  } catch {
    return `${req.method} ${req.path} ${tokens.status(req, res)}`
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false }));
// Login: 5 tentativas por IP por 15 minutos — efetivo agora que trust proxy está configurado
app.use('/api/auth/login', rateLimit({ windowMs: 15*60*1000, max: 5, standardHeaders: true, legacyHeaders: false }));
// Forgot-password: 3 por IP por hora
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60*60*1000, max: 3, standardHeaders: true, legacyHeaders: false }));
app.use('/api/registros', rateLimit({ windowMs: 60*60*1000, max: 200, skip: (req) => req.method !== 'POST', standardHeaders: true, legacyHeaders: false }));

// Proteção CSRF: rejeita requisições de origens não autorizadas
app.use((req, res, next) => {
  if (['POST','PATCH','DELETE','PUT'].includes(req.method)) {
    const origin = req.headers.origin
    const allowedOrigins = (process.env.FRONTEND_URL || '')
      .split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean)
    if (origin && allowedOrigins.length === 0) {
      return res.status(403).json({ error: 'Servidor não configurado (FRONTEND_URL ausente)' })
    }
    const normalizedOrigin = (origin || '').replace(/\/$/, '')
    if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(normalizedOrigin)) {
      return res.status(403).json({ error: 'Origem não permitida' })
    }
  }
  next()
});

app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/users',     require('./routes/user.routes'));
app.use('/api/registros', require('./routes/registro.routes'));
app.use('/api/portarias', require('./routes/portaria.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/whatsapp',  require('./routes/whatsapp.routes'));
app.use('/api/webhooks', require('./routes/webhook.routes'));
app.use('/api/eventos',    require('./routes/eventos.routes'));
app.use('/api/relatorios',    require('./routes/relatorio.routes'));
app.use('/api/configuracoes', require('./routes/configuracao.routes'));
app.use('/api/ocorrencias',   require('./routes/ocorrencia.routes'));
app.use('/api/contatos-notificacao', require('./routes/contato.routes'));
app.use('/api/universidade',  require('./routes/universidade.routes'));
app.use('/api/agendamentos',  require('./routes/agendamento.routes'));
app.use('/api/empresas',      require('./routes/empresa.routes'));
app.use('/api/nf',            (() => {
  const r = require('express').Router();
  const { authenticate, requireRole } = require('./middleware/auth.middleware');
  const c = require('./controllers/nfScan.controller');
  r.post('/verificar', authenticate, requireRole('operador'), c.verificarNF);
  return r;
})());
app.use('/api/publico/agendamento', require('./routes/agendamentoPublico.routes'));
app.use('/api/api-keys',      require('./routes/apikey.routes'));
app.use('/api/agendamentos-dash', (() => {
  const r = require('express').Router();
  const { authenticate, requireRole } = require('./middleware/auth.middleware');
  const c = require('./controllers/agendamentoDash.controller');
  r.get('/resumo', authenticate, requireRole('supervisor'), c.resumo);
  return r;
})());
app.use('/api/v1/agendamentos', require('./routes/integracaoExterna.routes'));

// Servir uploads de NF (acesso restrito via rota autenticada no frontend)
app.use('/uploads', require('express').static('/app/uploads'));

app.get('/health', async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, app: 'SOS Entry', db: 'ok', ts: new Date() })
  } catch {
    // Não expõe e.message para evitar vazamento de informações do banco
    res.status(503).json({ ok: false, app: 'SOS Entry', db: 'error' })
  }
});

app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  } else {
    console.error(`[error] ${err.status || 500} ${err.message}`);
  }
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Erro interno do servidor'
    : (err.message || 'Erro interno');
  res.status(status).json({ error: message });
});

// Nota: valores de enum são gerenciados exclusivamente via migrations Prisma.

const server = app.listen(process.env.PORT || 3001, () =>
  console.log(`SOS Entry API rodando na porta ${process.env.PORT || 3001}`)
);

function shutdown(signal) {
  console.log(`[shutdown] ${signal} recebido — encerrando servidor`);
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
