const r = require('express').Router();
const c = require('../controllers/integracaoExterna.controller');
const { authenticateApiKey, requireEscopo } = require('../middleware/apikey.middleware');

r.use(authenticateApiKey);
r.get('/',           requireEscopo('agendamentos:ler'),    c.listar);
r.post('/',          requireEscopo('agendamentos:criar'),  c.criar);
r.get('/:id',        requireEscopo('agendamentos:ler'),    c.buscar);
r.post('/:id/nf',    requireEscopo('agendamentos:criar'),  c.preencherNF);
r.post('/:id/aprovar', requireEscopo('agendamentos:aprovar'), c.aprovar);
r.get('/:id/qrcode', requireEscopo('agendamentos:ler'),    c.qrcode);

module.exports = r;
