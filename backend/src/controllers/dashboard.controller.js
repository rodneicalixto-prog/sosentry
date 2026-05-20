const prisma = require('../lib/prisma');
exports.resumo = async (req, res, next) => {
  try {
    // Meia-noite no horário de Brasília (UTC-3) independente do timezone do container
    const agora = new Date();
    const hoje = new Date(Date.UTC(
      agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()
    ) - 3 * 60 * 60 * 1000);
    const [naFila, naEmpresa, entradaHoje, saidaHoje, total] = await Promise.all([
      prisma.registro.count({ where:{ status:'na_fila' } }),
      prisma.registro.count({ where:{ status:'na_empresa' } }),
      prisma.registro.count({ where:{ dataEntrada:{ gte: hoje } } }),
      prisma.registro.count({ where:{ horaSaida:{ gte: hoje } } }),
      prisma.registro.count()
    ]);
    res.json({ naFila, naEmpresa, entradaHoje, saidaHoje, total });
  } catch(e){ next(e); }
};
