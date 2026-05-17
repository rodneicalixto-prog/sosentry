const { PrismaClient } = require('@prisma/client');
const { disparar } = require('../services/webhook.service');

const prisma = new PrismaClient();

const EVENTOS_VALIDOS = ['entrada', 'saida', 'cancelado'];

exports.listar = async (req, res, next) => {
  try {
    const webhooks = await prisma.webhook.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(webhooks);
  } catch (e) { next(e); }
};

exports.criar = async (req, res, next) => {
  try {
    const { nome, url, eventos, secret } = req.body;
    if (!nome || !url || !eventos?.length) return res.status(400).json({ error: 'nome, url e eventos são obrigatórios' });
    const eventosInvalidos = eventos.filter(e => !EVENTOS_VALIDOS.includes(e));
    if (eventosInvalidos.length) return res.status(400).json({ error: `Eventos inválidos: ${eventosInvalidos.join(', ')}` });
    try { new URL(url); } catch { return res.status(400).json({ error: 'URL inválida' }); }

    const wh = await prisma.webhook.create({
      data: { nome, url, eventos, secret: secret || null, createdBy: req.user.id }
    });
    res.status(201).json(wh);
  } catch (e) { next(e); }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, url, eventos, secret, ativo } = req.body;
    if (eventos) {
      const eventosInvalidos = eventos.filter(e => !EVENTOS_VALIDOS.includes(e));
      if (eventosInvalidos.length) return res.status(400).json({ error: `Eventos inválidos: ${eventosInvalidos.join(', ')}` });
    }
    if (url) { try { new URL(url); } catch { return res.status(400).json({ error: 'URL inválida' }); } }

    const wh = await prisma.webhook.update({
      where: { id },
      data: { ...(nome && { nome }), ...(url && { url }), ...(eventos && { eventos }),
               ...(secret !== undefined && { secret: secret || null }), ...(ativo !== undefined && { ativo }) }
    });
    res.json(wh);
  } catch (e) { next(e); }
};

exports.deletar = async (req, res, next) => {
  try {
    await prisma.webhook.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.testar = async (req, res, next) => {
  try {
    const wh = await prisma.webhook.findUnique({ where: { id: req.params.id } });
    if (!wh) return res.status(404).json({ error: 'Webhook não encontrado' });
    await disparar(wh.eventos[0] || 'entrada', {
      _teste: true, protocolo: 'PRT1-TEST-0000', nomeMotorista: 'Motorista Teste',
      placa: 'TST-0000', empresa: 'Empresa Teste', status: 'na_empresa'
    });
    res.json({ ok: true, mensagem: 'Evento de teste disparado' });
  } catch (e) { next(e); }
};
