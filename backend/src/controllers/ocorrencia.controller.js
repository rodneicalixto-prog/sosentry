const { randomInt } = require('crypto');
const prisma   = require('../lib/prisma');
const evo      = require('../services/evolution.service');
const notifSvc = require('../services/notificacao.service');

async function notificarOcorrencia(oc) {
  try {
    const pad = n => String(n).padStart(2, '0');
    const d = new Date(oc.dataHora);
    const hora = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    const data = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth()+1)}/${d.getUTCFullYear()}`;
    const descTrunc = oc.descricao?.length > 200 ? oc.descricao.slice(0, 197) + '...' : oc.descricao;
    const msg =
      `🚨 *SOS Entry — Ocorrência [${oc.categoria}]*\n\n` +
      `📋 ${oc.protocolo}\n📌 ${oc.tipo}\n📍 ${oc.local}\n🕐 ${hora} · ${data}\n\n` +
      `📝 ${descTrunc}`;

    // Coleta todos os números que serão notificados pelos outros canais
    // para deduplicar e evitar mensagens duplicadas
    const [contatosNotif, usuarios] = await Promise.all([
      prisma.contatoNotificacao.findMany({
        where: { ativo: true, eventos: { hasSome: [`ocorrencia:${oc.categoria}`] } },
        select: { telefone: true },
      }),
      prisma.user.findMany({
        where: { ativo: true, recebeWhatsapp: true, telefone: { not: null } },
        select: { nome: true, telefone: true },
      }),
    ]);

    const numerosJaNotificados = new Set(
      contatosNotif.map(c => c.telefone.replace(/\D/g, ''))
    );

    // 1. Responsável pré-configurado (evo_responsavel) — via enviarOcorrencia
    evo.enviarOcorrencia(oc).catch(e => console.error('[evo] ocorrência:', e.message));

    // 2. Usuários com recebeWhatsapp=true, deduplica contra contatoNotificacao
    for (const u of usuarios) {
      const num = u.telefone.replace(/\D/g, '');
      if (numerosJaNotificados.has(num)) continue;
      numerosJaNotificados.add(num);
      evo.send(u.telefone, msg).catch(e => console.error(`[evo] usuário ${u.nome}: ${e.message}`));
    }
  } catch (e) {
    console.error('[ocorrência] erro ao notificar:', e.message);
  }
}

function gerarProtocolo() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const data = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  return `OCR-${data}-${randomInt(100000, 999999)}`;
}

exports.criar = async (req, res, next) => {
  try {
    const d = req.body;
    if (!d.categoria?.trim()) return res.status(400).json({ error: 'Categoria obrigatória' });
    if (!d.tipo?.trim())      return res.status(400).json({ error: 'Tipo obrigatório' });
    if (!d.local?.trim())     return res.status(400).json({ error: 'Local obrigatório' });
    if (!d.dataHora)          return res.status(400).json({ error: 'Data e horário obrigatórios' });
    if (!d.descricao?.trim()) return res.status(400).json({ error: 'Descrição obrigatória' });
    if (d.descricao.length > 5000) return res.status(400).json({ error: 'Descrição muito longa (máx 5000 chars)' });
    if (d.providencias?.length > 3000) return res.status(400).json({ error: 'Providências muito longas (máx 3000 chars)' });
    if (d.danosMateriais?.length > 2000) return res.status(400).json({ error: 'Danos materiais muito longos (máx 2000 chars)' });

    const statusValidos = ['aberta','em_analise','resolvida','encaminhada','arquivada'];
    const status = statusValidos.includes(d.status) ? d.status : 'aberta';

    let ocorrencia;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const protocolo = gerarProtocolo();
      try {
        ocorrencia = await prisma.ocorrencia.create({
          data: {
            protocolo,
            categoria:       d.categoria.trim(),
            tipo:            d.tipo.trim(),
            local:           d.local.trim(),
            dataHora:        new Date(d.dataHora),
            descricao:       d.descricao.trim(),
            envolvidos:      Array.isArray(d.envolvidos)  ? d.envolvidos  : [],
            testemunhas:     Array.isArray(d.testemunhas) ? d.testemunhas : [],
            acionamentos:    Array.isArray(d.acionamentos)? d.acionamentos: [],
            danosMateriais:  d.danosMateriais  || null,
            estimativaDanos: d.estimativaDanos ? parseFloat(d.estimativaDanos) : null,
            anexos:          Array.isArray(d.anexos) ? d.anexos : [],
            providencias:    d.providencias || null,
            status,
            registradoPorId: req.user.id,
          },
          include: { registradoPor: { select: { nome: true, role: true, setor: true } } }
        });
        break;
      } catch (e) {
        if (e.code !== 'P2002' || tentativa === 2) throw e;
      }
    }

    prisma.auditLog.create({ data: {
      userId: req.user.id, acao: 'CRIAR_OCORRENCIA',
      entidade: 'ocorrencia', entidadeId: ocorrencia.id,
      detalhes: { protocolo: ocorrencia.protocolo, categoria: ocorrencia.categoria }
    }}).catch(e => console.warn('[audit]', e.message));

    notificarOcorrencia(ocorrencia).catch(e => console.error('[notif] ocorrência:', e.message));
    notifSvc.ocorrencia(ocorrencia).catch(e => console.error('[notif] ocorrência setor:', e.message));

    res.status(201).json(ocorrencia);
  } catch(e) { next(e); }
};

exports.listar = async (req, res, next) => {
  try {
    const { page = 1, status, categoria, busca, dataInicio, dataFim } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip  = (Number(page) - 1) * limit;
    const where = {};

    if (status)   where.status   = status;
    if (categoria) where.categoria = categoria;
    if (busca && typeof busca === 'string' && busca.length <= 100) {
      const term = busca.trim();
      where.OR = [
        { protocolo: { contains: term, mode: 'insensitive' } },
        { descricao: { contains: term, mode: 'insensitive' } },
        { local:     { contains: term, mode: 'insensitive' } },
        { tipo:      { contains: term, mode: 'insensitive' } },
      ];
    }
    if (dataInicio || dataFim) {
      const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00Z') : null;
      const fim    = dataFim    ? new Date(dataFim    + 'T23:59:59Z') : null;
      if ((inicio && isNaN(inicio)) || (fim && isNaN(fim)))
        return res.status(400).json({ error: 'Data inválida (use YYYY-MM-DD)' });
      where.dataHora = {};
      if (inicio) where.dataHora.gte = inicio;
      if (fim)    where.dataHora.lte = fim;
    }

    const [ocorrencias, total] = await Promise.all([
      prisma.ocorrencia.findMany({
        where, skip, take: limit,
        orderBy: { dataHora: 'desc' },
        include: { registradoPor: { select: { nome: true } } }
      }),
      prisma.ocorrencia.count({ where })
    ]);

    res.json({ ocorrencias, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch(e) { next(e); }
};

exports.buscar = async (req, res, next) => {
  try {
    const ocorrencia = await prisma.ocorrencia.findUnique({
      where: { id: req.params.id },
      include: { registradoPor: { select: { nome: true, role: true, setor: true } } }
    });
    if (!ocorrencia) return res.status(404).json({ error: 'Ocorrência não encontrada' });
    res.json(ocorrencia);
  } catch(e) { next(e); }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existe = await prisma.ocorrencia.findUnique({ where: { id }, select: { id: true } });
    if (!existe) return res.status(404).json({ error: 'Ocorrência não encontrada' });

    const d    = req.body;
    const data = {};
    const statusValidos = ['aberta','em_analise','resolvida','encaminhada','arquivada'];
    if (d.status && statusValidos.includes(d.status)) data.status = d.status;
    if (d.providencias  !== undefined) data.providencias  = d.providencias  || null;
    if (d.danosMateriais !== undefined) data.danosMateriais = d.danosMateriais || null;
    if (d.estimativaDanos !== undefined) data.estimativaDanos = d.estimativaDanos ? parseFloat(d.estimativaDanos) : null;
    if (d.descricao     !== undefined) data.descricao    = d.descricao;
    if (d.acionamentos  !== undefined) data.acionamentos = d.acionamentos;
    if (d.anexos        !== undefined) data.anexos       = d.anexos;

    const updated = await prisma.ocorrencia.update({
      where: { id },
      data,
      include: { registradoPor: { select: { nome: true } } }
    });

    prisma.auditLog.create({ data: {
      userId: req.user.id, acao: 'ATUALIZAR_OCORRENCIA',
      entidade: 'ocorrencia', entidadeId: id,
      detalhes: { status: data.status }
    }}).catch(e => console.warn('[audit]', e.message));

    res.json(updated);
  } catch(e) { next(e); }
};

exports.exportar = async (req, res, next) => {
  try {
    const { status, categoria, busca, dataInicio, dataFim } = req.query;
    const where = {};
    if (status)   where.status   = status;
    if (categoria) where.categoria = categoria;
    if (busca) {
      if (typeof busca !== 'string' || busca.length > 100)
        return res.status(400).json({ error: 'Busca inválida' });
      const term = busca.trim();
      where.OR = [
        { protocolo: { contains: term, mode: 'insensitive' } },
        { descricao: { contains: term, mode: 'insensitive' } },
        { local:     { contains: term, mode: 'insensitive' } },
        { tipo:      { contains: term, mode: 'insensitive' } },
      ];
    }
    if (dataInicio || dataFim) {
      const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00Z') : null;
      const fim    = dataFim    ? new Date(dataFim    + 'T23:59:59Z') : null;
      if ((inicio && isNaN(inicio)) || (fim && isNaN(fim)))
        return res.status(400).json({ error: 'Data inválida (use YYYY-MM-DD)' });
      where.dataHora = {};
      if (inicio) where.dataHora.gte = inicio;
      if (fim)    where.dataHora.lte = fim;
    }

    const ocorrencias = await prisma.ocorrencia.findMany({
      where,
      take: 5000,
      orderBy: { dataHora: 'desc' },
      include: { registradoPor: { select: { nome: true } } },
    });

    const fmt = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      const p = n => String(n).padStart(2, '0');
      return `${p(d.getUTCDate())}/${p(d.getUTCMonth()+1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
    };
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const header = ['Protocolo','Status','Categoria','Tipo','Local','Data/Hora','Registrado por','Descrição','Providências','Danos Materiais','Estimativa Danos','Envolvidos','Testemunhas','Acionamentos','Anexos'];
    const rows = ocorrencias.map(o => [
      o.protocolo, o.status, o.categoria, o.tipo, o.local, fmt(o.dataHora),
      o.registradoPor?.nome ?? '',
      o.descricao,
      o.providencias ?? '',
      o.danosMateriais ?? '',
      o.estimativaDanos ?? '',
      Array.isArray(o.envolvidos)  ? o.envolvidos.length  : 0,
      Array.isArray(o.testemunhas) ? o.testemunhas.length : 0,
      Array.isArray(o.acionamentos)? o.acionamentos.length: 0,
      Array.isArray(o.anexos)      ? o.anexos.length      : 0,
    ].map(esc).join(','));

    const csv = '﻿' + [header.join(','), ...rows].join('\r\n');
    const filename = `ocorrencias_${new Date().toISOString().slice(0,10)}.csv`;

    prisma.auditLog.create({ data: {
      userId: req.user.id, acao: 'EXPORTAR_OCORRENCIAS', entidade: 'ocorrencias',
      detalhes: { total: ocorrencias.length, filtros: { status, categoria, busca, dataInicio, dataFim } }, ip: req.ip,
    }}).catch(e => console.warn('[audit] export:', e.message));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch(e) { next(e); }
};
