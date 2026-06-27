const crypto = require('crypto');
const http   = require('http');
const https  = require('https');
const prisma = require('../lib/prisma');

// IPs/hostnames internos bloqueados para prevenir SSRF
const BLOQUEADOS = [
  '127.0.0.1', 'localhost', '0.0.0.0', '::1', '::ffff:127.0.0.1',
  '169.254.169.254', // AWS/GCP/Azure metadata service
]

function validarUrl(url) {
  let parsed
  try { parsed = new URL(url) } catch { throw new Error('URL inválida') }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Protocolo não permitido')

  const h = parsed.hostname

  // Bloqueia hostnames explícitos
  if (BLOQUEADOS.includes(h.toLowerCase())) throw new Error('URL aponta para rede interna')

  // Bloqueia endereços IPv6 internos/loopback
  if (h.startsWith('[')) {
    const ipv6 = h.slice(1, -1).toLowerCase()
    if (ipv6 === '::1' || ipv6.startsWith('::ffff:127.') || ipv6.startsWith('fe80:') ||
        ipv6.startsWith('fc') || ipv6.startsWith('fd'))
      throw new Error('URL aponta para rede interna (IPv6)')
  }

  // Bloqueia encodings alternativos de IPs privados (decimal, hex, octal)
  // Tenta resolver como número inteiro — ex: 2130706433 = 127.0.0.1
  if (/^\d+$/.test(h) || /^0x[\da-f]+$/i.test(h) || /^0\d+$/.test(h)) {
    throw new Error('URL com IP em formato alternativo não permitida')
  }

  // Bloqueia intervalos de IP privado por prefixo
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      /^127\./.test(h) || /^169\.254\./.test(h) || /^0\.0\.0\./.test(h))
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

async function postarComRetry(url, payload, headers, tentativa = 1, inicio = Date.now()) {
  const MAX_TENTATIVAS = 3
  const MAX_TEMPO_TOTAL = 30000 // 30s teto por payload
  let r
  try {
    r = await postar(url, payload, headers)
  } catch (e) {
    const tempoRestante = MAX_TEMPO_TOTAL - (Date.now() - inicio)
    if (tentativa < MAX_TENTATIVAS && tempoRestante > 2000) {
      const delay = Math.min(Math.pow(2, tentativa) * 1000, tempoRestante - 1000)
      await new Promise(res => setTimeout(res, delay))
      return postarComRetry(url, payload, headers, tentativa + 1, inicio)
    }
    throw e
  }
  // Retenta apenas em 5xx, não em 4xx
  const tempoRestante = MAX_TEMPO_TOTAL - (Date.now() - inicio)
  if (r.status >= 500 && tentativa < MAX_TENTATIVAS && tempoRestante > 2000) {
    const delay = Math.min(Math.pow(2, tentativa) * 1000, tempoRestante - 1000)
    await new Promise(res => setTimeout(res, delay))
    return postarComRetry(url, payload, headers, tentativa + 1, inicio)
  }
  return r
}

async function dispararParaWebhook(wh, evento, dados) {
  const payload = JSON.stringify({ evento, ts: new Date().toISOString(), dados });
  const headers = { 'X-SOS-Event': evento, 'X-SOS-Webhook-Id': wh.id };
  if (wh.secret) headers['X-SOS-Signature'] = assinar(payload, wh.secret);
  return enqueue(() => postarComRetry(wh.url, payload, headers));
}

async function disparar(evento, dados) {
  let webhooks;
  try {
    webhooks = await prisma.webhook.findMany({ where: { ativo: true } });
  } catch (e) {
    console.error('[webhook] erro ao buscar webhooks:', e.message);
    return;
  }

  const ativos = webhooks.filter(wh => wh.ativo === true && Array.isArray(wh.eventos) && wh.eventos.length > 0 && wh.eventos.includes(evento));
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

module.exports = { disparar, dispararParaWebhook };
