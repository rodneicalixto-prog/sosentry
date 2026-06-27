const prisma = require('../lib/prisma');

exports.resumo = async (req, res, next) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const ini = dataInicio ? new Date(dataInicio + 'T00:00:00Z') : new Date(new Date().setDate(1)); // mês atual
    const fim = dataFim   ? new Date(dataFim   + 'T23:59:59Z') : new Date();

    const where = { criadoEm: { gte: ini, lte: fim } };
    const hoje = new Date();
    hoje.setUTCHours(0,0,0,0);
    const amanha = new Date(hoje); amanha.setUTCDate(amanha.getUTCDate() + 1);
    const seteDias = new Date(hoje); seteDias.setUTCDate(seteDias.getUTCDate() + 7);

    const [
      total, porStatus, porDepartamento, porDia, previstas7dias,
      tempoMedioAprovacao, agendamentosHoje,
    ] = await Promise.all([
      prisma.agendamento.count({ where }),

      prisma.agendamento.groupBy({
        by: ['status'], where, _count: { id: true },
      }),

      prisma.agendamento.groupBy({
        by: ['departamento'], where, _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Agendamentos criados por dia
      prisma.$queryRaw`
        SELECT DATE_TRUNC('day', "criado_em") AS dia, COUNT(*) AS total
        FROM agendamentos
        WHERE "criado_em" >= ${ini} AND "criado_em" <= ${fim}
        GROUP BY dia ORDER BY dia
      `,

      // Entregas previstas nos próximos 7 dias
      prisma.agendamento.findMany({
        where: { dataEntrega: { gte: hoje, lt: seteDias }, status: { in: ['APROVADO', 'NF_RECEBIDA'] } },
        select: { id: true, empresa: true, placa: true, dataEntrega: true, horarioPref: true, status: true, departamento: true },
        orderBy: { dataEntrega: 'asc' },
      }),

      // Tempo médio (horas) entre criação e aprovação
      prisma.$queryRaw`
        SELECT AVG(EXTRACT(EPOCH FROM ("aprovado_em" - "criado_em")) / 3600) AS media_horas
        FROM agendamentos
        WHERE "aprovado_em" IS NOT NULL AND "criado_em" >= ${ini} AND "criado_em" <= ${fim}
      `,

      // Chegadas de hoje
      prisma.agendamento.findMany({
        where: { dataEntrega: { gte: hoje, lt: amanha } },
        select: { id: true, empresa: true, placa: true, motorista: true, horarioPref: true, status: true, chegadaEm: true },
        orderBy: { horarioPref: 'asc' },
      }),
    ]);

    const mediaHoras = Number(tempoMedioAprovacao[0]?.media_horas || 0);

    res.json({
      periodo: { ini, fim },
      total,
      porStatus: porStatus.map(s => ({ status: s.status, count: s._count.id })),
      porDepartamento: porDepartamento.map(d => ({ departamento: d.departamento, count: d._count.id })),
      porDia: porDia.map(d => ({ dia: d.dia, total: Number(d.total) })),
      previstas7dias,
      agendamentosHoje,
      tempoMedioAprovacaoHoras: Math.round(mediaHoras * 10) / 10,
    });
  } catch (e) { next(e); }
};
