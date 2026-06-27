const { v4: uuid } = require('uuid');
const prisma = require('../lib/prisma');
const sseSvc = require('../services/sse.service');
const webhookSvc = require('../services/webhook.service');
const qrSvc = require('../services/qrcode.service');
const evo = require('../services/evolution.service');
const emailSvc = require('../services/email.service');
const { telefonesNotificados } = require('../helpers/notificacao.helper');

const TOKEN_HORAS = 72;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenExpiracao() {
  const d = new Date();
  d.setTime(d.getTime() + TOKEN_HORAS * 3600000);
  return d;
}

function buildQRPayload(ag) {
  return {
    agendamentoId: ag.id,
    token: ag.token,
    placa: ag.placa,
    motorista: ag.motorista,
    empresa: ag.empresa,
    nf: ag.numeroNF,
    dataEntrega: ag.dataEntrega,
    horario: ag.horarioPref,
  };
}

// ─── Listar ──────────────────────────────────────────────────────────────────

exports.listar = async (req, res, next) => {
  try {
    const { page = 1, status, departamento, busca, dataInicio, dataFim } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (Number(page) - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (departamento) where.departamento = departamento;
    if (busca) {
      const term = busca.trim();
      where.OR = [
        { empresa:      { contains: term, mode: 'insensitive' } },
        { motorista:    { contains: term, mode: 'insensitive' } },
        { placa:        { contains: term, mode: 'insensitive' } },
        { numeroNF:     { contains: term, mode: 'insensitive' } },
        { pedidoInterno:{ contains: term, mode: 'insensitive' } },
      ];
    }
    if (dataInicio || dataFim) {
      const ini = dataInicio ? new Date(dataInicio + 'T00:00:00Z') : null;
      const fim = dataFim   ? new Date(dataFim   + 'T23:59:59Z') : null;
      if ((ini && isNaN(ini)) || (fim && isNaN(fim)))
        return res.status(400).json({ error: 'Data inválida (use YYYY-MM-DD)' });
      where.dataEntrega = {};
      if (ini) where.dataEntrega.gte = ini;
      if (fim) where.dataEntrega.lte = fim;
    }
    const [agendamentos, total] = await Promise.all([
      prisma.agendamento.findMany({
        where, skip, take: limit, orderBy: { criadoEm: 'desc' },
        include: {
          criadoPor:   { select: { nome: true } },
          aprovadoPor: { select: { nome: true } },
          portaria:    { select: { nome: true, numero: true } },
        },
      }),
      prisma.agendamento.count({ where }),
    ]);
    res.json({ agendamentos, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
};

// ─── Criar link ──────────────────────────────────────────────────────────────

exports.criar = async (req, res, next) => {
  try {
    const { portariaId, departamento, pedidoInterno, observacoes, emailDestino, whatsappDestino, empresaId } = req.body;
    if (!portariaId) return res.status(400).json({ error: 'portariaId obrigatório' });
    if (!departamento) return res.status(400).json({ error: 'departamento obrigatório' });

    const portaria = await prisma.portaria.findUnique({ where: { id: portariaId } });
    if (!portaria) return res.status(404).json({ error: 'Portaria não encontrada' });

    // Se empresaId fornecido, buscar email/whatsapp cadastrados como fallback
    let emailEfetivo = emailDestino, waEfetivo = whatsappDestino;
    if (empresaId && (!emailEfetivo || !waEfetivo)) {
      const emp = await prisma.empresa.findUnique({ where: { id: empresaId } }).catch(() => null);
      if (emp) {
        if (!emailEfetivo) emailEfetivo = emp.email;
        if (!waEfetivo)    waEfetivo    = emp.whatsapp;
      }
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        token: uuid(),
        tokenExpiraEm: tokenExpiracao(),
        criadoPorId: req.user.id,
        portariaId,
        departamento,
        pedidoInterno: pedidoInterno || null,
        observacoes: observacoes || null,
        empresaId: empresaId || null,
      },
      include: { portaria: { select: { nome: true } } },
    });

    const link = `${process.env.FRONTEND_URL}/agendamento/${agendamento.token}`;

    // Enviar link para empresa externa via e-mail e/ou WhatsApp
    if (emailEfetivo && /\S+@\S+\.\S+/.test(emailEfetivo)) {
      emailSvc.enviarLinkAgendamento(emailEfetivo, link, agendamento)
        .catch(e => console.error('[email] link agendamento:', e.message));
    }
    if (waEfetivo) {
      evo.enviarLinkAgendamento(waEfetivo, link, agendamento)
        .catch(e => console.error('[evo] link agendamento:', e.message));
    }

    res.status(201).json({ agendamento, link });
  } catch (e) { next(e); }
};

// ─── Detalhes ─────────────────────────────────────────────────────────────────

exports.buscar = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { id: req.params.id },
      include: {
        criadoPor:   { select: { nome: true } },
        aprovadoPor: { select: { nome: true } },
        portaria:    { select: { nome: true, numero: true } },
      },
    });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(ag);
  } catch (e) { next(e); }
};

// ─── QR Code PNG ──────────────────────────────────────────────────────────────

exports.qrcode = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({ where: { id: req.params.id } });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (ag.status === 'AGUARDANDO_NF')
      return res.status(400).json({ error: 'QR Code disponível somente após NF recebida' });
    const buf = await qrSvc.gerarQRCodeBuffer(buildQRPayload(ag));
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  } catch (e) { next(e); }
};

// ─── Aprovar ──────────────────────────────────────────────────────────────────

