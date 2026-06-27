const { randomUUID } = require('crypto')
const prisma = require('../lib/prisma')

exports.listar = async (req, res, next) => {
  try {
    const { busca, ativo } = req.query
    const where = {}
    if (ativo !== undefined) where.ativo = ativo === 'true'
    if (busca) where.OR = [
      { nome:     { contains: busca, mode: 'insensitive' } },
      { cnpj:     { contains: busca } },
      { email:    { contains: busca, mode: 'insensitive' } },
      { whatsapp: { contains: busca } },
      { contato:  { contains: busca, mode: 'insensitive' } },
    ]
    const empresas = await prisma.empresa.findMany({ where, orderBy: { nome: 'asc' } })
    res.json(empresas)
  } catch (e) { next(e) }
}

exports.buscar = async (req, res, next) => {
  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: req.params.id } })
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' })
    res.json(empresa)
  } catch (e) { next(e) }
}

exports.criar = async (req, res, next) => {
  try {
    const { nome, cnpj, email, whatsapp, contato, observacoes } = req.body
    if (!nome?.trim())     return res.status(400).json({ error: 'Nome obrigatório' })
    if (!email?.trim())    return res.status(400).json({ error: 'E-mail obrigatório' })
    if (!whatsapp?.trim()) return res.status(400).json({ error: 'WhatsApp obrigatório' })
    const empresa = await prisma.empresa.create({
      data: {
        id: randomUUID(),
        nome: nome.trim(),
        cnpj: cnpj?.replace(/\D/g, '') || null,
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.replace(/\D/g, ''),
        contato: contato?.trim() || null,
        observacoes: observacoes?.trim() || null,
      },
    })
    res.status(201).json(empresa)
  } catch (e) { next(e) }
}

exports.atualizar = async (req, res, next) => {
  try {
    const { nome, cnpj, email, whatsapp, contato, observacoes, ativo } = req.body
    const data = {}
    if (nome        !== undefined) data.nome        = nome.trim()
    if (cnpj        !== undefined) data.cnpj        = cnpj?.replace(/\D/g, '') || null
    if (email       !== undefined) data.email       = email.trim().toLowerCase()
    if (whatsapp    !== undefined) data.whatsapp    = whatsapp.replace(/\D/g, '')
    if (contato     !== undefined) data.contato     = contato?.trim() || null
    if (observacoes !== undefined) data.observacoes = observacoes?.trim() || null
    if (ativo       !== undefined) data.ativo       = Boolean(ativo)
    const empresa = await prisma.empresa.update({ where: { id: req.params.id }, data })
    res.json(empresa)
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Empresa não encontrada' })
    next(e)
  }
}

exports.deletar = async (req, res, next) => {
  try {
    await prisma.empresa.update({ where: { id: req.params.id }, data: { ativo: false } })
    res.json({ ok: true })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Empresa não encontrada' })
    next(e)
  }
}
