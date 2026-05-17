const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const r = express.Router();

const sendLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Limite de envio atingido. Aguarde.' } });

r.use(authenticate, requireRole('admin'));

function getEvoConfig() {
  return {
    url: process.env.EVOLUTION_API_URL,
    key: process.env.EVOLUTION_API_KEY,
    inst: process.env.EVOLUTION_INSTANCE || 'portaria',
  };
}

async function evoFetch(path, opts = {}) {
  const { url, key } = getEvoConfig();
  if (!url) throw Object.assign(new Error('Evolution API não configurada (EVOLUTION_API_URL ausente)'), { status: 503 });
  const res = await fetch(`${url}${path}`, {
    ...opts,
    signal: AbortSignal.timeout(10000),
    headers: { 'apikey': key, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok && !ct.includes('json')) {
    throw Object.assign(new Error(`Evolution API retornou ${res.status}`), { status: res.status >= 500 ? 502 : res.status });
  }
  return res;
}

r.get('/status', async (req, res) => {
  try {
    const { inst } = getEvoConfig();
    const resp = await evoFetch(`/instance/connectionState/${inst}`);
    res.json(await resp.json());
  } catch(e) { res.status(e.status || 500).json({ error: e.message }); }
});

r.get('/qr', async (req, res) => {
  try {
    const { inst } = getEvoConfig();
    const resp = await evoFetch(`/instance/connect/${inst}`);
    res.json(await resp.json());
  } catch(e) { res.status(e.status || 500).json({ error: e.message }); }
});

r.post('/send', sendLimiter, async (req, res) => {
  try {
    const { number, text } = req.body;
    if (!number || !/^\d{10,15}$/.test(String(number).replace(/\D/g, '')))
      return res.status(400).json({ error: 'Número inválido (10–15 dígitos)' });
    if (!text || typeof text !== 'string' || text.trim().length === 0)
      return res.status(400).json({ error: 'Texto obrigatório' });
    if (text.length > 4096)
      return res.status(400).json({ error: 'Texto muito longo (máx 4096 caracteres)' });
    const { inst } = getEvoConfig();
    const resp = await evoFetch(`/message/sendText/${inst}`, {
      method: 'POST',
      body: JSON.stringify({ number, text })
    });
    res.json(await resp.json());
  } catch(e) { res.status(e.status || 500).json({ error: e.message }); }
});

r.delete('/logout', async (req, res) => {
  try {
    const { inst } = getEvoConfig();
    const resp = await evoFetch(`/instance/logout/${inst}`, { method: 'DELETE' });
    res.json(await resp.json());
  } catch(e) { res.status(e.status || 500).json({ error: e.message }); }
});

module.exports = r;
