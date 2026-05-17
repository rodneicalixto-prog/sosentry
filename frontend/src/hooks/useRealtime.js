import { useEffect, useRef } from 'react'

// Conecta ao endpoint SSE e chama onEvento(evento) a cada atividade recebida.
// Reconecta automaticamente em caso de queda (comportamento nativo do EventSource).
export function useRealtime(onEvento, onConectado) {
  const cbEvento = useRef(onEvento)
  const cbConectado = useRef(onConectado)
  cbEvento.current = onEvento
  cbConectado.current = onConectado

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const url = `/api/eventos?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.addEventListener('conectado', () => {
      cbConectado.current?.(true)
    })

    es.addEventListener('atividade', (e) => {
      try {
        cbEvento.current?.(JSON.parse(e.data))
      } catch { /* ignore parse errors */ }
    })

    es.onerror = () => {
      cbConectado.current?.(false)
      // EventSource reconecta automaticamente
    }

    return () => {
      es.close()
      cbConectado.current?.(false)
    }
  }, []) // monta uma vez por sessão
}
