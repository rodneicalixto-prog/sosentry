const router = require('express').Router()
const { v4: uuid } = require('uuid')
const { authenticate } = require('../middleware/auth.middleware')
const { addClient, removeClient, clientCount } = require('../services/sse.service')

router.get('/', authenticate, (req, res) => {
  const id = uuid()

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // desativa buffer do nginx para SSE
  res.flushHeaders()

  // Confirma conexão
  res.write(`event: conectado\ndata: ${JSON.stringify({ ok: true, clientes: clientCount() + 1 })}\n\n`)

  addClient(id, res)

  // Keepalive a cada 25s para manter a conexão viva através de proxies
  const ping = setInterval(() => {
    try {
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
