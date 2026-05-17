// Gerencia conexões SSE ativas e transmite eventos para todos os clientes conectados
const clients = new Map() // id → res

function addClient(id, res) {
  clients.set(id, res)
}

function removeClient(id) {
  clients.delete(id)
}

function broadcast(tipo, dados) {
  if (!clients.size) return
  const msg = `event: atividade\ndata: ${JSON.stringify({ tipo, dados, ts: new Date().toISOString() })}\n\n`
  for (const [id, res] of clients) {
    try {
      res.write(msg)
    } catch {
      clients.delete(id)
    }
  }
}

function clientCount() {
  return clients.size
}

module.exports = { addClient, removeClient, broadcast, clientCount }
