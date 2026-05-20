const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const HIERARCHY = ['operador','supervisor','admin','superadmin'];

async function authenticate(req, res, next) {
  try {
    // Suporta token via header (padrão) ou query param ?token= (necessário para EventSource/SSE)
    const raw = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : req.query.token;
    if (!raw) return res.status(401).json({ error: 'Não autenticado' });
    const payload = jwt.verify(raw, process.env.JWT_SECRET);
    if (!payload.sub || typeof payload.sub !== 'string') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id:true, nome:true, login:true, role:true, ativo:true, trocaSenhaObrigatoria:true }
    });
    if (!user || !user.ativo) return res.status(401).json({ error: 'Usuário inativo' });
    req.user = user;
    next();
  } catch (e) {
    if (e.name !== 'JsonWebTokenError' && e.name !== 'TokenExpiredError' && e.name !== 'NotBeforeError') {
      console.error('[auth] erro inesperado:', e.message);
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
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
