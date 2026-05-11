const r = require('express').Router();
const c = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
r.post('/login',   c.login);
r.post('/refresh', c.refresh);
r.post('/logout',  authenticate, c.logout);
r.get('/me',       authenticate, c.me);
module.exports = r;
