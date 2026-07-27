import { useEffect, useState } from 'react'
import { ChevronRight, Clock, CheckCircle, Search, Loader } from 'lucide-react'
import api from '../../api/client'

export default function FilaLiberacao() {
  const [clientes, setClientes] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [liberando, setLiberando] = useState(null)

  const limit = 15

  useEffect(() => {
    carregar()
  }, [page, busca])

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 3500)
    return () => clearTimeout(t)
  }, [feedback])

  async function carregar() {
    setCarregando(true)
    try {
      const params = new URLSearchParams({
        page,
        limit,
        ...(busca && { busca }),
      })
      const { data } = await api.get(`/api/agendamentos/fila/liberacao?${params}`)
      setClientes(data.agendamentos || [])
      setTotal(data.total || 0)
    } catch (e) {
      setFeedback({
        tipo: 'erro',
        msg: e.response?.data?.error || 'Erro ao carregar fila.'
      })
    } finally {
      setCarregando(false)
    }
  }

  async function liberar(agId) {
    setLiberando(agId)
    try {
      await api.patch(`/api/agendamentos/${agId}/liberar-fila`)
      setFeedback({
        tipo: 'ok',
        msg: 'Cliente liberado da fila com sucesso!'
      })
      await carregar()
    } catch (e) {
      setFeedback({
        tipo: 'erro',
        msg: e.response?.data?.error || 'Erro ao liberar cliente.'
      })
    } finally {
      setLiberando(null)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const temResultados = clientes.length > 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-6 h-6 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Fila de Liberação</h1>
          </div>
          <p className="text-gray-600">Clientes aguardando liberação para entrada</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Na fila</p>
            <p className="text-2xl font-bold text-orange-600">{total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Página</p>
            <p className="text-2xl font-bold text-gray-900">{page} de {totalPages || 1}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Mostrando</p>
            <p className="text-2xl font-bold text-gray-900">{clientes.length} items</p>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            feedback.tipo === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {feedback.msg}
          </div>
        )}

        {/* Busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por empresa, CNPJ, motorista, placa ou NF..."
              value={busca}
              onChange={e => {
                setBusca(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Tabela */}
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-orange-600 animate-spin" />
          </div>
        ) : temResultados ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Empresa</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">CNPJ</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Motorista</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Placa</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">NF</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Portaria</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clientes.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{c.razaoSocial || c.empresa || '—'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{c.departamento && `Depto: ${c.departamento}`}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.cnpjEmpresa || '—'}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-900">{c.motorista || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-blue-50 text-blue-700 px-2.5 py-1 rounded font-mono text-xs font-semibold">
                          {c.placa || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono">{c.numeroNF || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.portaria?.nome || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => liberar(c.id)}
                          disabled={liberando === c.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs font-semibold transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {liberando === c.id ? 'Liberando...' : 'Liberar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-200">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1.5 rounded text-sm font-medium ${
                      page === p
                        ? 'bg-orange-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-gray-600">Nenhum cliente aguardando liberação no momento.</p>
          </div>
        )}
      </div>
    </div>
  )
}
