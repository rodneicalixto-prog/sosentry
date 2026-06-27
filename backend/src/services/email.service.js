const nodemailer = require('nodemailer');
const cfg = require('./configuracao.service');

let _transport = null;

async function getTransport() {
  if (_transport) return _transport;
  const host = await cfg.get('smtp_host');
  const port = Number(await cfg.get('smtp_port') || 587);
  const user = await cfg.get('smtp_user');
  const pass = await cfg.get('smtp_pass');
  const from = await cfg.get('smtp_from') || user;
  if (!host || !user || !pass) return null;
  _transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, pool: true });
  _transport._from = from;
  return _transport;
}

async function send({ to, subject, html, text }) {
  const t = await getTransport();
  if (!t) return; // e-mail não configurado — ignora silenciosamente
  await t.sendMail({ from: t._from, to, subject, html, text });
}

function fmtData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth()+1)}/${d.getUTCFullYear()}`;
}

async function destinatariosEmail() {
  const prisma = require('../lib/prisma');
  const usuarios = await prisma.user.findMany({
    where: { ativo: true, email: { not: null }, recebeWhatsapp: true }, // reutiliza flag de notificação
    select: { email: true },
  });
  return [...new Set(usuarios.map(u => u.email).filter(Boolean))];
}

// ─── Templates ──────────────────────────────────────────────────────────────

function templateBase(titulo, corpo) {
  return `
<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;font-family:sans-serif;background:#f4f4f4">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#1d4ed8;padding:24px 32px">
    <span style="color:#fff;font-size:20px;font-weight:700">SOS Entry</span>
    <span style="color:#93c5fd;font-size:14px;margin-left:12px">Agendamento de Carga</span>
  </td></tr>
  <tr><td style="padding:32px">
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px">${titulo}</h2>
    ${corpo}
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 32px;color:#64748b;font-size:12px">
    Mensagem automática do sistema SOS Entry. Não responda este e-mail.
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

function row(label, value) {
  if (!value) return '';
  return `<tr>
    <td style="padding:6px 0;color:#64748b;font-size:13px;width:140px">${label}</td>
    <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600">${value}</td>
  </tr>`;
}

// ─── Eventos ────────────────────────────────────────────────────────────────

async function enviarAgendamentoNFRecebida(ag) {
  const destinos = await destinatariosEmail();
  if (!destinos.length) return;
  const corpo = `
    <p style="color:#374151;margin:0 0 16px">Uma nova nota fiscal foi recebida e aguarda aprovação interna.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%">
      ${row('Empresa', ag.empresa)}
      ${row('NF', ag.numeroNF)}
      ${row('Placa', ag.placa)}
      ${row('Motorista', ag.motorista)}
      ${row('Previsão', `${fmtData(ag.dataEntrega)} às ${ag.horarioPref || '—'}`)}
      ${row('Portaria', ag.portaria?.nome)}
    </table>
    <p style="margin:24px 0 0;padding:12px 16px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:13px">
      ⚠️ Acesse o painel para aprovar o agendamento.
    </p>`;
  await send({
    to: destinos.join(', '),
    subject: `📦 NF Recebida — ${ag.empresa || '—'} | SOS Entry`,
    html: templateBase('NF Recebida — Aguardando Aprovação', corpo),
  }).catch(e => console.error('[email] nf_recebida:', e.message));
}

async function enviarAgendamentoAprovado(ag) {
  const destinos = await destinatariosEmail();
  if (!destinos.length) return;
  const corpo = `
    <p style="color:#374151;margin:0 0 16px">O agendamento foi aprovado. A portaria está autorizada a receber esta entrega.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%">
      ${row('Empresa', ag.empresa)}
      ${row('NF', ag.numeroNF)}
      ${row('Placa', ag.placa)}
      ${row('Data prevista', `${fmtData(ag.dataEntrega)} às ${ag.horarioPref || '—'}`)}
      ${row('Portaria', ag.portaria?.nome)}
    </table>
    <p style="margin:24px 0 0;padding:12px 16px;background:#dcfce7;border-radius:8px;color:#166534;font-size:13px">
      ✅ Entrada aprovada na portaria.
    </p>`;
  await send({
    to: destinos.join(', '),
    subject: `✅ Entrega Aprovada — ${ag.empresa || '—'} | SOS Entry`,
    html: templateBase('Entrega Aprovada na Portaria', corpo),
  }).catch(e => console.error('[email] aprovado:', e.message));
}

