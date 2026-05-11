const r = require('express').Router();
const c = require('../controllers/portaria.controller');
const { authenticate } = require('../middleware/auth.middleware');
r.use(authenticate);
r.get('/', c.listar);
module.exports = r;
