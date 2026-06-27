/**
 * API aberta para integração com sistemas externos (ERP, WMS, sistemas de NF).
 * Autenticação via API Key (X-API-Key header).
 */
const { v4: uuid } = require('uuid');
const prisma = require('../lib/prisma');
const sseSvc = require('../services/sse.service');
const webhookSvc = require('../services/webhook.service');
const qrSvc = require('../services/qrcode.service');
const evo = require('../services/evolution.service');
const emailSvc = require('../services/email.service');

const TOKEN_HORAS = 72;
const { telefonesNotificados } = require('../helpers/notificacao.helper');

// ─── GET /api/v1/agendamentos ─────────────────────────────────────────────────

exports.listar = async (req, res, next) => {
  try {
    const { page = 1, status, dataInicio, dataFim } = req.query;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (Number(page) - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (dataInicio || dataFim) {
      const ini = dataInicio ? new Date(dataInicio + 'T00:00:00Z') : null;
      const fim = dataFim   ? new Date(dataFim   + 'T23:59:59Z')  : null;
      if ((ini && isNaN(ini)) || (fim && isNaN(fim)))
        return res.status(400).json({ error: 'Data inválida (use YYYY-MM-DD)' });
      where.dataEntrega = {};
      if (ini) where.dataEntrega.gte = ini;
      if (fim) where.dataEntrega.lte = fim;
    }
    const [agendamentos, total] = await Promise.all([
      prisma.agendamento.findMany({
        where, skip, take: limit, orderBy: { criadoEm: 'desc' },
        select: {
          id: true, status: true, departamento: true, pedidoInterno: true,
          empresa: true, cnpj: true, motorista: true, placa: true, tipoVeiculo: true,
          numeroNF: true, valorNF: true, dataEntrega: true, horarioPref: true,
          observacoes: true, aprovadoEm: true, chegadaEm: true, criadoEm: true,
          portaria: { select: { nome: true, numero: true } },
        },
      }),
      prisma.agendamento.count({ where }),
    ]);
    res.json({ agendamentos, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
};

// ─── GET /api/v1/agendamentos/:id ─────────────────────────────────────────────

exports.buscar = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, status: true, tokenExpiraEm: true,
        departamento: true, pedidoInterno: true,
        empresa: true, cnpj: true, motorista: true, cpfMotorista: true,
        placa: true, tipoVeiculo: true, numeroNF: true, valorNF: true,
        nfArquivoUrl: true, dataEntrega: true, horarioPref: true, observacoes: true,
        aprovadoEm: true, chegadaEm: true, registroId: true, criadoEm: true,
        portaria: { select: { nome: true, numero: true } },
      },
    });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(ag);
  } catch (e) { next(e); }
};

// ─── POST /api/v1/agendamentos ────────────────────────────────────────────────
// Permite que o ERP crie um agendamento e receba o link de preenchimento

exports.criar = async (req, res, next) => {
  try {
    const { portariaNumero, departamento, pedidoInterno, observacoes, emailDestino } = req.body;
    if (!departamento) return res.status(400).json({ error: 'departamento obrigatório' });

    let portariaId;
    if (portariaNumero) {
      const p = await prisma.portaria.findFirst({ where: { numero: Number(portariaNumero), ativo: true } });
      if (!p) return res.status(404).json({ error: `Portaria ${portariaNumero} não encontrada ou inativa` });
      portariaId = p.id;
    } else {
      const p = await prisma.portaria.findFirst({ where: { ativo: true } });
      if (!p) return res.status(404).json({ error: 'Nenhuma portaria ativa configurada' });
      portariaId = p.id;
    }

    // Usa o primeiro superadmin como criadoPor (sem usuário autenticado neste fluxo)
    const sys = await prisma.user.findFirst({ where: { role: 'superadmin', ativo: true } });
    if (!sys) return res.status(503).json({ error: 'Sistema não configurado corretamente' });

    const expira = new Date();
    expira.setHours(expira.getHours() + TOKEN_HORAS);

    const agendamento = await prisma.agendamento.create({
      data: {
        token: uuid(), tokenExpiraEm: expira,
        criadoPorId: sys.id, portariaId, departamento,
        pedidoInterno: pedidoInterno || null,
        observacoes: observacoes || null,
      },
      include: { portaria: { select: { nome: true } } },
    });

    const frontendUrl = process.env.FRONTEND_URL || '';
    const link = `${frontendUrl}/agendamento/${agendamento.token}`;

    if (emailDestino && /\S+@\S+\.\S+/.test(emailDestino)) {
      emailSvc.enviarLinkAgendamento(emailDestino, link, agendamento)
        .catch(e => console.error('[email] integração link:', e.message));
    }

    res.status(201).json({
      id: agendamento.id,
      token: agendamento.token,
      link,
      tokenExpiraEm: agendamento.tokenExpiraEm,
      status: agendamento.status,
    });
  } catch (e) { next(e); }
};

// ─── POST /api/v1/agendamentos/:id/nf ─────────────────────────────────────────
// ERP já tem todos os dados da NF e pode preenchê-los diretamente (sem formulário público)

