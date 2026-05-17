const express = require('express');
const r = express.Router();

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const EVO_INST = process.env.EVOLUTION_INSTANCE || 'portaria';

async function evoFetch(path, opts = {}) {
  const res = await fetch(`${EVO_URL}${path}`, {
    ...opts,
    headers: { 'apikey': EVO_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  return res;
}

r.get('/status', async (req, res) => {
  try {
    const resp = await evoFetch(`/instance/connectionState/${EVO_INST}`);
    const data = await resp.json();
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

r.get('/qrcode', async (req, res) => {
  try {
    const resp = await evoFetch(`/instance/connect/${EVO_INST}`);
    const data = await resp.json();
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

r.post('/send', async (req, res) => {
  try {
    const { number, text } = req.body;
    if (!number || !/^\d{10,15}$/.test(String(number).replace(/\D/g, '')))
      return res.status(400).json({ error: 'Número inválido (10–15 dígitos)' });
    if (!text || typeof text !== 'string' || text.trim().length === 0)
      return res.status(400).json({ error: 'Texto obrigatório' });
    if (text.length > 4096)
      return res.status(400).json({ error: 'Texto muito longo (máx 4096 caracteres)' });
    const resp = await evoFetch(`/message/sendText/${EVO_INST}`, {
      method: 'POST',
      body: JSON.stringify({ number, text })
    });
    const data = await resp.json();
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

r.delete('/logout', async (req, res) => {
  try {
    const resp = await evoFetch(`/instance/logout/${EVO_INST}`, { method: 'DELETE' });
    const data = await resp.json();
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = r;
