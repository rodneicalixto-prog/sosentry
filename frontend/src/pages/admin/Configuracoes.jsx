import React, { useEffect, useState } from 'react'
import {
  Settings, MessageCircle, QrCode, RefreshCw, LogOut, Send,
  Bell, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight,
} from 'lucide-react'
import api from '../../api/client'

// ─── helpers ─────────────────────────────────────────────────────────────────

const CRITERIOS = [
  { value: 'tipoOperacao', label: 'Tipo de Operação', placeholder: 'ex: coleta, entrega, manutenção' },
  { value: 'tipoPortaria', label: 'Tipo de Portaria', placeholder: 'transportes ou pedestres' },
  { value: 'tipoVeiculo',  label: 'Tipo de Veículo',  placeholder: 'ex: Caminhão, Carro, Moto' },
]

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Feedback({ fb }) {
  if (!fb) return null
  const cls = fb.tipo === 'ok'
    ? 'bg-green-50 border-green-200 text-green-700'
    : fb.tipo === 'info'
    ? 'bg-blue-50 border-blue-200 text-blue-700'
    : 'bg-red-50 border-red-200 text-red-700'
  return <div className={`mb-4 rounded-xl p-3 text-sm border ${cls}`}>{fb.msg}</div>
}

// ─── Aba 1: Conexão WhatsApp ──────────────────────────────────────────────────

