import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/client'

const STATUS_LABEL = {
  AGUARDANDO_NF: { label: 'Aguardando NF',  color: 'bg-yellow-100 text-yellow-700' },
  NF_RECEBIDA:   { label: 'NF Recebida',    color: 'bg-blue-100 text-blue-700' },
  APROVADO:      { label: 'Aprovado',        color: 'bg-green-100 text-green-700' },
  NA_PORTARIA:   { label: 'Na Portaria',     color: 'bg-purple-100 text-purple-700' },
  CONCLUIDO:     { label: 'Concluído',       color: 'bg-gray-100 text-gray-600' },
  CANCELADO:     { label: 'Cancelado',       color: 'bg-red-100 text-red-600' },
}

function Badge({ status }) {
  const s = STATUS_LABEL[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
}

function fmt(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`
}

export default function Agendamentos() {
  const nav = useNavigate()
  const [lista, setLista] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filtro, setFiltro] = useState({ status: '', busca: '' })
  const [carregando, setCarregando] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      const params = { page, limit: 20 }
      if (filtro.status) params.status = filtro.status
      if (filtro.busca)  params.busca  = filtro.busca
      const { data } = await api.get('/api/agendamentos', { params })
      setLista(data.agendamentos)
      setTotal(data.total)
    } catch {}
    finally { setCarregando(false) }
  }

  useEffect(() => { carregar() }, [page, filtro])

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Agendamentos de Carga</h1>
          <p className="text-gray-500 text-sm">{total} registro(s)</p>
        </div>
        <button onClick={() => nav('/admin/agendamentos/novo')}
          className="bg-blue-700 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-800 transition whitespace-nowrap">
          + Novo Agendamento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          placeholder="Buscar empresa, motorista, placa, NF..."
          value={filtro.busca}
          onChange={e => { setFiltro(f => ({ ...f, busca: e.target.value })); setPage(1) }}
          className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtro.status}
          onChange={e => { setFiltro(f => ({ ...f, status: e.target.value })); setPage(1) }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhum agendamento encontrado.</div>
      ) : (
        <div className="space-y-3">
          {lista.map(ag => (
            <Link key={ag.id} to={`/admin/agendamentos/${ag.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Badge status={ag.status} />
                  <span className="font-semibold text-gray-800">{ag.empresa || '—'}</span>
                  {ag.placa && <span className="text-xs text-gray-500 font-mono">{ag.placa}</span>}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {ag.numeroNF && <span>NF {ag.numeroNF}</span>}
                  {ag.dataEntrega && <span>📅 {fmt(ag.dataEntrega)} {ag.horarioPref || ''}</span>}
                  <span className="text-xs">{ag.departamento}</span>
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Criado por {ag.criadoPor?.nome} · {fmt(ag.criadoEm)}
                {ag.portaria && ` · ${ag.portaria.nome}`}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Paginação */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40">Anterior</button>
          <span className="px-4 py-2 text-sm text-gray-600">Página {page}</span>
          <button disabled={lista.length < 20} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40">Próxima</button>
        </div>
      )}
    </div>
  )
}
