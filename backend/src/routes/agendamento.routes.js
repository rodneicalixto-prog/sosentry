const r = require('express').Router();
const c = require('../controllers/agendamento.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

r.use(authenticate);
r.get('/',              requireRole('supervisor'), c.listar);
r.post('/',             requireRole('operador'),   c.criar);

// Rotas específicas (devem vir antes de :id)
r.get('/fila/liberacao', requireRole('supervisor'), c.filaLiberacao);
r.post('/validar-qr',    requireRole('operador'),   c.validarQR);

// Rotas genéricas com :id
r.get('/:id',           requireRole('operador'),   c.buscar);
r.get('/:id/qrcode',    requireRole('operador'),   c.qrcode);
r.patch('/:id/aprovar',  requireRole('supervisor'), c.aprovar);
r.patch('/:id/cancelar', requireRole('supervisor'), c.cancelar);
r.patch('/:id/liberar',  requireRole('supervisor'), c.liberar);
r.patch('/:id/liberar-fila', requireRole('supervisor'), c.aprovarLiberacao);
r.patch('/:id/concluir', requireRole('operador'),   c.concluir);

module.exports = r;
