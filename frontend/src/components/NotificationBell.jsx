import React, { useState, useRef, useEffect } from 'react'
import { Bell, LogIn, LogOut, Trash2 } from 'lucide-react'
import { useRealtimeCtx } from '../contexts/RealtimeContext'

function fmt(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function NotificationBell() {
  const { notificacoes, naoLidas, marcarTodasLidas, limpar } = useRealtimeCtx()
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  // Fechar ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle() {
    setAberto(v => {
      if (!v) marcarTodasLidas()
      return !v
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-bounce">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">Atividade recente</span>
            {notificacoes.length > 0 && (
              <button onClick={limpar} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhuma atividade ainda
              </div>
            ) : (
              notificacoes.map(n => {
                const entrada = n.tipo === 'entrada'
                return (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${!n.lida ? 'bg-blue-50/40' : ''}`}>
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5
                      ${entrada ? 'bg-green-100' : 'bg-orange-100'}`}>
                      {entrada
                        ? <LogIn  className="w-3.5 h-3.5 text-green-600" />
                        : <LogOut className="w-3.5 h-3.5 text-orange-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${entrada ? 'text-green-700' : 'text-orange-600'}`}>
                        {entrada ? 'Entrada' : 'Saída'}
                        {!n.lida && <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                      </p>
                      <p className="text-sm text-gray-800 truncate">{n.dados?.nomeMotorista}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {n.dados?.placa}
                        {n.dados?.empresa ? ` · ${n.dados.empresa}` : ''}
                      </p>
                      <p className="text-xs text-gray-300 mt-0.5">{fmt(n.ts)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
