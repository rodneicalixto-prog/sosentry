const BASE = process.env.EVOLUTION_API_URL || 'https://evogo.sosbot.online';
const KEY  = process.env.EVOLUTION_API_KEY;
const INST = process.env.EVOLUTION_INSTANCE;
const RESP = process.env.WHATSAPP_RESPONSAVEL;

async function send(number, text) {
  const n = number.replace(/\D/g,'');
  const dest = n.startsWith('55') ? n : '55'+n;
  const r = await fetch(`${BASE}/message/sendText/${INST}`, {
    method:'POST',
    headers:{ apikey: KEY, 'Content-Type':'application/json' },
    body: JSON.stringify({ number: dest, text })
  });
  if (!r.ok) throw new Error('Evo '+r.status);
}

async function enviarEntrada(reg) {
  const hora = new Date(reg.dataEntrada).toLocaleTimeString('pt-BR');
  const data = new Date(reg.dataEntrada).toLocaleDateString('pt-BR');
  const msg  = `✅ *SOS Entry — Entrada registrada!*\n\n` +
    `📋 Protocolo: ${reg.protocolo}\n` +
    `🚛 Placa: ${reg.placa}\n⏰ ${hora} · 📅 ${data}\n\n` +
    `Para registrar saída envie:\n*SAÍDA ${reg.protocolo}*`;
  const resp = `🚛 *SOS Entry — Novo veículo*\n\n` +
    `📋 ${reg.protocolo}\n🏗️ ${reg.portaria?.nome||''}\n` +
    `👤 ${reg.nomeMotorista}\n📞 ${reg.telefoneMotorista}\n` +
    `🚗 ${reg.tipoVeiculo} - ${reg.placa}\n` +
    `🏢 ${reg.empresa||'-'}\n📄 NF: ${reg.notaFiscal||'-'}\n` +
    `📦 ${reg.tipoOperacao}\n⏰ ${hora}\n` +
    `🔐 Op: ${reg.operadorEntrada?.nome||'-'}`;
  await Promise.allSettled([
    send(reg.telefoneMotorista, msg)
      .catch(e => console.error(`[evo] motorista ${reg.telefoneMotorista}: ${e.message}`)),
    RESP
      ? send(RESP, resp).catch(e => console.error(`[evo] responsável ${RESP}: ${e.message}`))
      : Promise.resolve()
  ]);
}

async function enviarSaida(reg) {
  const hora = new Date(reg.horaSaida).toLocaleTimeString('pt-BR');
  await send(reg.telefoneMotorista,
    `✅ *SOS Entry — Saída registrada!*\n\n📋 ${reg.protocolo}\n⏰ ${hora}\n\nObrigado! ✌️`);
}

module.exports = { send, enviarEntrada, enviarSaida };
