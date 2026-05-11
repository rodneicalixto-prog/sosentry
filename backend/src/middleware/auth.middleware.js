const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const HIERARCHY = ['operador','supervisor','admin','superadmin'];

async function authenticate(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autenticado' });
    const payload = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id:true, nome:true, login:true, role:true, ativo:true }
    });
    if (!user || !user.ativo) return res.status(401).json({ error: 'Usuário inativo' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: 'Token inválido' }); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    const myLvl  = HIERARCHY.indexOf(req.user.role);
    const minLvl = Math.min(...roles.map(r => HIERARCHY.indexOf(r)));
    if (myLvl < minLvl) return res.status(403).json({ error: 'Acesso negado' });
    next();
  };
}
module.exports = { authenticate, requireRole };
