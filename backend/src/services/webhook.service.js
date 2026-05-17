const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();

function assinar(payload, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function postar(url, body, headers) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const parsed = new URL(url);
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port || (url.startsWith('https') ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
      timeout: 10000,
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function disparar(evento, dados) {
  let webhooks;
  try {
    webhooks = await prisma.webhook.findMany({ where: { ativo: true } });
  } catch (e) {
    console.error('[webhook] erro ao buscar webhooks:', e.message);
    return;
  }

  const ativos = webhooks.filter(wh => wh.eventos.includes(evento));
  if (!ativos.length) return;

  const payload = JSON.stringify({ evento, ts: new Date().toISOString(), dados });

  for (const wh of ativos) {
    const headers = { 'X-SOS-Event': evento, 'X-SOS-Webhook-Id': wh.id };
    if (wh.secret) headers['X-SOS-Signature'] = assinar(payload, wh.secret);

    postar(wh.url, payload, headers)
      .then(r => console.log(`[webhook] ${wh.nome} → ${wh.url} status=${r.status}`))
      .catch(e => console.error(`[webhook] ${wh.nome} → ${wh.url} erro: ${e.message}`));
  }
}

module.exports = { disparar };
