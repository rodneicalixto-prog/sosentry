import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Unlock, LogOut, X } from 'lucide-react'
import api from '../../api/client'

export const STATUS_LABEL = {
  AGUARDANDO_NF:         { label: 'Aguardando NF',          color: 'bg-yellow-100 text-yellow-700' },
  NF_RECEBIDA:           { label: 'NF Recebida',            color: 'bg-blue-100 text-blue-700' },
  APROVADO:              { label: 'Entrada Autorizada',      color: 'bg-green-100 text-green-700' },
  AGUARDANDO_LIBERACAO:  { label: 'Aguard. Liberação Port.', color: 'bg-orange-100 text-orange-700' },
  NA_PORTARIA:           { label: 'Na Portaria — Liberado',  color: 'bg-purple-100 text-purple-700' },
  CONCLUIDO:             { label: 'Concluído',               color: 'bg-gray-100 text-gray-600' },
  CANCELADO:             { label: 'Cancelado',               color: 'bg-red-100 text-red-600' },
}

function Badge({ status }) {
  const s = STATUS_LABEL[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return <span className={`px-3 py-1 rounded-full text-sm font-medium ${s.color}`}>{s.label}</span>
}

function fmt(dt, hora = false) {
  if (!dt) return '—'
  const d = new Date(dt)
  const data = `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`
  if (!hora) return data
  return `${data} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`
}

function Campo({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-800">{value}</dd>
    </div>
  )
}

// Linha do tempo do agendamento
function Timeline({ ag }) {
  const etapas = [
    { key: 'AGUARDANDO_NF',        label: 'Agendamento criado',      data: ag.criadoEm },
    { key: 'NF_RECEBIDA',          label: 'NF recebida',             data: ag.status !== 'AGUARDANDO_NF' ? ag.atualizadoEm : null },
    { key: 'APROVADO',             label: 'Entrada autorizada',      data: ag.aprovadoEm },
    { key: 'AGUARDANDO_LIBERACAO', label: 'Chegou à portaria',       data: ag.chegadaEm },
    { key: 'NA_PORTARIA',          label: 'Liberado na portaria',    data: ag.status === 'NA_PORTARIA' || ag.status === 'CONCLUIDO' ? ag.atualizadoEm : null },
    { key: 'CONCLUIDO',            label: 'Saída registrada',        data: ag.dataSaida },
  ]

  const ORDER = ['AGUARDANDO_NF','NF_RECEBIDA','APROVADO','AGUARDANDO_LIBERACAO','NA_PORTARIA','CONCLUIDO','CANCELADO']
  const statusIdx = ORDER.indexOf(ag.status)

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h2 className="font-semibold text-gray-700 mb-4">Linha do Tempo</h2>
      <div className="space-y-3">
        {etapas.map((e, i) => {
          const etapaIdx = ORDER.indexOf(e.key)
          const concluida = etapaIdx < statusIdx || (e.key === ag.status && ag.status === 'CONCLUIDO')
          const atual = e.key === ag.status
          return (
            <div key={e.key} className="flex items-start gap-3">
              <div className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
                ${concluida ? 'bg-green-500 text-white' : atual ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {concluida ? '✓' : atual ? '●' : i + 1}
              </div>
              <div>
                <p className={`text-sm font-medium ${concluida || atual ? 'text-gray-800' : 'text-gray-400'}`}>{e.label}</p>
                {e.data && <p className="text-xs text-gray-400">{fmt(e.data, true)}</p>}
              </div>
            </div>
          )
        })}
        {ag.status === 'CANCELADO' && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 bg-red-500 text-white flex items-center justify-center text-xs">✗</div>
            <div><p className="text-sm font-medium text-red-600">Cancelado</p></div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgendamentoDetalhe() {
  const { id } = useParams()
  const nav = useNavigate()
  const [ag, setAg] = useState(null)
  const [qrImg, setQrImg] = useState(null)
  const [acao, setAcao] = useState(null)
  const [erro, setErro] = useState('')

  async function carregar() {
    const { data } = await api.get(`/api/agendamentos/${id}`)
    setAg(data)
    if (['NF_RECEBIDA','APROVADO','AGUARDANDO_LIBERACAO','NA_PORTARIA','CONCLUIDO'].includes(data.status)) {
      api.get(`/api/agendamentos/${id}/qrcode`, { responseType: 'blob' })
        .then(r => setQrImg(URL.createObjectURL(r.data)))
        .catch(() => {})
    }
  }

  useEffect(() => { carregar() }, [id])

  async function executar(endpoint, confirmMsg, acaoNome) {
    if (!confirm(confirmMsg)) return
    setAcao(acaoNome); setErro('')
    try {
      await api.patch(`/api/agendamentos/${id}/${endpoint}`)
      await carregar()
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao executar ação.')
    } finally { setAcao(null) }
  }

  if (!ag) return <div className="p-6 text-gray-400">Carregando...</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/admin/agendamentos')} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <h1 className="text-xl font-bold text-gray-800 flex-1">Agendamento</h1>
        <Badge status={ag.status} />
      </div>

      {/* Alerta visual quando aguardando liberação */}
      {ag.status === 'AGUARDANDO_LIBERACAO' && (
        <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🚛</span>
          <div>
            <p className="font-bold text-orange-800">Veículo aguardando liberação na portaria!</p>
            <p className="text-sm text-orange-700">
              {ag.empresa} chegou às {fmt(ag.chegadaEm, true).split(' ')[1] || '—'}.
              Clique em <strong>Liberar Entrada</strong> para autorizar o acesso.
            </p>
          </div>
        </div>
      )}

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{erro}</div>}

      <Timeline ag={ag} />

      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Informações Gerais</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Campo label="Portaria" value={ag.portaria?.nome} />
          <Campo label="Departamento" value={ag.departamento} />
          <Campo label="Pedido Interno" value={ag.pedidoInterno} />
          <Campo label="Criado por" value={ag.criadoPor?.nome} />
          <Campo label="Criado em" value={fmt(ag.criadoEm, true)} />
          {ag.aprovadoPor && <Campo label="Aprovado por" value={ag.aprovadoPor?.nome} />}
          {ag.aprovadoEm && <Campo label="Aprovado em" value={fmt(ag.aprovadoEm, true)} />}
          {ag.chegadaEm && <Campo label="Chegada na portaria" value={fmt(ag.chegadaEm, true)} />}
          {ag.dataSaida && <Campo label="Saída registrada" value={fmt(ag.dataSaida, true)} />}
        </dl>
        {ag.observacoes && (
          <div className="mt-4 bg-gray-50 rounded p-3 text-sm text-gray-600">{ag.observacoes}</div>
        )}
      </div>

      {ag.status !== 'AGUARDANDO_NF' && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Dados da Entrega</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Campo label="Empresa" value={ag.empresa} />
            <Campo label="CNPJ" value={ag.cnpj} />
            <Campo label="Motorista" value={ag.motorista} />
            <Campo label="CPF Motorista" value={ag.cpfMotorista} />
            <Campo label="Placa" value={ag.placa} />
            <Campo label="Tipo Veículo" value={ag.tipoVeiculo} />
            <Campo label="NF" value={ag.numeroNF} />
            <Campo label="Valor NF" value={ag.valorNF ? `R$ ${Number(ag.valorNF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null} />
            <Campo label="Data Prevista" value={fmt(ag.dataEntrega)} />
            <Campo label="Horário" value={ag.horarioPref} />
          </dl>
          {ag.nfArquivoUrl && (
            <div className="mt-4">
              <a href={ag.nfArquivoUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline">
                📄 Ver arquivo da NF
              </a>
            </div>
          )}
        </div>
      )}

      {qrImg && (
        <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center gap-4">
          <h2 className="font-semibold text-gray-700 self-start">QR Code</h2>
          <img src={qrImg} alt="QR Code" className="w-56 h-56 border-2 border-gray-200 rounded-lg" />
          <a href={qrImg} download="qrcode-agendamento.png" className="text-sm text-blue-700 hover:underline">
            Baixar QR Code
          </a>
        </div>
      )}

      {/* Ações contextuais por status */}
      {!['CONCLUIDO','CANCELADO'].includes(ag.status) && (
        <div className="flex flex-wrap gap-3">
          {ag.status === 'NF_RECEBIDA' && (
            <button onClick={() => executar('aprovar', 'Aprovar este agendamento? A portaria será notificada.', 'aprovando')}
              disabled={!!acao}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
              <CheckCircle className="w-4 h-4" />
              {acao === 'aprovando' ? 'Aprovando...' : 'Autorizar Entrada'}
            </button>
          )}

          {ag.status === 'AGUARDANDO_LIBERACAO' && (
            <button onClick={() => executar('liberar', 'Liberar a entrada deste veículo na portaria?', 'liberando')}
              disabled={!!acao}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-2.5 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50">
              <Unlock className="w-4 h-4" />
              {acao === 'liberando' ? 'Liberando...' : '🚛 Liberar Entrada na Portaria'}
            </button>
          )}

          {ag.status === 'NA_PORTARIA' && (
            <button onClick={() => executar('concluir', 'Registrar saída deste veículo?', 'concluindo')}
              disabled={!!acao}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50">
              <LogOut className="w-4 h-4" />
              {acao === 'concluindo' ? 'Registrando...' : 'Registrar Saída'}
            </button>
          )}

          <button onClick={() => executar('cancelar', 'Cancelar este agendamento?', 'cancelando')}
            disabled={!!acao}
            className="flex items-center justify-center gap-2 border border-red-400 text-red-600 px-5 py-2.5 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50">
            <X className="w-4 h-4" />
            {acao === 'cancelando' ? 'Cancelando...' : 'Cancelar'}
          </button>
        </div>
      )}
    </div>
  )
}
