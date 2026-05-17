import React, { useEffect, useState } from 'react'
import { PlusCircle, Edit2, Trash2, Zap } from 'lucide-react'
import api from '../../api/client'

const EVENTOS = [
  { value: 'entrada', label: 'Entrada de veículo' },
  { value: 'saida', label: 'Saída de veículo' },
  { value: 'cancelado', label: 'Registro cancelado' },
]

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

const vazio = { nome: '', url: '', eventos: [], secret: '', ativo: true }

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  async function carregar() {
    setLoading(true)
    try { const { data } = await api.get('/api/webhooks'); setWebhooks(data) }
    catch { } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  function abrirCriar() { setForm(vazio); setErro(''); setModal('criar') }
  function abrirEditar(w) { setForm({ ...w, secret: w.secret || '' }); setErro(''); setModal(w) }

  function toggleEvento(ev) {
    setForm(f => ({
      ...f,
      eventos: f.eventos.includes(ev) ? f.eventos.filter(e => e !== ev) : [...f.eventos, ev]
    }))
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.nome || !form.url || !form.eventos.length) {
      setErro('Nome, URL e pelo menos um evento são obrigatórios.')
      return
    }
    setSalvando(true)
    try {
      if (modal === 'criar') await api.post('/api/webhooks', form)
      else await api.patch(`/api/webhooks/${modal.id}`, form)
      setModal(null)
      carregar()
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao salvar webhook.')
    } finally {
      setSalvando(false)
    }
  }

  async function deletar(id) {
    if (!confirm('Tem certeza que deseja remover este webhook?')) return
    try { await api.delete(`/api/webhooks/${id}`); carregar() } catch { }
  }

  async function testar(id) {
    setTestando(id)
    setMsg('')
    try {
      await api.post(`/api/webhooks/${id}/test`)
      setMsg('Evento de teste disparado com sucesso!')
      setTimeout(() => setMsg(''), 4000)
    } catch {
      setMsg('Erro ao testar webhook.')
      setTimeout(() => setMsg(''), 4000)
    } finally {
      setTestando(null)
    }
  }

  const label = 'block text-sm font-medium text-gray-700 mb-1'
  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Integre com n8n, Zapier e outros serviços de automação.</p>
        </div>
        <button onClick={abrirCriar} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <PlusCircle className="w-4 h-4" /> Novo Webhook
        </button>
      </div>

      {msg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">{msg}</div>
      )}

      {/* Guia de integração */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-800 text-sm mb-2">Como integrar com n8n</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Crie um nó <strong>Webhook</strong> no n8n (método POST)</li>
          <li>Copie a URL gerada pelo n8n</li>
          <li>Cole aqui e selecione os eventos desejados</li>
          <li>O payload chegará com: <code className="bg-blue-100 px-1 rounded">evento</code>, <code className="bg-blue-100 px-1 rounded">ts</code> e <code className="bg-blue-100 px-1 rounded">dados</code> (campos do registro)</li>
        </ol>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card p-8 text-center text-gray-400">Carregando...</div>
        ) : webhooks.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhum webhook configurado.
          </div>
        ) : (
          webhooks.map(w => (
            <div key={w.id} className="card p-4 flex items-start gap-4">
              <div className={`mt-0.5 w-3 h-3 rounded-full flex-shrink-0 ${w.ativo ? 'bg-green-400' : 'bg-gray-300'}`} title={w.ativo ? 'Ativo' : 'Inativo'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{w.nome}</span>
                  {!w.ativo && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>}
                </div>
                <p className="text-xs text-gray-500 font-mono truncate mb-2">{w.url}</p>
                <div className="flex gap-1 flex-wrap">
                  {w.eventos.map(ev => (
                    <span key={ev} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ev === 'entrada' ? 'bg-green-100 text-green-700' :
                      ev === 'saida' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-600'
                    }`}>{ev}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => testar(w.id)} disabled={testando === w.id} title="Testar" className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded disabled:opacity-50">
                  <Zap className="w-4 h-4" />
                </button>
                <button onClick={() => abrirEditar(w)} title="Editar" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deletar(w.id)} title="Remover" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modal !== null && (
        <Modal title={modal === 'criar' ? 'Novo Webhook' : 'Editar Webhook'} onClose={() => setModal(null)}>
          {erro && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{erro}</div>}
          <form onSubmit={salvar} className="space-y-4">
            <div>
              <label className={label}>Nome *</label>
              <input className={input} placeholder="Ex: n8n Entrada" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
            </div>
            <div>
              <label className={label}>URL *</label>
              <input className={input} placeholder="https://seu-n8n.com/webhook/..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required />
            </div>
            <div>
              <label className={label}>Eventos *</label>
              <div className="space-y-2 mt-1">
                {EVENTOS.map(ev => (
                  <label key={ev.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.eventos.includes(ev.value)} onChange={() => toggleEvento(ev.value)} className="w-4 h-4 rounded text-blue-600" />
                    <span className="text-sm text-gray-700">{ev.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>Secret (HMAC opcional)</label>
              <input className={input} placeholder="Deixe vazio para não assinar" value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Se preenchido, cada requisição incluirá o header <code>X-SOS-Signature</code></p>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="wh-ativo" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4 rounded text-blue-600" />
              <label htmlFor="wh-ativo" className="text-sm text-gray-700 cursor-pointer">Webhook ativo</label>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={salvando} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
