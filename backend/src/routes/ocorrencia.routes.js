const express = require('express');
const r = express.Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const c = require('../controllers/ocorrencia.controller');

r.use(authenticate);
r.get('/',          requireRole('operador'),   c.listar);
r.get('/exportar',  requireRole('supervisor'), c.exportar);
r.get('/:id',       requireRole('operador'),   c.buscar);
r.post('/',     requireRole('operador'),   c.criar);
r.patch('/:id', requireRole('supervisor'), c.atualizar);

module.exports = r;
