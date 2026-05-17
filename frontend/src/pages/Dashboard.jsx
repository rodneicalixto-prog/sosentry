import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, LogIn, LogOut, BarChart2, PlusCircle, RefreshCw } from 'lucide-react'
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

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">
          {value === null ? (
            <span className="block w-10 h-6 bg-gray-200 rounded animate-pulse" />
          ) : (
            value
          )}
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [resumo, setResumo] = useState(null)
  const [registros, setRegistros] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [resResumo, resRegistros] = await Promise.all([
        api.get('/api/dashboard/resumo'),
        api.get('/api/registros', { params: { page: 1, limit: 10 } }),
      ])
      setResumo(resResumo.data)
      setRegistros(resRegistros.data.registros || [])
    } catch (err) {
      setError('Erro ao carregar dados do dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral do controle de portaria</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Na Empresa"
          value={resumo ? resumo.naEmpresa : null}
          color="bg-green-500"
        />
        <StatCard
          icon={LogIn}
          label="Entradas Hoje"
          value={resumo ? resumo.entradaHoje : null}
          color="bg-primary-700"
        />
        <StatCard
          icon={LogOut}
          label="Saídas Hoje"
          value={resumo ? resumo.saidaHoje : null}
          color="bg-accent-500"
        />
        <StatCard
          icon={BarChart2}
          label="Total Registros"
          value={resumo ? resumo.total : null}
          color="bg-gray-500"
        />
      </div>

      {/* Recent records */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Últimos Registros</h2>
          <Link to="/registros" className="text-sm text-primary-700 hover:text-primary-800 font-medium">
            Ver todos →
          </Link>
        </div>

        {registros === null ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Nenhum registro encontrado.</div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {registros.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 p-4 active:bg-gray-50 cursor-pointer"
                  onClick={() => (window.location.href = `/registros/${r.id}`)}
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
            {/* Tablet/Desktop: tabela */}
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
                      onClick={() => (window.location.href = `/registros/${r.id}`)}
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
