const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.visitas = async (req, res, next) => {
  try {
    const { ano, mes, empresa, portariaId } = req.query;
    const anoNum = parseInt(ano) || new Date().getFullYear();
    const mesNum = mes ? parseInt(mes) : null;

    const inicio = mesNum
      ? new Date(anoNum, mesNum - 1, 1)
      : new Date(anoNum, 0, 1);
    const fim = mesNum
      ? new Date(anoNum, mesNum, 1)
      : new Date(anoNum + 1, 0, 1);

    const where = {
      dataEntrada: { gte: inicio, lt: fim },
      ...(empresa    && { empresa:    { contains: empresa,    mode: 'insensitive' } }),
      ...(portariaId && { portariaId }),
    };

    // Agrupa por empresa
    const porEmpresaRaw = await prisma.registro.groupBy({
      by: ['empresa'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const porEmpresa = porEmpresaRaw.map(r => ({
      empresa: r.empresa || '(sem empresa)',
      total: r._count.id,
    }));

    // Agrupa por mês (sempre retorna todos os meses do ano)
    const porMesRaw = await prisma.registro.groupBy({
      by: ['dataEntrada'],
      where: {
        dataEntrada: { gte: new Date(anoNum, 0, 1), lt: new Date(anoNum + 1, 0, 1) },
        ...(empresa    && { empresa:    { contains: empresa,    mode: 'insensitive' } }),
        ...(portariaId && { portariaId }),
      },
      _count: { id: true },
    });

    // Agrupa manualmente por mês
    const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: 0 }));
    for (const r of porMesRaw) {
      const m = new Date(r.dataEntrada).getMonth();
      meses[m].total += r._count.id;
    }

    const [total, portarias] = await Promise.all([
      prisma.registro.count({ where }),
      prisma.portaria.findMany({ select: { id: true, nome: true }, orderBy: { numero: 'asc' } }),
    ]);

    res.json({ porEmpresa, porMes: meses, total, portarias, filtros: { ano: anoNum, mes: mesNum } });
  } catch(e){ next(e); }
};
