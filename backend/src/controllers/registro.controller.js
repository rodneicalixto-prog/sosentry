const prisma = require('../lib/prisma');
const evo = require('../services/evolution.service');
const webhookSvc = require('../services/webhook.service');
const sseSvc = require('../services/sse.service');
const notifSvc = require('../services/notificacao.service');

async function dispararSetores(evento, reg) {
  try {
    const numerosNotificados = new Set();

    // 1. Regras de setor configuradas
    const setores = await prisma.notificacaoSetor.findMany({ where: { ativo: true } });
    for (const s of setores) {
      if (!s.eventos.includes(evento)) continue;
      let match = false;
      const val = (reg[s.criterioTipo] || '').toString().toLowerCase();
      if (s.criterioValor === '*') {
        match = true;
      } else if (s.criterioTipo === 'tipoPortaria') {
        match = (reg.portaria?.tipo || '').toLowerCase() === s.criterioValor;
      } else {
        match = val === s.criterioValor;
      }
      if (match) {
        const num = s.telefone.replace(/\D/g, '');
        numerosNotificados.add(num);
        evo.enviarSetor(s.telefone, s.nome, evento, reg)
          .catch(e => console.error(`[evo] setor ${s.nome}: ${e.message}`));
      }
    }

    // 2. Usuários com recebeWhatsapp=true — deduplica em relação às regras de setor
    const usuarios = await prisma.user.findMany({
      where: { ativo: true, recebeWhatsapp: true, telefone: { not: null } },
      select: { nome: true, telefone: true },
    });
    for (const u of usuarios) {
      const num = u.telefone.replace(/\D/g, '');
      if (numerosNotificados.has(num)) continue;
      numerosNotificados.add(num);
      evo.enviarSetor(u.telefone, u.nome, evento, reg)
        .catch(e => console.error(`[evo] usuário ${u.nome}: ${e.message}`));
    }
  } catch (e) {
    console.error('[setores] erro ao disparar notificações:', e.message);
  }
}

function gerarProtocolo(num) {
  const now = new Date(), pad = n => String(n).padStart(2,'0');
  return `PRT${num}-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${Math.floor(Math.random()*9000)+1000}`;
}

function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += Number(d[i]) * (10 - i)
  if (Number(d[9]) !== (s * 10) % 11 % 10) return false
  s = 0
  for (let i = 0; i < 10; i++) s += Number(d[i]) * (11 - i)
  return Number(d[10]) === (s * 10) % 11 % 10
}

function validarTelefone(tel) {
  const d = tel.replace(/\D/g, '')
  return d.length >= 10 && d.length <= 15
}

