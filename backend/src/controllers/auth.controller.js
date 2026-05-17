const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function tokens(userId, role) {
  return {
    access:  jwt.sign({ sub: userId, role }, process.env.JWT_SECRET,         { expiresIn: '8h' }),
    refresh: jwt.sign({ sub: userId },       process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
  };
}

exports.login = async (req, res, next) => {
  try {
    const { login, senha } = req.body;
    if (!login || !senha) return res.status(400).json({ error: 'Login e senha obrigatórios' });
    const user = await prisma.user.findUnique({ where: { login: login.toLowerCase().trim() } });
    if (!user || !user.ativo || !(await bcrypt.compare(senha, user.passwordHash)))
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    const { access, refresh } = tokens(user.id, user.role);
    await prisma.session.create({
      data: { userId: user.id, refreshToken: refresh,
              expiresAt: new Date(Date.now()+7*24*60*60*1000), ip: req.ip }
    });
    await prisma.auditLog.create({ data: { userId: user.id, acao:'LOGIN', entidade:'session', ip: req.ip } });
    res.json({ accessToken: access, refreshToken: refresh,
               user: { id: user.id, nome: user.nome, login: user.login, role: user.role, turno: user.turno } });
  } catch(e){ next(e); }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Token não informado' });
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const session = await prisma.session.findUnique({ where: { refreshToken } });
    if (!session || session.expiresAt < new Date())
      return res.status(401).json({ error: 'Sessão expirada' });
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.ativo) return res.status(401).json({ error: 'Usuário inativo' });
    const { access, refresh } = tokens(user.id, user.role);
    // Rotation: invalida token antigo e cria novo atomicamente
    await prisma.$transaction([
      prisma.session.delete({ where: { id: session.id } }),
      prisma.session.create({
        data: { userId: user.id, refreshToken: refresh,
                expiresAt: new Date(Date.now()+7*24*60*60*1000), ip: req.ip }
      })
    ]);
    res.json({ accessToken: access, refreshToken: refresh });
  } catch(e){ next(e); }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await prisma.session.deleteMany({ where: { refreshToken } });
    if (req.user) await prisma.auditLog.create({
      data: { userId: req.user.id, acao:'LOGOUT', entidade:'session', ip: req.ip }
    });
    res.json({ ok: true });
  } catch(e){ next(e); }
};

exports.me = (req, res) => res.json({ user: req.user });
