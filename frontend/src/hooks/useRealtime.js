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

    function verificarToken(fechar) {
      try {
        const t = localStorage.getItem('accessToken')
        if (!t) return
        const parts = t.split('.')
        if (parts.length !== 3) return
        const { exp } = JSON.parse(atob(parts[1]))
        if (exp * 1000 < Date.now()) {
          fechar()
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      } catch (e) {
        console.warn('[useRealtime] Falha ao verificar expiração do token:', e.message)
      }
    }

    const url = `/api/eventos?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    // Verifica expiração a cada 30s enquanto SSE está ativo
    const tokenCheck = setInterval(() => verificarToken(() => es.close()), 30000)

    es.addEventListener('conectado', () => {
      cbConectado.current?.(true)
    })

    es.addEventListener('atividade', (e) => {
      try {
        cbEvento.current?.(JSON.parse(e.data))
      } catch (err) {
        console.warn('[useRealtime] Falha ao decodificar evento SSE:', err.message)
      }
    })

    es.onerror = () => {
      cbConectado.current?.(false)
      verificarToken(() => es.close())
    }

    return () => {
      clearInterval(tokenCheck)
      es.close()
      cbConectado.current?.(false)
    }
  }, []) // monta uma vez por sessão
}
