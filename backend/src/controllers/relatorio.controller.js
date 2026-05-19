const prisma = require('../lib/prisma');

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

const VISITAS_TIPOS  = ['Visita', 'Reunião', 'Entrevista']
const COLETAS_TIPOS  = ['Coleta']
const ENTREGAS_TIPOS = ['Entrega']

function classificar(tipoOperacao) {
  if (!tipoOperacao) return null
  if (VISITAS_TIPOS.includes(tipoOperacao))  return 'visitas'
  if (COLETAS_TIPOS.includes(tipoOperacao))  return 'coletas'
  if (ENTREGAS_TIPOS.includes(tipoOperacao)) return 'entregas'
  return null
}

exports.resumo = async (req, res, next) => {
  try {
    const hoje = new Date()
    const todayStr = hoje.toISOString().slice(0, 10)

    // Período selecionado (default = últimos 7 dias)
    const fimStr    = req.query.dataFim    || todayStr
    const inicioStr = req.query.dataInicio || (() => {
      const d = new Date(fimStr + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - 6)
      return d.toISOString().slice(0, 10)
    })()

    const inicio = new Date(inicioStr + 'T00:00:00Z')
    const fim    = new Date(fimStr    + 'T23:59:59Z')

    if (isNaN(inicio) || isNaN(fim))
      return res.status(400).json({ error: 'Data inválida (use YYYY-MM-DD)' })

    // Busca registros e ocorrências do período em paralelo
    const [registros, ocorrencias] = await Promise.all([
      prisma.registro.findMany({
        where: { dataEntrada: { gte: inicio, lte: fim } },
        select: { dataEntrada: true, tipoOperacao: true },
      }),
      prisma.ocorrencia.findMany({
        where: { dataHora: { gte: inicio, lte: fim } },
        select: { dataHora: true },
      }),
    ])

    // Gera array de todos os dias do período
    const days = []
    const cur = new Date(inicio)
    while (cur <= fim) {
      days.push(cur.toISOString().slice(0, 10))
      cur.setUTCDate(cur.getUTCDate() + 1)
    }

    // Mapa dia → contadores
    const serieMap = {}
    for (const d of days) {
      serieMap[d] = { data: d, visitas: 0, coletas: 0, entregas: 0, ocorrencias: 0 }
    }

    for (const r of registros) {
      const d = new Date(r.dataEntrada).toISOString().slice(0, 10)
      if (serieMap[d]) {
        const cat = classificar(r.tipoOperacao)
        if (cat) serieMap[d][cat]++
      }
    }
    for (const o of ocorrencias) {
      const d = new Date(o.dataHora).toISOString().slice(0, 10)
      if (serieMap[d]) serieMap[d].ocorrencias++
    }

    const serie = days.map(d => ({
      ...serieMap[d],
      dia: d.slice(8, 10) + '/' + d.slice(5, 7),
    }))

    // Totais acumulados do período
    const totais = serie.reduce(
      (acc, d) => {
        acc.visitas    += d.visitas
        acc.coletas    += d.coletas
        acc.entregas   += d.entregas
        acc.ocorrencias += d.ocorrencias
        return acc
      },
      { visitas: 0, coletas: 0, entregas: 0, ocorrencias: 0 }
    )

    res.json({ totais, serie, periodo: { inicio: inicioStr, fim: fimStr } })
  } catch(e) { next(e) }
}