exports.criar = async (req, res, next) => {
  try {
    const d = req.body;

    if (!d.portariaId) return res.status(400).json({ error: 'Portaria obrigatória' });
    const portaria = await prisma.portaria.findUnique({ where: { id: d.portariaId } });
    if (!portaria) return res.status(404).json({ error: 'Portaria não encontrada' });

    const isPedestre = portaria.tipo === 'pedestres';

    const nome     = d.nomeMotorista
    const cpf      = d.cpfMotorista
    const telefone = d.telefoneMotorista || null
    const ajNome   = d.nomeAjudante      || null
    const ajCpf    = d.cpfAjudante       || null
    const ajTel    = d.telefoneAjudante  || null
    const ajRg     = d.rgAjudante        || null

    // Validações comuns
    if (!nome)   return res.status(400).json({ error: isPedestre ? 'Nome do visitante obrigatório' : 'Nome do motorista obrigatório' })
    if (!cpf)    return res.status(400).json({ error: 'CPF obrigatório' })
    if (!d.tipoOperacao) return res.status(400).json({ error: 'Tipo de operação obrigatório' })
    if (nome.length > 150) return res.status(400).json({ error: 'Nome muito longo' })
    if (!validarCPF(cpf)) return res.status(400).json({ error: 'CPF inválido' })
    if (telefone && !validarTelefone(telefone)) return res.status(400).json({ error: 'Telefone inválido (10–15 dígitos)' })
    if (d.empresa?.length > 150) return res.status(400).json({ error: 'Empresa muito longa' })
    if (d.notaFiscal?.length > 50) return res.status(400).json({ error: 'Nota fiscal muito longa (máx 50 chars)' })
    if (d.obsMaterial?.length > 500) return res.status(400).json({ error: 'Observação de material muito longa (máx 500 chars)' })
    if (d.obsGeral?.length > 2000) return res.status(400).json({ error: 'Observação geral muito longa (máx 2000 chars)' })
    if (d.temAjudante && !ajNome) return res.status(400).json({ error: 'Nome do ajudante obrigatório' })
    if (ajCpf && !validarCPF(ajCpf)) return res.status(400).json({ error: 'CPF do ajudante inválido' })
    if (ajTel && !validarTelefone(ajTel)) return res.status(400).json({ error: 'Telefone do ajudante inválido (10–15 dígitos)' })

    let placa = null;
    if (!isPedestre) {
      // Validações exclusivas de veículo
      if (!d.placa)      return res.status(400).json({ error: 'Placa obrigatória' })
      if (!d.tipoVeiculo) return res.status(400).json({ error: 'Tipo de veículo obrigatório' })
      const placaNorm = d.placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (!/^[A-Z]{3}\d{4}$/.test(placaNorm) && !/^[A-Z]{3}\d[A-Z]\d{2}$/.test(placaNorm))
        return res.status(400).json({ error: 'Placa inválida (use ABC-1234 ou ABC1D23)' })
      placa = `${placaNorm.slice(0, 3)}-${placaNorm.slice(3)}`
    }

    // dataEntrada: usa o valor enviado (forçando UTC) ou o momento atual
    const dtEntrada = d.dataEntrada
      ? new Date(`${d.dataEntrada}T${d.horaEntrada||'00:00'}:00Z`)
      : new Date()
    const dados = {
      portariaId: d.portariaId, operadorEntradaId: req.user.id,
      nomeMotorista: nome, cpfMotorista: cpf, telefoneMotorista: telefone||null,
      placa: placa || 'PEDESTRE',
      tipoVeiculo: d.tipoVeiculo || (isPedestre ? 'Pedestre' : null),
      empresa: d.empresa||null, notaFiscal: d.notaFiscal||null,
      tipoOperacao: d.tipoOperacao, tipoMaterial: d.tipoMaterial||null,
      tipoEmbalagem: d.tipoEmbalagem||null, quantidade: d.quantidade ? Number(d.quantidade) : null,
      obsMaterial: d.obsMaterial||null, obsGeral: d.obsGeral||null,
      temAjudante: !!d.temAjudante,
      ajudanteNome: ajNome, ajudanteCpf: ajCpf, ajudanteTelefone: ajTel, ajudanteRg: ajRg,
      setorDestino: d.setorDestino||null, falarCom: d.falarCom||null, autorizadoPor: d.autorizadoPor||null,
      dataEntrada: dtEntrada
    }

    // Retry em caso raro de colisão de protocolo (unique constraint P2002)
    let registro
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const protocolo = gerarProtocolo(portaria.numero)
      try {
        registro = await prisma.registro.create({
          data: { protocolo, ...dados },
          include: { portaria: true, operadorEntrada: { select: { nome: true, turno: true } } }
        })
        break
      } catch (e) {
        if (e.code !== 'P2002' || tentativa === 2) throw e
      }
    }

    evo.enviarEntrada(registro).catch(e => console.error('Evo erro:', e.message));
    dispararSetores('entrada', registro);
    notifSvc.portariaEntrada(registro);
    webhookSvc.disparar('entrada', registro).catch(e => console.error('Webhook entrada erro:', e.message));
    sseSvc.broadcast('entrada', {
      protocolo: registro.protocolo, placa: registro.placa, nomeMotorista: registro.nomeMotorista,
      empresa: registro.empresa, portaria: registro.portaria?.nome,
      tipoVeiculo: registro.tipoVeiculo, operador: req.user.nome
    });
    prisma.auditLog.create({ data: {
      userId: req.user.id, acao: 'CRIAR_REGISTRO',
      entidade: 'registro', entidadeId: registro.id, detalhes: { protocolo: registro.protocolo }
    }}).catch(e => console.warn('[audit] Falha ao gravar log:', e.message));
    res.status(201).json({ protocolo: registro.protocolo, registro });
  } catch(e){ next(e); }
};