exports.aprovar = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({ where: { id: req.params.id } });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (ag.status !== 'NF_RECEBIDA')
      return res.status(400).json({ error: 'Somente agendamentos com NF recebida podem ser aprovados' });

    const updated = await prisma.agendamento.update({
      where: { id: ag.id },
      data: { status: 'APROVADO', aprovadoPorId: req.user.id, aprovadoEm: new Date() },
      include: { portaria: { select: { nome: true } } },
    });

    sseSvc.broadcast('agendamento_aprovado', {
      agendamentoId: updated.id, empresa: updated.empresa,
      placa: updated.placa, dataEntrega: updated.dataEntrega, portaria: updated.portaria?.nome,
    });
    webhookSvc.disparar('agendamento.aprovado', updated).catch(() => {});
    telefonesNotificados().then(nums => evo.enviarAgendamentoAprovado(updated, nums)).catch(() => {});
    emailSvc.enviarAgendamentoAprovado(updated).catch(() => {});

    res.json(updated);
  } catch (e) { next(e); }
};

// ─── Cancelar ─────────────────────────────────────────────────────────────────

exports.cancelar = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({ where: { id: req.params.id } });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (['CONCLUIDO', 'CANCELADO'].includes(ag.status))
      return res.status(400).json({ error: 'Agendamento já encerrado' });

    const updated = await prisma.agendamento.update({
      where: { id: ag.id },
      data: { status: 'CANCELADO' },
    });
    res.json(updated);
  } catch (e) { next(e); }
};

// ─── Validar QR (chegada na portaria → aguarda liberação do setor) ────────────

exports.validarQR = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token obrigatório' });

    const ag = await prisma.agendamento.findUnique({
      where: { token },
      include: { portaria: { select: { nome: true } }, criadoPor: { select: { nome: true } } },
    });
    if (!ag) return res.status(404).json({ error: 'QR Code inválido ou não encontrado' });
    if (ag.status === 'AGUARDANDO_LIBERACAO')
      return res.status(400).json({ error: 'QR já registrado — aguardando liberação do setor responsável', status: ag.status });
    if (ag.status !== 'APROVADO')
      return res.status(400).json({ error: 'Agendamento não está aprovado para entrada', status: ag.status });

    const updated = await prisma.agendamento.update({
      where: { id: ag.id },
      data: { status: 'AGUARDANDO_LIBERACAO', chegadaEm: new Date() },
      include: { portaria: { select: { nome: true } } },
    });

    // Notifica setor responsável que o veículo chegou e aguarda liberação
    sseSvc.broadcast('agendamento_aguardando_liberacao', {
      agendamentoId: updated.id, empresa: updated.empresa, motorista: updated.motorista,
      placa: updated.placa, portaria: updated.portaria?.nome, chegadaEm: updated.chegadaEm,
      departamento: updated.departamento,
    });
    webhookSvc.disparar('agendamento.aguardando_liberacao', updated).catch(() => {});
    telefonesNotificados().then(nums => evo.enviarAgendamentoAguardandoLiberacao(updated, nums)).catch(() => {});
    emailSvc.enviarAgendamentoAguardandoLiberacao(updated).catch(() => {});

    res.json(updated);
  } catch (e) { next(e); }
};

// ─── Liberar entrada (setor responsável confirma — portaria abre) ─────────────

exports.liberar = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { id: req.params.id },
      include: { portaria: { select: { nome: true } } },
    });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (ag.status !== 'AGUARDANDO_LIBERACAO')
      return res.status(400).json({ error: 'Agendamento não está aguardando liberação', status: ag.status });

    const updated = await prisma.agendamento.update({
      where: { id: ag.id },
      data: { status: 'NA_PORTARIA' },
      include: { portaria: { select: { nome: true } } },
    });

    sseSvc.broadcast('agendamento_liberado', {
      agendamentoId: updated.id, empresa: updated.empresa, motorista: updated.motorista,
      placa: updated.placa, portaria: updated.portaria?.nome,
      liberadoPor: req.user.nome || req.user.login,
    });
    webhookSvc.disparar('agendamento.liberado', updated).catch(() => {});
    telefonesNotificados().then(nums => evo.enviarAgendamentoLiberado(updated, nums)).catch(() => {});
    emailSvc.enviarAgendamentoLiberado(updated).catch(() => {});

    res.json(updated);
  } catch (e) { next(e); }
};

// ─── Registrar Saída do agendamento (CONCLUIDO) ───────────────────────────────

exports.concluir = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { id: req.params.id },
      include: { portaria: { select: { nome: true } } },
    });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (ag.status !== 'NA_PORTARIA')
      return res.status(400).json({ error: 'Agendamento não está na portaria', status: ag.status });

    const now = new Date();
    const updated = await prisma.agendamento.update({
      where: { id: ag.id },
      data: { status: 'CONCLUIDO', dataSaida: now },
      include: { portaria: { select: { nome: true } } },
    });

    sseSvc.broadcast('agendamento_saida', {
      agendamentoId: updated.id, empresa: updated.empresa, motorista: updated.motorista,
      placa: updated.placa, portaria: updated.portaria?.nome, dataSaida: now,
    });
    webhookSvc.disparar('agendamento.saida', updated).catch(() => {});
    telefonesNotificados().then(nums => evo.enviarAgendamentoSaida(updated, nums)).catch(() => {});
    emailSvc.enviarAgendamentoSaida(updated).catch(() => {});

    res.json(updated);
  } catch (e) { next(e); }
};
