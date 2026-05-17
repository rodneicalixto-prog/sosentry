const r = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const c = require('../controllers/relatorio.controller');

r.use(authenticate, requireRole('admin'));
r.get('/visitas', c.visitas);

module.exports = r;
