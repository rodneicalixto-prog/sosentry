import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, LogIn, LogOut, BarChart2, PlusCircle, RefreshCw, Clock, X } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import { useRealtimeCtx } from '../contexts/RealtimeContext'

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

const CARDS = [
  {
    id: 'na_fila',
    icon: Clock,
    label: 'Na Fila',
    color: 'bg-yellow-500',
    activeColor: 'ring-yellow-400',
    params: { status: 'na_fila' },
    tituloLista: 'Aguardando liberação',
  },
  {
    id: 'na_empresa',
    icon: Users,
    label: 'Na Empresa',
    color: 'bg-green-500',
    activeColor: 'ring-green-400',
    params: { status: 'na_empresa' },
    tituloLista: 'Atualmente na empresa',
  },
  {
    id: 'entradas_hoje',
    icon: LogIn,
    label: 'Entradas Hoje',
    color: 'bg-primary-700',
    activeColor: 'ring-primary-400',
    params: () => ({ dataInicio: hoje(), dataFim: hoje() }),
    tituloLista: 'Entradas de hoje',
  },
  {
    id: 'saidas_hoje',
    icon: LogOut,
    label: 'Saídas Hoje',
    color: 'bg-accent-500',
    activeColor: 'ring-accent-400',
    params: () => ({ status: 'saiu', dataInicio: hoje(), dataFim: hoje() }),
    tituloLista: 'Saídas de hoje',
  },
  {
    id: 'total',
    icon: BarChart2,
    label: 'Total Registros',
    color: 'bg-gray-500',
    activeColor: 'ring-gray-400',
    params: {},
    tituloLista: 'Todos os registros',
  },
]

