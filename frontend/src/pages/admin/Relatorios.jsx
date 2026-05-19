import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Truck, PackageCheck, AlertTriangle, RefreshCw, Download, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from 'recharts'
import api from '../../api/client'
import StatusBadge from '../../components/StatusBadge'

/* ─── Helpers ─────────────────────────────────────────── */

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function isoHoje() {
  return new Date().toISOString().slice(0, 10)
}
function isoPeriodo(dias) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - (dias - 1))
  return d.toISOString().slice(0, 10)
}

/* ─── Configuração dos cards ─────────────────────────── */

const CARDS = [
  {
    id: 'visitas',
    label: 'Visitas',
    icon: Users,
    color: 'bg-blue-500',
    ring: 'ring-blue-400',
    fill: '#3b82f6',
    fillLight: '#bfdbfe',
    dataKey: 'visitas',
    tipoParam: 'visitas',
  },
  {
    id: 'coletas',
    label: 'Coletas',
    icon: Truck,
    color: 'bg-amber-500',
    ring: 'ring-amber-400',
    fill: '#f59e0b',
    fillLight: '#fde68a',
    dataKey: 'coletas',
    tipoParam: 'coletas',
  },
  {
    id: 'entregas',
    label: 'Entregas',
    icon: PackageCheck,
    color: 'bg-emerald-500',
    ring: 'ring-emerald-400',
    fill: '#10b981',
    fillLight: '#a7f3d0',
    dataKey: 'entregas',
    tipoParam: 'entregas',
  },
  {
    id: 'ocorrencias',
    label: 'Ocorrências',
    icon: AlertTriangle,
    color: 'bg-red-500',
    ring: 'ring-red-400',
    fill: '#ef4444',
    fillLight: '#fecaca',
    dataKey: 'ocorrencias',
    tipoParam: null, // usa API de ocorrências
  },
]

const PERIODOS = [
  { label: 'Hoje',    dias: 1  },
  { label: '7 dias',  dias: 7  },
  { label: '15 dias', dias: 15 },
  { label: '30 dias', dias: 30 },
]

/* ─── Mini sparkline dentro do card ─────────────────── */

function MiniChart({ data, dataKey, fill, fillLight, ativo }) {
  return (
    <ResponsiveContainer width="100%" height={56}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="20%">
        <Bar dataKey={dataKey} radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={ativo ? fill : fillLight} />
          ))}
        </Bar>
        <Tooltip
          cursor={false}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs shadow">
                <p className="font-semibold text-gray-700">{payload[0].value}</p>
                <p className="text-gray-400">{label}</p>
              </div>
            ) : null
          }
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ─── Card ────────────────────────────────────────────── */

