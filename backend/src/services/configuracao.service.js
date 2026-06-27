const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');

const CHAVES = [
  'evo_url', 'evo_key', 'evo_instance', 'evo_responsavel',
  'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from',
];

// Cache simples com TTL de 60s para evitar N×4 queries por evento de notificação
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000;

function _envMap() {
  return {
    evo_url:         process.env.EVOLUTION_API_URL || 'https://evogo.sosbot.online',
    evo_key:         process.env.EVOLUTION_API_KEY,
    evo_instance:    process.env.EVOLUTION_INSTANCE,
    evo_responsavel: process.env.WHATSAPP_RESPONSAVEL,
    smtp_host:       process.env.SMTP_HOST,
    smtp_port:       process.env.SMTP_PORT,
    smtp_user:       process.env.SMTP_USER,
    smtp_pass:       process.env.SMTP_PASS,
    smtp_from:       process.env.SMTP_FROM,
  };
}

async function _loadAll() {
  const rows = await prisma.configuracao.findMany({ where: { chave: { in: CHAVES } } });
  const map  = Object.fromEntries(rows.map(r => [r.chave, r.valor]));
  const env  = _envMap();
  return CHAVES.reduce((acc, k) => { acc[k] = map[k] ?? env[k] ?? null; return acc; }, {});
}

async function _getCache() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;
  _cache = await _loadAll();
  _cacheAt = Date.now();
  return _cache;
}

function _invalidateCache() {
  _cache = null;
  _cacheAt = 0;
}

async function get(chave) {
  const all = await _getCache();
  return all[chave] ?? null;
}

async function getAll() {
  return _getCache();
}

async function set(chave, valor) {
  if (!CHAVES.includes(chave)) throw new Error(`Chave inválida: ${chave}`);
  await prisma.configuracao.upsert({
    where:  { chave },
    update: { valor },
    create: { id: randomUUID(), chave, valor },
  });
  _invalidateCache();
}

async function setMany(obj) {
  const invalidas = Object.keys(obj).filter(k => !CHAVES.includes(k));
  if (invalidas.length) throw new Error(`Chaves inválidas: ${invalidas.join(', ')}`);

  // Transação atômica — ou todas as configs são salvas ou nenhuma
  await prisma.$transaction(
    Object.entries(obj).map(([chave, valor]) =>
      prisma.configuracao.upsert({
        where:  { chave },
        update: { valor },
        create: { id: randomUUID(), chave, valor },
      })
    )
  );
  _invalidateCache();
}

module.exports = { get, getAll, set, setMany, CHAVES };