exports.autorizar = async (req, res, next) => {
  try {
    const { protocolo } = req.params;
    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        const atual = await tx.registro.findUnique({ where: { protocolo } });
        if (!atual) throw Object.assign(new Error('Protocolo não encontrado'), { _status: 404 });
        if (atual.status !== 'na_fila') throw Object.assign(new Error('Registro não está na fila'), { _status: 400 });
        return tx.registro.update({
          where: { protocolo },
          data: { horaEntrada: new Date(), status: 'na_empresa' },
          include: { portaria: true, operadorEntrada: { select: { nome: true } } }
        });
      });
    } catch (e) {
      if (e._status) return res.status(e._status).json({ error: e.message });
      throw e;
    }
    sseSvc.broadcast('entrada', {
      protocolo: updated.protocolo, placa: updated.placa, nomeMotorista: updated.nomeMotorista,
      empresa: updated.empresa, portaria: updated.portaria?.nome,
      tipoVeiculo: updated.tipoVeiculo, operador: req.user.nome
    });
    res.json(updated);
  } catch(e){ next(e); }
};

exports.saida = async (req, res, next) => {
  try {
    const { protocolo } = req.params;
    const { lacreImageUrl, fotoCarroceriaUrl, obsOcorrencia } = req.body || {};
    const FOTO_PREFIX = 'https://yshvniyhtnyhnjcecbft.supabase.co/storage/v1/object/public/fotos-saida/';
    if (!lacreImageUrl)
      return res.status(400).json({ error: 'Foto do lacre obrigatória' })
    if (typeof lacreImageUrl !== 'string' || !lacreImageUrl.startsWith(FOTO_PREFIX))
      return res.status(400).json({ error: 'URL do lacre inválida' })
    if (fotoCarroceriaUrl && (typeof fotoCarroceriaUrl !== 'string' || !fotoCarroceriaUrl.startsWith(FOTO_PREFIX)))
      return res.status(400).json({ error: 'URL da foto da carroceria inválida' })
    if (obsOcorrencia?.length > 2000) return res.status(400).json({ error: 'Observação muito longa (máx 2000 chars)' })

    // $transaction garante atomicidade — evita race condition de dois operadores
    // registrando saída simultânea para o mesmo protocolo
    let updated
    try {
      updated = await prisma.$transaction(async (tx) => {
        const atual = await tx.registro.findUnique({ where: { protocolo } })
        if (!atual) throw Object.assign(new Error('Protocolo não encontrado'), { _status: 404 })
        if (atual.status === 'saiu') throw Object.assign(new Error('Saída já registrada'), { _status: 400 })
        return tx.registro.update({
          where: { protocolo },
          data: {
            horaSaida: new Date(), status: 'saiu', operadorSaidaId: req.user.id,
            ...(lacreImageUrl     && { lacreImageUrl }),
            ...(fotoCarroceriaUrl && { fotoCarroceriaUrl }),
            ...(obsOcorrencia     && { obsOcorrencia }),
          },
          include: { portaria: true, operadorEntrada: { select: { nome: true } }, operadorSaida: { select: { nome: true } } }
        })
      })
    } catch (e) {
      if (e._status) return res.status(e._status).json({ error: e.message })
      throw e
    }

    evo.enviarSaida(updated).catch(e => console.error('Evo saída erro:', e.message));
    dispararSetores('saida', updated);
    notifSvc.portariaSaida(updated);
    webhookSvc.disparar('saida', updated).catch(e => console.error('Webhook saída erro:', e.message));
    sseSvc.broadcast('saida', {
      protocolo, placa: updated.placa, nomeMotorista: updated.nomeMotorista,
      empresa: updated.empresa, lacreImageUrl: updated.lacreImageUrl, operador: req.user.nome
    });
    res.json(updated);
  } catch(e){ next(e); }
};

