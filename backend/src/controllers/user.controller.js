const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const evo    = require('../services/evolution.service');
const prisma = require('../lib/prisma');
const HIER = ['operador','supervisor','admin','superadmin'];

const SELECT_FIELDS = {
  id: true, nome: true, login: true, email: true,
  role: true, turno: true, setor: true, recebeWhatsapp: true,
  telefone: true, ativo: true, createdAt: true,
};

exports.listar = async (req, res, next) => {
  try {
    const where = req.user.role === 'admin' ? { role: { not: 'superadmin' } } : {};
    const users = await prisma.user.findMany({ where,
      select: SELECT_FIELDS,
      orderBy: { nome: 'asc' } });
    res.json(users);
  } catch(e){ next(e); }
};

exports.criar = async (req, res, next) => {
  try {
    const { nome, login, email, senha, role='operador', turno, setor, telefone, recebeWhatsapp } = req.body;

    if (role === 'superadmin' && req.user.role !== 'superadmin')
      return res.status(403).json({ error: 'Apenas superadmins podem criar outros superadmins' });
    if (role !== 'superadmin' && HIER.indexOf(role) >= HIER.indexOf(req.user.role))
      return res.status(403).json({ error: 'Não é possível criar perfil igual ou superior ao seu' });

    const existe = await prisma.user.findUnique({ where: { login: login.toLowerCase() } });
    if (existe) return res.status(409).json({ error: 'Login já em uso' });
    if (email) {
      const emailExiste = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (emailExiste) return res.status(409).json({ error: 'E-mail já em uso' });
    }
    const user = await prisma.user.create({ data: {
      nome, login: login.toLowerCase().trim(), email: email||null,
      passwordHash: await bcrypt.hash(senha, 12),
      role, turno: turno||null, setor: setor||null,
      recebeWhatsapp: !!recebeWhatsapp,
      telefone: telefone||null, createdBy: req.user.id
    }, select: SELECT_FIELDS });
    res.status(201).json(user);
  } catch(e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Login ou e-mail já em uso' });
    next(e);
  }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alvo = await prisma.user.findUnique({ where: { id } });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (alvo.role === 'superadmin' && req.user.role !== 'superadmin' && alvo.id !== req.user.id)
      return res.status(403).json({ error: 'Sem permissão' });
    if (alvo.role !== 'superadmin' && HIER.indexOf(alvo.role) >= HIER.indexOf(req.user.role) && alvo.id !== req.user.id)
      return res.status(403).json({ error: 'Sem permissão' });
    if (!alvo.ativo && alvo.id !== req.user.id && req.body.ativo !== true)
      return res.status(400).json({ error: 'Usuário está desativado. Reative-o primeiro.' });

    const { nome, email, role, turno, setor, telefone, recebeWhatsapp, ativo, senha } = req.body;
    const data = {};
    if (nome !== undefined)             data.nome             = nome;
    if (email !== undefined)            data.email            = email || null;
    if (turno !== undefined)            data.turno            = turno || null;
    if (setor !== undefined)            data.setor            = setor || null;
    if (telefone !== undefined)         data.telefone         = telefone || null;
    if (recebeWhatsapp !== undefined)   data.recebeWhatsapp   = !!recebeWhatsapp;
    if (ativo !== undefined)            data.ativo            = ativo;
    if (role) {
      if (role === 'superadmin' && req.user.role !== 'superadmin')
        return res.status(403).json({ error: 'Apenas superadmins podem promover para superadmin' });
      if (role !== 'superadmin' && HIER.indexOf(role) < HIER.indexOf(req.user.role))
        data.role = role;
      else if (role === 'superadmin')
        data.role = role;
    }
    if (senha) data.passwordHash = await bcrypt.hash(senha, 12);

    const updated = await prisma.user.update({ where:{ id }, data, select: SELECT_FIELDS });
    res.json(updated);
  } catch(e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Login ou e-mail já em uso' });
    next(e);
  }
};

exports.desativar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Não pode desativar a própria conta' });
    const alvo = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });
    await prisma.user.update({ where:{ id }, data:{ ativo: false } });
    await prisma.session.deleteMany({ where:{ userId: id } });
    res.json({ ok: true });
  } catch(e){ next(e); }
};

exports.resetSenha = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { modo, senhaNova } = req.body;

    if (id === req.user.id)
      return res.status(400).json({ error: 'Use "Alterar minha senha" para sua própria conta' });

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, nome: true, login: true, role: true, telefone: true, ativo: true },
    });
    if (!user || !user.ativo) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Não permite resetar senha de perfil igual ou superior ao do solicitante
    if (HIER.indexOf(user.role) >= HIER.indexOf(req.user.role))
      return res.status(403).json({ error: 'Sem permissão para redefinir senha deste perfil' });

    if (modo === 'whatsapp') {
      if (!user.telefone)
        return res.status(400).json({ error: 'Usuário não tem telefone cadastrado' });

      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.user.update({ where: { id }, data: { resetToken: token, resetTokenExpiry: expiry } });

      const frontendUrl = (process.env.FRONTEND_URL || '').split(/[,;]/)[0].trim().replace(/\/$/, '');
      const link = `${frontendUrl}/redefinir-senha?token=${token}`;
      const msg =
        `🔐 *SOS Entry — Redefinição de senha*\n\n` +
        `Olá, *${user.nome}*!\n\n` +
        `O administrador solicitou a redefinição da sua senha.\n\n` +
        `👉 Clique para criar uma nova senha:\n${link}\n\n` +
        `⏱ Expira em *1 hora*.`;
      evo.send(user.telefone, msg).catch(e => console.warn('[reset] WhatsApp:', e.message));

      await prisma.auditLog.create({ data: {
        userId: req.user.id, acao: 'ADMIN_RESET_SENHA_LINK', entidade: 'users', entidadeId: id,
        detalhes: { targetLogin: user.login }, ip: req.ip,
      }});
      return res.json({ ok: true, msg: `Link enviado para o WhatsApp de ${user.nome}.` });
    }

    if (modo === 'manual') {
      if (!senhaNova || senhaNova.length < 8)
        return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres' });

      const hash = await bcrypt.hash(senhaNova, 12);
      await prisma.user.update({
        where: { id },
        data: { passwordHash: hash, trocaSenhaObrigatoria: true, resetToken: null, resetTokenExpiry: null },
      });
      await prisma.session.deleteMany({ where: { userId: id } });

      await prisma.auditLog.create({ data: {
        userId: req.user.id, acao: 'ADMIN_RESET_SENHA_MANUAL', entidade: 'users', entidadeId: id,
        detalhes: { targetLogin: user.login }, ip: req.ip,
      }});
      return res.json({ ok: true, msg: `Senha definida. ${user.nome} deverá criar uma nova senha no próximo acesso.` });
    }

    res.status(400).json({ error: 'Modo inválido. Use "whatsapp" ou "manual".' });
  } catch(e) { next(e); }
};
