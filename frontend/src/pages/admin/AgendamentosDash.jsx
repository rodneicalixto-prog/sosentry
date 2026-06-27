import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'
import api from '../../api/client'

const STATUS_LABEL = {
  AGUARDANDO_NF:        'Aguard. NF',
  NF_RECEBIDA:          'NF Recebida',
  APROVADO:             'Ent. Autorizada',
  AGUARDANDO_LIBERACAO: 'Aguard. Portaria',
  NA_PORTARIA:          'Liberado',
  CONCLUIDO:            'Concluído',
  CANCELADO:            'Cancelado',
}
const STATUS_CORES = {
  AGUARDANDO_NF:        '#fbbf24',
  NF_RECEBIDA:          '#60a5fa',
  APROVADO:             '#34d399',
  AGUARDANDO_LIBERACAO: '#f97316',
  NA_PORTARIA:          '#a78bfa',
  CONCLUIDO:            '#94a3b8',
  CANCELADO:            '#f87171',
}
const DEPT_CORES = ['#1d4ed8','#0891b2','#059669','#d97706','#7c3aed','#db2777']

function KPI({ label, valor, sub, cor }) {
  return (
    <div className={`bg-white rounded-xl shadow p-5 border-l-4 ${cor}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{valor}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`
}

const STATUS_BADGE = {
  AGUARDANDO_NF: 'bg-yellow-100 text-yellow-700',
  NF_RECEBIDA:   'bg-blue-100 text-blue-700',
  APROVADO:      'bg-green-100 text-green-700',
  NA_PORTARIA:   'bg-purple-100 text-purple-700',
  CONCLUIDO:     'bg-gray-100 text-gray-500',
  CANCELADO:     'bg-red-100 text-red-600',
}

export default function AgendamentosDash() {
  const [dados, setDados] = useState(null)
  const [periodo, setPeriodo] = useState({ ini: '', fim: '' })
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    try {
      const params = {}
      if (periodo.ini) params.dataInicio = periodo.ini
      if (periodo.fim) params.dataFim    = periodo.fim
      const { data } = await api.get('/api/agendamentos-dash/resumo', { params })
      setDados(data)
    } catch {}
    finally { setCarregando(false) }
  }

  useEffect(() => { carregar() }, [])

  const concluidos = dados?.porStatus.find(s => s.status === 'CONCLUIDO')?.count || 0
  const cancelados = dados?.porStatus.find(s => s.status === 'CANCELADO')?.count || 0
  const naPortaria = dados?.porStatus.find(s => s.status === 'NA_PORTARIA')?.count || 0
  const aprovados  = dados?.porStatus.find(s => s.status === 'APROVADO')?.count  || 0

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard de Agendamentos</h1>
          <p className="text-gray-400 text-sm">Visão gerencial de cargas e entregas</p>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">De</label>
            <input type="date" value={periodo.ini} onChange={e => setPeriodo(p => ({ ...p, ini: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Até</label>
            <input type="date" value={periodo.fim} onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={carregar}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            Filtrar
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="text-center py-16 text-gray-400">Carregando dados...</div>
      ) : !dados ? (
        <div className="text-center py-16 text-gray-400">Erro ao carregar dados.</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label="Total do Período"  valor={dados.total}  cor="border-blue-600"   sub="agendamentos criados" />
            <KPI label="Concluídos"        valor={concluidos}   cor="border-green-500"  sub={dados.total ? `${Math.round(concluidos/dados.total*100)}% do total` : ''} />
            <KPI label="Na Portaria Agora" valor={naPortaria}   cor="border-purple-500" sub="aguardando liberação" />
            <KPI label="Tempo Médio Aprov." valor={`${dados.tempoMedioAprovacaoHoras}h`} cor="border-orange-400" sub="da criação à aprovação" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de linha — criações por dia */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-700 mb-4">Agendamentos por Dia</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dados.porDia.map(d => ({ dia: fmt(d.dia), total: d.total }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} name="Agendamentos" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pizza — status */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-700 mb-4">Distribuição por Status</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dados.porStatus.map(s => ({ name: STATUS_LABEL[s.status] || s.status, value: s.count }))}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3}>
                    {dados.porStatus.map((s, i) => (
                      <Cell key={s.status} fill={STATUS_CORES[s.status] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Barras — por departamento */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-700 mb-4">Agendamentos por Departamento</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dados.porDepartamento.map(d => ({ name: d.departamento, total: d.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total" radius={[4,4,0,0]}>
                    {dados.porDepartamento.map((_, i) => (
                      <Cell key={i} fill={DEPT_CORES[i % DEPT_CORES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Próximas entregas 7 dias */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-700 mb-4">Previsão — Próximos 7 dias</h2>
              {dados.previstas7dias.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-8">Nenhuma entrega prevista.</div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {dados.previstas7dias.map(ag => (
                    <div key={ag.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="font-medium text-gray-800">{ag.empresa || '—'}</span>
                        <span className="text-gray-400 ml-2 text-xs">{ag.placa}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">{fmt(ag.dataEntrega)} {ag.horarioPref || ''}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_BADGE[ag.status] || 'bg-gray-100'}`}>
                          {STATUS_LABEL[ag.status] || ag.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chegadas de hoje */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-4">📅 Agenda de Hoje</h2>
            {dados.agendamentosHoje.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-6">Nenhuma entrega agendada para hoje.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b">
                      <th className="pb-2 font-medium">Horário</th>
                      <th className="pb-2 font-medium">Empresa</th>
                      <th className="pb-2 font-medium">Placa</th>
                      <th className="pb-2 font-medium">Motorista</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Chegada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.agendamentosHoje.map(ag => (
                      <tr key={ag.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 font-mono">{ag.horarioPref || '—'}</td>
                        <td className="py-2 font-medium">{ag.empresa || '—'}</td>
                        <td className="py-2 text-gray-500">{ag.placa || '—'}</td>
                        <td className="py-2 text-gray-500">{ag.motorista || '—'}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[ag.status] || 'bg-gray-100'}`}>
                            {STATUS_LABEL[ag.status] || ag.status}
                          </span>
                        </td>
                        <td className="py-2 text-gray-400 text-xs">
                          {ag.chegadaEm ? fmt(ag.chegadaEm) + ' ' + String(new Date(ag.chegadaEm).getUTCHours()).padStart(2,'0') + ':' + String(new Date(ag.chegadaEm).getUTCMinutes()).padStart(2,'0') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
