const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
exports.listar = async (req, res, next) => {
  try {
    const portarias = await prisma.portaria.findMany({ where:{ ativo:true }, orderBy:{ numero:'asc' } });
    res.json(portarias);
  } catch(e){ next(e); }
};