function StatCard({ card, value, ativo, onClick }) {
  const Icon = card.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card p-5 flex items-center gap-4 w-full text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none ${ativo ? `ring-2 ${card.activeColor} shadow-md -translate-y-0.5` : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${card.color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">
          {value === null ? (
            <span className="block w-10 h-6 bg-gray-200 rounded animate-pulse" />
          ) : value}
        </p>
      </div>
      {ativo && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${card.color}`} />}
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [resumo, setResumo]       = useState(null)
  const [registros, setRegistros] = useState(null)
  const [totalFiltro, setTotalFiltro] = useState(0)
  const [loadingResumo, setLoadingResumo] = useState(true)
  const [loadingLista, setLoadingLista]   = useState(false)
  const [error, setError]         = useState('')
  const [cardAtivo, setCardAtivo] = useState(null)
  const { notificacoes } = useRealtimeCtx()
  const abortResumoRef = useRef(null)
  const abortListaRef  = useRef(null)
  const debounceRef    = useRef(null)

  const fetchResumo = useCallback(async () => {
    if (abortResumoRef.current) abortResumoRef.current.abort()
    const ctrl = new AbortController()
    abortResumoRef.current = ctrl
    setLoadingResumo(true)
    setError('')
    try {
      const { data } = await api.get('/api/dashboard/resumo', { signal: ctrl.signal })
      setResumo(data)
    } catch (err) {
      if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED')
        setError('Erro ao carregar dados do dashboard.')
    } finally {
      setLoadingResumo(false)
    }
  }, [])

  const fetchLista = useCallback(async (params) => {
    if (abortListaRef.current) abortListaRef.current.abort()
    const ctrl = new AbortController()
    abortListaRef.current = ctrl
    setLoadingLista(true)
    try {
      const { data } = await api.get('/api/registros', {
        params: { page: 1, limit: 50, ...params },
        signal: ctrl.signal,
      })
      setRegistros(data.registros || [])
      setTotalFiltro(data.total || 0)
    } catch (err) {
      if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED')
        setRegistros([])
    } finally {
      setLoadingLista(false)
    }
  }, [])

  // Carrega lista padrão (últimos 10) na inicialização
  const fetchRecentes = useCallback(async () => {
    if (abortListaRef.current) abortListaRef.current.abort()
    const ctrl = new AbortController()
    abortListaRef.current = ctrl
    setLoadingLista(true)
    try {
      const { data } = await api.get('/api/registros', {
        params: { page: 1, limit: 10 },
        signal: ctrl.signal,
      })
      setRegistros(data.registros || [])
      setTotalFiltro(data.total || 0)
    } catch (err) {
      if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED')
        setRegistros([])
    } finally {
      setLoadingLista(false)
    }
  }, [])

  useEffect(() => {
    fetchResumo()
    fetchRecentes()
    return () => {
      if (abortResumoRef.current) abortResumoRef.current.abort()
      if (abortListaRef.current)  abortListaRef.current.abort()
      clearTimeout(debounceRef.current)
    }
  }, [])

  // SSE: atualiza resumo e lista no filtro ativo
  useEffect(() => {
    if (notificacoes.length === 0) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchResumo()
      if (cardAtivo) {
        const card = CARDS.find(c => c.id === cardAtivo)
        const params = typeof card.params === 'function' ? card.params() : card.params
        fetchLista(params)
      } else {
        fetchRecentes()
      }
    }, 1500)
    return () => clearTimeout(debounceRef.current)
  }, [notificacoes.length])

  const handleCardClick = (card) => {
    if (cardAtivo === card.id) {
      // desseleciona
      setCardAtivo(null)
      fetchRecentes()
    } else {
      setCardAtivo(card.id)
      const params = typeof card.params === 'function' ? card.params() : card.params
      fetchLista(params)
    }
  }

  const handleRefresh = () => {
    fetchResumo()
    if (cardAtivo) {
      const card = CARDS.find(c => c.id === cardAtivo)
      const params = typeof card.params === 'function' ? card.params() : card.params
      fetchLista(params)
    } else {
      fetchRecentes()
    }
  }

  const cardAtivoInfo = CARDS.find(c => c.id === cardAtivo)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral do controle de portaria</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={loadingResumo || loadingLista} className="btn-secondary btn-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingResumo || loadingLista) ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <Link to="/registros/novo" className="btn-accent flex-1 sm:flex-none justify-center">
            <PlusCircle className="w-4 h-4" />
            Nova Entrada
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {CARDS.map(card => (
          <StatCard
            key={card.id}
            card={card}
            value={resumo ? resumo[
              card.id === 'na_fila'       ? 'naFila'      :
              card.id === 'na_empresa'    ? 'naEmpresa'   :
              card.id === 'entradas_hoje' ? 'entradaHoje' :
              card.id === 'saidas_hoje'   ? 'saidaHoje'   : 'total'
            ] : null}
            ativo={cardAtivo === card.id}
            onClick={() => handleCardClick(card)}
          />
        ))}
      </div>

      {/* Lista */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-800">
              {cardAtivoInfo ? cardAtivoInfo.tituloLista : 'Últimos Registros'}
            </h2>
            {cardAtivo && !loadingLista && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {totalFiltro} registro{totalFiltro !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {cardAtivo && (
              <button
                onClick={() => { setCardAtivo(null); fetchRecentes() }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="w-3.5 h-3.5" /> Limpar filtro
              </button>
            )}
            <Link to="/registros" className="text-sm text-primary-700 hover:text-primary-800 font-medium">
              Ver todos →
            </Link>
          </div>
        </div>

        {loadingLista ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : registros === null ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Nenhum registro encontrado.
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {registros.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 p-4 active:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/registros/${r.id}`)}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{r.nomeMotorista}</p>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{r.protocolo}</p>
                    <p className="text-xs text-gray-500 mt-1">{r.placa}{r.empresa ? ` · ${r.empresa}` : ''}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(r.dataEntrada)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="table-th">Protocolo</th>
                    <th className="table-th">Data/Hora</th>
                    <th className="table-th">Motorista</th>
                    <th className="table-th hidden md:table-cell">Placa</th>
                    <th className="table-th hidden lg:table-cell">Empresa</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registros.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/registros/${r.id}`)}
                    >
                      <td className="table-td font-mono text-xs">{r.protocolo}</td>
                      <td className="table-td text-xs whitespace-nowrap">{formatDateTime(r.dataEntrada)}</td>
                      <td className="table-td">{r.nomeMotorista}</td>
                      <td className="table-td hidden md:table-cell font-mono text-xs">{r.placa}</td>
                      <td className="table-td hidden lg:table-cell">{r.empresa || '—'}</td>
                      <td className="table-td"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
