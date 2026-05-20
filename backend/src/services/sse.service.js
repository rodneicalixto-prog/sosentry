// id → { res, userId }
const clients = new Map()

const MAX_CONEXOES_POR_USUARIO = 5

function addClient(id, res, userId) {
  // Limita conexões por usuário para prevenir DoS por múltiplas abas
  let count = 0;
  for (const c of clients.values()) {
    if (c.userId === userId) count++;
  }
  if (count >= MAX_CONEXOES_POR_USUARIO) {
    // Remove a conexão mais antiga do mesmo usuário
    for (const [cid, c] of clients) {
      if (c.userId === userId) {
        try { c.res.end(); } catch {}
        clients.delete(cid);
        break;
      }
    }
  }
  clients.set(id, { res, userId })
  res.once('close', () => removeClient(id))
}

function removeClient(id) {
  clients.delete(id)
}

function broadcast(tipo, dados) {
  if (!clients.size) return
  const msg = `event: atividade\ndata: ${JSON.stringify({ tipo, dados, ts: new Date().toISOString() })}\n\n`
  for (const [id, { res }] of clients) {
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
