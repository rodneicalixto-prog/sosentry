import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, LogOut, AlertCircle, CheckCircle, X } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value || '—'}</dd>
    </div>
  )
}

function ConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Confirmar Saída</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Confirma o registro de saída deste veículo? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary" disabled={loading}>
            Cancelar
          </button>
          <button onClick={onConfirm} className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registrando…
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Confirmar Saída
              </>
            )}
          </button>
        </div>
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
  const [showConfirm, setShowConfirm] = useState(false)
  const [saidaLoading, setSaidaLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setLoading(true)
    api
      .get(`/api/registros/${id}`)
      .then(({ data }) => {
        setRegistro(data)
        setError('')
      })
      .catch(() => setError('Registro não encontrado ou erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSaida = async () => {
    setSaidaLoading(true)
    try {
      const { data } = await api.patch(`/api/registros/${registro.protocolo}/saida`)
      setRegistro(data)
      setSuccess('Saída registrada com sucesso!')
      setShowConfirm(false)
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Erro ao registrar saída.',
      )
      setShowConfirm(false)
    } finally {
      setSaidaLoading(false)
    }
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
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-4 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      </div>
    )
  }

  if (!registro) return null

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {showConfirm && (
        <ConfirmModal
          onConfirm={handleSaida}
          onCancel={() => setShowConfirm(false)}
          loading={saidaLoading}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registro de Entrada</h1>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{registro.protocolo}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={registro.status} />
          {registro.status === 'na_empresa' && (
            <button
              onClick={() => setShowConfirm(true)}
              className="btn-primary"
            >
              <LogOut className="w-4 h-4" />
              Registrar Saída
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {success}
        </div>
      )}

      {error && registro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Timestamps */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Datas e Portaria
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Portaria" value={registro.portaria?.nome || registro.portariaNome} />
          <Detail label="Entrada" value={formatDateTime(registro.dataEntrada || registro.createdAt)} />
          <Detail label="Saída" value={formatDateTime(registro.dataSaida)} />
        </dl>
      </div>

      {/* Motorista */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Motorista
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Nome" value={registro.nomeMotorista} />
          <Detail label="CPF" value={registro.cpfMotorista} />
          <Detail label="Telefone" value={registro.telefoneMotorista} />
        </dl>
      </div>

      {/* Veículo */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Veículo
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Placa" value={registro.placa} />
          <Detail label="Tipo" value={registro.tipoVeiculo} />
        </dl>
      </div>

      {/* Operação */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Operação
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Empresa" value={registro.empresa} />
          <Detail label="Nota Fiscal" value={registro.notaFiscal} />
          <Detail label="Tipo de Operação" value={registro.tipoOperacao} />
          <Detail label="Tipo de Material" value={registro.tipoMaterial} />
          <div className="col-span-2 sm:col-span-3">
            <Detail label="Obs Material" value={registro.obsMaterial} />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <Detail label="Obs Geral" value={registro.obsGeral} />
          </div>
        </dl>
      </div>

      {/* Ajudante */}
      {registro.temAjudante && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Ajudante
          </h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Detail label="Nome" value={registro.nomeAjudante} />
            <Detail label="CPF" value={registro.cpfAjudante} />
            <Detail label="RG" value={registro.rgAjudante} />
            <Detail label="Telefone" value={registro.telefoneAjudante} />
          </dl>
        </div>
      )}
    </div>
  )
}