async function enviarAgendamentoChegada(ag) {
  const destinos = await destinatariosEmail();
  if (!destinos.length) return;
  const d = new Date(ag.chegadaEm || new Date());
  const hora = `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
  const corpo = `
    <p style="color:#374151;margin:0 0 16px">O caminhão chegou à portaria e está aguardando liberação da doca.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%">
      ${row('Empresa', ag.empresa)}
      ${row('Motorista', ag.motorista)}
      ${row('Placa', ag.placa)}
      ${row('NF', ag.numeroNF)}
      ${row('Portaria', ag.portaria?.nome)}
      ${row('Chegada', `${hora} · ${fmtData(ag.chegadaEm)}`)}
    </table>
    <p style="margin:24px 0 0;padding:12px 16px;background:#ede9fe;border-radius:8px;color:#4c1d95;font-size:13px">
      🚛 Acesse o sistema para coordenar o recebimento.
    </p>`;
  await send({
    to: destinos.join(', '),
    subject: `🚛 Caminhão na Portaria — ${ag.empresa || '—'} | SOS Entry`,
    html: templateBase('Caminhão Aguardando na Portaria', corpo),
  }).catch(e => console.error('[email] chegada:', e.message));
}

async function enviarQRCodeConfirmacao(emailDestino, ag, qrBase64) {
  const corpo = `
    <p style="color:#374151;margin:0 0 16px">
      Seus dados foram recebidos com sucesso! Apresente o QR Code abaixo na portaria no dia da entrega.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px">
      ${row('Empresa', ag.empresa)}
      ${row('NF', ag.numeroNF)}
      ${row('Motorista', ag.motorista)}
      ${row('Placa', ag.placa)}
      ${row('Data prevista', `${fmtData(ag.dataEntrega)} às ${ag.horarioPref || '—'}`)}
      ${row('Portaria', ag.portaria?.nome)}
    </table>
    <div style="text-align:center;margin:24px 0">
      <img src="${qrBase64}" alt="QR Code" width="220" height="220"
           style="border:2px solid #e2e8f0;border-radius:12px" />
      <p style="color:#6b7280;font-size:12px;margin:8px 0 0">QR Code de entrada — apresentar na portaria</p>
    </div>
    <p style="margin:24px 0 0;padding:12px 16px;background:#dcfce7;border-radius:8px;color:#166534;font-size:13px">
      ✅ O agendamento foi registrado. A portaria será notificada automaticamente na chegada.
    </p>`;
  await send({
    to: emailDestino,
    subject: `✅ Agendamento Confirmado — QR Code de Entrada | SOS Entry`,
    html: templateBase('Agendamento Confirmado — Guarde seu QR Code', corpo),
  }).catch(e => console.error('[email] qr confirmacao:', e.message));
}

async function enviarLinkAgendamento(emailDestino, link, agendamento) {
  const corpo = `
    <p style="color:#374151;margin:0 0 16px">
      Você recebeu um link para preencher os dados da entrega referente ao pedido
      <strong>${agendamento.pedidoInterno || 'sem número'}</strong>.
    </p>
    <p style="color:#374151;margin:0 0 16px">
      Departamento responsável: <strong>${agendamento.departamento}</strong>
      ${agendamento.portaria?.nome ? ` · Portaria: <strong>${agendamento.portaria.nome}</strong>` : ''}
    </p>
    ${agendamento.observacoes ? `<p style="color:#6b7280;font-size:13px;margin:0 0 16px">${agendamento.observacoes}</p>` : ''}
    <div style="text-align:center;margin:32px 0">
      <a href="${link}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block">
        Preencher Dados da Entrega
      </a>
    </div>
    <p style="color:#6b7280;font-size:12px;margin:0 0 8px">Ou copie o link abaixo:</p>
    <p style="color:#1d4ed8;font-size:12px;word-break:break-all">${link}</p>
    <p style="margin:24px 0 0;padding:12px 16px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:13px">
      ⚠️ Este link expira em 72 horas. Após o preenchimento, um QR Code será gerado para uso na portaria.
    </p>`;
  await send({
    to: emailDestino,
    subject: `📦 Agendamento de Entrega — Preencha os dados | SOS Entry`,
    html: templateBase('Agendamento de Entrega', corpo),
  });
}

module.exports = {
  send,
  enviarAgendamentoNFRecebida,
  enviarAgendamentoAprovado,
  enviarAgendamentoChegada,
  enviarLinkAgendamento,
  enviarQRCodeConfirmacao,
};
