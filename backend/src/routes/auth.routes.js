const r = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const forgotLimiter = rateLimit({ windowMs: 60*60*1000, max: 3, message: { error: 'Muitas tentativas. Aguarde 1 hora.' } });

r.post('/login',           c.login);
r.post('/refresh',         c.refresh);
r.post('/logout',          authenticate, c.logout);
r.get('/me',               authenticate, c.me);
r.post('/forgot-password', forgotLimiter, c.forgotPassword);
r.post('/reset-password',  c.resetPassword);
r.patch('/minha-senha',    authenticate, c.minhaSenha);

module.exports = r;
