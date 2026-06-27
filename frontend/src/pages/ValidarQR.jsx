import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { AlertTriangle, CheckCircle, QrCode, FileBarChart2 } from 'lucide-react'
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

// ─── Resultado QR Agendamento ─────────────────────────────────────────────────
function ResultadoQR({ resultado, reiniciar }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 text-center">
      <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
      <h1 className="text-xl font-bold text-gray-800 mb-1">Entrada Liberada!</h1>
      <p className="text-gray-500 text-sm mb-6">Agendamento validado. Todos os setores foram notificados.</p>
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
      <button onClick={reiniciar} className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800">
        Validar outro QR Code
      </button>
    </div>
  )
}

// ─── Resultado NF — Programado ────────────────────────────────────────────────
function ResultadoNFOk({ nfe, agendamento, onValidar, validando, reiniciar }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="w-6 h-6 text-green-500" />
        <h2 className="font-bold text-gray-800">Entrega Programada Encontrada</h2>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
        <p className="font-semibold text-green-800 text-xs uppercase tracking-wide mb-2">Dados da Nota Fiscal</p>
        {[
          ['Documento', `${nfe.modelo} nº ${nfe.numeroNF}`],
          ['Série', nfe.serie],
          ['CNPJ Emitente', nfe.cnpjFmt],
          ['UF', nfe.uf],
          ['Emissão', nfe.emissao],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between">
            <span className="text-gray-500">{l}</span>
            <span className="font-medium text-gray-800">{v}</span>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 space-y-1.5 text-sm">
        <p className="font-semibold text-blue-800 text-xs uppercase tracking-wide mb-2">Agendamento Aprovado</p>
        {[
          ['Empresa',    agendamento.empresa],
          ['Motorista',  agendamento.motorista],
          ['Placa',      agendamento.placa],
          ['NF nº',      agendamento.numeroNF],
          ['Departamento', agendamento.departamento],
        ].filter(([,v]) => v).map(([l, v]) => (
          <div key={l} className="flex justify-between">
            <span className="text-gray-500">{l}</span>
            <span className="font-medium text-gray-800">{v}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={reiniciar} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
          Cancelar
        </button>
        <button onClick={onValidar} disabled={validando}
          className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          {validando ? 'Liberando...' : 'Liberar Entrada'}
        </button>
      </div>
    </div>
  )
}

// ─── Resultado NF — Não Programado ───────────────────────────────────────────
function ResultadoNFAlerta({ nfe, empresa, setoresNotificados, emissorNotificado, reiniciar }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <h2 className="font-bold text-red-700">Entrega Não Programada</h2>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
        <p className="font-semibold text-red-800 text-xs uppercase tracking-wide mb-2">Dados da Nota Fiscal</p>
        {[
          ['Documento', `${nfe.modelo} nº ${nfe.numeroNF}`],
          ['Série', nfe.serie],
          ['CNPJ Emitente', nfe.cnpjFmt],
          ['UF', nfe.uf],
          ['Emissão', nfe.emissao],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between">
            <span className="text-gray-500">{l}</span>
            <span className="font-medium text-gray-800">{v}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 mb-4 space-y-1">
        <p className="font-semibold">Nenhum agendamento aprovado encontrado para esta NF / CNPJ.</p>
        <p>O setor de Faturamento foi alertado {setoresNotificados > 0 ? `(${setoresNotificados} setor${setoresNotificados > 1 ? 'es' : ''})` : ''} via WhatsApp e e-mail.</p>
      </div>

      {empresa ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 mb-5">
          <p className="font-semibold mb-1">Emissor identificado: {empresa.nome}</p>
          <p>Foi enviado automaticamente via WhatsApp e e-mail ao emissor com as instruções do processo obrigatório de pré-agendamento.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 mb-5">
          <p className="font-semibold mb-1">Emissor não cadastrado</p>
          <p>CNPJ <strong>{nfe.cnpjFmt}</strong> não está na base de fornecedores. Cadastre a empresa em <em>Admin → Fornecedores</em> para notificações automáticas futuras.</p>
        </div>
      )}

      <div className="bg-red-100 rounded-lg p-3 text-red-700 text-xs font-medium mb-5 text-center">
        🚫 ENTRADA NÃO AUTORIZADA — Encaminhe o motorista ao setor de Faturamento.
      </div>

      <button onClick={reiniciar} className="w-full bg-gray-700 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800">
        Nova leitura
      </button>
    </div>
  )
}

// ─── Aba QR Code Agendamento ──────────────────────────────────────────────────
function AbaQR() {
  const [modo, setModo]           = useState('manual')
  const [tokenInput, setTokenInput] = useState('')
  const [validando, setValidando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro]           = useState('')
  const [cameras, setCameras]     = useState([])
  const [cameraId, setCameraId]   = useState(null)
  const qrRef        = useRef(null)
  const scannerRef   = useRef(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (modo !== 'camera') { stopScanner(); return }
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
    const qr = new Html5Qrcode('qr-reader-qr')
    scannerRef.current = qr
    processingRef.current = false
    await qr.start(
      { deviceId: { exact: id } },
      { fps: 10, qrbox: { width: 250, height: 250 },
        formatsToSupport: [0,1,2,3,4,5,6,7,8,9,10,11,12,13] },
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
    try { const obj = JSON.parse(texto); if (obj.token) return obj.token } catch {}
    const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(texto)
    if (uuid) return uuid[0]
    return texto.trim()
  }

  async function handleScan(texto) { await validarToken(extrairToken(texto)) }

  async function validarManual(e) {
    e.preventDefault()
    if (!tokenInput.trim()) return
    await validarToken(extrairToken(tokenInput.trim()))
  }

  async function validarToken(token) {
    setValidando(true); setErro(''); setResultado(null)
    try {
      const { data } = await api.post('/api/agendamentos/validar-qr', { token })
      setResultado(data)
      if (modo === 'camera') stopScanner()
    } catch (e) {
      const msg = e.response?.data?.error || 'QR Code inválido'
      const status = e.response?.data?.status
      setErro(status ? `${msg} (status atual: ${STATUS_LABEL[status] || status})` : msg)
      processingRef.current = false
    } finally { setValidando(false) }
  }

  function reiniciar() {
    setResultado(null); setErro(''); setTokenInput('')
    processingRef.current = false
    if (modo === 'camera') startScanner(cameraId)
  }

  if (resultado) return <ResultadoQR resultado={resultado} reiniciar={reiniciar} />

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        <button onClick={() => setModo('manual')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${modo === 'manual' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          ⌨️ Manual / Colar
        </button>
        <button onClick={() => setModo('camera')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${modo === 'camera' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          📷 Câmera
        </button>
      </div>
      {erro && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{erro}</div>}
      {modo === 'manual' && (
        <form onSubmit={validarManual} className="bg-white rounded-xl shadow p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token / QR Code</label>
            <textarea value={tokenInput} onChange={e => setTokenInput(e.target.value)} rows={4}
              placeholder="Cole aqui o conteúdo do QR Code ou o token UUID..."
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <button type="submit" disabled={validando || !tokenInput.trim()}
            className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50">
            {validando ? 'Validando...' : 'Validar Agendamento'}
          </button>
        </form>
      )}
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
          <div id="qr-reader-qr" ref={qrRef} style={{ width: '100%' }} />
          <div className="p-3 text-center text-xs text-gray-400">Suporta QR Code e todos os formatos de código de barras</div>
          {validando && <div className="p-3 text-center text-blue-700 font-medium text-sm">Validando...</div>}
        </div>
      )}
    </div>
  )
}

// ─── Aba NF Código de Barras ──────────────────────────────────────────────────
function AbaNF() {
  const [modo, setModo]         = useState('manual')
  const [codigoInput, setCodigoInput] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [resultado, setResultado] = useState(null) // { programado, nfe, agendamento?, empresa?, ... }
  const [erro, setErro]         = useState('')
  const [cameras, setCameras]   = useState([])
  const [cameraId, setCameraId] = useState(null)
  const [validandoEntrada, setValidandoEntrada] = useState(false)
  const nfRef        = useRef(null)
  const scannerRef   = useRef(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (modo !== 'camera') { stopScanner(); return }
    Html5Qrcode.getCameras()
      .then(devs => {
        setCameras(devs)
        const traseira = devs.find(d => /back|rear|environment/i.test(d.label)) || devs[devs.length - 1]
        setCameraId(traseira?.id || devs[0]?.id)
      })
      .catch(() => setErro('Câmera não acessível. Use o modo manual.'))
  }, [modo])

  useEffect(() => {
    if (modo !== 'camera' || !cameraId) return
    startScanner(cameraId)
    return () => stopScanner()
  }, [cameraId, modo])

  async function startScanner(id) {
    await stopScanner()
    const qr = new Html5Qrcode('qr-reader-nf')
    scannerRef.current = qr
    processingRef.current = false
    await qr.start(
      { deviceId: { exact: id } },
      { fps: 10, qrbox: { width: 300, height: 120 },
        formatsToSupport: [0,1,2,3,4,5,6,7,8,9,10,11,12,13] },
      (texto) => {
        if (processingRef.current) return
        processingRef.current = true
        verificarNF(texto)
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

  async function verificarNF(codigoNF) {
    setVerificando(true); setErro(''); setResultado(null)
    try {
      const { data } = await api.post('/api/nf/verificar', { codigoNF: codigoNF.trim() })
      setResultado(data)
      if (modo === 'camera') stopScanner()
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao verificar NF.')
      processingRef.current = false
    } finally { setVerificando(false) }
  }

  async function liberarEntrada() {
    if (!resultado?.agendamento) return
    setValidandoEntrada(true)
    try {
      const { data } = await api.post('/api/agendamentos/validar-qr', { token: resultado.agendamento.token })
      setResultado({ ...resultado, liberado: true, chegada: data })
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao liberar entrada.')
    } finally { setValidandoEntrada(false) }
  }

  function reiniciar() {
    setResultado(null); setErro(''); setCodigoInput('')
    processingRef.current = false
    if (modo === 'camera') startScanner(cameraId)
  }

  function handleManual(e) {
    e.preventDefault()
    if (!codigoInput.trim()) return
    verificarNF(codigoInput.trim())
  }

  // Agendamento liberado com sucesso
  if (resultado?.liberado) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800 mb-1">Entrada Liberada!</h2>
        <p className="text-gray-500 text-sm mb-4">NF validada e todos os setores notificados.</p>
        <div className="bg-green-50 rounded-xl p-4 text-left text-sm space-y-1.5 mb-5">
          {[
            ['NF', `${resultado.nfe.modelo} nº ${resultado.nfe.numeroNF}`],
            ['CNPJ', resultado.nfe.cnpjFmt],
            ['Empresa', resultado.agendamento?.empresa],
            ['Motorista', resultado.agendamento?.motorista],
          ].filter(([,v]) => v).map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-gray-500">{l}</span>
              <span className="font-medium text-gray-800">{v}</span>
            </div>
          ))}
        </div>
        <button onClick={reiniciar} className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800">
          Nova leitura
        </button>
      </div>
    )
  }

  // Resultado da verificação
  if (resultado) {
    if (resultado.programado) {
      return <ResultadoNFOk nfe={resultado.nfe} agendamento={resultado.agendamento}
        onValidar={liberarEntrada} validando={validandoEntrada} reiniciar={reiniciar} />
    }
    return <ResultadoNFAlerta nfe={resultado.nfe} empresa={resultado.empresa}
      setoresNotificados={resultado.setoresNotificados} emissorNotificado={resultado.emissorNotificado}
      reiniciar={reiniciar} />
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
        <p className="font-semibold mb-1">Leitura de NF-e / DANFE</p>
        <p>Escaneie o código de barras da Nota Fiscal (44 dígitos). O sistema verifica automaticamente se há agendamento aprovado.</p>
      </div>

      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        <button onClick={() => setModo('manual')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${modo === 'manual' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          ⌨️ Digitar / Colar
        </button>
        <button onClick={() => setModo('camera')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${modo === 'camera' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          📷 Câmera
        </button>
      </div>

      {erro && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{erro}</div>}

      {modo === 'manual' && (
        <form onSubmit={handleManual} className="bg-white rounded-xl shadow p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave NF-e (44 dígitos)</label>
            <input value={codigoInput} onChange={e => setCodigoInput(e.target.value)}
              placeholder="35260312345678000100550010000012341234567890"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Cole a chave de acesso ou o código de barras da DANFE (sem espaços)</p>
          </div>
          <button type="submit" disabled={verificando || !codigoInput.trim()}
            className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50">
            {verificando ? 'Verificando...' : 'Verificar NF'}
          </button>
        </form>
      )}

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
          <div id="qr-reader-nf" ref={nfRef} style={{ width: '100%' }} />
          <div className="p-3 text-center text-xs text-gray-400">
            Aponte para o código de barras da NF-e (DANFE) ou QR Code da NFC-e
          </div>
          {verificando && <div className="p-3 text-center text-blue-700 font-medium text-sm">Verificando NF...</div>}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ValidarQR() {
  const [aba, setAba] = useState('qr')

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Portaria — Validação</h1>
      <p className="text-gray-500 text-sm mb-5">Valide QR Codes de agendamento ou leia o código de barras da Nota Fiscal.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setAba('qr')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
            aba === 'qr' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <QrCode className="w-4 h-4" />
          QR Code
        </button>
        <button onClick={() => setAba('nf')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
            aba === 'nf' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <FileBarChart2 className="w-4 h-4" />
          Código de Barras NF
        </button>
      </div>

      {aba === 'qr' && <AbaQR />}
      {aba === 'nf' && <AbaNF />}
    </div>
  )
}
