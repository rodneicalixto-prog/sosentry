const crypto = require('crypto');
const prisma = require('../lib/prisma');

const ESCOPOS_VALIDOS = ['agendamentos:ler', 'agendamentos:criar', 'agendamentos:aprovar', 'registros:ler', '*'];

exports.listar = async (req, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { criadoPor: { select: { nome: true } } },
      select: {
        id: true, nome: true, descricao: true, escopos: true,
        ativo: true, ultimoUso: true, criadoEm: true,
        criadoPor: { select: { nome: true } },
        // Não retorna a chave completa após criação
        chave: true,
      },
    });
    // Mascara a chave — mostra apenas os 8 últimos caracteres
    const mascaradas = keys.map(k => ({
      ...k,
      chave: '••••••••' + k.chave.slice(-8),
    }));
    res.json(mascaradas);
  } catch (e) { next(e); }
};

exports.criar = async (req, res, next) => {
  try {
    const { nome, descricao, escopos } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome obrigatório' });
    if (!Array.isArray(escopos) || !escopos.length)
      return res.status(400).json({ error: 'escopos obrigatório (array)' });
    const invalidos = escopos.filter(e => !ESCOPOS_VALIDOS.includes(e));
    if (invalidos.length)
      return res.status(400).json({ error: `Escopos inválidos: ${invalidos.join(', ')}`, validos: ESCOPOS_VALIDOS });

    const chave = 'sose_' + crypto.randomBytes(32).toString('hex');
    const apiKey = await prisma.apiKey.create({
      data: { nome, descricao: descricao || null, escopos, chave, criadoPorId: req.user.id },
    });
    // Retorna a chave completa APENAS neste momento — não será exibida novamente
    res.status(201).json({ ...apiKey, _aviso: 'Guarde a chave agora. Ela não será exibida novamente.' });
  } catch (e) { next(e); }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { nome, descricao, escopos, ativo } = req.body;
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
    if (!key) return res.status(404).json({ error: 'API Key não encontrada' });
    if (escopos) {
      const invalidos = escopos.filter(e => !ESCOPOS_VALIDOS.includes(e));
      if (invalidos.length) return res.status(400).json({ error: `Escopos inválidos: ${invalidos.join(', ')}` });
    }
    const updated = await prisma.apiKey.update({
      where: { id: req.params.id },
      data: {
        ...(nome !== undefined      && { nome }),
        ...(descricao !== undefined && { descricao }),
        ...(escopos !== undefined   && { escopos }),
        ...(ativo !== undefined     && { ativo }),
      },
    });
    res.json({ ...updated, chave: '••••••••' + updated.chave.slice(-8) });
  } catch (e) { next(e); }
};

exports.revogar = async (req, res, next) => {
  try {
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
    if (!key) return res.status(404).json({ error: 'API Key não encontrada' });
    await prisma.apiKey.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.escopos = (req, res) => res.json({ escopos: ESCOPOS_VALIDOS });
