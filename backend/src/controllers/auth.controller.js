const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const evo = require('../services/evolution.service');

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

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  // Resposta genérica — nunca revela se o login existe ou não
  const RESPOSTA_OK = { ok: true, msg: 'Se o login existir e houver um telefone cadastrado, você receberá uma mensagem no WhatsApp em instantes.' };
  try {
    const { login } = req.body;
    if (!login) return res.status(400).json({ error: 'Informe o login' });

    const user = await prisma.user.findUnique({ where: { login: login.toLowerCase().trim() } });

    // Não processa se usuário não existe, está inativo ou não tem telefone
    if (!user || !user.ativo || !user.telefone) return res.json(RESPOSTA_OK);

    // Token de 256 bits, expira em 15 minutos
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry }
    });

    await prisma.auditLog.create({
      data: { userId: user.id, acao: 'RESET_SENHA_SOLICITADO', entidade: 'users', entidadeId: user.id, ip: req.ip }
    });

    const frontendUrl = (process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '');
    const link = `${frontendUrl}/redefinir-senha?token=${token}`;
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Mensagem para o usuário
    const msgUsuario =
      `🔐 *SOS Entry — Recuperação de senha*\n\n` +
      `Olá, *${user.nome}*!\n\n` +
      `Recebemos uma solicitação de redefinição de senha para o login *${user.login}*.\n\n` +
      `👉 Clique no link abaixo para criar uma nova senha:\n${link}\n\n` +
      `⏱ Este link expira em *1 hora*.\n\n` +
      `Se você não solicitou isso, ignore esta mensagem e sua senha permanece a mesma.`;

    // Aviso ao admin
    const resp = process.env.WHATSAPP_RESPONSAVEL;
    const msgAdmin =
      `⚠️ *SOS Entry — Alerta de segurança*\n\n` +
      `Solicitação de recuperação de senha:\n\n` +
      `👤 Usuário: *${user.login}* (${user.nome})\n` +
      `🌐 IP: ${req.ip}\n` +
      `🕐 Horário: ${agora}\n\n` +
      `Se esta ação for suspeita, bloqueie o usuário em Administração → Usuários.`;

    // Fire-and-forget — não bloqueia a resposta ao usuário
    Promise.allSettled([
      evo.send(user.telefone, msgUsuario).catch(e => console.warn('[reset] WhatsApp usuário:', e.message)),
      resp ? evo.send(resp, msgAdmin).catch(e => console.warn('[reset] WhatsApp admin:', e.message)) : Promise.resolve(),
    ]);

    res.json(RESPOSTA_OK);
  } catch(e){ next(e); }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) return res.status(400).json({ error: 'Token e nova senha obrigatórios' });
    if (novaSenha.length < 6) return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });

    const user = await prisma.user.findUnique({ where: { resetToken: token } });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date())
      return res.status(400).json({ error: 'Link inválido ou expirado. Solicite um novo.' });

    const hash = await bcrypt.hash(novaSenha, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, resetToken: null, resetTokenExpiry: null }
    });

    // Invalida todas as sessões ativas do usuário
    await prisma.session.deleteMany({ where: { userId: user.id } });

    await prisma.auditLog.create({
      data: { userId: user.id, acao: 'RESET_SENHA_CONCLUIDO', entidade: 'users', entidadeId: user.id, ip: req.ip }
    });

    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const resp = process.env.WHATSAPP_RESPONSAVEL;
    const msgAdmin =
      `✅ *SOS Entry — Senha redefinida*\n\n` +
      `👤 Usuário: *${user.login}* (${user.nome})\n` +
      `🌐 IP: ${req.ip}\n` +
      `🕐 Horário: ${agora}`;

    if (resp) evo.send(resp, msgAdmin).catch(e => console.warn('[reset] WhatsApp admin confirmação:', e.message));

    res.json({ ok: true, msg: 'Senha redefinida com sucesso! Faça login com a nova senha.' });
  } catch(e){ next(e); }
};
