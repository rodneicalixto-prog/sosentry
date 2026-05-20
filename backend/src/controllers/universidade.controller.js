const prisma = require('../lib/prisma');

const select = {
  id: true, titulo: true, descricao: true, categoria: true,
  videoUrl: true, thumbUrl: true, destaque: true, ordem: true,
  ativo: true, createdAt: true,
  criadoPor: { select: { nome: true } }
};

exports.listar = async (req, res, next) => {
  try {
    const videos = await prisma.videoUniversidade.findMany({
      where: { ativo: true },
      select,
      orderBy: [{ destaque: 'desc' }, { ordem: 'asc' }, { createdAt: 'desc' }]
    });
    res.json(videos);
  } catch(e){ next(e); }
};

exports.listarAdmin = async (req, res, next) => {
  try {
    const videos = await prisma.videoUniversidade.findMany({
      select,
      orderBy: [{ destaque: 'desc' }, { ordem: 'asc' }, { createdAt: 'desc' }]
    });
    res.json(videos);
  } catch(e){ next(e); }
};

exports.criar = async (req, res, next) => {
  try {
    const { titulo, descricao, categoria, videoUrl, thumbUrl, destaque, ordem } = req.body;
    if (!titulo?.trim()) return res.status(400).json({ error: 'Título obrigatório' });
    if (!videoUrl?.trim()) return res.status(400).json({ error: 'URL do vídeo obrigatória' });

    const video = await prisma.$transaction(async (tx) => {
      if (destaque) await tx.videoUniversidade.updateMany({ data: { destaque: false } });
      return tx.videoUniversidade.create({
        data: {
          titulo: titulo.trim(),
          descricao: descricao?.trim() || null,
          categoria: categoria?.trim() || 'Geral',
          videoUrl: videoUrl.trim(),
          thumbUrl: thumbUrl?.trim() || null,
          destaque: !!destaque,
          ordem: Number(ordem) || 0,
          criadoPorId: req.user.id
        },
        select
      });
    });
    res.status(201).json(video);
  } catch(e){ next(e); }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existe = await prisma.videoUniversidade.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ error: 'Vídeo não encontrado' });
    const { titulo, descricao, categoria, videoUrl, thumbUrl, destaque, ordem, ativo } = req.body;

    const video = await prisma.$transaction(async (tx) => {
      if (destaque) await tx.videoUniversidade.updateMany({ where: { id: { not: id } }, data: { destaque: false } });
      return tx.videoUniversidade.update({
        where: { id },
        data: {
          ...(titulo    !== undefined && { titulo: titulo.trim() }),
          ...(descricao !== undefined && { descricao: descricao?.trim() || null }),
          ...(categoria !== undefined && { categoria: categoria?.trim() || 'Geral' }),
          ...(videoUrl  !== undefined && { videoUrl: videoUrl.trim() }),
          ...(thumbUrl  !== undefined && { thumbUrl: thumbUrl?.trim() || null }),
          ...(destaque  !== undefined && { destaque: !!destaque }),
          ...(ordem     !== undefined && { ordem: Number(ordem) || 0 }),
          ...(ativo     !== undefined && { ativo: !!ativo }),
        },
        select
      });
    });
    res.json(video);
  } catch(e){ next(e); }
};

exports.deletar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existe = await prisma.videoUniversidade.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ error: 'Vídeo não encontrado' });
    await prisma.videoUniversidade.delete({ where: { id } });
    res.json({ ok: true });
  } catch(e){ next(e); }
};
