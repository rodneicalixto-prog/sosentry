import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, LogOut, AlertCircle, CheckCircle, Tag, AlertTriangle, X } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function Detail({ label, value, span }) {
  return (
    <div className={span ? 'col-span-2 sm:col-span-3' : ''}>
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800 whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  )
}

function SaidaModal({ registro, onSave, onCancel }) {
  const [lacre, setLacre] = useState('')
  const [obsOcorrencia, setObsOcorrencia] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  async function submit(e) {
    e.preventDefault()
    setSalvando(true); setErro('')
    try {
      const { data } = await api.patch(`/api/registros/${registro.protocolo}/saida`, { lacre, obsOcorrencia })
      onSave(data)
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao registrar saída.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Registrar Saída</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{registro.protocolo}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Resumo do veículo */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
            <p className="font-semibold text-gray-900">{registro.nomeMotorista}</p>
            <p className="text-gray-500">{registro.placa} · {registro.tipoVeiculo} · {registro.empresa || 'sem empresa'}</p>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{erro}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Tag className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
              Nº do Lacre
            </label>
            <input
              className={inp}
              placeholder="Número do lacre (opcional)"
              value={lacre}
              onChange={e => setLacre(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
              Observações / Ocorrências
            </label>
            <textarea
              className={inp + ' resize-none h-28'}
              placeholder="Registre observações, ocorrências ou irregularidades na saída..."
              value={obsOcorrencia}
              onChange={e => setObsOcorrencia(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onCancel} disabled={salvando}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
              <LogOut className="w-4 h-4" />
              {salvando ? 'Registrando...' : 'Confirmar Saída'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RegistroDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSaida, setShowSaida] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get(`/api/registros/${id}`)
      .then(({ data }) => { setRegistro(data); setError('') })
      .catch(() => setError('Registro não encontrado ou erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [id])

  function handleSaidaSalva(atualizado) {
    setRegistro(atualizado)
    setSuccess('Saída registrada com sucesso!')
    setShowSaida(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !registro) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-4 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
        </div>
      </div>
    )
  }

  if (!registro) return null

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {showSaida && (
        <SaidaModal
          registro={registro}
          onSave={handleSaidaSalva}
          onCancel={() => setShowSaida(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registro de Entrada</h1>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{registro.protocolo}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={registro.status} />
          {registro.status === 'na_empresa' && (
            <button onClick={() => setShowSaida(true)} className="btn-primary">
              <LogOut className="w-4 h-4" /> Registrar Saída
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{success}
        </div>
      )}

      {/* Datas e Portaria */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Datas e Portaria</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Portaria" value={registro.portaria?.nome} />
          <Detail label="Entrada" value={formatDateTime(registro.dataEntrada)} />
          <Detail label="Saída" value={formatDateTime(registro.horaSaida)} />
          {registro.operadorEntrada && <Detail label="Operador Entrada" value={registro.operadorEntrada?.nome} />}
          {registro.operadorSaida  && <Detail label="Operador Saída"   value={registro.operadorSaida?.nome} />}
        </dl>
      </div>

      {/* Motorista */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Motorista</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Nome"     value={registro.nomeMotorista} />
          <Detail label="CPF"      value={registro.cpfMotorista} />
          <Detail label="Telefone" value={registro.telefoneMotorista} />
        </dl>
      </div>

      {/* Veículo */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Veículo</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Placa" value={registro.placa} />
          <Detail label="Tipo"  value={registro.tipoVeiculo} />
          {registro.lacre && <Detail label="Nº do Lacre" value={registro.lacre} />}
        </dl>
      </div>

      {/* Operação */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Operação</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Empresa"        value={registro.empresa} />
          <Detail label="Nota Fiscal"    value={registro.notaFiscal} />
          <Detail label="Tipo Operação"  value={registro.tipoOperacao} />
          <Detail label="Tipo Material"  value={registro.tipoMaterial} />
          <Detail label="Obs. Material"  value={registro.obsMaterial} span />
          <Detail label="Obs. Geral"     value={registro.obsGeral} span />
        </dl>
      </div>

      {/* Saída — lacre e ocorrências (só exibe se tiver dados) */}
      {(registro.lacre || registro.obsOcorrencia) && (
        <div className="card p-5 border-l-4 border-orange-400">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Dados da Saída</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {registro.lacre        && <Detail label="Nº do Lacre" value={registro.lacre} />}
            {registro.obsOcorrencia && <Detail label="Observações / Ocorrências" value={registro.obsOcorrencia} span />}
          </dl>
        </div>
      )}

      {/* Ajudante */}
      {registro.temAjudante && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Ajudante</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Detail label="Nome"     value={registro.ajudanteNome} />
            <Detail label="CPF"      value={registro.ajudanteCpf} />
            <Detail label="RG"       value={registro.ajudanteRg} />
            <Detail label="Telefone" value={registro.ajudanteTelefone} />
          </dl>
        </div>
      )}
    </div>
  )
}
