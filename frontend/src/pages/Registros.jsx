import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, PlusCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Registros() {
  const navigate = useNavigate()
  const [registros, setRegistros] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const LIMIT = 15

  const fetchRegistros = useCallback(async (pg = page) => {
    setLoading(true)
    setError('')
    try {
      const params = { page: pg, limit: LIMIT }
      if (busca) params.busca = busca
      if (status) params.status = status
      if (dataInicio) params.dataInicio = dataInicio
      if (dataFim) params.dataFim = dataFim
      const { data } = await api.get('/api/registros', { params })
      setRegistros(data.registros || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      setPage(pg)
    } catch {
      setError('Erro ao carregar registros.')
    } finally {
      setLoading(false)
    }
  }, [busca, status, dataInicio, dataFim, page])

  useEffect(() => {
    fetchRegistros(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, status, dataInicio, dataFim])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchRegistros(1)
  }

  const clearFilters = () => {
    setBusca('')
    setStatus('')
    setDataInicio('')
    setDataFim('')
  }

  const hasFilters = busca || status || dataInicio || dataFim

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registros</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}` : 'Controle de entradas e saídas'}
          </p>
        </div>
        <Link to="/registros/novo" className="btn-accent">
          <PlusCircle className="w-4 h-4" />
          Nova Entrada
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Motorista, placa, empresa, protocolo…"
              className="input pl-9"
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input w-full sm:w-44"
          >
            <option value="">Todos os status</option>
            <option value="na_empresa">Na empresa</option>
            <option value="saiu">Saiu</option>
            <option value="cancelado">Cancelado</option>
          </select>

          {/* Date range */}
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="input w-full sm:w-auto"
            title="Data início"
          />
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="input w-full sm:w-auto"
            title="Data fim"
          />

          <button type="submit" className="btn-primary">
            <Search className="w-4 h-4" />
            Buscar
          </button>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-secondary">
              <X className="w-4 h-4" />
              Limpar
            </button>
          )}
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Nenhum registro encontrado para os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-th">Protocolo</th>
                  <th className="table-th">Data/Hora</th>
                  <th className="table-th hidden sm:table-cell">Portaria</th>
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
                    <td className="table-td text-xs whitespace-nowrap">
                      {formatDateTime(r.createdAt || r.dataEntrada)}
                    </td>
                    <td className="table-td hidden sm:table-cell text-xs">
                      {r.portaria?.nome || r.portariaNome || '—'}
                    </td>
                    <td className="table-td">{r.nomeMotorista}</td>
                    <td className="table-td hidden md:table-cell font-mono text-xs">{r.placa}</td>
                    <td className="table-td hidden lg:table-cell">{r.empresa || '—'}</td>
                    <td className="table-td">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchRegistros(page - 1)}
                disabled={page <= 1}
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pg = i + 1
                if (totalPages > 5) {
                  if (page <= 3) pg = i + 1
                  else if (page >= totalPages - 2) pg = totalPages - 4 + i
                  else pg = page - 2 + i
                }
                return (
                  <button
                    key={pg}
                    onClick={() => fetchRegistros(pg)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      pg === page
                        ? 'bg-primary-700 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pg}
                  </button>
                )
              })}
              <button
                onClick={() => fetchRegistros(page + 1)}
                disabled={page >= totalPages}
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
