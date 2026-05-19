const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const ctrl   = require('../controllers/configuracao.controller');

router.use(auth.authenticate, auth.requireRole('admin'));

router.get('/evo',          ctrl.getConfiguracoes);
router.post('/evo',         ctrl.salvarConfiguracoes);
router.get('/setores',      ctrl.listarSetores);
router.post('/setores',     ctrl.criarSetor);
router.patch('/setores/:id',  ctrl.atualizarSetor);
router.delete('/setores/:id', ctrl.deletarSetor);

module.exports = router;
