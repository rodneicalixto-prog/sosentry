const clients = new Map() // id → res

function addClient(id, res) {
  clients.set(id, res)
  // Remove imediatamente se a conexão fechar de forma abrupta
  res.once('close', () => removeClient(id))
}

function removeClient(id) {
  clients.delete(id)
}

function broadcast(tipo, dados) {
  if (!clients.size) return
  const msg = `event: atividade\ndata: ${JSON.stringify({ tipo, dados, ts: new Date().toISOString() })}\n\n`
  for (const [id, res] of clients) {
    if (res.writableEnded || res.destroyed) { removeClient(id); continue }
    try {
      res.write(msg)
    } catch {
      removeClient(id)
    }
  }
}

function clientCount() {
  return clients.size
}

module.exports = { addClient, removeClient, broadcast, clientCount }
