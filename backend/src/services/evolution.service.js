const cfg = require('./configuracao.service');

async function getConfig() {
  const [base, key, inst, resp] = await Promise.all([
    cfg.get('evo_url'),
    cfg.get('evo_key'),
    cfg.get('evo_instance'),
    cfg.get('evo_responsavel'),
  ]);
  return { base: base || 'https://evogo.sosbot.online', key, inst, resp };
}

async function send(number, text) {
  const { base, key, inst } = await getConfig();
  const n = number.replace(/\D/g, '');
  const dest = n.startsWith('55') ? n : '55' + n;
  const r = await fetch(`${base}/message/sendText/${inst}`, {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: dest, text }),
  });
  if (!r.ok) throw new Error('Evo ' + r.status);
}

function fmtDataHora(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return {
    hora: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    data: `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`,
  };
}

async function enviarEntrada(reg) {
  const { resp } = await getConfig();
  const { hora, data } = fmtDataHora(reg.dataEntrada);
  const msg =
    `✅ *SOS Entry — Entrada registrada!*\n\n` +
    `📋 Protocolo: ${reg.protocolo}\n` +
    `🚛 Placa: ${reg.placa}\n⏰ ${hora} · 📅 ${data}\n\n` +
    `Para registrar saída envie:\n*SAÍDA ${reg.protocolo}*`;
  const msgResp =
    `🚛 *SOS Entry — Novo veículo*\n\n` +
    `📋 ${reg.protocolo}\n🏗️ ${reg.portaria?.nome || ''}\n` +
    `👤 ${reg.nomeMotorista}\n📞 ${reg.telefoneMotorista}\n` +
    `🚗 ${reg.tipoVeiculo} - ${reg.placa}\n` +
    `🏢 ${reg.empresa || '-'}\n📄 NF: ${reg.notaFiscal || '-'}\n` +
    `📦 ${reg.tipoOperacao}\n⏰ ${hora}\n` +
    `🔐 Op: ${reg.operadorEntrada?.nome || '-'}`;

  const tasks = [];
  if (reg.telefoneMotorista) tasks.push(send(reg.telefoneMotorista, msg).catch(e => console.error(`[evo] motorista: ${e.message}`)));
  if (resp) tasks.push(send(resp, msgResp).catch(e => console.error(`[evo] responsável: ${e.message}`)));
  await Promise.allSettled(tasks);
}

async function enviarSaida(reg) {
  const { hora } = fmtDataHora(reg.horaSaida);
  if (reg.telefoneMotorista) {
    await send(reg.telefoneMotorista,
      `✅ *SOS Entry — Saída registrada!*\n\n📋 ${reg.protocolo}\n⏰ ${hora}\n\nObrigado! ✌️`
    ).catch(e => console.error(`[evo] motorista saída: ${e.message}`));
  }
}

async function enviarSetor(numero, nomeSetor, evento, reg) {
  const { hora } = fmtDataHora(evento === 'saida' ? (reg.horaSaida || new Date()) : reg.dataEntrada);
  const emoji = evento === 'entrada' ? '🟢' : '🔴';
  const tipo  = evento === 'entrada' ? 'Entrada' : 'Saída';
  const msg =
    `${emoji} *SOS Entry — ${tipo} [${nomeSetor}]*\n\n` +
    `📋 ${reg.protocolo}\n` +
    `👤 ${reg.nomeMotorista}\n` +
    `🚗 ${reg.tipoVeiculo} - ${reg.placa}\n` +
    `🏢 ${reg.empresa || '-'}\n` +
    `📦 ${reg.tipoOperacao}\n` +
    `⏰ ${hora}`;
  await send(numero, msg).catch(e => console.error(`[evo] setor ${nomeSetor}: ${e.message}`));
}

module.exports = { send, enviarEntrada, enviarSaida, enviarSetor };
