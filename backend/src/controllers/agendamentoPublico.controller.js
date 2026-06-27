const path = require('path');
const prisma = require('../lib/prisma');
const sseSvc = require('../services/sse.service');
const webhookSvc = require('../services/webhook.service');
const qrSvc = require('../services/qrcode.service');
const evo = require('../services/evolution.service');
const emailSvc = require('../services/email.service');
const { telefonesNotificados } = require('../helpers/notificacao.helper');

// ─── Buscar agendamento pelo token (público) ──────────────────────────────────

exports.buscar = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { token: req.params.token },
      select: {
        id: true, status: true, tokenExpiraEm: true,
        departamento: true, pedidoInterno: true, observacoes: true,
        portaria: { select: { nome: true } },
        criadoPor: { select: { nome: true } },
        dataEntrega: true,
      },
    });
    if (!ag) return res.status(404).json({ error: 'Link inválido ou expirado' });
    if (new Date() > ag.tokenExpiraEm)
      return res.status(410).json({ error: 'Link expirado. Solicite um novo link ao responsável.' });
    if (ag.status !== 'AGUARDANDO_NF')
      return res.status(409).json({ error: 'Este link já foi utilizado.', status: ag.status });
    res.json(ag);
  } catch (e) { next(e); }
};

// ─── Submeter NF (público) ────────────────────────────────────────────────────

exports.submeter = async (req, res, next) => {
  try {
    // Valida token e expiração antes de ler o body
    const agCheck = await prisma.agendamento.findUnique({
      where: { token: req.params.token },
      select: { id: true, tokenExpiraEm: true, status: true },
    });
    if (!agCheck) return res.status(404).json({ error: 'Link inválido ou expirado' });
    if (new Date() > agCheck.tokenExpiraEm)
      return res.status(410).json({ error: 'Link expirado. Solicite um novo link ao responsável.' });
    if (agCheck.status !== 'AGUARDANDO_NF')
      return res.status(409).json({ error: 'Este link já foi utilizado.' });

    const { empresa, cnpj, motorista, cpfMotorista, placa, tipoVeiculo,
            numeroNF, valorNF, dataEntrega, horarioPref, observacoes,
            emailEmpresa, telefoneMotorista, emailMotorista } = req.body;

    if (!empresa)      return res.status(400).json({ error: 'empresa obrigatório' });
    if (!motorista)    return res.status(400).json({ error: 'motorista obrigatório' });
    if (!cpfMotorista) return res.status(400).json({ error: 'CPF do motorista obrigatório' });
    if (!placa)        return res.status(400).json({ error: 'placa obrigatória' });
    if (!tipoVeiculo)  return res.status(400).json({ error: 'tipo de veículo obrigatório' });
    if (!numeroNF)     return res.status(400).json({ error: 'número da NF obrigatório' });
    if (!dataEntrega)  return res.status(400).json({ error: 'data de entrega obrigatória' });
    if (!horarioPref)  return res.status(400).json({ error: 'horário preferencial obrigatório' });

    const dtEntrega = new Date(dataEntrega);
    if (isNaN(dtEntrega)) return res.status(400).json({ error: 'Data de entrega inválida' });

    const nfUrl = req.file
      ? `/uploads/nf/${req.file.filename}`
      : null;

    // updateMany com status como condição — evita race condition entre requests concorrentes
    const { count } = await prisma.agendamento.updateMany({
      where: { id: agCheck.id, status: 'AGUARDANDO_NF' },
      data: {
        status: 'NF_RECEBIDA',
        empresa, cnpj: cnpj || null, motorista, cpfMotorista,
        placa: placa.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{3})(.+)$/, '$1-$2'),
        tipoVeiculo, numeroNF,
        valorNF: valorNF ? parseFloat(valorNF) : null,
        nfArquivoUrl: nfUrl,
        dataEntrega: dtEntrega,
        horarioPref,
        observacoes: observacoes || null,
      },
    });

    if (count === 0)
      return res.status(409).json({ error: 'Este link já foi utilizado.' });

    const updated = await prisma.agendamento.findUnique({
      where: { id: agCheck.id },
      include: { portaria: { select: { nome: true } } },
    });

    const qrBase64 = await qrSvc.gerarQRCodeBase64({
      agendamentoId: updated.id,
      token: updated.token,
      placa: updated.placa,
      motorista: updated.motorista,
      empresa: updated.empresa,
      nf: updated.numeroNF,
      dataEntrega: updated.dataEntrega,
      horario: updated.horarioPref,
    });

    sseSvc.broadcast('agendamento_nf_recebida', {
      agendamentoId: updated.id, empresa: updated.empresa,
      numeroNF: updated.numeroNF, dataEntrega: updated.dataEntrega,
      horarioPref: updated.horarioPref, portaria: updated.portaria?.nome,
    });
    webhookSvc.disparar('agendamento.nf_recebida', updated).catch(() => {});
    // Notificações internas (departamentos/setores)
    telefonesNotificados().then(nums => evo.enviarAgendamentoNFRecebida(updated, nums)).catch(() => {});
    emailSvc.enviarAgendamentoNFRecebida(updated).catch(() => {});

    // QR Code para a empresa externa (e-mail e WhatsApp do motorista)
    if (emailEmpresa && /\S+@\S+\.\S+/.test(emailEmpresa))
      emailSvc.enviarQRCodeConfirmacao(emailEmpresa, updated, qrBase64).catch(() => {});
    if (emailMotorista && /\S+@\S+\.\S+/.test(emailMotorista))
      emailSvc.enviarQRCodeConfirmacao(emailMotorista, updated, qrBase64).catch(() => {});
    if (telefoneMotorista)
      evo.enviarQRCodeMotorista(telefoneMotorista, updated, qrBase64).catch(() => {});

    res.json({ agendamento: updated, qrCode: qrBase64 });
  } catch (e) { next(e); }
};