function AbaConexaoAPI() {
  const [form, setForm]       = useState({ evo_url: '', evo_key: '', evo_instance: '', evo_responsavel: '' })
  const [salvando, setSalvando] = useState(false)
  const [fb, setFb]           = useState(null)

  useEffect(() => {
    api.get('/api/configuracoes/evo').then(({ data }) => {
      setForm({
        evo_url:         data.evo_url         || '',
        evo_key:         data.evo_key_masked  || '',
        evo_instance:    data.evo_instance    || '',
        evo_responsavel: data.evo_responsavel || '',
      })
    }).catch(() => setFb({ tipo: 'erro', msg: 'Erro ao carregar configurações.' }))
  }, [])

  useEffect(() => {
    if (!fb) return
    const t = setTimeout(() => setFb(null), 4000)
    return () => clearTimeout(t)
  }, [fb])

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.post('/api/configuracoes/evo', form)
      setFb({ tipo: 'ok', msg: 'Configurações salvas com sucesso!' })
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao salvar configurações.' }) }
    finally { setSalvando(false) }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-800 mb-4">Configurações da API Evolution</h2>
      <Feedback fb={fb} />
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL da API Evolution</label>
          <input className={input} placeholder="https://evogo.sosbot.online" value={form.evo_url}
            onChange={e => setForm(f => ({ ...f, evo_url: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input className={input} type="password" placeholder="Chave de acesso da Evolution API"
            value={form.evo_key} onChange={e => setForm(f => ({ ...f, evo_key: e.target.value }))} />
          <p className="text-xs text-gray-400 mt-1">Deixe em branco para não alterar a chave atual.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Instância</label>
          <input className={input} placeholder="portaria" value={form.evo_instance}
            onChange={e => setForm(f => ({ ...f, evo_instance: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp do Responsável Geral</label>
          <input className={input} placeholder="5511999999999 (com DDI)" value={form.evo_responsavel}
            onChange={e => setForm(f => ({ ...f, evo_responsavel: e.target.value }))} />
          <p className="text-xs text-gray-400 mt-1">Recebe todas as notificações de entrada. Sem formatação, só números.</p>
        </div>
        <button type="submit" disabled={salvando}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          <Check className="w-4 h-4" />
          {salvando ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>
    </div>
  )
}

// ─── Aba 2: Conexão / QR ─────────────────────────────────────────────────────

function StatusChip({ state }) {
  const map = {
    open:       { label: 'Conectado',     cls: 'bg-green-100 text-green-700' },
    connecting: { label: 'Conectando...', cls: 'bg-yellow-100 text-yellow-700' },
    close:      { label: 'Desconectado',  cls: 'bg-red-100 text-red-600' },
  }
  const s = map[state] || { label: state || 'Desconhecido', cls: 'bg-gray-100 text-gray-600' }
  return <span className={`px-3 py-1 rounded-full text-sm font-medium ${s.cls}`}>{s.label}</span>
}

function AbaConexaoQR() {
  const [status,    setStatus]    = useState(null)
  const [qr,        setQr]        = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [numero,    setNumero]    = useState('')
  const [mensagem,  setMensagem]  = useState('')
  const [enviando,  setEnviando]  = useState(false)
  const [fb,        setFb]        = useState(null)

  useEffect(() => { carregarStatus() }, [])
  useEffect(() => {
    if (!fb) return
    const t = setTimeout(() => setFb(null), 4000)
    return () => clearTimeout(t)
  }, [fb])

  async function carregarStatus() {
    setCarregando(true); setQr(null)
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
      setFb({ tipo: 'info', msg: 'QR gerado. Escaneie com o WhatsApp.' })
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao gerar QR Code.' }) }
    finally { setCarregando(false) }
  }

  async function desconectar() {
    if (!confirm('Desconectar o WhatsApp desta instância?')) return
    try {
      await api.delete('/api/whatsapp/logout')
      setStatus('close'); setQr(null)
      setFb({ tipo: 'ok', msg: 'WhatsApp desconectado.' })
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao desconectar.' }) }
  }

  async function enviarTeste(e) {
    e.preventDefault()
    if (!numero || !mensagem) return
    setEnviando(true)
    try {
      await api.post('/api/whatsapp/send', { number: numero.replace(/\D/g, ''), text: mensagem })
      setFb({ tipo: 'ok', msg: 'Mensagem enviada com sucesso!' })
      setMensagem('')
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao enviar mensagem.' }) }
    finally { setEnviando(false) }
  }

  return (
    <div className="space-y-4">
      <Feedback fb={fb} />

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Status da Instância</h2>
          <div className="flex items-center gap-2">
            {status && <StatusChip state={status} />}
            <button onClick={carregarStatus} disabled={carregando}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {status !== 'open' && (
            <button onClick={gerarQr} disabled={carregando}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              <QrCode className="w-4 h-4" /> Conectar via QR Code
            </button>
          )}
          {status === 'open' && (
            <button onClick={desconectar}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">
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

      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Enviar Mensagem de Teste</h2>
        <form onSubmit={enviarTeste} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número (com DDI+DDD)</label>
            <input className={input} placeholder="5511999999999" value={numero}
              onChange={e => setNumero(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea className={input + ' resize-none h-24'} placeholder="Digite sua mensagem..."
              value={mensagem} onChange={e => setMensagem(e.target.value)} />
          </div>
          <button type="submit" disabled={enviando || !numero || !mensagem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <Send className="w-4 h-4" />
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Aba 3: Notificações por Setor ───────────────────────────────────────────

const SETOR_VAZIO = { nome: '', telefone: '', criterioTipo: 'tipoOperacao', criterioValor: '', eventos: ['entrada'] }

function SetorForm({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(inicial || SETOR_VAZIO)

  function toggleEvento(ev) {
    setForm(f => ({
      ...f,
      eventos: f.eventos.includes(ev) ? f.eventos.filter(e => e !== ev) : [...f.eventos, ev],
    }))
  }

  const criterio = CRITERIOS.find(c => c.value === form.criterioTipo) || CRITERIOS[0]

  return (
    <div className="border border-blue-200 rounded-xl p-4 bg-blue-50 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Setor</label>
          <input className={input} placeholder="ex: Logística, Recebimento, Administrativo"
            value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDI+DDD)</label>
          <input className={input} placeholder="5511999999999"
            value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Critério</label>
          <select className={input} value={form.criterioTipo}
            onChange={e => setForm(f => ({ ...f, criterioTipo: e.target.value, criterioValor: '' }))}>
            {CRITERIOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Critério</label>
          <input className={input} placeholder={criterio.placeholder}
            value={form.criterioValor} onChange={e => setForm(f => ({ ...f, criterioValor: e.target.value }))} />
          <p className="text-xs text-gray-400 mt-1">Use <code>*</code> para qualquer valor</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notificar em</label>
        <div className="flex gap-3">
          {['entrada', 'saida'].map(ev => (
            <label key={ev} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.eventos.includes(ev)}
                onChange={() => toggleEvento(ev)} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm capitalize">{ev === 'entrada' ? 'Entrada' : 'Saída'}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSalvar(form)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium">
          <Check className="w-4 h-4" /> Salvar
        </button>
        <button onClick={onCancelar}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium">
          <X className="w-4 h-4" /> Cancelar
        </button>
      </div>
    </div>
  )
}

function AbaSetores() {
  const [setores,  setSetores]  = useState([])
  const [criando,  setCriando]  = useState(false)
  const [editando, setEditando] = useState(null)
  const [fb,       setFb]       = useState(null)

  useEffect(() => { carregar() }, [])
  useEffect(() => {
    if (!fb) return
    const t = setTimeout(() => setFb(null), 4000)
    return () => clearTimeout(t)
  }, [fb])

  async function carregar() {
    try {
      const { data } = await api.get('/api/configuracoes/setores')
      setSetores(data)
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao carregar setores.' }) }
  }

  async function criar(form) {
    try {
      await api.post('/api/configuracoes/setores', form)
      setCriando(false)
      setFb({ tipo: 'ok', msg: 'Setor criado!' })
      carregar()
    } catch (e) {
      setFb({ tipo: 'erro', msg: e.response?.data?.error || 'Erro ao criar setor.' })
    }
  }

  async function atualizar(id, form) {
    try {
      await api.patch(`/api/configuracoes/setores/${id}`, form)
      setEditando(null)
      setFb({ tipo: 'ok', msg: 'Setor atualizado!' })
      carregar()
    } catch (e) {
      setFb({ tipo: 'erro', msg: e.response?.data?.error || 'Erro ao atualizar setor.' })
    }
  }

  async function toggleAtivo(s) {
    try {
      await api.patch(`/api/configuracoes/setores/${s.id}`, { ativo: !s.ativo })
      carregar()
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao alterar status.' }) }
  }

  async function deletar(id) {
    if (!confirm('Remover este setor?')) return
    try {
      await api.delete(`/api/configuracoes/setores/${id}`)
      setFb({ tipo: 'ok', msg: 'Setor removido.' })
      carregar()
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao remover setor.' }) }
  }

  function labelCriterio(tipo) {
    return CRITERIOS.find(c => c.value === tipo)?.label || tipo
  }

  return (
    <div className="space-y-4">
      <Feedback fb={fb} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Defina quais setores devem ser notificados conforme o tipo de acesso ou veículo.
        </p>
        {!criando && (
          <button onClick={() => setCriando(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium flex-shrink-0">
            <Plus className="w-4 h-4" /> Novo Setor
          </button>
        )}
      </div>

      {criando && (
        <SetorForm onSalvar={criar} onCancelar={() => setCriando(false)} />
      )}

      {setores.length === 0 && !criando && (
        <div className="card p-8 text-center text-gray-400 text-sm">
          Nenhum setor configurado ainda. Clique em "Novo Setor" para começar.
        </div>
      )}

      {setores.map(s => (
        <div key={s.id}>
          {editando === s.id ? (
            <SetorForm inicial={s} onSalvar={f => atualizar(s.id, f)} onCancelar={() => setEditando(null)} />
          ) : (
            <div className={`card p-4 flex items-start justify-between gap-3 ${!s.ativo ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{s.nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  {s.eventos.map(ev => (
                    <span key={ev} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ev === 'entrada' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {ev === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-600">{labelCriterio(s.criterioTipo)}:</span>{' '}
                  <code className="bg-gray-100 px-1 rounded text-xs">{s.criterioValor === '*' ? 'qualquer' : s.criterioValor}</code>
                  {' · '}📱 {s.telefone}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleAtivo(s)} title={s.ativo ? 'Desativar' : 'Ativar'}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                  {s.ativo ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => setEditando(s.id)} title="Editar"
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deletar(s.id)} title="Remover"
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const ABAS = [
  { id: 'api',     label: 'Configuração da API',    icon: Settings },
  { id: 'conexao', label: 'Conexão / QR Code',      icon: MessageCircle },
  { id: 'setores', label: 'Notificações por Setor', icon: Bell },
]

export default function Configuracoes() {
  const [aba, setAba] = useState('api')

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              aba === a.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <a.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{a.label}</span>
          </button>
        ))}
      </div>

      {aba === 'api'     && <AbaConexaoAPI />}
      {aba === 'conexao' && <AbaConexaoQR />}
      {aba === 'setores' && <AbaSetores />}
    </div>
  )
}
