const prisma = require('../lib/prisma');

const EVENTOS_VALIDOS = ['entrada', 'saida', 'cancelado'];

exports.listar = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const [webhooks, total] = await Promise.all([
      prisma.webhook.findMany({ skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.webhook.count()
    ])
    res.json({ webhooks, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
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
    if (url !== undefined) {
      if (!url) return res.status(400).json({ error: 'URL não pode ser vazia' });
      try { new URL(url); } catch { return res.status(400).json({ error: 'URL inválida' }); }
    }

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
    if (!wh.eventos.length) return res.status(400).json({ error: 'Webhook sem eventos configurados' });
    const evento = wh.eventos[0]
    await disparar(evento, {
      _teste: true, protocolo: 'PRT1-TEST-0000', nomeMotorista: 'Motorista Teste',
      placa: 'TST-0000', empresa: 'Empresa Teste', status: 'na_empresa'
    });
    res.json({ ok: true, mensagem: `Evento '${evento}' disparado` });
  } catch (e) { next(e); }
};
