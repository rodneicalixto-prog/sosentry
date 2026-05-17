const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const evo = require('../services/evolution.service');
const webhookSvc = require('../services/webhook.service');

function gerarProtocolo(num) {
  const now = new Date(), pad = n => String(n).padStart(2,'0');
  return `PRT${num}-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${Math.floor(Math.random()*9000)+1000}`;
}

exports.criar = async (req, res, next) => {
  try {
    const d = req.body;
    const portaria = await prisma.portaria.findUnique({ where: { id: d.portariaId } });
    if (!portaria) return res.status(404).json({ error: 'Portaria não encontrada' });
    const protocolo = gerarProtocolo(portaria.numero);
    const dtEntrada = new Date(`${d.dataEntrada}T${d.horaEntrada||'00:00'}:00`);
    const registro = await prisma.registro.create({ data: {
      protocolo, portariaId: d.portariaId, operadorEntradaId: req.user.id,
      nomeMotorista: d.nome, cpfMotorista: d.cpf, telefoneMotorista: d.telefone,
      placa: d.placa.toUpperCase(), tipoVeiculo: d.tipoVeiculo,
      empresa: d.empresa||null, notaFiscal: d.notaFiscal||null,
      tipoOperacao: d.tipoOperacao, tipoMaterial: d.tipoMaterial||null,
      obsMaterial: d.obsMaterial||null, obsGeral: d.obsGeral||null,
      temAjudante: !!d.temAjudante,
      ajudanteNome: d.ajudanteNome||null, ajudanteCpf: d.ajudanteCpf||null,
      ajudanteTelefone: d.ajudanteTelefone||null, ajudanteRg: d.ajudanteRg||null,
      dataEntrada: dtEntrada
    }, include: { portaria:true, operadorEntrada:{ select:{ nome:true, turno:true } } } });
    evo.enviarEntrada(registro).catch(e => console.error('Evo erro:', e.message));
    webhookSvc.disparar('entrada', registro).catch(e => console.error('Webhook entrada erro:', e.message));
    await prisma.auditLog.create({ data:{ userId: req.user.id, acao:'CRIAR_REGISTRO',
      entidade:'registro', entidadeId: registro.id, detalhes:{ protocolo, placa: d.placa } } });
    res.status(201).json({ protocolo, registro });
  } catch(e){ next(e); }
};

exports.saida = async (req, res, next) => {
  try {
    const { protocolo } = req.params;
    const { lacre, obsOcorrencia } = req.body || {};
    const reg = await prisma.registro.findUnique({ where:{ protocolo } });
    if (!reg) return res.status(404).json({ error: 'Protocolo não encontrado' });
    if (reg.status === 'saiu') return res.status(400).json({ error: 'Saída já registrada' });
    const updated = await prisma.registro.update({
      where: { protocolo },
      data: {
        horaSaida: new Date(),
        status: 'saiu',
        operadorSaidaId: req.user.id,
        ...(lacre        && { lacre }),
        ...(obsOcorrencia && { obsOcorrencia }),
      },
      include: { portaria: true, operadorEntrada: { select: { nome: true } }, operadorSaida: { select: { nome: true } } }
    });
    evo.enviarSaida(updated).catch(e => console.error('Evo saída erro:', e.message));
    webhookSvc.disparar('saida', updated).catch(e => console.error('Webhook saída erro:', e.message));
    res.json(updated);
  } catch(e){ next(e); }
};

exports.listar = async (req, res, next) => {
  try {
    const { page=1, limit=20, status, busca, dataInicio, dataFim } = req.query;
    const skip = (Number(page)-1)*Number(limit);
    const where = {};
    if (status) where.status = status;
    if (busca) where.OR = [
      { protocolo:     { contains: busca, mode:'insensitive' } },
      { nomeMotorista: { contains: busca, mode:'insensitive' } },
      { placa:         { contains: busca, mode:'insensitive' } }
    ];
    if (dataInicio||dataFim) {
      where.dataEntrada = {};
      if (dataInicio) where.dataEntrada.gte = new Date(dataInicio);
      if (dataFim)    where.dataEntrada.lte = new Date(dataFim);
    }
    const [registros, total] = await Promise.all([
      prisma.registro.findMany({ where, skip, take: Number(limit),
        orderBy:{ dataEntrada:'desc' },
        include:{ portaria:{ select:{nome:true,numero:true} },
                  operadorEntrada:{ select:{nome:true} },
                  operadorSaida:{ select:{nome:true} } } }),
      prisma.registro.count({ where })
    ]);
    res.json({ registros, total, page: Number(page), totalPages: Math.ceil(total/Number(limit)) });
  } catch(e){ next(e); }
};

exports.buscar = async (req, res, next) => {
  try {
    const reg = await prisma.registro.findUnique({ where:{ id: req.params.id },
      include:{ portaria:true, operadorEntrada:{ select:{nome:true,turno:true} }, operadorSaida:{ select:{nome:true} } } });
    if (!reg) return res.status(404).json({ error: 'Não encontrado' });
    res.json(reg);
  } catch(e){ next(e); }
};
