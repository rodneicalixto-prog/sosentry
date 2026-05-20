const r = require('express').Router();
const c = require('../controllers/universidade.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

r.use(authenticate);
r.get('/',        requireRole('operador'), c.listar);
r.get('/admin',   requireRole('admin'),    c.listarAdmin);
r.post('/',       requireRole('admin'),    c.criar);
r.patch('/:id',   requireRole('admin'),    c.atualizar);
r.delete('/:id',  requireRole('admin'),    c.deletar);

module.exports = r;
