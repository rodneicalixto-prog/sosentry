import React, { useEffect, useState } from 'react'
import { MessageCircle, QrCode, RefreshCw, LogOut, Send } from 'lucide-react'
import api from '../../api/client'

function StatusChip({ state }) {
  const map = {
    open: { label: 'Conectado', cls: 'bg-green-100 text-green-700' },
    connecting: { label: 'Conectando...', cls: 'bg-yellow-100 text-yellow-700' },
    close: { label: 'Desconectado', cls: 'bg-red-100 text-red-600' },
  }
  const s = map[state] || { label: state || 'Desconhecido', cls: 'bg-gray-100 text-gray-600' }
  return <span className={`px-3 py-1 rounded-full text-sm font-medium ${s.cls}`}>{s.label}</span>
}

export default function Whatsapp() {
  const [status, setStatus] = useState(null)
  const [qr, setQr] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [numero, setNumero] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function carregarStatus() {
    setCarregando(true)
    setQr(null)
    try {
      const { data } = await api.get('/api/whatsapp/status')
      setStatus(data?.instance?.state || data?.state || 'unknown')
    } catch { setStatus('error') }
    finally { setCarregando(false) }
  }

  async function gerarQr() {
    setCarregando(true)
    try {
      const { data } = await api.get('/api/whatsapp/qr')
      setQr(data?.qrcode?.base64 || data?.base64 || null)
      if (!qr) setFeedback({ tipo: 'info', msg: 'QR gerado. Escaneie com o WhatsApp.' })
    } catch { setFeedback({ tipo: 'erro', msg: 'Erro ao gerar QR Code.' }) }
    finally { setCarregando(false) }
  }

  async function desconectar() {
    if (!confirm('Desconectar o WhatsApp desta instância?')) return
    try {
      await api.delete('/api/whatsapp/logout')
      setStatus('close')
      setQr(null)
      setFeedback({ tipo: 'ok', msg: 'WhatsApp desconectado.' })
    } catch { setFeedback({ tipo: 'erro', msg: 'Erro ao desconectar.' }) }
  }

  async function enviarTeste(e) {
    e.preventDefault()
    if (!numero || !mensagem) return
    setEnviando(true)
    try {
      await api.post('/api/whatsapp/send', {
        number: numero.replace(/\D/g, ''),
        text: mensagem,
      })
      setFeedback({ tipo: 'ok', msg: 'Mensagem enviada com sucesso!' })
      setMensagem('')
    } catch { setFeedback({ tipo: 'erro', msg: 'Erro ao enviar mensagem.' }) }
    finally { setEnviando(false) }
  }

  useEffect(() => { carregarStatus() }, [])

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(t)
  }, [feedback])

  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-6 h-6 text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
      </div>

      {feedback && (
        <div className={`mb-4 rounded-xl p-3 text-sm border ${
          feedback.tipo === 'ok' ? 'bg-green-50 border-green-200 text-green-700' :
          feedback.tipo === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' :
          'bg-red-50 border-red-200 text-red-700'
        }`}>{feedback.msg}</div>
      )}

      {/* Status */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Status da Instância</h2>
          <div className="flex items-center gap-2">
            {status && <StatusChip state={status} />}
            <button onClick={carregarStatus} disabled={carregando} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {status !== 'open' && (
            <button onClick={gerarQr} disabled={carregando} className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              <QrCode className="w-4 h-4" /> Conectar via QR Code
            </button>
          )}
          {status === 'open' && (
            <button onClick={desconectar} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">
              <LogOut className="w-4 h-4" /> Desconectar
            </button>
          )}
        </div>

        {qr && (
          <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500">Escaneie com o WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
            <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR Code WhatsApp" className="w-56 h-56 rounded-lg" />
          </div>
        )}
      </div>

      {/* Envio de teste */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Enviar Mensagem de Teste</h2>
        <form onSubmit={enviarTeste} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número (com DDD)</label>
            <input className={input} placeholder="55119999-99999" value={numero} onChange={e => setNumero(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea className={input + ' resize-none h-24'} placeholder="Digite sua mensagem..." value={mensagem} onChange={e => setMensagem(e.target.value)} />
          </div>
          <button type="submit" disabled={enviando || !numero || !mensagem} className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <Send className="w-4 h-4" />
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  )
}
