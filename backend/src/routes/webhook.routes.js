const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const wh = require('../controllers/webhook.controller');

router.use(authenticate, requireRole('admin'));

router.get('/',         wh.listar);
router.post('/',        wh.criar);
router.patch('/:id',    wh.atualizar);
router.delete('/:id',   wh.deletar);
router.post('/:id/test', wh.testar);

module.exports = router;
