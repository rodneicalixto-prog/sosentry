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

async function enviarOcorrencia(oc) {
  const { resp } = await getConfig();
  const pad = n => String(n).padStart(2, '0');
  const d = new Date(oc.dataHora);
  const hora = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const data = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth()+1)}/${d.getUTCFullYear()}`;
  const descTrunc = oc.descricao?.length > 300 ? oc.descricao.slice(0, 297) + '...' : oc.descricao;
  const envolvidos = Array.isArray(oc.envolvidos) ? oc.envolvidos.length : 0;
  const acionamentos = Array.isArray(oc.acionamentos) ? oc.acionamentos.length : 0;

  const msg =
    `🚨 *SOS Entry — Nova Ocorrência*\n\n` +
    `📋 Protocolo: *${oc.protocolo}*\n` +
    `🗂️ Categoria: ${oc.categoria}\n` +
    `📌 Tipo: ${oc.tipo}\n` +
    `📍 Local: ${oc.local}\n` +
    `🕐 Data/Hora: ${hora} · ${data}\n` +
    `👤 Registrado por: ${oc.registradoPor?.nome || '-'}\n` +
    (envolvidos   ? `👥 Envolvidos: ${envolvidos} pessoa(s)\n` : '') +
    (acionamentos ? `📞 Acionamentos: ${acionamentos} serviço(s)\n` : '') +
    `\n📝 *Descrição:*\n${descTrunc}\n\n` +
    `⚠️ Status: ${oc.status?.replace('_', ' ').toUpperCase()}`;

  const tasks = [];
  if (resp) tasks.push(send(resp, msg).catch(e => console.error(`[evo] ocorrência responsável: ${e.message}`)));
  await Promise.allSettled(tasks);
}

function fmtData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth()+1)}/${d.getUTCFullYear()}`;
}

async function enviarAgendamentoNFRecebida(ag, destinos) {
  const msg =
    `📦 *SOS Entry — NF Recebida*\n\n` +
    `🏢 Empresa: *${ag.empresa || '—'}*\n` +
    `📄 NF: ${ag.numeroNF || '—'}\n` +
    `🚛 Placa: ${ag.placa || '—'}\n` +
    `👤 Motorista: ${ag.motorista || '—'}\n` +
    `📅 Previsão: ${fmtData(ag.dataEntrega)} às ${ag.horarioPref || '—'}\n` +
    `🏗️ Portaria: ${ag.portaria?.nome || '—'}\n` +
    `\n⚠️ Aguardando aprovação interna.`;
  await Promise.allSettled(destinos.map(n => send(n, msg).catch(e => console.error(`[evo] ag nf: ${e.message}`))));
}

async function enviarAgendamentoAprovado(ag, destinos) {
  const msg =
    `✅ *SOS Entry — Entrega APROVADA*\n\n` +
    `🏢 Empresa: *${ag.empresa || '—'}*\n` +
    `📄 NF: ${ag.numeroNF || '—'}\n` +
    `🚛 Placa: ${ag.placa || '—'}\n` +
    `📅 Data prevista: ${fmtData(ag.dataEntrega)} às ${ag.horarioPref || '—'}\n` +
    `🏗️ Portaria: ${ag.portaria?.nome || '—'}\n` +
    `\n🔓 A entrada está liberada. A portaria será notificada na chegada.`;
  await Promise.allSettled(destinos.map(n => send(n, msg).catch(e => console.error(`[evo] ag aprovado: ${e.message}`))));
}

async function enviarAgendamentoChegada(ag, destinos) {
  const msg =
    `🚛 *SOS Entry — CAMINHÃO NA PORTARIA*\n\n` +
    `🏢 Empresa: *${ag.empresa || '—'}*\n` +
    `👤 Motorista: ${ag.motorista || '—'}\n` +
    `🚗 Placa: ${ag.placa || '—'}\n` +
    `📄 NF: ${ag.numeroNF || '—'}\n` +
    `🏗️ Portaria: ${ag.portaria?.nome || '—'}\n` +
    `⏰ Chegada: ${fmtDataHora(ag.chegadaEm).hora} · ${fmtDataHora(ag.chegadaEm).data}\n` +
    `\n⚡ Aguardando liberação da doca.`;
  await Promise.allSettled(destinos.map(n => send(n, msg).catch(e => console.error(`[evo] ag chegada: ${e.message}`))));
}

async function enviarLinkAgendamento(numero, link, ag) {
  const msg =
    `📦 *Agendamento de Entrega — SOS Entry*\n\n` +
    `Olá! Você recebeu um link para preencher os dados de entrega.\n\n` +
    (ag.pedidoInterno ? `📋 Pedido: *${ag.pedidoInterno}*\n` : '') +
    `🏢 Departamento: ${ag.departamento}\n\n` +
    `🔗 *Acesse o link para preencher:*\n${link}\n\n` +
    `⚠️ Este link expira em 72 horas. Após preencher, um QR Code será gerado para a portaria.`;
  await send(numero, msg).catch(e => console.error('[evo] link agendamento:', e.message));
}

async function enviarQRCodeMotorista(numero, ag, qrBase64) {
  // Envia mensagem de texto com dados — envio de imagem requer outro endpoint da Evolution API
  const msg =
    `🚛 *SOS Entry — QR Code de Entrada*\n\n` +
    `Seu agendamento foi recebido com sucesso!\n\n` +
    `🏢 Empresa: ${ag.empresa}\n` +
    `📄 NF: ${ag.numeroNF}\n` +
    `📅 Data prevista: ${fmtData(ag.dataEntrega)} às ${ag.horarioPref || '—'}\n\n` +
    `Na chegada à portaria, apresente o QR Code. Você pode acessá-lo em:\n` +
    `${process.env.FRONTEND_URL || ''}/agendamento/${ag.token}/qr\n\n` +
    `⚡ A portaria e os setores serão notificados automaticamente.`;
  await send(numero, msg).catch(e => console.error('[evo] qr motorista:', e.message));
}

module.exports = {
  send, enviarEntrada, enviarSaida, enviarSetor, enviarOcorrencia,
  enviarAgendamentoNFRecebida, enviarAgendamentoAprovado, enviarAgendamentoChegada,
  enviarLinkAgendamento, enviarQRCodeMotorista,
};
