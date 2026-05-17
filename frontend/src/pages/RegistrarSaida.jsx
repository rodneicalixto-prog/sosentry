import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LogOut, CheckCircle } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RegistrarSaida() {
  const nav = useNavigate()
  const [protocolo, setProtocolo] = useState('')
  const [registro, setRegistro] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function buscar(e) {
    e.preventDefault()
    if (!protocolo.trim()) return
    setErro('')
    setSucesso('')
    setRegistro(null)
    setBuscando(true)
    try {
      const { data } = await api.get('/api/registros', { params: { busca: protocolo.trim(), limit: 1 } })
      const reg = data.registros?.[0]
      if (!reg) { setErro('Protocolo não encontrado.'); return }
      setRegistro(reg)
    } catch {
      setErro('Erro ao buscar protocolo.')
    } finally {
      setBuscando(false)
    }
  }

  async function confirmarSaida() {
    if (!registro) return
    setConfirmando(true)
    setErro('')
    try {
      await api.patch(`/api/registros/${registro.protocolo}/saida`)
      setSucesso(`Saída registrada com sucesso — protocolo ${registro.protocolo}`)
      setRegistro(null)
      setProtocolo('')
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao registrar saída.')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Registrar Saída</h1>

      <form onSubmit={buscar} className="card p-5 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Protocolo ou Placa</label>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            placeholder="PRT1-20260517-0001 ou ABC-1234"
            value={protocolo}
            onChange={e => { setProtocolo(e.target.value.toUpperCase()); setRegistro(null); setSucesso(''); setErro('') }}
          />
          <button type="submit" disabled={buscando || !protocolo.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
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

      {registro && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 font-mono">{registro.protocolo}</p>
              <p className="font-bold text-gray-900 text-lg">{registro.nomeMotorista}</p>
            </div>
            <StatusBadge status={registro.status} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-5">
            <div>
              <span className="text-gray-400 block text-xs mb-0.5">Placa</span>
              <span className="font-semibold text-gray-800">{registro.placa}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs mb-0.5">Veículo</span>
              <span className="text-gray-700">{registro.tipoVeiculo}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs mb-0.5">Portaria</span>
              <span className="text-gray-700">{registro.portaria?.nome || '—'}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs mb-0.5">Empresa</span>
              <span className="text-gray-700">{registro.empresa || '—'}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs mb-0.5">Entrada</span>
              <span className="text-gray-700">{fmt(registro.dataEntrada)}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs mb-0.5">Operação</span>
              <span className="text-gray-700">{registro.tipoOperacao}</span>
            </div>
          </div>

          {registro.status === 'na_empresa' ? (
            <button onClick={confirmarSaida} disabled={confirmando} className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors">
              <LogOut className="w-4 h-4" />
              {confirmando ? 'Registrando...' : 'Confirmar Saída'}
            </button>
          ) : (
            <div className="text-center text-sm text-gray-500 py-2">
              {registro.status === 'saiu' ? 'Saída já registrada em ' + fmt(registro.horaSaida) : 'Registro cancelado'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
