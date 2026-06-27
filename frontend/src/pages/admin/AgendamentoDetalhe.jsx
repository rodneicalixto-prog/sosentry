import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

export default function AgendamentoDetalhe() {
  const { id } = useParams()
  const nav = useNavigate()
  const [ag, setAg] = useState(null)
  const [qrImg, setQrImg] = useState(null)
  const [acao, setAcao] = useState(null)

  async function carregar() {
    const { data } = await api.get(`/api/agendamentos/${id}`)
    setAg(data)
    if (['NF_RECEBIDA','APROVADO','NA_PORTARIA','CONCLUIDO'].includes(data.status)) {
      api.get(`/api/agendamentos/${id}/qrcode`, { responseType: 'blob' })
        .then(r => setQrImg(URL.createObjectURL(r.data)))
        .catch(() => {})
    }
  }

  useEffect(() => { carregar() }, [id])

  async function aprovar() {
    if (!confirm('Aprovar este agendamento? A portaria e logística serão notificadas.')) return
    setAcao('aprovando')
    try {
      await api.patch(`/api/agendamentos/${id}/aprovar`)
      await carregar()
    } catch (e) { alert(e.response?.data?.error || 'Erro') }
    finally { setAcao(null) }
  }

  async function cancelar() {
    if (!confirm('Cancelar este agendamento?')) return
    setAcao('cancelando')
    try {
      await api.patch(`/api/agendamentos/${id}/cancelar`)
      await carregar()
    } catch (e) { alert(e.response?.data?.error || 'Erro') }
    finally { setAcao(null) }
  }

  if (!ag) return <div className="p-6 text-gray-400">Carregando...</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/admin/agendamentos')} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-xl font-bold text-gray-800 flex-1">Agendamento</h1>
        <Badge status={ag.status} />
      </div>

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
          {ag.observacoes && (
            <div className="mt-4">
              <dt className="text-xs text-gray-500 mb-1">Observações da empresa</dt>
              <dd className="text-sm text-gray-700 bg-gray-50 rounded p-3">{ag.observacoes}</dd>
            </div>
          )}
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
          <a href={qrImg} download="qrcode-agendamento.png"
            className="text-sm text-blue-700 hover:underline">Baixar QR Code</a>
        </div>
      )}

      {/* Ações */}
      {!['CONCLUIDO','CANCELADO'].includes(ag.status) && (
        <div className="flex flex-wrap gap-3">
          {ag.status === 'NF_RECEBIDA' && (
            <button onClick={aprovar} disabled={!!acao}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50">
              {acao === 'aprovando' ? 'Aprovando...' : '✓ Aprovar Agendamento'}
            </button>
          )}
          <button onClick={cancelar} disabled={!!acao}
            className="flex-1 border border-red-400 text-red-600 py-2 rounded-lg font-medium hover:bg-red-50 transition disabled:opacity-50">
            {acao === 'cancelando' ? 'Cancelando...' : 'Cancelar'}
          </button>
        </div>
      )}
    </div>
  )
}
