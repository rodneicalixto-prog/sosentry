import React, { useEffect, useState, useRef } from 'react'
import { LogIn, LogOut, AlertTriangle, X } from 'lucide-react'
import { useRealtimeCtx } from '../contexts/RealtimeContext'

const DURACAO_MS = 6000
const DURACAO_ALERTA_MS = 12000 // alertas de NF ficam mais tempo

function Toast({ notif, onFechar }) {
  const nfAlerta = notif.tipo === 'nf_nao_programada'
  const duracao = nfAlerta ? DURACAO_ALERTA_MS : DURACAO_MS
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setSaindo(true), duracao - 400)
    const t2 = setTimeout(() => onFechar(notif.id), duracao)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [notif.id, onFechar])

  const entrada = notif.tipo === 'entrada'

  if (nfAlerta) {
    const nfe = notif.dados?.nfe
    return (
      <div className={`flex items-start gap-3 w-80 bg-white shadow-xl rounded-xl border-l-4 border-red-500 p-4 transition-all duration-300 ${saindo ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">🚨 NF sem Agendamento</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {nfe ? `${nfe.modelo} nº ${nfe.numeroNF}` : 'Entrega não programada'}
          </p>
          {nfe && <p className="text-xs text-gray-500 mt-0.5">CNPJ: {nfe.cnpjFmt}</p>}
          {notif.dados?.empresa && <p className="text-xs text-gray-500">{notif.dados.empresa.nome}</p>}
          <p className="text-xs text-gray-400 mt-1">Faturamento notificado · {new Date(notif.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={() => { setSaindo(true); setTimeout(() => onFechar(notif.id), 300) }}
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 -mt-0.5 -mr-0.5 p-0.5 rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`flex items-start gap-3 w-80 bg-white shadow-lg rounded-xl border-l-4 p-4 transition-all duration-300
        ${entrada ? 'border-green-500' : 'border-orange-500'}
        ${saindo ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${entrada ? 'bg-green-100' : 'bg-orange-100'}`}>
        {entrada
          ? <LogIn  className="w-4 h-4 text-green-600" />
          : <LogOut className="w-4 h-4 text-orange-600" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold uppercase tracking-wide ${entrada ? 'text-green-700' : 'text-orange-600'}`}>
          {entrada ? 'Nova entrada' : 'Saída registrada'}
        </p>
        <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
          {notif.dados?.nomeMotorista || '—'}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {notif.dados?.placa}
          {notif.dados?.empresa ? ` · ${notif.dados.empresa}` : ''}
        </p>
        {notif.dados?.protocolo && (
          <p className="text-xs font-mono text-gray-400 mt-0.5">{notif.dados.protocolo}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          por {notif.dados?.operador || 'operador'} · {new Date(notif.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <button
        onClick={() => { setSaindo(true); setTimeout(() => onFechar(notif.id), 300) }}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 -mt-0.5 -mr-0.5 p-0.5 rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function Toasts() {
  const { notificacoes } = useRealtimeCtx()
  const [visiveis, setVisiveis] = useState([])
  const visiveisRef = useRef([])
  visiveisRef.current = visiveis

  // Exibe apenas os 3 mais recentes como toasts
  useEffect(() => {
    if (!notificacoes.length) return
    const ultima = notificacoes[0]
    if (visiveisRef.current.find(v => v.id === ultima.id)) return
    setVisiveis(prev => [ultima, ...prev].slice(0, 3))
  }, [notificacoes])

  const fechar = (id) => setVisiveis(prev => prev.filter(v => v.id !== id))

  if (!visiveis.length) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {visiveis.map(n => (
        <div key={n.id} className="pointer-events-auto">
          <Toast notif={n} onFechar={fechar} />
        </div>
      ))}
    </div>
  )
}