exports.preencherNF = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({ where: { id: req.params.id } });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (ag.status !== 'AGUARDANDO_NF')
      return res.status(409).json({ error: 'Agendamento já possui NF registrada', status: ag.status });

    const { empresa, cnpj, motorista, cpfMotorista, placa, tipoVeiculo,
            numeroNF, valorNF, dataEntrega, horarioPref, observacoes, nfArquivoUrl } = req.body;

    if (!empresa || !motorista || !cpfMotorista || !placa || !tipoVeiculo || !numeroNF || !dataEntrega || !horarioPref)
      return res.status(400).json({ error: 'Campos obrigatórios: empresa, motorista, cpfMotorista, placa, tipoVeiculo, numeroNF, dataEntrega, horarioPref' });

    const dtEntrega = new Date(dataEntrega);
    if (isNaN(dtEntrega)) return res.status(400).json({ error: 'dataEntrega inválida (use ISO 8601)' });

    const updated = await prisma.agendamento.update({
      where: { id: ag.id },
      data: {
        status: 'NF_RECEBIDA',
        empresa, cnpj: cnpj || null, motorista, cpfMotorista,
        placa: placa.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{3})(.+)$/, '$1-$2'),
        tipoVeiculo, numeroNF,
        valorNF: valorNF ? parseFloat(valorNF) : null,
        nfArquivoUrl: nfArquivoUrl || null,
        dataEntrega: dtEntrega, horarioPref,
        observacoes: observacoes || null,
      },
      include: { portaria: { select: { nome: true } } },
    });

    const qrBase64 = await qrSvc.gerarQRCodeBase64({
      agendamentoId: updated.id, token: updated.token,
      placa: updated.placa, motorista: updated.motorista,
      empresa: updated.empresa, nf: updated.numeroNF,
      dataEntrega: updated.dataEntrega, horario: updated.horarioPref,
    });

    sseSvc.broadcast('agendamento_nf_recebida', {
      agendamentoId: updated.id, empresa: updated.empresa,
      numeroNF: updated.numeroNF, dataEntrega: updated.dataEntrega,
      horarioPref: updated.horarioPref, portaria: updated.portaria?.nome,
      origem: 'integracao',
    });
    webhookSvc.disparar('agendamento.nf_recebida', updated).catch(() => {});
    telefonesNotificados().then(nums => evo.enviarAgendamentoNFRecebida(updated, nums)).catch(() => {});
    emailSvc.enviarAgendamentoNFRecebida(updated).catch(() => {});

    res.json({ agendamento: updated, qrCode: qrBase64 });
  } catch (e) { next(e); }
};

// ─── POST /api/v1/agendamentos/:id/aprovar ────────────────────────────────────

exports.aprovar = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({ where: { id: req.params.id } });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (ag.status !== 'NF_RECEBIDA')
      return res.status(409).json({ error: 'Somente agendamentos com NF recebida podem ser aprovados', status: ag.status });

    const sys = await prisma.user.findFirst({ where: { role: 'superadmin', ativo: true } });
    const updated = await prisma.agendamento.update({
      where: { id: ag.id },
      data: { status: 'APROVADO', aprovadoPorId: sys?.id || null, aprovadoEm: new Date() },
      include: { portaria: { select: { nome: true } } },
    });

    sseSvc.broadcast('agendamento_aprovado', {
      agendamentoId: updated.id, empresa: updated.empresa,
      placa: updated.placa, dataEntrega: updated.dataEntrega,
      portaria: updated.portaria?.nome, origem: 'integracao',
    });
    webhookSvc.disparar('agendamento.aprovado', updated).catch(() => {});
    telefonesNotificados().then(nums => evo.enviarAgendamentoAprovado(updated, nums)).catch(() => {});
    emailSvc.enviarAgendamentoAprovado(updated).catch(() => {});

    res.json({ ok: true, status: updated.status, aprovadoEm: updated.aprovadoEm });
  } catch (e) { next(e); }
};

// ─── GET /api/v1/agendamentos/:id/qrcode ──────────────────────────────────────

exports.qrcode = async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({ where: { id: req.params.id } });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (ag.status === 'AGUARDANDO_NF')
      return res.status(400).json({ error: 'QR Code disponível somente após NF recebida' });
    const formato = req.query.formato === 'json' ? 'json' : 'png';
    if (formato === 'json') {
      const base64 = await qrSvc.gerarQRCodeBase64({
        agendamentoId: ag.id, token: ag.token, placa: ag.placa,
        motorista: ag.motorista, empresa: ag.empresa, nf: ag.numeroNF,
        dataEntrega: ag.dataEntrega, horario: ag.horarioPref,
      });
      return res.json({ qrCode: base64 });
    }
    const buf = await qrSvc.gerarQRCodeBuffer({
      agendamentoId: ag.id, token: ag.token, placa: ag.placa,
      motorista: ag.motorista, empresa: ag.empresa, nf: ag.numeroNF,
      dataEntrega: ag.dataEntrega, horario: ag.horarioPref,
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  } catch (e) { next(e); }
};
