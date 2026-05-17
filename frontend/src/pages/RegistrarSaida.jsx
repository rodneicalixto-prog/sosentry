import React, { useState } from 'react'
import { Search, LogOut, CheckCircle, Tag, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function RegistrarSaida() {
  const [protocolo, setProtocolo] = useState('')
  const [registro, setRegistro] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [lacre, setLacre] = useState('')
  const [obsOcorrencia, setObsOcorrencia] = useState('')

  async function buscar(e) {
    e.preventDefault()
    if (!protocolo.trim()) return
    setErro(''); setSucesso(''); setRegistro(null); setLacre(''); setObsOcorrencia('')
    setBuscando(true)
    try {
      const { data } = await api.get('/api/registros', { params: { busca: protocolo.trim(), limit: 1 } })
      const reg = data.registros?.[0]
      if (!reg) { setErro('Protocolo ou placa não encontrado. Verifique e tente novamente.'); return }
      setRegistro(reg)
    } catch (err) {
      const msg = err?.response?.data?.error
        || (err?.response ? `Erro do servidor (${err.response.status})` : 'Sem conexão. Verifique a rede e tente novamente.')
      setErro(msg)
    } finally {
      setBuscando(false)
    }
  }

  async function confirmarSaida(e) {
    e.preventDefault()
    if (!registro) return
    setConfirmando(true); setErro('')
    try {
      await api.patch(`/api/registros/${registro.protocolo}/saida`, { lacre, obsOcorrencia })
      setSucesso(`Saída registrada — protocolo ${registro.protocolo}`)
      setRegistro(null); setProtocolo(''); setLacre(''); setObsOcorrencia('')
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao registrar saída.')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Registrar Saída</h1>

      {/* Busca */}
      <form onSubmit={buscar} className="card p-5 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Protocolo ou Placa</label>
        <div className="flex gap-2">
          <input
            className={inp + ' flex-1 uppercase'}
            placeholder="PRT1-20260517-0001 ou ABC-1234"
            value={protocolo}
            onChange={e => { setProtocolo(e.target.value.toUpperCase()); setRegistro(null); setSucesso(''); setErro('') }}
          />
          <button type="submit" disabled={buscando || !protocolo.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <Search className="w-4 h-4" />
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {sucesso && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-4">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{sucesso}</span>
        </div>
      )}
      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{erro}</div>
      )}

      {/* Dados do veículo + formulário de saída */}
      {registro && (
        <div className="card overflow-hidden">
          {/* Cabeçalho do registro */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-gray-400 font-mono mb-0.5">{registro.protocolo}</p>
                <p className="font-bold text-gray-900 text-xl">{registro.nomeMotorista}</p>
                <p className="text-sm text-gray-500">{registro.empresa || 'Empresa não informada'}</p>
              </div>
              <StatusBadge status={registro.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Placa', <span className="font-bold text-gray-900">{registro.placa}</span>],
                ['Veículo', registro.tipoVeiculo],
                ['Portaria', registro.portaria?.nome || '—'],
                ['Operação', registro.tipoOperacao],
                ['Entrada', fmt(registro.dataEntrada)],
                ['NF', registro.notaFiscal || '—'],
              ].map(([l, v]) => (
                <div key={l}>
                  <span className="text-gray-400 block text-xs mb-0.5">{l}</span>
                  <span className="text-gray-700">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Formulário de saída */}
          {registro.status === 'na_empresa' ? (
            <form onSubmit={confirmarSaida} className="p-5 space-y-4 bg-orange-50/40">
              <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Dados da Saída</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Tag className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Nº do Lacre
                </label>
                <input
                  className={inp}
                  placeholder="Número do lacre do veículo (opcional)"
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
                  className={inp + ' resize-none h-24'}
                  placeholder="Registre aqui qualquer observação, ocorrência ou irregularidade na saída..."
                  value={obsOcorrencia}
                  onChange={e => setObsOcorrencia(e.target.value)}
                />
              </div>

              <button type="submit" disabled={confirmando}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold text-sm transition-colors">
                <LogOut className="w-4 h-4" />
                {confirmando ? 'Registrando saída...' : 'Confirmar Saída'}
              </button>
            </form>
          ) : (
            <div className="p-5 text-center text-sm text-gray-500">
              {registro.status === 'saiu'
                ? `Saída já registrada em ${fmt(registro.horaSaida)}`
                : 'Registro cancelado'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
