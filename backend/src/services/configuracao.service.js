const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CHAVES = ['evo_url', 'evo_key', 'evo_instance', 'evo_responsavel'];

async function get(chave) {
  const r = await prisma.configuracao.findUnique({ where: { chave } });
  if (r?.valor) return r.valor;
  // fallback para variável de ambiente durante transição
  const envMap = {
    evo_url:         process.env.EVOLUTION_API_URL || 'https://evogo.sosbot.online',
    evo_key:         process.env.EVOLUTION_API_KEY,
    evo_instance:    process.env.EVOLUTION_INSTANCE,
    evo_responsavel: process.env.WHATSAPP_RESPONSAVEL,
  };
  return envMap[chave] ?? null;
}

async function getAll() {
  const rows = await prisma.configuracao.findMany({ where: { chave: { in: CHAVES } } });
  const map = Object.fromEntries(rows.map(r => [r.chave, r.valor]));
  const envMap = {
    evo_url:         process.env.EVOLUTION_API_URL || 'https://evogo.sosbot.online',
    evo_key:         process.env.EVOLUTION_API_KEY,
    evo_instance:    process.env.EVOLUTION_INSTANCE,
    evo_responsavel: process.env.WHATSAPP_RESPONSAVEL,
  };
  return CHAVES.reduce((acc, k) => {
    acc[k] = map[k] ?? envMap[k] ?? '';
    return acc;
  }, {});
}

async function set(chave, valor) {
  await prisma.configuracao.upsert({
    where:  { chave },
    update: { valor },
    create: { id: require('crypto').randomUUID(), chave, valor },
  });
}

async function setMany(obj) {
  await Promise.all(Object.entries(obj).map(([k, v]) => set(k, v)));
}

module.exports = { get, getAll, set, setMany, CHAVES };
