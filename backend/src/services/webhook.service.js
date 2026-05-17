const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();

// IPs/hostnames internos bloqueados para prevenir SSRF
const BLOQUEADOS = ['127.0.0.1', 'localhost', '0.0.0.0', '::1', '::ffff:127.0.0.1']

function validarUrl(url) {
  let parsed
  try { parsed = new URL(url) } catch { throw new Error('URL inválida') }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Protocolo não permitido')
  if (BLOQUEADOS.includes(parsed.hostname)) throw new Error('URL aponta para rede interna')
  // Bloqueia intervalos de IP privado por prefixo
  const h = parsed.hostname
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h))
    throw new Error('URL aponta para rede privada')
  return parsed
}

function assinar(payload, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function postar(url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsed = validarUrl(url)
    const mod = parsed.protocol === 'https:' ? https : http;
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
      timeout: 10000,
    }, res => {
      let raw = '';
      let size = 0;
      res.on('data', chunk => {
        size += chunk.length
        if (size > 512 * 1024) { req.destroy(); return reject(new Error('Resposta muito grande')) }
        raw += chunk
      });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

// Máximo de 5 disparos simultâneos e fila limitada a 500 itens
let emFlight = 0
const queue = []
function enqueue(fn) {
  if (queue.length >= 500) {
    console.warn('[webhook] fila cheia, descartando evento')
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject })
    drain()
  })
}
function drain() {
  while (emFlight < 5 && queue.length) {
    const { fn, resolve, reject } = queue.shift()
    emFlight++
    fn().then(resolve, reject).finally(() => { emFlight--; drain() })
  }
}

async function postarComRetry(url, payload, headers, tentativa = 1) {
  let r
  try {
    r = await postar(url, payload, headers)
  } catch (e) {
    // Erro de rede ou timeout — retenta
    if (tentativa < 3) {
      await new Promise(res => setTimeout(res, Math.pow(2, tentativa) * 1000))
      return postarComRetry(url, payload, headers, tentativa + 1)
    }
    throw e
  }
  // Retenta apenas em 5xx (erros do servidor receptor), não em 4xx (erro do payload)
  if (r.status >= 500 && tentativa < 3) {
    await new Promise(res => setTimeout(res, Math.pow(2, tentativa) * 1000))
    return postarComRetry(url, payload, headers, tentativa + 1)
  }
  return r
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

    enqueue(() => postarComRetry(wh.url, payload, headers))
      .then(r => r && console.log(`[webhook] ${wh.nome} status=${r.status}`))
      .catch(e => console.error(`[webhook] ${wh.nome} erro após retries: ${e.message}`));
  }
}

module.exports = { disparar };