exports.listar = async (req, res, next) => {
  try {
    const { page=1, status, busca, dataInicio, dataFim, tipoOperacao } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
    const skip = (Number(page)-1)*limit;
    const where = {};
    if (status) where.status = status;
    if (busca) {
      if (typeof busca !== 'string' || busca.length > 100)
        return res.status(400).json({ error: 'Busca inválida' });
      const term = busca.trim();
      where.OR = [
        { protocolo:     { contains: term, mode:'insensitive' } },
        { nomeMotorista: { contains: term, mode:'insensitive' } },
        { placa:         { contains: term, mode:'insensitive' } }
      ];
    }
    if (dataInicio||dataFim) {
      const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00Z') : null
      const fim    = dataFim    ? new Date(dataFim    + 'T23:59:59Z') : null
      if ((inicio && isNaN(inicio)) || (fim && isNaN(fim)))
        return res.status(400).json({ error: 'Data inválida (use YYYY-MM-DD)' })
      if (inicio && fim && inicio > fim)
        return res.status(400).json({ error: 'Data início não pode ser maior que data fim' })
      where.dataEntrada = {}
      if (inicio) where.dataEntrada.gte = inicio
      if (fim)    where.dataEntrada.lte = fim
    }
    if (tipoOperacao) {
      const mapa = { visitas: ['Visita','Reunião','Entrevista'], coletas: ['Coleta'], entregas: ['Entrega'] }
      where.tipoOperacao = mapa[tipoOperacao]
        ? { in: mapa[tipoOperacao] }
        : { equals: tipoOperacao, mode: 'insensitive' }
    }
    const [registros, total] = await Promise.all([
      prisma.registro.findMany({ where, skip, take: limit,
        orderBy:{ dataEntrada:'desc' },
        include:{ portaria:{ select:{nome:true,numero:true} },
                  operadorEntrada:{ select:{nome:true} },
                  operadorSaida:{ select:{nome:true} } } }),
      prisma.registro.count({ where })
    ]);
    res.json({ registros, total, page: Number(page), totalPages: Math.ceil(total/limit) });
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

exports.exportar = async (req, res, next) => {
  try {
    const { status, busca, dataInicio, dataFim } = req.query;
    const where = {};
    if (status) where.status = status;
    if (busca) {
      if (typeof busca !== 'string' || busca.length > 100)
        return res.status(400).json({ error: 'Busca inválida' });
      const term = busca.trim();
      where.OR = [
        { protocolo:     { contains: term, mode: 'insensitive' } },
        { nomeMotorista: { contains: term, mode: 'insensitive' } },
        { placa:         { contains: term, mode: 'insensitive' } },
      ];
    }
    if (dataInicio || dataFim) {
      const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00Z') : null;
      const fim    = dataFim    ? new Date(dataFim    + 'T23:59:59Z') : null;
      if ((inicio && isNaN(inicio)) || (fim && isNaN(fim)))
        return res.status(400).json({ error: 'Data inválida (use YYYY-MM-DD)' });
      where.dataEntrada = {};
      if (inicio) where.dataEntrada.gte = inicio;
      if (fim)    where.dataEntrada.lte = fim;
    }

    const registros = await prisma.registro.findMany({
      where,
      take: 5000,
      orderBy: { dataEntrada: 'desc' },
      include: {
        portaria:       { select: { nome: true, numero: true } },
        operadorEntrada:{ select: { nome: true } },
        operadorSaida:  { select: { nome: true } },
      },
    });

    const fmt = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      const p = n => String(n).padStart(2, '0');
      return `${p(d.getUTCDate())}/${p(d.getUTCMonth()+1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
    };
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const header = ['Protocolo','Status','Portaria','Data Entrada','Hora Saída','Motorista','CPF','Telefone','Placa','Tipo Veículo','Empresa','Nota Fiscal','Tipo Operação','Setor Destino','Operador Entrada','Operador Saída','Obs Ocorrência'];
    const rows = registros.map(r => [
      r.protocolo, r.status, r.portaria?.nome ?? '',
      fmt(r.dataEntrada), fmt(r.horaSaida),
      r.nomeMotorista, r.cpfMotorista, r.telefoneMotorista ?? '',
      r.placa, r.tipoVeiculo ?? '', r.empresa ?? '', r.notaFiscal ?? '',
      r.tipoOperacao ?? '', r.setorDestino ?? '',
      r.operadorEntrada?.nome ?? '', r.operadorSaida?.nome ?? '',
      r.obsOcorrencia ?? '',
    ].map(esc).join(','));

    const csv = '﻿' + [header.join(','), ...rows].join('\r\n');
    const filename = `registros_${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch(e) { next(e); }
};
