import React, { useEffect, useState } from 'react'
import {
  Settings, MessageCircle, QrCode, RefreshCw, LogOut, Send,
  Bell, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight,
  DoorOpen, ShieldCheck, UserX, UserCheck,
} from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'

// ─── helpers ─────────────────────────────────────────────────────────────────

const CRITERIOS = [
  { value: 'tipoOperacao', label: 'Tipo de Operação', placeholder: 'ex: coleta, entrega' },
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

// ─── Aba 1: Configuração da API ───────────────────────────────────────────────

function AbaConexaoAPI() {
  const [form, setForm] = useState({ evo_url: '', evo_key: '', evo_instance: '', evo_responsavel: '' })
  const [salvando, setSalvando] = useState(false)
  const [fb, setFb] = useState(null)

  useEffect(() => {
    api.get('/api/configuracoes/evo').then(({ data }) => {
      setForm({ evo_url: data.evo_url||'', evo_key: data.evo_key_masked||'', evo_instance: data.evo_instance||'', evo_responsavel: data.evo_responsavel||'' })
    }).catch(() => setFb({ tipo: 'erro', msg: 'Erro ao carregar configurações.' }))
  }, [])

  useEffect(() => { if (!fb) return; const t = setTimeout(() => setFb(null), 4000); return () => clearTimeout(t) }, [fb])

  async function salvar(e) {
    e.preventDefault(); setSalvando(true)
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
          <Check className="w-4 h-4" />{salvando ? 'Salvando...' : 'Salvar Configurações'}
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
  const [status, setStatus] = useState(null)
  const [qr, setQr] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [numero, setNumero] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [fb, setFb] = useState(null)

  useEffect(() => { carregarStatus() }, [])
  useEffect(() => { if (!fb) return; const t = setTimeout(() => setFb(null), 4000); return () => clearTimeout(t) }, [fb])

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
            <input className={input} placeholder="5511999999999" value={numero} onChange={e => setNumero(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea className={input + ' resize-none h-24'} placeholder="Digite sua mensagem..."
              value={mensagem} onChange={e => setMensagem(e.target.value)} />
          </div>
          <button type="submit" disabled={enviando || !numero || !mensagem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <Send className="w-4 h-4" />{enviando ? 'Enviando...' : 'Enviar'}
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
    setForm(f => ({ ...f, eventos: f.eventos.includes(ev) ? f.eventos.filter(e => e !== ev) : [...f.eventos, ev] }))
  }
  const criterio = CRITERIOS.find(c => c.value === form.criterioTipo) || CRITERIOS[0]
  return (
    <div className="border border-blue-200 rounded-xl p-4 bg-blue-50 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Setor</label>
          <input className={input} placeholder="ex: Logística, Recebimento…"
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
              <input type="checkbox" checked={form.eventos.includes(ev)} onChange={() => toggleEvento(ev)} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm">{ev === 'entrada' ? 'Entrada' : 'Saída'}</span>
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
  const [setores, setSetores] = useState([])
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [fb, setFb] = useState(null)

  useEffect(() => { carregar() }, [])
  useEffect(() => { if (!fb) return; const t = setTimeout(() => setFb(null), 4000); return () => clearTimeout(t) }, [fb])

  async function carregar() {
    try { const { data } = await api.get('/api/configuracoes/setores'); setSetores(data) }
    catch { setFb({ tipo: 'erro', msg: 'Erro ao carregar setores.' }) }
  }

  async function criar(form) {
    try { await api.post('/api/configuracoes/setores', form); setCriando(false); setFb({ tipo: 'ok', msg: 'Setor criado!' }); carregar() }
    catch (e) { setFb({ tipo: 'erro', msg: e.response?.data?.error || 'Erro ao criar setor.' }) }
  }

  async function atualizar(id, form) {
    try { await api.patch(`/api/configuracoes/setores/${id}`, form); setEditando(null); setFb({ tipo: 'ok', msg: 'Setor atualizado!' }); carregar() }
    catch (e) { setFb({ tipo: 'erro', msg: e.response?.data?.error || 'Erro ao atualizar setor.' }) }
  }

  async function toggleAtivo(s) {
    try { await api.patch(`/api/configuracoes/setores/${s.id}`, { ativo: !s.ativo }); carregar() }
    catch { setFb({ tipo: 'erro', msg: 'Erro ao alterar status.' }) }
  }

  async function deletar(id) {
    if (!confirm('Remover este setor?')) return
    try { await api.delete(`/api/configuracoes/setores/${id}`); setFb({ tipo: 'ok', msg: 'Setor removido.' }); carregar() }
    catch { setFb({ tipo: 'erro', msg: 'Erro ao remover setor.' }) }
  }

  const labelCriterio = tipo => CRITERIOS.find(c => c.value === tipo)?.label || tipo

  return (
    <div className="space-y-4">
      <Feedback fb={fb} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Defina quais setores devem ser notificados conforme o tipo de acesso ou veículo.</p>
        {!criando && (
          <button onClick={() => setCriando(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium flex-shrink-0">
            <Plus className="w-4 h-4" /> Novo Setor
          </button>
        )}
      </div>
      {criando && <SetorForm onSalvar={criar} onCancelar={() => setCriando(false)} />}
      {setores.length === 0 && !criando && (
        <div className="card p-8 text-center text-gray-400 text-sm">Nenhum setor configurado ainda.</div>
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
                <button onClick={() => toggleAtivo(s)} title={s.ativo ? 'Desativar' : 'Ativar'} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                  {s.ativo ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => setEditando(s.id)} title="Editar" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deletar(s.id)} title="Remover" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
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

// ─── Aba 4: Portarias ─────────────────────────────────────────────────────────

const PORTARIA_VAZIA = { nome: '', tipo: 'transportes' }

function PortariaForm({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(inicial || PORTARIA_VAZIA)
  return (
    <div className="border border-blue-200 rounded-xl p-4 bg-blue-50 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Portaria / Local</label>
          <input className={input} placeholder="ex: Portaria 1, Estacionamento, Recepção…"
            value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select className={input} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
            <option value="transportes">Transportes (veículos)</option>
            <option value="pedestres">Pedestres (visitantes)</option>
          </select>
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

function AbaPortarias() {
  const [portarias, setPortarias] = useState([])
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [fb, setFb] = useState(null)

  useEffect(() => { carregar() }, [])
  useEffect(() => { if (!fb) return; const t = setTimeout(() => setFb(null), 4000); return () => clearTimeout(t) }, [fb])

  async function carregar() {
    try { const { data } = await api.get('/api/portarias?all=true'); setPortarias(data) }
    catch { setFb({ tipo: 'erro', msg: 'Erro ao carregar portarias.' }) }
  }

  async function criar(form) {
    if (!form.nome.trim()) { setFb({ tipo: 'erro', msg: 'Nome obrigatório.' }); return }
    try { await api.post('/api/portarias', form); setCriando(false); setFb({ tipo: 'ok', msg: 'Portaria criada!' }); carregar() }
    catch (e) { setFb({ tipo: 'erro', msg: e.response?.data?.error || 'Erro ao criar portaria.' }) }
  }

  async function atualizar(id, form) {
    try { await api.patch(`/api/portarias/${id}`, form); setEditando(null); setFb({ tipo: 'ok', msg: 'Portaria atualizada!' }); carregar() }
    catch (e) { setFb({ tipo: 'erro', msg: e.response?.data?.error || 'Erro ao atualizar portaria.' }) }
  }

  async function toggleAtivo(p) {
    try { await api.patch(`/api/portarias/${p.id}`, { ativo: !p.ativo }); carregar() }
    catch { setFb({ tipo: 'erro', msg: 'Erro ao alterar status.' }) }
  }

  return (
    <div className="space-y-4">
      <Feedback fb={fb} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Gerencie os pontos de acesso (portarias, estacionamentos, recepções…).</p>
        {!criando && (
          <button onClick={() => setCriando(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium flex-shrink-0">
            <Plus className="w-4 h-4" /> Nova Portaria
          </button>
        )}
      </div>
      {criando && <PortariaForm onSalvar={criar} onCancelar={() => setCriando(false)} />}
      {portarias.length === 0 && !criando && (
        <div className="card p-8 text-center text-gray-400 text-sm">Nenhuma portaria cadastrada ainda.</div>
      )}
      {portarias.map(p => (
        <div key={p.id}>
          {editando === p.id ? (
            <PortariaForm inicial={p} onSalvar={f => atualizar(p.id, f)} onCancelar={() => setEditando(null)} />
          ) : (
            <div className={`card p-4 flex items-center justify-between gap-3 ${!p.ativo ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${p.ativo ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                  {p.numero}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{p.nome}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.tipo === 'transportes' ? 'Veículos / Transportes' : 'Pedestres / Visitantes'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleAtivo(p)} title={p.ativo ? 'Desativar' : 'Ativar'} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                  {p.ativo ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => setEditando(p.id)} title="Editar" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Aba 5: Superadmin ────────────────────────────────────────────────────────

function AbaSuperadmin() {
  const [form, setForm] = useState({ nome: '', login: '', email: '', senha: '', telefone: '' })
  const [salvando, setSalvando] = useState(false)
  const [fb, setFb] = useState(null)
  const [superadmins, setSuperadmins] = useState([])

  useEffect(() => { carregar() }, [])
  useEffect(() => { if (!fb) return; const t = setTimeout(() => setFb(null), 5000); return () => clearTimeout(t) }, [fb])

  async function carregar() {
    try {
      const { data } = await api.get('/api/users')
      setSuperadmins(data.filter(u => u.role === 'superadmin'))
    } catch {}
  }

  async function criar(e) {
    e.preventDefault()
    if (!form.nome || !form.login || !form.senha)
      return setFb({ tipo: 'erro', msg: 'Nome, login e senha são obrigatórios.' })
    setSalvando(true)
    try {
      await api.post('/api/users', { ...form, role: 'superadmin' })
      setFb({ tipo: 'ok', msg: `Superadmin "${form.nome}" criado com sucesso!` })
      setForm({ nome: '', login: '', email: '', senha: '', telefone: '' })
      carregar()
    } catch (err) {
      setFb({ tipo: 'erro', msg: err.response?.data?.error || 'Erro ao criar superadmin.' })
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(u) {
    const acao = u.ativo !== false ? 'desativar' : 'ativar'
    if (!confirm(`Deseja ${acao} o superadmin "${u.nome}"?`)) return
    try {
      await api.patch(`/api/users/${u.id}`, { ativo: !u.ativo })
      carregar()
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao alterar status.' }) }
  }

  return (
    <div className="space-y-5">
      <Feedback fb={fb} />

      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-1">Superadmins ativos</h2>
        <p className="text-sm text-gray-400 mb-4">Contas com acesso total ao sistema.</p>
        {superadmins.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum superadmin encontrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {superadmins.map(u => (
              <div key={u.id} className="flex items-center justify-between py-3 gap-3">
                <div>
                  <p className="font-medium text-gray-800">{u.nome}</p>
                  <p className="text-xs text-gray-400">{u.login}{u.email ? ` · ${u.email}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.ativo !== false ? 'Ativo' : 'Inativo'}
                  </span>
                  <button onClick={() => toggleAtivo(u)}
                    className={`btn-sm btn ${u.ativo !== false ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200' : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200'}`}>
                    {u.ativo !== false ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-1">Criar novo Superadmin</h2>
        <p className="text-sm text-gray-400 mb-4">Útil para rotatividade de responsáveis. O novo usuário terá acesso total ao sistema.</p>
        <form onSubmit={criar} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input className={input} placeholder="Nome completo" value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login <span className="text-red-500">*</span></label>
              <input className={input} placeholder="nome.sobrenome" value={form.login}
                onChange={e => setForm(f => ({ ...f, login: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input className={input} type="email" placeholder="email@empresa.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDI)</label>
              <input className={input} placeholder="5511999999999" value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha <span className="text-red-500">*</span></label>
              <input className={input} type="password" placeholder="Mínimo 6 caracteres" value={form.senha}
                onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
            </div>
          </div>
          <button type="submit" disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />{salvando ? 'Criando...' : 'Criar Superadmin'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const ABAS_BASE = [
  { id: 'api',       label: 'Configuração da API',    icon: Settings },
  { id: 'conexao',   label: 'Conexão / QR Code',      icon: MessageCircle },
  { id: 'setores',   label: 'Notificações por Setor', icon: Bell },
  { id: 'portarias', label: 'Portarias',               icon: DoorOpen },
]

const ABA_SUPERADMIN = { id: 'superadmin', label: 'Superadmin', icon: ShieldCheck }

export default function Configuracoes() {
  const { user } = useAuth()
  const [aba, setAba] = useState('api')

  const ABAS = user?.role === 'superadmin' ? [...ABAS_BASE, ABA_SUPERADMIN] : ABAS_BASE

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      </div>

      {/* Tabs — scroll horizontal em mobile */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              aba === a.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <a.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{a.label}</span>
          </button>
        ))}
      </div>

      {aba === 'api'        && <AbaConexaoAPI />}
      {aba === 'conexao'    && <AbaConexaoQR />}
      {aba === 'setores'    && <AbaSetores />}
      {aba === 'portarias'  && <AbaPortarias />}
      {aba === 'superadmin' && user?.role === 'superadmin' && <AbaSuperadmin />}
    </div>
  )
}
