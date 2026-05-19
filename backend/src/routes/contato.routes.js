const express = require('express');
const r = express.Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const c = require('../controllers/contato.controller');

r.use(authenticate);
r.get('/eventos', requireRole('admin'), c.eventos);
r.get('/',        requireRole('admin'), c.listar);
r.post('/',       requireRole('admin'), c.criar);
r.patch('/:id',   requireRole('admin'), c.atualizar);
r.delete('/:id',  requireRole('admin'), c.deletar);

module.exports = r;
