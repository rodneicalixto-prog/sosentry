const r = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

r.use(authenticate);
r.get('/resumo', requireRole('supervisor'), c.resumo);

// Proxy WhatsApp
r.get('/whatsapp/status', requireRole('admin'), async (req, res) => {
  try {
    const resp = await fetch(`${process.env.EVOLUTION_API_URL}/instance/connectionState/${process.env.EVOLUTION_INSTANCE}`, {
      headers: { apikey: process.env.EVOLUTION_API_KEY }
    });
    res.json(await resp.json());
  } catch(e) { res.status(500).json({ error: e.message }); }
});

r.get('/whatsapp/qr', requireRole('admin'), async (req, res) => {
  try {
    const resp = await fetch(`${process.env.EVOLUTION_API_URL}/instance/connect/${process.env.EVOLUTION_INSTANCE}`, {
      headers: { apikey: process.env.EVOLUTION_API_KEY }
    });
    res.json(await resp.json());
  } catch(e) { res.status(500).json({ error: e.message }); }
});

r.post('/whatsapp/send', requireRole('admin'), async (req, res) => {
  try {
    const resp = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { apikey: process.env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.json(await resp.json());
  } catch(e) { res.status(500).json({ error: e.message }); }
});

r.delete('/whatsapp/logout', requireRole('admin'), async (req, res) => {
  try {
    const resp = await fetch(`${process.env.EVOLUTION_API_URL}/instance/logout/${process.env.EVOLUTION_INSTANCE}`, {
      method: 'DELETE',
      headers: { apikey: process.env.EVOLUTION_API_KEY }
    });
    res.json(await resp.json());
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = r;
