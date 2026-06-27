import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../api/client'

const STATUS_LABEL = {
  AGUARDANDO_NF: 'Aguardando NF',
  NF_RECEBIDA:   'NF Recebida',
  APROVADO:      'Aprovado',
  NA_PORTARIA:   'Na Portaria',
  CONCLUIDO:     'Concluído',
  CANCELADO:     'Cancelado',
}

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`
}

export default function ValidarQR() {
  const [modo, setModo] = useState('manual') // 'manual' | 'camera'
  const [tokenInput, setTokenInput] = useState('')
  const [validando, setValidando] = useState(false)
  const [resultado, setResultado] = useState(null) // { agendamento } | null
  const [erro, setErro] = useState('')
  const [cameras, setCameras] = useState([])
  const [cameraId, setCameraId] = useState(null)
  const qrRef = useRef(null)
  const scannerRef = useRef(null)
  const processingRef = useRef(false)

  // Inicia câmera quando modo = camera
  useEffect(() => {
    if (modo !== 'camera') {
      stopScanner()
      return
    }
    Html5Qrcode.getCameras()
      .then(devs => {
        setCameras(devs)
        const traseira = devs.find(d => /back|rear|environment/i.test(d.label)) || devs[devs.length - 1]
        setCameraId(traseira?.id || devs[0]?.id)
      })
      .catch(() => setErro('Não foi possível acessar a câmera. Use o modo manual.'))
  }, [modo])

  useEffect(() => {
    if (modo !== 'camera' || !cameraId) return
    startScanner(cameraId)
    return () => stopScanner()
  }, [cameraId, modo])

  async function startScanner(id) {
    await stopScanner()
    const qr = new Html5Qrcode('qr-reader')
    scannerRef.current = qr
    processingRef.current = false
    await qr.start(
      { deviceId: { exact: id } },
      { fps: 10, qrbox: { width: 250, height: 250 },
        formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
      (texto) => {
        if (processingRef.current) return
        processingRef.current = true
        handleScan(texto)
      },
      () => {}
    ).catch(e => setErro('Erro ao iniciar câmera: ' + e))
  }

  async function stopScanner() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
  }

  function extrairToken(texto) {
    // Tenta parsear JSON do QR Code gerado pelo sistema
    try {
      const obj = JSON.parse(texto)
      if (obj.token) return obj.token
    } catch {}
    // Aceita também o token diretamente (string UUID)
    const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(texto)
    if (uuid) return uuid[0]
    return texto.trim()
  }

  async function handleScan(texto) {
    const token = extrairToken(texto)
    await validarToken(token)
  }

  async function validarManual(e) {
    e.preventDefault()
    if (!tokenInput.trim()) return
    await validarToken(extrairToken(tokenInput.trim()))
  }

  async function validarToken(token) {
    setValidando(true)
    setErro('')
    setResultado(null)
    try {
      const { data } = await api.post('/api/agendamentos/validar-qr', { token })
      setResultado(data)
      if (modo === 'camera') stopScanner()
    } catch (e) {
      const msg = e.response?.data?.error || 'QR Code inválido'
      const status = e.response?.data?.status
      if (status) {
        setErro(`${msg} (status atual: ${STATUS_LABEL[status] || status})`)
      } else {
        setErro(msg)
      }
      processingRef.current = false
    } finally {
      setValidando(false)
    }
  }

  function reiniciar() {
    setResultado(null)
    setErro('')
    setTokenInput('')
    processingRef.current = false
    if (modo === 'camera') startScanner(cameraId)
  }

  if (resultado) return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <div className="text-5xl mb-3">✅</div>
        <h1 className="text-xl font-bold text-gray-800 mb-1">Entrada Liberada!</h1>
        <p className="text-gray-500 text-sm mb-6">Agendamento validado com sucesso. Todos os setores foram notificados.</p>

        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
          {[
            ['Empresa',   resultado.empresa],
            ['Motorista', resultado.motorista],
            ['Placa',     resultado.placa],
            ['Tipo',      resultado.tipoVeiculo],
            ['NF',        resultado.numeroNF],
            ['Portaria',  resultado.portaria?.nome],
            ['Chegada',   fmt(resultado.chegadaEm)],
          ].map(([l, v]) => v ? (
            <div key={l} className="flex justify-between text-sm">
              <span className="text-gray-500">{l}</span>
              <span className="font-medium text-gray-800">{v}</span>
            </div>
          ) : null)}
        </div>

        <div className="bg-purple-50 rounded-lg p-3 text-purple-700 text-sm mb-6">
          🔔 Logística, Compras e Portaria foram notificados via WhatsApp e e-mail.
        </div>

        <button onClick={reiniciar}
          className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800 transition">
          Validar outro QR Code
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Validar Agendamento</h1>
      <p className="text-gray-500 text-sm mb-6">
        Escaneie o QR Code ou código de barras do agendamento, ou cole o token manualmente.
      </p>

      {/* Alternador de modo */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
        <button onClick={() => setModo('manual')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${modo === 'manual' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          ⌨️ Manual / Colar
        </button>
        <button onClick={() => setModo('camera')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${modo === 'camera' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          📷 Câmera
        </button>
      </div>

      {erro && (
        <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-4">{erro}</div>
      )}

      {/* Modo manual */}
      {modo === 'manual' && (
        <form onSubmit={validarManual} className="bg-white rounded-xl shadow p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token / Conteúdo do QR Code
            </label>
            <textarea
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              rows={4}
              placeholder="Cole aqui o conteúdo do QR Code ou o token UUID..."
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <button type="submit" disabled={validando || !tokenInput.trim()}
            className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50">
            {validando ? 'Validando...' : 'Validar Agendamento'}
          </button>
        </form>
      )}

      {/* Modo câmera */}
      {modo === 'camera' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {cameras.length > 1 && (
            <div className="p-3 border-b">
              <select value={cameraId} onChange={e => setCameraId(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm">
                {cameras.map(c => <option key={c.id} value={c.id}>{c.label || c.id}</option>)}
              </select>
            </div>
          )}
          <div id="qr-reader" ref={qrRef} style={{ width: '100%' }} />
          <div className="p-3 text-center text-xs text-gray-400">
            Suporta QR Code, Code128, EAN, UPC e outros formatos
          </div>
          {validando && (
            <div className="p-3 text-center text-blue-700 font-medium text-sm">Validando...</div>
          )}
        </div>
      )}
    </div>
  )
}
