const prisma = require('../lib/prisma');

// Autenticação via API Key no header X-API-Key ou query ?apiKey=
async function authenticateApiKey(req, res, next) {
  // Aceita apenas via header — query string expõe a chave em logs de proxy/nginx
  const chave = req.headers['x-api-key'];
  if (!chave) return res.status(401).json({ error: 'API Key ausente (header X-API-Key obrigatório)' });

  const apiKey = await prisma.apiKey.findUnique({ where: { chave } });
  if (!apiKey || !apiKey.ativo) return res.status(401).json({ error: 'API Key inválida ou inativa' });

  req.apiKey = apiKey;

  // Atualiza último uso de forma assíncrona — não bloqueia a requisição
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { ultimoUso: new Date() } })
    .catch(() => {});

  next();
}

function requireEscopo(escopo) {
  return (req, res, next) => {
    if (!req.apiKey) return res.status(401).json({ error: 'Não autenticado' });
    if (!req.apiKey.escopos.includes(escopo) && !req.apiKey.escopos.includes('*'))
      return res.status(403).json({ error: `Escopo necessário: ${escopo}` });
    next();
  };
}

module.exports = { authenticateApiKey, requireEscopo };
