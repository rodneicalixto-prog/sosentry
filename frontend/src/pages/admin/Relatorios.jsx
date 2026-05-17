import React, { useEffect, useState, useCallback } from 'react'
import { BarChart2, Download } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import api from '../../api/client'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const ANO_ATUAL = new Date().getFullYear()
const ANOS = Array.from({ length: 5 }, (_, i) => ANO_ATUAL - i)

function Filtros({ filtros, setFiltros, portarias }) {
  const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  return (
    <div className="card p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Ano</label>
        <select className={inp} value={filtros.ano} onChange={e => setFiltros(f => ({ ...f, ano: e.target.value, mes: '' }))}>
          {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Mês</label>
        <select className={inp} value={filtros.mes} onChange={e => setFiltros(f => ({ ...f, mes: e.target.value }))}>
          <option value="">Ano completo</option>
          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Portaria</label>
        <select className={inp} value={filtros.portariaId} onChange={e => setFiltros(f => ({ ...f, portariaId: e.target.value }))}>
          <option value="">Todas</option>
          {portarias.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Transportadora</label>
        <input
          className={inp}
          placeholder="Filtrar empresa…"
          value={filtros.empresa}
          onChange={e => setFiltros(f => ({ ...f, empresa: e.target.value }))}
        />
      </div>
    </div>
  )
}

function CardTotal({ label, value, color }) {
  return (
    <div className={`card p-4 border-l-4 ${color}`}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
    </div>
  )
}

export default function Relatorios() {
  const [filtros, setFiltros] = useState({ ano: ANO_ATUAL, mes: '', empresa: '', portariaId: '' })
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  const buscar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { ano: filtros.ano }
      if (filtros.mes)        params.mes        = filtros.mes
      if (filtros.empresa)    params.empresa    = filtros.empresa
      if (filtros.portariaId) params.portariaId = filtros.portariaId
      const { data } = await api.get('/api/relatorios/visitas', { params })
      setDados(data)
    } catch { setDados(null) }
    finally { setLoading(false) }
  }, [filtros])

  useEffect(() => { buscar() }, [buscar])

  const porMesLabel = dados?.porMes?.map((m, i) => ({ ...m, mes: MESES[i] })) ?? []
  const portarias = dados?.portarias ?? []

  function exportarCSV() {
    if (!dados?.porEmpresa?.length) return
    const header = 'Empresa,Total de Visitas'
    const rows = dados.porEmpresa.map(r => `"${r.empresa}",${r.total}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-visitas-${filtros.ano}${filtros.mes ? `-${String(filtros.mes).padStart(2,'0')}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-primary-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-sm text-gray-500">Análise de visitas por transportadora</p>
          </div>
        </div>
        <button
          onClick={exportarCSV}
          disabled={!dados?.porEmpresa?.length}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <Filtros filtros={filtros} setFiltros={setFiltros} portarias={portarias} />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !dados ? (
        <div className="card p-8 text-center text-gray-400">Erro ao carregar dados.</div>
      ) : (
        <>
          {/* Total */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <CardTotal
              label={filtros.mes ? `Visitas em ${MESES[Number(filtros.mes)-1]}/${filtros.ano}` : `Visitas em ${filtros.ano}`}
              value={dados.total}
              color="border-primary-700"
            />
            <CardTotal label="Transportadoras distintas" value={dados.porEmpresa.length} color="border-green-500" />
          </div>

          {/* Gráfico evolução mensal — só quando não há filtro de mês */}
          {!filtros.mes && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Evolução Mensal — {filtros.ano}</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={porMesLabel} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={v => [v, 'Visitas']} />
                  <Line type="monotone" dataKey="total" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico por transportadora */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Visitas por Transportadora (top 20)</h2>
            {dados.porEmpresa.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Nenhum registro no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(260, dados.porEmpresa.length * 36)}>
                <BarChart
                  data={dados.porEmpresa}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="empresa" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => [v, 'Visitas']} />
                  <Bar dataKey="total" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tabela detalhada */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Detalhamento</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="table-th">#</th>
                    <th className="table-th">Transportadora</th>
                    <th className="table-th text-right">Visitas</th>
                    <th className="table-th text-right">% do total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dados.porEmpresa.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="table-td text-gray-400 text-xs">{i + 1}</td>
                      <td className="table-td font-medium">{r.empresa}</td>
                      <td className="table-td text-right font-semibold">{r.total}</td>
                      <td className="table-td text-right text-gray-500 text-xs">
                        {dados.total > 0 ? ((r.total / dados.total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
