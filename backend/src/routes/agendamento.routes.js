const r = require('express').Router();
const c = require('../controllers/agendamento.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

r.use(authenticate);
r.get('/',              requireRole('supervisor'), c.listar);
r.post('/',             requireRole('operador'),   c.criar);
r.get('/:id',           requireRole('operador'),   c.buscar);
r.get('/:id/qrcode',    requireRole('operador'),   c.qrcode);
r.patch('/:id/aprovar', requireRole('supervisor'), c.aprovar);
r.patch('/:id/cancelar',requireRole('supervisor'), c.cancelar);
r.post('/validar-qr',   requireRole('operador'),   c.validarQR);

module.exports = r;
