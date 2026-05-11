const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
exports.resumo = async (req, res, next) => {
  try {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const [naEmpresa, entradaHoje, saidaHoje, total] = await Promise.all([
      prisma.registro.count({ where:{ status:'na_empresa' } }),
      prisma.registro.count({ where:{ dataEntrada:{ gte: hoje } } }),
      prisma.registro.count({ where:{ horaSaida:{ gte: hoje } } }),
      prisma.registro.count()
    ]);
    res.json({ naEmpresa, entradaHoje, saidaHoje, total });
  } catch(e){ next(e); }
};
