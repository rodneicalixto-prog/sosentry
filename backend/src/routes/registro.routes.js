const r = require('express').Router();
const c = require('../controllers/registro.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
r.use(authenticate);
r.get('/',                     requireRole('supervisor'), c.listar);
r.get('/exportar',             requireRole('supervisor'), c.exportar);
r.get('/:id',                  requireRole('operador'),   c.buscar);
r.post('/',                    requireRole('operador'),   c.criar);
r.patch('/:protocolo/entrada', requireRole('operador'),   c.autorizar);
r.patch('/:protocolo/saida',   requireRole('operador'),   c.saida);

// Registros são imutáveis — edição e exclusão são proibidas para todos os perfis
r.delete('*', (_, res) => res.status(403).json({ error: 'Registros não podem ser excluídos' }));
r.put('*',    (_, res) => res.status(403).json({ error: 'Registros não podem ser editados' }));
r.patch('*',  (_, res) => res.status(403).json({ error: 'Operação não permitida' }));

module.exports = r;
