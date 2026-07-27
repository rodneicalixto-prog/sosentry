const prisma = require('../lib/prisma');
const { EVENTOS } = require('../services/notificacao.service');

const EVENTOS_VALIDOS = Object.keys(EVENTOS);

function validarTelefone(tel) {
  const d = tel.replace(/\D/g, '');
  return d.length >= 10 && d.length <= 15;
}

exports.listar = async (req, res, next) => {
  try {
    const contatos = await prisma.contatoNotificacao.findMany({
      include: { usuario: { select: { id: true, nome: true, setor: true, telefone: true } } },
      orderBy: { nome: 'asc' }
    });
    res.json(contatos);
  } catch(e) { next(e); }
};

exports.criar = async (req, res, next) => {
  try {
    const { nome, telefone, eventos = [], ativo = true, usuarioId, setor } = req.body;
    if (!nome?.trim())      return res.status(400).json({ error: 'Nome obrigatório' });
    if (!Array.isArray(eventos))    return res.status(400).json({ error: 'Eventos deve ser um array' });
    const eventosValidos = eventos.filter(e => EVENTOS_VALIDOS.includes(e));

    // Se usuarioId é fornecido, buscar dados do usuário
    let telefoneUsar = telefone?.trim() || '';
    let setorUsar = setor?.trim() || '';

    if (usuarioId) {
      const usuario = await prisma.user.findUnique({
        where: { id: usuarioId },
        select: { nome: true, telefone: true, setor: true }
      });
      if (!usuario) return res.status(400).json({ error: 'Usuário não encontrado' });

      telefoneUsar = usuario.telefone || telefone?.trim() || '';
      setorUsar = usuario.setor || setor?.trim() || '';
    }

    if (!telefoneUsar?.trim()) return res.status(400).json({ error: 'Telefone obrigatório' });
    if (!validarTelefone(telefoneUsar)) return res.status(400).json({ error: 'Telefone inválido (10–15 dígitos)' });

    const contato = await prisma.contatoNotificacao.create({
      data: {
        nome: nome.trim(),
        telefone: telefoneUsar,
        setor: setorUsar || null,
        usuarioId: usuarioId || null,
        eventos: eventosValidos,
        ativo: !!ativo
      },
      include: { usuario: { select: { id: true, nome: true, setor: true, telefone: true } } }
    });
    res.status(201).json(contato);
  } catch(e) { next(e); }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existe = await prisma.contatoNotificacao.findUnique({ where: { id }, select: { id: true } });
    if (!existe) return res.status(404).json({ error: 'Contato não encontrado' });

    const { nome, telefone, eventos, ativo, usuarioId, setor } = req.body;
    const data = {};
    if (nome      !== undefined) data.nome      = nome.trim();
    if (usuarioId !== undefined) {
      if (usuarioId) {
        const usuario = await prisma.user.findUnique({
          where: { id: usuarioId },
          select: { nome: true, telefone: true, setor: true }
        });
        if (!usuario) return res.status(400).json({ error: 'Usuário não encontrado' });
        data.usuarioId = usuarioId;
        data.telefone = usuario.telefone || telefone?.trim() || '';
        data.setor = usuario.setor || setor?.trim() || '';
      } else {
        data.usuarioId = null;
      }
    }
    if (telefone  !== undefined && !usuarioId) {
      if (!validarTelefone(telefone)) return res.status(400).json({ error: 'Telefone inválido' });
      data.telefone = telefone.trim();
    }
    if (setor !== undefined && !usuarioId) data.setor = setor?.trim() || null;
    if (eventos   !== undefined) data.eventos = Array.isArray(eventos) ? eventos.filter(e => EVENTOS_VALIDOS.includes(e)) : [];
    if (ativo     !== undefined) data.ativo   = !!ativo;

    const updated = await prisma.contatoNotificacao.update({
      where: { id },
      data,
      include: { usuario: { select: { id: true, nome: true, setor: true, telefone: true } } }
    });
    res.json(updated);
  } catch(e) { next(e); }
};

exports.deletar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existe = await prisma.contatoNotificacao.findUnique({ where: { id }, select: { id: true } });
    if (!existe) return res.status(404).json({ error: 'Contato não encontrado' });
    await prisma.contatoNotificacao.delete({ where: { id } });
    res.json({ ok: true });
  } catch(e) { next(e); }
};

exports.eventos = async (_req, res) => {
  res.json(EVENTOS);
};
