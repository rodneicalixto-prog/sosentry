const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cfgSvc = require('../services/configuracao.service');

// ─── Configurações Evolution API ─────────────────────────────────────────────

exports.getConfiguracoes = async (req, res, next) => {
  try {
    const data = await cfgSvc.getAll();
    // nunca expõe a chave de API completa
    if (data.evo_key) data.evo_key_masked = data.evo_key.slice(0, 4) + '****';
    res.json(data);
  } catch (e) { next(e); }
};

exports.salvarConfiguracoes = async (req, res, next) => {
  try {
    const { evo_url, evo_key, evo_instance, evo_responsavel } = req.body;
    const updates = {};
    if (evo_url        !== undefined) updates.evo_url        = String(evo_url || '').trim();
    if (evo_instance   !== undefined) updates.evo_instance   = String(evo_instance || '').trim();
    if (evo_responsavel !== undefined) updates.evo_responsavel = String(evo_responsavel || '').trim();
    // só atualiza a chave se não vier mascarada
    if (evo_key !== undefined && !evo_key.includes('****')) {
      updates.evo_key = String(evo_key || '').trim();
    }
    await cfgSvc.setMany(updates);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

// ─── Notificações por Setor ───────────────────────────────────────────────────

exports.listarSetores = async (req, res, next) => {
  try {
    const setores = await prisma.notificacaoSetor.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(setores);
  } catch (e) { next(e); }
};

exports.criarSetor = async (req, res, next) => {
  try {
    const { nome, telefone, criterioTipo, criterioValor, eventos } = req.body;
    if (!nome?.trim())          return res.status(400).json({ error: 'Nome obrigatório' });
    if (!telefone?.trim())      return res.status(400).json({ error: 'Telefone obrigatório' });
    if (!criterioTipo?.trim())  return res.status(400).json({ error: 'Tipo de critério obrigatório' });
    if (!criterioValor?.trim()) return res.status(400).json({ error: 'Valor do critério obrigatório' });
    if (!Array.isArray(eventos) || eventos.length === 0)
      return res.status(400).json({ error: 'Selecione ao menos um evento' });

    const setor = await prisma.notificacaoSetor.create({
      data: {
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ''),
        criterioTipo: criterioTipo.trim(),
        criterioValor: criterioValor.trim().toLowerCase(),
        eventos,
        ativo: true,
      },
    });
    res.status(201).json(setor);
  } catch (e) { next(e); }
};

exports.atualizarSetor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, telefone, criterioTipo, criterioValor, eventos, ativo } = req.body;
    const data = {};
    if (nome          !== undefined) data.nome          = nome.trim();
    if (telefone      !== undefined) data.telefone      = telefone.replace(/\D/g, '');
    if (criterioTipo  !== undefined) data.criterioTipo  = criterioTipo.trim();
    if (criterioValor !== undefined) data.criterioValor = criterioValor.trim().toLowerCase();
    if (eventos       !== undefined) data.eventos       = eventos;
    if (ativo         !== undefined) data.ativo         = Boolean(ativo);

    const setor = await prisma.notificacaoSetor.update({ where: { id }, data });
    res.json(setor);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Setor não encontrado' });
    next(e);
  }
};

exports.deletarSetor = async (req, res, next) => {
  try {
    await prisma.notificacaoSetor.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Setor não encontrado' });
    next(e);
  }
};
