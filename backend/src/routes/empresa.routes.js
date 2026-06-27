const router = require('express').Router()
const { authenticate, requireRole } = require('../middleware/auth.middleware')
const ctrl = require('../controllers/empresa.controller')

router.use(authenticate, requireRole('supervisor'))

router.get('/',      ctrl.listar)
router.get('/:id',   ctrl.buscar)
router.post('/',     requireRole('admin'), ctrl.criar)
router.patch('/:id', requireRole('admin'), ctrl.atualizar)
router.delete('/:id',requireRole('admin'), ctrl.deletar)

module.exports = router
