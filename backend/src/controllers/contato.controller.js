const prisma = require('../lib/prisma');
const { EVENTOS } = require('../services/notificacao.service');

const EVENTOS_VALIDOS = Object.keys(EVENTOS);

function validarTelefone(tel) {
  const d = tel.replace(/\D/g, '');
  return d.length >= 10 && d.length <= 15;
}

exports.listar = async (req, res, next) => {
  try {
    const contatos = await prisma.contatoNotificacao.findMany({ orderBy: { nome: 'asc' } });
    res.json(contatos);
  } catch(e) { next(e); }
};

exports.criar = async (req, res, next) => {
  try {
    const { nome, telefone, eventos = [], ativo = true } = req.body;
    if (!nome?.trim())      return res.status(400).json({ error: 'Nome obrigatório' });
    if (!telefone?.trim())  return res.status(400).json({ error: 'Telefone obrigatório' });
    if (!validarTelefone(telefone)) return res.status(400).json({ error: 'Telefone inválido (10–15 dígitos)' });
    if (!Array.isArray(eventos))    return res.status(400).json({ error: 'Eventos deve ser um array' });
    const eventosValidos = eventos.filter(e => EVENTOS_VALIDOS.includes(e));

    const contato = await prisma.contatoNotificacao.create({
      data: { nome: nome.trim(), telefone: telefone.trim(), eventos: eventosValidos, ativo: !!ativo }
    });
    res.status(201).json(contato);
  } catch(e) { next(e); }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existe = await prisma.contatoNotificacao.findUnique({ where: { id }, select: { id: true } });
    if (!existe) return res.status(404).json({ error: 'Contato não encontrado' });

    const { nome, telefone, eventos, ativo } = req.body;
    const data = {};
    if (nome      !== undefined) data.nome      = nome.trim();
    if (telefone  !== undefined) {
      if (!validarTelefone(telefone)) return res.status(400).json({ error: 'Telefone inválido' });
      data.telefone = telefone.trim();
    }
    if (eventos   !== undefined) data.eventos = Array.isArray(eventos) ? eventos.filter(e => EVENTOS_VALIDOS.includes(e)) : [];
    if (ativo     !== undefined) data.ativo   = !!ativo;

    const updated = await prisma.contatoNotificacao.update({ where: { id }, data });
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