function CardMetrica({ card, total, serie, ativo, onClick }) {
  const Icon = card.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card p-4 w-full text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none flex flex-col gap-2 ${
        ativo ? `ring-2 ${card.ring} shadow-md -translate-y-0.5` : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
          <p className="text-2xl font-bold text-gray-900">
            {total === null ? (
              <span className="block w-10 h-6 bg-gray-200 rounded animate-pulse" />
            ) : total}
          </p>
        </div>
        {ativo && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${card.color}`} />}
      </div>
      <MiniChart data={serie} dataKey={card.dataKey} fill={card.fill} fillLight={card.fillLight} ativo={ativo} />
    </button>
  )
}

/* ─── Tooltip customizado do banner ─────────────────── */

function BannerTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm shadow-lg min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-gray-600">{p.name}</span>
          </span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Página principal ────────────────────────────────── */

export default function Relatorios() {
  const navigate = useNavigate()

  const hoje = isoHoje()
  const [dataFim,    setDataFim]    = useState(hoje)
  const [dataInicio, setDataInicio] = useState(isoPeriodo(7))
  const [periodoBotao, setPeriodoBotao] = useState(7) // qts dias está selecionado, null = custom

  const [dados,     setDados]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [cardAtivo, setCardAtivo] = useState(null)

  // Detalhe da lista
  const [detalhe,      setDetalhe]      = useState([])
  const [detalheTotal, setDetalheTotal] = useState(0)
  const [detalhePages, setDetalhePages] = useState(1)
  const [detalhePage,  setDetalhePage]  = useState(1)
  const [loadingDet,   setLoadingDet]   = useState(false)
  const [exporting,    setExporting]    = useState(false)

  const abortRef    = useRef(null)
  const abortDetRef = useRef(null)
  const LIMIT = 15

  /* Busca resumo */
  const buscarResumo = useCallback(async (ini, fim) => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    try {
      const { data } = await api.get('/api/relatorios/resumo', {
        params: { dataInicio: ini, dataFim: fim },
        signal: ctrl.signal,
      })
      setDados(data)
    } catch (err) {
      if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') setDados(null)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Busca detalhe da lista */
  const buscarDetalhe = useCallback(async (card, ini, fim, pg = 1) => {
    if (!card) { setDetalhe([]); return }
    if (abortDetRef.current) abortDetRef.current.abort()
    const ctrl = new AbortController()
    abortDetRef.current = ctrl
    setLoadingDet(true)
    try {
      if (card.id === 'ocorrencias') {
        const { data } = await api.get('/api/ocorrencias', {
          params: { page: pg, limit: LIMIT, dataInicio: ini, dataFim: fim },
          signal: ctrl.signal,
        })
        setDetalhe(data.ocorrencias || [])
        setDetalheTotal(data.total || 0)
        setDetalhePages(data.totalPages || 1)
      } else {
        const { data } = await api.get('/api/registros', {
          params: { page: pg, limit: LIMIT, tipoOperacao: card.tipoParam, dataInicio: ini, dataFim: fim },
          signal: ctrl.signal,
        })
        setDetalhe(data.registros || [])
        setDetalheTotal(data.total || 0)
        setDetalhePages(data.totalPages || 1)
      }
      setDetalhePage(pg)
    } catch (err) {
      if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') setDetalhe([])
    } finally {
      setLoadingDet(false)
    }
  }, [])

  useEffect(() => {
    buscarResumo(dataInicio, dataFim)
    if (cardAtivo) buscarDetalhe(cardAtivo, dataInicio, dataFim, 1)
    return () => {
      if (abortRef.current)    abortRef.current.abort()
      if (abortDetRef.current) abortDetRef.current.abort()
    }
  }, [dataInicio, dataFim])

  const aplicarPeriodo = (dias) => {
    const fim = isoHoje()
    const ini = isoPeriodo(dias)
    setPeriodoBotao(dias)
    setDataFim(fim)
    setDataInicio(ini)
  }

  const handleCardClick = (card) => {
    if (cardAtivo?.id === card.id) {
      setCardAtivo(null)
      setDetalhe([])
    } else {
      setCardAtivo(card)
      buscarDetalhe(card, dataInicio, dataFim, 1)
    }
  }

  const handleDetalhePage = (pg) => {
    buscarDetalhe(cardAtivo, dataInicio, dataFim, pg)
  }

  const handleExport = async () => {
    if (!cardAtivo) return
    setExporting(true)
    try {
      const params = { dataInicio, dataFim }
      let endpoint, filename
      if (cardAtivo.id === 'ocorrencias') {
        endpoint = '/api/ocorrencias/exportar'
        filename = `ocorrencias_${dataInicio}_${dataFim}.csv`
      } else {
        params.tipoOperacao = cardAtivo.tipoParam
        endpoint = '/api/registros/exportar'
        filename = `${cardAtivo.id}_${dataInicio}_${dataFim}.csv`
      }
      const { data } = await api.get(endpoint, { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8;' }))
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    } catch { /* silently fail */ } finally {
      setExporting(false)
    }
  }

  const serie = dados?.serie ?? []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análise operacional do período</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { buscarResumo(dataInicio, dataFim); if (cardAtivo) buscarDetalhe(cardAtivo, dataInicio, dataFim, 1) }}
            disabled={loading} className="btn-secondary btn-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          {cardAtivo && (
            <button onClick={handleExport} disabled={exporting || detalheTotal === 0}
              className="btn-secondary btn-sm">
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros de período */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex gap-1">
          {PERIODOS.map(p => (
            <button
              key={p.dias}
              onClick={() => aplicarPeriodo(p.dias)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                periodoBotao === p.dias
                  ? 'bg-primary-700 text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dataInicio}
            max={dataFim}
            onChange={e => { setDataInicio(e.target.value); setPeriodoBotao(null) }}
            className="input w-36 text-sm"
          />
          <span className="text-gray-400 text-sm">até</span>
          <input
            type="date"
            value={dataFim}
            min={dataInicio}
            max={isoHoje()}
            onChange={e => { setDataFim(e.target.value); setPeriodoBotao(null) }}
            className="input w-36 text-sm"
          />
        </div>
      </div>

      {/* Cards com mini chart */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {CARDS.map(card => (
          <CardMetrica
            key={card.id}
            card={card}
            total={dados ? dados.totais[card.dataKey] : null}
            serie={serie}
            ativo={cardAtivo?.id === card.id}
            onClick={() => handleCardClick(card)}
          />
        ))}
      </div>

      {/* Banner chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">
            {cardAtivo ? `${cardAtivo.label} — evolução diária` : 'Evolução diária — todas as categorias'}
          </h2>
          {cardAtivo && (
            <button onClick={() => { setCardAtivo(null); setDetalhe([]) }}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2 py-1">
              Ver tudo
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : serie.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Nenhum dado no período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={serie} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<BannerTooltip />} />
              <Legend
                formatter={(v) => CARDS.find(c => c.dataKey === v)?.label ?? v}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              {cardAtivo ? (
                <Bar
                  dataKey={cardAtivo.dataKey}
                  fill={cardAtivo.fill}
                  radius={[4, 4, 0, 0]}
                  name={cardAtivo.label}
                  maxBarSize={48}
                />
              ) : (
                CARDS.map(c => (
                  <Bar
                    key={c.id}
                    dataKey={c.dataKey}
                    fill={c.fill}
                    radius={[4, 4, 0, 0]}
                    name={c.label}
                    maxBarSize={24}
                    stackId={undefined}
                  />
                ))
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Lista de detalhe — aparece ao clicar em um card */}
      {cardAtivo && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cardAtivo.color}`}>
                <cardAtivo.icon className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-semibold text-gray-800">{cardAtivo.label}</h2>
              {!loadingDet && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                  {detalheTotal} registro{detalheTotal !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {loadingDet ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detalhe.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Nenhum registro no período selecionado.
            </div>
          ) : cardAtivo.id === 'ocorrencias' ? (
            /* Tabela de ocorrências */
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="table-th">Protocolo</th>
                    <th className="table-th">Data/Hora</th>
                    <th className="table-th">Categoria</th>
                    <th className="table-th hidden md:table-cell">Tipo</th>
                    <th className="table-th hidden lg:table-cell">Local</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detalhe.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/ocorrencias/${o.id}`)}>
                      <td className="table-td font-mono text-xs">{o.protocolo}</td>
                      <td className="table-td text-xs whitespace-nowrap">{fmt(o.dataHora)}</td>
                      <td className="table-td text-sm">{o.categoria}</td>
                      <td className="table-td hidden md:table-cell text-xs text-gray-500">{o.tipo}</td>
                      <td className="table-td hidden lg:table-cell text-xs text-gray-500">{o.local}</td>
                      <td className="table-td">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          o.status === 'aberta'      ? 'bg-blue-100 text-blue-700'   :
                          o.status === 'em_analise'  ? 'bg-yellow-100 text-yellow-700' :
                          o.status === 'resolvida'   ? 'bg-green-100 text-green-700'  :
                          o.status === 'encaminhada' ? 'bg-purple-100 text-purple-700':
                          'bg-gray-100 text-gray-600'
                        }`}>{
                          o.status === 'aberta'      ? 'Aberta'       :
                          o.status === 'em_analise'  ? 'Em análise'   :
                          o.status === 'resolvida'   ? 'Resolvida'    :
                          o.status === 'encaminhada' ? 'Encaminhada'  : 'Arquivada'
                        }</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Tabela de registros */
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="table-th">Protocolo</th>
                    <th className="table-th">Data/Hora</th>
                    <th className="table-th">Motorista / Visitante</th>
                    <th className="table-th hidden md:table-cell">Placa</th>
                    <th className="table-th hidden lg:table-cell">Empresa</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detalhe.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/registros/${r.id}`)}>
                      <td className="table-td font-mono text-xs">{r.protocolo}</td>
                      <td className="table-td text-xs whitespace-nowrap">{fmt(r.dataEntrada)}</td>
                      <td className="table-td">{r.nomeMotorista}</td>
                      <td className="table-td hidden md:table-cell font-mono text-xs">{r.placa}</td>
                      <td className="table-td hidden lg:table-cell">{r.empresa || '—'}</td>
                      <td className="table-td"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação do detalhe */}
          {!loadingDet && detalhePages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Página {detalhePage} de {detalhePages} · {detalheTotal} registros
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => handleDetalhePage(detalhePage - 1)} disabled={detalhePage <= 1}
                  className="btn-secondary btn-sm disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(detalhePages, 5) }, (_, i) => {
                  let pg = i + 1
                  if (detalhePages > 5) {
                    if (detalhePage <= 3) pg = i + 1
                    else if (detalhePage >= detalhePages - 2) pg = detalhePages - 4 + i
                    else pg = detalhePage - 2 + i
                  }
                  return (
                    <button key={pg} onClick={() => handleDetalhePage(pg)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        pg === detalhePage ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}>
                      {pg}
                    </button>
                  )
                })}
                <button onClick={() => handleDetalhePage(detalhePage + 1)} disabled={detalhePage >= detalhePages}
                  className="btn-secondary btn-sm disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
