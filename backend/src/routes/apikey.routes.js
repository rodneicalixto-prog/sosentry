const r = require('express').Router();
const c = require('../controllers/apikey.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

r.use(authenticate);
r.get('/escopos',  requireRole('admin'), c.escopos);
r.get('/',         requireRole('admin'), c.listar);
r.post('/',        requireRole('admin'), c.criar);
r.patch('/:id',    requireRole('admin'), c.atualizar);
r.delete('/:id',   requireRole('admin'), c.revogar);

module.exports = r;
