require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 300 }));
app.use('/api/auth/login', rateLimit({ windowMs: 15*60*1000, max: 10 }));

app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/users',     require('./routes/user.routes'));
app.use('/api/registros', require('./routes/registro.routes'));
app.use('/api/portarias', require('./routes/portaria.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/whatsapp',  require('./routes/whatsapp.routes'));
app.use('/api/webhooks', require('./routes/webhook.routes'));

app.get('/health', (_, res) => res.json({ ok: true, app: 'SOS Entry', ts: new Date() }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});

app.listen(process.env.PORT || 3001, () =>
  console.log(`SOS Entry API rodando na porta ${process.env.PORT || 3001}`)
);
