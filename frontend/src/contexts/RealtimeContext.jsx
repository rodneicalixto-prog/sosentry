import React, { createContext, useContext, useState, useCallback } from 'react'
import { useRealtime } from '../hooks/useRealtime'

const RealtimeContext = createContext(null)

const MAX_NOTIFS = 50

export function RealtimeProvider({ children }) {
  const [conectado, setConectado] = useState(false)
  const [notificacoes, setNotificacoes] = useState([])
  const [naoLidas, setNaoLidas] = useState(0)

  const adicionarNotificacao = useCallback((evento) => {
    const nova = { id: Date.now() + Math.random(), ...evento, lida: false }
    setNotificacoes(prev => [nova, ...prev].slice(0, MAX_NOTIFS))
    setNaoLidas(n => n + 1)
  }, [])

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
    setNaoLidas(0)
  }, [])

  const limpar = useCallback(() => {
    setNotificacoes([])
    setNaoLidas(0)
  }, [])

  useRealtime(adicionarNotificacao, setConectado)

  return (
    <RealtimeContext.Provider value={{ conectado, notificacoes, naoLidas, marcarTodasLidas, limpar }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeCtx() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtimeCtx fora de RealtimeProvider')
  return ctx
}
