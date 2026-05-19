const prisma = require('../lib/prisma');
const evo    = require('./evolution.service');

// Eventos disponíveis — usados no frontend e no dispatch
const EVENTOS = {
  'portaria:entrada':                    'Portaria — Entrada',
  'portaria:saida':                      'Portaria — Saída',
  'ocorrencia:Segurança do Trabalho':    'Ocorrência: Segurança do Trabalho',
  'ocorrencia:Segurança Patrimonial':    'Ocorrência: Segurança Patrimonial',
  'ocorrencia:Conflitos Internos':       'Ocorrência: Conflitos Internos',
  'ocorrencia:Veículos e Estacionamento':'Ocorrência: Veículos e Estacionamento',
  'ocorrencia:Infraestrutura':           'Ocorrência: Infraestrutura',
  'ocorrencia:Ocorrências Externas':     'Ocorrência: Ocorrências Externas',
  'ocorrencia:Danos ao Patrimônio':      'Ocorrência: Danos ao Patrimônio',
  'ocorrencia:Saúde / Mal-estar':        'Ocorrência: Saúde / Mal-estar',
  'ocorrencia:Outras Ocorrências':       'Ocorrência: Outras Ocorrências',
};

async function disparar(eventoKeys, msg) {
  try {
    const contatos = await prisma.contatoNotificacao.findMany({
      where: { ativo: true, eventos: { hasSome: eventoKeys } },
    });
    const vistos = new Set();
    for (const c of contatos) {
      if (vistos.has(c.id)) continue;
      vistos.add(c.id);
      evo.send(c.telefone, msg)
        .catch(e => console.error(`[notif] ${c.nome}: ${e.message}`));
    }
  } catch (e) {
    console.error('[notificacao] erro ao disparar:', e.message);
  }
}

function _fmtDH(iso) {
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return { hora: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`, data: `${p(d.getUTCDate())}/${p(d.getUTCMonth()+1)}/${d.getUTCFullYear()}` };
}

function msgPortariaEntrada(reg) {
  const { hora, data } = _fmtDH(reg.dataEntrada);
  return `🟢 *SOS Entry — Entrada*\n\n` +
    `📋 ${reg.protocolo}\n` +
    `👤 ${reg.nomeMotorista}\n` +
    `🚗 ${reg.tipoVeiculo} · ${reg.placa}\n` +
    `🏢 ${reg.empresa || '-'}\n` +
    `📦 ${reg.tipoOperacao}\n` +
    `🚪 ${reg.portaria?.nome || '-'}\n` +
    `⏰ ${hora} · ${data}`;
}

function msgPortariaSaida(reg) {
  const { hora, data } = _fmtDH(reg.horaSaida);
  return `🔴 *SOS Entry — Saída*\n\n` +
    `📋 ${reg.protocolo}\n` +
    `👤 ${reg.nomeMotorista}\n` +
    `🚗 ${reg.tipoVeiculo} · ${reg.placa}\n` +
    `🏢 ${reg.empresa || '-'}\n` +
    `🚪 ${reg.portaria?.nome || '-'}\n` +
    `⏰ ${hora} · ${data}`;
}

function msgOcorrencia(oc) {
  const { hora, data } = _fmtDH(oc.dataHora);
  const desc = oc.descricao?.length > 250 ? oc.descricao.slice(0, 247) + '...' : oc.descricao;
  const envolvidos = Array.isArray(oc.envolvidos) ? oc.envolvidos.length : 0;
  return `🚨 *SOS Entry — Ocorrência*\n\n` +
    `📋 ${oc.protocolo}\n` +
    `🗂️ ${oc.categoria}\n` +
    `📌 ${oc.tipo}\n` +
    `📍 ${oc.local}\n` +
    `⏰ ${hora} · ${data}\n` +
    `👤 ${oc.registradoPor?.nome || '-'}\n` +
    (envolvidos ? `👥 Envolvidos: ${envolvidos}\n` : '') +
    `\n📝 ${desc}`;
}

async function portariaEntrada(reg) {
  await disparar(['portaria:entrada'], msgPortariaEntrada(reg));
}

async function portariaSaida(reg) {
  await disparar(['portaria:saida'], msgPortariaSaida(reg));
}

async function ocorrencia(oc) {
  // Envia para quem assinou a categoria específica da ocorrência
  await disparar([`ocorrencia:${oc.categoria}`], msgOcorrencia(oc));
}

module.exports = { portariaEntrada, portariaSaida, ocorrencia, EVENTOS };
