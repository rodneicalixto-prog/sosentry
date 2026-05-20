const prisma = require('../lib/prisma');
const evo    = require('./evolution.service');

// Eventos disponíveis — usados no frontend e no dispatch
const EVENTOS = {
  'portaria2:veiculo:entrada':             'Portaria 2 — Entrada de Veículos',
  'portaria2:veiculo:saida':               'Portaria 2 — Saída de Veículos',
  'portaria2:pedestre:entrada':            'Portaria 2 — Entrada de Pedestres',
  'portaria2:pedestre:saida':              'Portaria 2 — Saída de Pedestres',
  'portaria1:pedestre:entrada':            'Portaria 1 — Entrada de Pedestres',
  'portaria1:pedestre:saida':              'Portaria 1 — Saída de Pedestres',
  // legado — contatos antigos continuam recebendo
  'portaria:entrada':                      'Portaria — Entrada (todos)',
  'portaria:saida':                        'Portaria — Saída (todos)',
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
  const num   = reg.portaria?.numero
  const tipo  = reg.portaria?.tipo === 'pedestres' ? 'pedestre' : 'veiculo'
  const keys  = ['portaria:entrada']
  if (num) keys.push(`portaria${num}:${tipo}:entrada`)
  await disparar(keys, msgPortariaEntrada(reg));
}

async function portariaSaida(reg) {
  const num   = reg.portaria?.numero
  const tipo  = reg.portaria?.tipo === 'pedestres' ? 'pedestre' : 'veiculo'
  const keys  = ['portaria:saida']
  if (num) keys.push(`portaria${num}:${tipo}:saida`)
  await disparar(keys, msgPortariaSaida(reg));
}

async function ocorrencia(oc) {
  // Envia para quem assinou a categoria específica da ocorrência
  await disparar([`ocorrencia:${oc.categoria}`], msgOcorrencia(oc));
}

module.exports = { portariaEntrada, portariaSaida, ocorrencia, EVENTOS };
