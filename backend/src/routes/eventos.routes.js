const router = require('express').Router()
const { v4: uuid } = require('uuid')
const { authenticate } = require('../middleware/auth.middleware')
const { addClient, removeClient, clientCount } = require('../services/sse.service')
const prisma = require('../lib/prisma')

const REVALIDAR_INTERVALO = 5 * 60 * 1000 // revalida sessão a cada 5 minutos

router.get('/', authenticate, (req, res) => {
  const id = uuid()

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // desativa buffer do nginx para SSE
  res.flushHeaders()

  // Confirma conexão
  res.write(`event: conectado\ndata: ${JSON.stringify({ ok: true, clientes: clientCount() + 1 })}\n\n`)

  addClient(id, res, req.user.id)

  let ultimaRevalidacao = Date.now()

  // Keepalive a cada 25s + revalidação de sessão a cada 5 minutos
  const ping = setInterval(async () => {
    try {
      // Revalida se o usuário ainda está ativo
      if (Date.now() - ultimaRevalidacao >= REVALIDAR_INTERVALO) {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { ativo: true },
        }).catch(() => null)

        if (!user?.ativo) {
          clearInterval(ping)
          removeClient(id)
          try { res.end() } catch {}
          return
        }
        ultimaRevalidacao = Date.now()
      }

      res.write(':keepalive\n\n')
    } catch {
      clearInterval(ping)
      removeClient(id)
    }
  }, 25000)

  req.on('close', () => {
    clearInterval(ping)
    removeClient(id)
  })
})

module.exports = router
