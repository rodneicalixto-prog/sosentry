const r = require('express').Router();
const c = require('../controllers/portaria.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

r.use(authenticate);
r.get('/',      c.listar);
r.post('/',     requireRole('admin'), c.criar);
r.patch('/:id', requireRole('admin'), c.atualizar);

module.exports = r;
