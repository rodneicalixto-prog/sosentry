import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, AlertTriangle, Filter, ChevronRight, RefreshCw } from 'lucide-react'
import api from '../api/client'

const STATUS_MAP = {
  aberta:      { label: 'Aberta',       cls: 'bg-blue-100 text-blue-700' },
  em_analise:  { label: 'Em análise',   cls: 'bg-yellow-100 text-yellow-700' },
  resolvida:   { label: 'Resolvida',    cls: 'bg-green-100 text-green-700' },
  encaminhada: { label: 'Encaminhada',  cls: 'bg-purple-100 text-purple-700' },
  arquivada:   { label: 'Arquivada',    cls: 'bg-gray-100 text-gray-600' },
}

const CATEGORIAS = [
  'Segurança do Trabalho','Segurança Patrimonial','Conflitos Internos',
  'Veículos e Estacionamento','Infraestrutura','Ocorrências Externas',
  'Danos ao Patrimônio','Saúde / Mal-estar','Outras Ocorrências',
]

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

export default function Ocorrencias() {
  const navigate = useNavigate()
  const [ocorrencias, setOcorrencias] = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [busca, setBusca]     = useState('')
  const [status, setStatus]   = useState('')
  const [categoria, setCategoria] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const LIMIT = 20

  const carregar = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, limit: LIMIT }
      if (busca.trim()) params.busca = busca.trim()
      if (status)   params.status   = status
      if (categoria) params.categoria = categoria
      const { data } = await api.get('/api/ocorrencias', { params })
      setOcorrencias(data.ocorrencias)
      setTotal(data.total)
      setPage(p)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [busca, status, categoria])

  useEffect(() => { carregar(1) }, [carregar])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ocorrências</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} ocorrência(s) registrada(s)</p>
        </div>
        <button onClick={() => navigate('/ocorrencias/nova')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold flex-shrink-0">
          <Plus className="w-4 h-4" /> Nova Ocorrência
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-4">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por protocolo, descrição, local..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && carregar(1)}
            />
          </div>
          <button onClick={() => setFiltrosAbertos(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${filtrosAbertos ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button onClick={() => carregar(1)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {filtrosAbertos && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">Todos os status</option>
                {Object.entries(STATUS_MAP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={categoria} onChange={e => setCategoria(e.target.value)}>
                <option value="">Todas as categorias</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ocorrencias.length === 0 ? (
        <div className="card p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma ocorrência encontrada</p>
          <p className="text-gray-400 text-sm mt-1">Ajuste os filtros ou registre uma nova ocorrência.</p>
          <button onClick={() => navigate('/ocorrencias/nova')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Nova Ocorrência
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {ocorrencias.map(o => {
            const st = STATUS_MAP[o.status] || STATUS_MAP.aberta
            const qtdAnexos = Array.isArray(o.anexos) ? o.anexos.length : 0
            return (
              <div key={o.id}
                className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/ocorrencias/${o.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{o.protocolo}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm truncate">{o.categoria} · {o.tipo}</p>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{o.local}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                      <span>{fmt(o.dataHora)}</span>
                      {o.registradoPor && <span>por {o.registradoPor.nome}</span>}
                      {qtdAnexos > 0 && <span>{qtdAnexos} anexo(s)</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                </div>
                {o.descricao && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{o.descricao}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => carregar(page - 1)} disabled={page <= 1}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
            Anterior
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => carregar(page + 1)} disabled={page >= totalPages}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
            Próxima
          </button>
        </div>
      )}
    </div>
  )
}
