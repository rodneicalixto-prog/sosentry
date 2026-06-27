const r = require('express').Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const c = require('../controllers/agendamentoPublico.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/app/uploads/nf'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const MIME_PERMITIDOS = [
  'application/pdf',
  'text/xml', 'application/xml',
  'image/jpeg', 'image/png',
];
const EXT_PERMITIDAS = ['.pdf', '.xml', '.jpg', '.jpeg', '.png'];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = MIME_PERMITIDOS.includes(file.mimetype);
    const extOk  = EXT_PERMITIDAS.includes(ext);
    if (mimeOk && extOk) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido (PDF, XML, JPG, PNG)'));
  },
});

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

r.get('/:token',  limiter, c.buscar);
r.post('/:token', limiter, upload.single('nfArquivo'), c.submeter);

module.exports = r;
