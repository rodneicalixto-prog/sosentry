const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const HIER = ['operador','supervisor','admin','superadmin'];

exports.listar = async (req, res, next) => {
  try {
    const where = req.user.role === 'admin' ? { role: { not: 'superadmin' } } : {};
    const users = await prisma.user.findMany({ where,
      select: { id:true,nome:true,login:true,email:true,role:true,turno:true,telefone:true,ativo:true,createdAt:true },
      orderBy: { nome: 'asc' } });
    res.json(users);
  } catch(e){ next(e); }
};

exports.criar = async (req, res, next) => {
  try {
    const { nome, login, email, senha, role='operador', turno, telefone } = req.body;
    if (HIER.indexOf(role) >= HIER.indexOf(req.user.role))
      return res.status(403).json({ error: 'Não é possível criar perfil igual ou superior ao seu' });
    const existe = await prisma.user.findUnique({ where: { login: login.toLowerCase() } });
    if (existe) return res.status(409).json({ error: 'Login já em uso' });
    const user = await prisma.user.create({ data: {
      nome, login: login.toLowerCase().trim(), email: email||null,
      passwordHash: await bcrypt.hash(senha, 12),
      role, turno: turno||null, telefone: telefone||null, createdBy: req.user.id
    }, select: { id:true,nome:true,login:true,role:true,turno:true,ativo:true } });
    res.status(201).json(user);
  } catch(e){ next(e); }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alvo = await prisma.user.findUnique({ where: { id } });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (HIER.indexOf(alvo.role) >= HIER.indexOf(req.user.role) && alvo.id !== req.user.id)
      return res.status(403).json({ error: 'Sem permissão' });
    const { nome, email, role, turno, telefone, ativo, senha } = req.body;
    const data = {};
    if (nome)     data.nome     = nome;
    if (email)    data.email    = email;
    if (turno)    data.turno    = turno;
    if (telefone) data.telefone = telefone;
    if (ativo !== undefined) data.ativo = ativo;
    if (role && HIER.indexOf(role) < HIER.indexOf(req.user.role)) data.role = role;
    if (senha)    data.passwordHash = await bcrypt.hash(senha, 12);
    const updated = await prisma.user.update({ where:{ id }, data,
      select:{ id:true,nome:true,login:true,role:true,turno:true,ativo:true } });
    res.json(updated);
  } catch(e){
    if (e.code === 'P2002') return res.status(409).json({ error: 'Login ou e-mail já em uso' })
    next(e);
  }
};

exports.desativar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Não pode desativar a própria conta' });
    await prisma.user.update({ where:{ id }, data:{ ativo: false } });
    await prisma.session.deleteMany({ where:{ userId: id } });
    res.json({ ok: true });
  } catch(e){ next(e); }
};
