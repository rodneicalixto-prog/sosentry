const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listar = async (req, res, next) => {
  try {
    const all = req.query.all === 'true';
    const portarias = await prisma.portaria.findMany({
      where: all ? {} : { ativo: true },
      orderBy: { numero: 'asc' },
    });
    res.json(portarias);
  } catch(e){ next(e); }
};

exports.criar = async (req, res, next) => {
  try {
    const { nome, tipo } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
    if (!['transportes','pedestres'].includes(tipo))
      return res.status(400).json({ error: 'Tipo inválido (transportes ou pedestres)' });

    const maior = await prisma.portaria.findFirst({ orderBy: { numero: 'desc' } });
    const numero = (maior?.numero || 0) + 1;

    const portaria = await prisma.portaria.create({
      data: { nome: nome.trim(), tipo, numero },
    });
    res.status(201).json(portaria);
  } catch(e){ next(e); }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const portaria = await prisma.portaria.findUnique({ where: { id } });
    if (!portaria) return res.status(404).json({ error: 'Portaria não encontrada' });

    const { nome, tipo, ativo } = req.body;
    const data = {};
    if (nome !== undefined) data.nome = nome.trim();
    if (tipo !== undefined) {
      if (!['transportes','pedestres'].includes(tipo))
        return res.status(400).json({ error: 'Tipo inválido' });
      data.tipo = tipo;
    }
    if (ativo !== undefined) data.ativo = !!ativo;

    const updated = await prisma.portaria.update({ where: { id }, data });
    res.json(updated);
  } catch(e){ next(e); }
};
