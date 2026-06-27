import React, { useEffect, useState } from 'react'
import {
  Settings, MessageCircle, QrCode, RefreshCw, LogOut, Send,
  Bell, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight,
  DoorOpen, ShieldCheck, UserX, UserCheck, Users, Mail, KeyRound, Eye, EyeOff, Copy,
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
      setForm({ evo_url: data.evo_url||'', evo_key: data.evo_key_masked||'', evo_instance: data.evo_instance||'', evo_responsavel: (data.evo_responsavel||'').replace(/^55/, '') })
    }).catch(() => setFb({ tipo: 'erro', msg: 'Erro ao carregar configurações.' }))
  }, [])

  useEffect(() => { if (!fb) return; const t = setTimeout(() => setFb(null), 4000); return () => clearTimeout(t) }, [fb])

  async function salvar(e) {
    e.preventDefault(); setSalvando(true)
    try {
      const evo_responsavel = form.evo_responsavel ? '55' + form.evo_responsavel.replace(/\D/g, '') : ''
      await api.post('/api/configuracoes/evo', { ...form, evo_responsavel })
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
          <div className="flex">
            <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-sm text-gray-600 font-medium select-none">+55</span>
            <input className={`${input} rounded-l-none`} type="tel" placeholder="11 99999-9999" value={form.evo_responsavel}
              onChange={e => setForm(f => ({ ...f, evo_responsavel: e.target.value.replace(/\D/g, '') }))} />
          </div>
          <p className="text-xs text-gray-400 mt-1">Recebe todas as notificações de entrada.</p>
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

const SETOR_EVENTOS = [
  { key: 'entrada',           label: 'Entrada de veículo' },
  { key: 'saida',             label: 'Saída de veículo' },
  { key: 'nf_nao_programada', label: 'NF sem agendamento (Faturamento)' },
]

const SETOR_VAZIO = { nome: '', telefone: '', email: '', criterioTipo: 'tipoOperacao', criterioValor: '', eventos: ['entrada'] }

function SetorForm({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(inicial ? { email: '', ...inicial } : SETOR_VAZIO)
  function toggleEvento(ev) {
    setForm(f => ({ ...f, eventos: f.eventos.includes(ev) ? f.eventos.filter(e => e !== ev) : [...f.eventos, ev] }))
  }
  const criterio = CRITERIOS.find(c => c.value === form.criterioTipo) || CRITERIOS[0]
  return (
    <div className="border border-blue-200 rounded-xl p-4 bg-blue-50 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Setor</label>
          <input className={input} placeholder="ex: Faturamento, Logística…"
            value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDI+DDD)</label>
          <input className={input} placeholder="5511999999999"
            value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do setor <span className="text-gray-400 font-normal">(para alertas)</span></label>
          <input className={input} type="email" placeholder="faturamento@empresa.com.br"
            value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
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
        <div className="flex flex-wrap gap-3">
          {SETOR_EVENTOS.map(ev => (
            <label key={ev.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.eventos.includes(ev.key)} onChange={() => toggleEvento(ev.key)} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm">{ev.label}</span>
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
                  {s.eventos.map(ev => {
                    const evCfg = SETOR_EVENTOS.find(e => e.key === ev)
                    const cor = ev === 'entrada' ? 'bg-blue-100 text-blue-700' : ev === 'nf_nao_programada' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    return <span key={ev} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cor}`}>{evCfg?.label || ev}</span>
                  })}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-600">{labelCriterio(s.criterioTipo)}:</span>{' '}
                  <code className="bg-gray-100 px-1 rounded text-xs">{s.criterioValor === '*' ? 'qualquer' : s.criterioValor}</code>
                  {' · '}📱 {s.telefone}
                  {s.email && <>{' · '}✉️ {s.email}</>}
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
      const tel = form.telefone ? '55' + form.telefone.replace(/\D/g, '') : ''
      await api.post('/api/users', { ...form, telefone: tel, role: 'superadmin' })
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
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-sm text-gray-600 font-medium select-none">+55</span>
                <input className={`${input} rounded-l-none`} type="tel" placeholder="11 99999-9999" value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value.replace(/\D/g, '') }))} />
              </div>
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

// ─── Aba Contatos de Notificação ─────────────────────────────────────────────

const GRUPOS_EVENTOS = [
  {
    grupo: 'Portaria 1 — Pedestres',
    eventos: [
      { key: 'portaria1:pedestre:entrada', label: 'Entrada de pedestres' },
      { key: 'portaria1:pedestre:saida',   label: 'Saída de pedestres' },
    ],
  },
  {
    grupo: 'Portaria 2 — Veículos',
    eventos: [
      { key: 'portaria2:veiculo:entrada', label: 'Entrada de veículos' },
      { key: 'portaria2:veiculo:saida',   label: 'Saída de veículos' },
    ],
  },
  {
    grupo: 'Portaria 2 — Pedestres',
    eventos: [
      { key: 'portaria2:pedestre:entrada', label: 'Entrada de pedestres' },
      { key: 'portaria2:pedestre:saida',   label: 'Saída de pedestres' },
    ],
  },
  {
    grupo: 'Ocorrências',
    eventos: [
      { key: 'ocorrencia:Segurança do Trabalho',    label: 'Segurança do Trabalho' },
      { key: 'ocorrencia:Segurança Patrimonial',    label: 'Segurança Patrimonial' },
      { key: 'ocorrencia:Conflitos Internos',       label: 'Conflitos Internos' },
      { key: 'ocorrencia:Veículos e Estacionamento',label: 'Veículos e Estacionamento' },
      { key: 'ocorrencia:Infraestrutura',           label: 'Infraestrutura' },
      { key: 'ocorrencia:Ocorrências Externas',     label: 'Ocorrências Externas' },
      { key: 'ocorrencia:Danos ao Patrimônio',      label: 'Danos ao Patrimônio' },
      { key: 'ocorrencia:Saúde / Mal-estar',        label: 'Saúde / Mal-estar' },
      { key: 'ocorrencia:Outras Ocorrências',       label: 'Outras Ocorrências' },
    ],
  },
]

const EVENTO_LABELS = {}
GRUPOS_EVENTOS.forEach(g => g.eventos.forEach(e => { EVENTO_LABELS[e.key] = `${g.grupo}: ${e.label}` }))

function ContatoModal({ contato, onSave, onClose }) {
  const [nome, setNome]         = useState(contato?.nome     || '')
  const [telefone, setTelefone] = useState((contato?.telefone || '').replace(/^55/, ''))
  const [eventos, setEventos]   = useState(new Set(contato?.eventos || []))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  function toggleEvento(key) {
    setEventos(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleGrupo(grupo) {
    const keys = grupo.eventos.map(e => e.key)
    const todos = keys.every(k => eventos.has(k))
    setEventos(prev => {
      const next = new Set(prev)
      keys.forEach(k => todos ? next.delete(k) : next.add(k))
      return next
    })
  }

  async function salvar() {
    if (!nome.trim())     return setErro('Nome obrigatório')
    if (!telefone.trim()) return setErro('Telefone obrigatório')
    if (eventos.size === 0) return setErro('Selecione ao menos um evento')
    setSalvando(true); setErro('')
    try {
      const telFull = telefone ? '55' + telefone.replace(/\D/g, '') : ''
      const payload = { nome, telefone: telFull, eventos: [...eventos], ativo: contato?.ativo ?? true }
      if (contato?.id) {
        await api.patch(`/api/contatos-notificacao/${contato.id}`, payload)
      } else {
        await api.post('/api/contatos-notificacao', payload)
      }
      onSave()
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{contato?.id ? 'Editar contato' : 'Novo contato'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{erro}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Setor <span className="text-red-500">*</span></label>
            <input className={input} placeholder="Ex: Segurança, RH, Manutenção..." value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp <span className="text-red-500">*</span></label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-sm text-gray-600 font-medium select-none">+55</span>
              <input className={`${input} rounded-l-none`} type="tel" placeholder="11 99999-9999" value={telefone} onChange={e => setTelefone(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Mensagens que este contato receberá <span className="text-red-500">*</span></p>
            <div className="space-y-4">
              {GRUPOS_EVENTOS.map(g => {
                const todos = g.eventos.every(e => eventos.has(e.key))
                const algum = g.eventos.some(e => eventos.has(e.key))
                return (
                  <div key={g.grupo} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button type="button" onClick={() => toggleGrupo(g)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold transition-colors ${todos ? 'bg-blue-600 text-white' : algum ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                      <span>{g.grupo}</span>
                      <span className="text-xs font-normal">{todos ? 'Todos selecionados' : algum ? 'Parcialmente' : 'Nenhum'}</span>
                    </button>
                    <div className="divide-y divide-gray-100">
                      {g.eventos.map(e => (
                        <label key={e.key} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" className="w-4 h-4 accent-blue-600 flex-shrink-0"
                            checked={eventos.has(e.key)} onChange={() => toggleEvento(e.key)} />
                          <span className="text-sm text-gray-700">{e.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-2 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
            <Check className="w-4 h-4" />{salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AbaContatos() {
  const [contatos, setContatos]   = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal]         = useState(null) // null | {} | {id,...}
  const [fb, setFb]               = useState(null)

  useEffect(() => { carregar() }, [])
  useEffect(() => { if (!fb) return; const t = setTimeout(() => setFb(null), 3500); return () => clearTimeout(t) }, [fb])

  async function carregar() {
    setCarregando(true)
    try { const { data } = await api.get('/api/contatos-notificacao'); setContatos(data) }
    catch { setFb({ tipo: 'erro', msg: 'Erro ao carregar contatos.' }) }
    finally { setCarregando(false) }
  }

  async function toggleAtivo(c) {
    try {
      await api.patch(`/api/contatos-notificacao/${c.id}`, { ativo: !c.ativo })
      setContatos(cs => cs.map(x => x.id === c.id ? { ...x, ativo: !x.ativo } : x))
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao alterar status.' }) }
  }

  async function excluir(c) {
    if (!confirm(`Excluir contato "${c.nome}"?`)) return
    try {
      await api.delete(`/api/contatos-notificacao/${c.id}`)
      setContatos(cs => cs.filter(x => x.id !== c.id))
      setFb({ tipo: 'ok', msg: 'Contato removido.' })
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao excluir.' }) }
  }

  function onSave() {
    setModal(null)
    setFb({ tipo: 'ok', msg: 'Contato salvo com sucesso!' })
    carregar()
  }

  return (
    <div className="space-y-4">
      {modal !== null && <ContatoModal contato={modal} onSave={onSave} onClose={() => setModal(null)} />}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Contatos de Notificação</h2>
            <p className="text-xs text-gray-400 mt-0.5">Cada contato recebe apenas as mensagens das categorias selecionadas.</p>
          </div>
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>

        <Feedback fb={fb} />

        {carregando ? (
          <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : contatos.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            Nenhum contato cadastrado.<br />Adicione o primeiro contato para começar a receber notificações.
          </div>
        ) : (
          <div className="space-y-3">
            {contatos.map(c => (
              <div key={c.id} className={`border rounded-xl p-4 ${c.ativo ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 text-sm">{c.nome}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{c.telefone}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(c.eventos || []).map(ev => (
                        <span key={ev} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                          {ev.replace('portaria:', '').replace('ocorrencia:', '')}
                        </span>
                      ))}
                      {(!c.eventos || c.eventos.length === 0) && (
                        <span className="text-xs text-gray-400 italic">Sem eventos configurados</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleAtivo(c)} title={c.ativo ? 'Desativar' : 'Ativar'}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                      {c.ativo ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setModal(c)} title="Editar"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => excluir(c)} title="Excluir"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Aba Email (SMTP) ─────────────────────────────────────────────────────────

const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from']

function AbaEmail() {
  const [form, setForm] = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '' })
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [emailTeste, setEmailTeste] = useState('')
  const [fb, setFb] = useState(null)

  useEffect(() => {
    Promise.all(SMTP_KEYS.map(k => api.get(`/api/configuracoes/${k}`).then(r => [k, r.data.valor || '']).catch(() => [k, ''])))
      .then(entries => setForm(Object.fromEntries(entries)))
  }, [])

  useEffect(() => { if (!fb) return; const t = setTimeout(() => setFb(null), 5000); return () => clearTimeout(t) }, [fb])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function salvar(e) {
    e.preventDefault(); setSalvando(true)
    try {
      await Promise.all(SMTP_KEYS.map(k => api.post(`/api/configuracoes/${k}`, { valor: form[k] })))
      setFb({ tipo: 'ok', msg: 'Configurações de e-mail salvas com sucesso!' })
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao salvar configurações.' }) }
    finally { setSalvando(false) }
  }

  async function testar() {
    if (!emailTeste) return setFb({ tipo: 'erro', msg: 'Informe um e-mail para teste.' })
    setTestando(true)
    try {
      await api.post('/api/configuracoes/smtp/teste', { destinatario: emailTeste })
      setFb({ tipo: 'ok', msg: `E-mail de teste enviado para ${emailTeste}` })
    } catch (err) {
      setFb({ tipo: 'erro', msg: err.response?.data?.error || 'Erro ao enviar e-mail de teste.' })
    } finally { setTestando(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Mail className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Configuração de E-mail (SMTP)</h2>
      </div>
      <Feedback fb={fb} />
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Servidor SMTP</label>
            <input className={input} placeholder="smtp.gmail.com" value={form.smtp_host} onChange={set('smtp_host')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Porta</label>
            <input className={input} placeholder="587" value={form.smtp_port} onChange={set('smtp_port')} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <input className={input} placeholder="seu@email.com" value={form.smtp_user} onChange={set('smtp_user')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <input className={input + ' pr-10'} type={mostrarSenha ? 'text' : 'password'} placeholder="••••••••" value={form.smtp_pass} onChange={set('smtp_pass')} />
              <button type="button" onClick={() => setMostrarSenha(s => !s)} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail remetente (From)</label>
          <input className={input} placeholder="SOS Entry <noreply@suaempresa.com>" value={form.smtp_from} onChange={set('smtp_from')} />
        </div>
        <button type="submit" disabled={salvando} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Enviar e-mail de teste</h3>
        <div className="flex gap-2">
          <input className={input} placeholder="destinatario@teste.com" value={emailTeste} onChange={e => setEmailTeste(e.target.value)} />
          <button onClick={testar} disabled={testando} className="flex items-center gap-1.5 bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap">
            <Send className="w-4 h-4" />
            {testando ? 'Enviando…' : 'Testar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Aba API Keys ─────────────────────────────────────────────────────────────

const ESCOPOS_DISPONIVEIS = [
  { value: 'agendamentos:ler',    label: 'Agendamentos — Leitura' },
  { value: 'agendamentos:criar',  label: 'Agendamentos — Criar' },
  { value: 'agendamentos:aprovar',label: 'Agendamentos — Aprovar' },
  { value: 'registros:ler',       label: 'Registros — Leitura' },
  { value: '*',                   label: 'Acesso Total (*)' },
]

function AbaApiKeys() {
  const [keys, setKeys] = useState([])
  const [fb, setFb] = useState(null)
  const [novaChave, setNovaChave] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [form, setForm] = useState({ nome: '', descricao: '', escopos: ['agendamentos:ler'] })
  const [criando, setCriando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  const carregar = () => api.get('/api/api-keys').then(({ data }) => setKeys(data)).catch(() => {})

  useEffect(() => { carregar() }, [])
  useEffect(() => { if (!fb) return; const t = setTimeout(() => setFb(null), 5000); return () => clearTimeout(t) }, [fb])

  function toggleEscopo(v) {
    setForm(f => {
      const s = f.escopos.includes(v) ? f.escopos.filter(e => e !== v) : [...f.escopos, v]
      return { ...f, escopos: s }
    })
  }

  async function criar(e) {
    e.preventDefault()
    if (!form.nome) return setFb({ tipo: 'erro', msg: 'Informe um nome para a API Key.' })
    if (!form.escopos.length) return setFb({ tipo: 'erro', msg: 'Selecione pelo menos um escopo.' })
    setCriando(true)
    try {
      const { data } = await api.post('/api/api-keys', form)
      setNovaChave(data.chave)
      setForm({ nome: '', descricao: '', escopos: ['agendamentos:ler'] })
      setMostrarForm(false)
      carregar()
      setFb({ tipo: 'ok', msg: 'API Key criada. Copie a chave agora — ela não será exibida novamente.' })
    } catch (err) {
      setFb({ tipo: 'erro', msg: err.response?.data?.error || 'Erro ao criar API Key.' })
    } finally { setCriando(false) }
  }

  async function revogar(id) {
    if (!confirm('Revogar esta API Key? A ação não pode ser desfeita.')) return
    try {
      await api.delete(`/api/api-keys/${id}`)
      setFb({ tipo: 'ok', msg: 'API Key revogada.' })
      carregar()
    } catch { setFb({ tipo: 'erro', msg: 'Erro ao revogar.' }) }
  }

  function copiar(chave) {
    navigator.clipboard.writeText(chave).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          </div>
          <button onClick={() => setMostrarForm(f => !f)} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Nova Key
          </button>
        </div>
        <Feedback fb={fb} />

        {novaChave && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-yellow-800 mb-2">Copie sua chave agora! Ela não será exibida novamente.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-yellow-200 rounded px-3 py-2 break-all font-mono">{novaChave}</code>
              <button onClick={() => copiar(novaChave)} className="flex items-center gap-1 text-yellow-700 hover:text-yellow-900 text-sm font-medium">
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <button onClick={() => setNovaChave(null)} className="mt-2 text-xs text-yellow-600 hover:underline">Fechar</button>
          </div>
        )}

        {mostrarForm && (
          <form onSubmit={criar} className="mb-5 bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Nova API Key</h3>
            <input className={input} placeholder="Nome da integração (ex: ERP TOTVS)" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <input className={input} placeholder="Descrição (opcional)" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Escopos de acesso</p>
              <div className="space-y-1.5">
                {ESCOPOS_DISPONIVEIS.map(e => (
                  <label key={e.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.escopos.includes(e.value)} onChange={() => toggleEscopo(e.value)} className="rounded" />
                    <span className="text-gray-700">{e.label}</span>
                    <code className="text-xs text-gray-400">{e.value}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={criando} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {criando ? 'Criando…' : 'Criar API Key'}
              </button>
              <button type="button" onClick={() => setMostrarForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
            </div>
          </form>
        )}

        {keys.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhuma API Key criada.</p>
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <div key={k.id} className="flex items-start justify-between gap-3 border border-gray-100 rounded-xl p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 text-sm">{k.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${k.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                      {k.ativo ? 'Ativa' : 'Revogada'}
                    </span>
                  </div>
                  {k.descricao && <p className="text-xs text-gray-400 mt-0.5">{k.descricao}</p>}
                  <code className="text-xs text-gray-500 mt-1 block">…{k.chave}</code>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(k.escopos || []).map(s => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                  {k.ultimoUso && <p className="text-xs text-gray-400 mt-1">Último uso: {new Date(k.ultimoUso).toLocaleString('pt-BR')}</p>}
                </div>
                {k.ativo && (
                  <button onClick={() => revogar(k.id)} className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                    Revogar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Como usar a API</p>
        <p className="mb-2">Inclua o header <code className="bg-white px-1 rounded">X-API-Key: sua-chave</code> em todas as requisições.</p>
        <p className="font-medium mb-1">Endpoints disponíveis:</p>
        <ul className="space-y-0.5 text-xs font-mono">
          <li>GET  /api/v1/agendamentos</li>
          <li>GET  /api/v1/agendamentos/:id</li>
          <li>POST /api/v1/agendamentos</li>
          <li>POST /api/v1/agendamentos/:id/preencher-nf</li>
          <li>POST /api/v1/agendamentos/:id/aprovar</li>
          <li>GET  /api/v1/agendamentos/:id/qrcode</li>
        </ul>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const ABAS_BASE = [
  { id: 'api',       label: 'Configuração da API',       icon: Settings },
  { id: 'conexao',   label: 'Conexão / QR Code',         icon: MessageCircle },
  { id: 'email',     label: 'E-mail (SMTP)',              icon: Mail },
  { id: 'apikeys',   label: 'API Keys',                   icon: KeyRound },
  { id: 'contatos',  label: 'Contatos de Notificação',   icon: Users },
  { id: 'setores',   label: 'Notificações por Setor',    icon: Bell },
  { id: 'portarias', label: 'Portarias',                  icon: DoorOpen },
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
      {aba === 'email'      && <AbaEmail />}
      {aba === 'apikeys'    && <AbaApiKeys />}
      {aba === 'contatos'   && <AbaContatos />}
      {aba === 'setores'    && <AbaSetores />}
      {aba === 'portarias'  && <AbaPortarias />}
      {aba === 'superadmin' && user?.role === 'superadmin' && <AbaSuperadmin />}
    </div>
  )
}
