import { useEffect, useState } from 'react'
import { Building2, Plus, Pencil, Trash2, X, Check, Search, Phone, Mail } from 'lucide-react'
import api from '../../api/client'

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function fmtCNPJ(v) {
  if (!v) return '—'
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || d
}

function fmtWA(v) {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  return d
}

const VAZIO = { nome: '', cnpj: '', email: '', whatsapp: '', contato: '', observacoes: '' }

function Modal({ empresa, onClose, onSaved }) {
  const [form, setForm] = useState(empresa ? { ...empresa, whatsapp: empresa.whatsapp || '' } : VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function salvar(e) {
    e.preventDefault()
    if (!form.nome.trim())     return setErro('Nome obrigatório')
    if (!form.email.trim())    return setErro('E-mail obrigatório')
    if (!form.whatsapp.trim()) return setErro('WhatsApp obrigatório')
    setSalvando(true); setErro('')
    try {
      const payload = { ...form, whatsapp: '55' + form.whatsapp.replace(/\D/g, '').replace(/^55/, '') }
      if (empresa) await api.patch(`/api/empresas/${empresa.id}`, payload)
      else         await api.post('/api/empresas', payload)
      onSaved()
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar.')
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-800">{empresa ? 'Editar Fornecedor' : 'Novo Fornecedor / Empresa'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={salvar} className="px-6 py-5 space-y-4">
          {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{erro}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social / Nome *</label>
            <input className={input} value={form.nome} onChange={set('nome')} placeholder="Transportadora XYZ Ltda" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input className={input} value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" maxLength={18} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contato (pessoa)</label>
              <input className={input} value={form.contato} onChange={set('contato')} placeholder="João Silva" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
            <input className={input} type="email" value={form.email} onChange={set('email')} placeholder="logistica@empresa.com.br" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp * <span className="text-gray-400 font-normal">(com DDD, sem +55)</span></label>
            <div className="flex">
              <span className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">+55</span>
              <input className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.whatsapp.replace(/^55/, '')} onChange={set('whatsapp')} placeholder="11 99999-9999" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea className={input} rows={2} value={form.observacoes} onChange={set('observacoes')} placeholder="Observações internas..." />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={salvando} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {salvando ? 'Salvando…' : empresa ? 'Salvar alterações' : 'Cadastrar empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Empresas() {
  const [empresas, setEmpresas] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(null) // null | 'novo' | empresa obj

  const carregar = () => {
    setCarregando(true)
    api.get('/api/empresas', { params: busca ? { busca } : {} })
      .then(({ data }) => setEmpresas(data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  async function desativar(id) {
    if (!confirm('Desativar esta empresa?')) return
    await api.delete(`/api/empresas/${id}`)
    carregar()
  }

  async function ativar(id) {
    await api.patch(`/api/empresas/${id}`, { ativo: true })
    carregar()
  }

  const filtradas = empresas.filter(e => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (e.nome + e.email + (e.cnpj || '') + (e.contato || '')).toLowerCase().includes(q)
  })

  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Fornecedores / Empresas</h1>
        </div>
        <button onClick={() => setModal('novo')}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova Empresa
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar por nome, e-mail, CNPJ ou contato…"
          value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {carregando ? (
        <div className="text-center py-16 text-gray-400">Carregando…</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nenhuma empresa encontrada.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtradas.map(e => (
            <div key={e.id} className={`bg-white rounded-xl border p-5 shadow-sm space-y-3 ${!e.ativo ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{e.nome}</h3>
                  {e.cnpj && <p className="text-xs text-gray-400">{fmtCNPJ(e.cnpj)}</p>}
                  {e.contato && <p className="text-xs text-gray-500 mt-0.5">Contato: {e.contato}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${e.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {e.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${e.email}`} className="hover:underline truncate">{e.email}</a>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <a href={`https://wa.me/${e.whatsapp}`} target="_blank" rel="noreferrer" className="hover:underline">{fmtWA(e.whatsapp)}</a>
                </div>
              </div>
              {e.observacoes && <p className="text-xs text-gray-400 italic">{e.observacoes}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal(e)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                {e.ativo ? (
                  <button onClick={() => desativar(e.id)}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 font-medium">
                    <Trash2 className="w-3.5 h-3.5" /> Desativar
                  </button>
                ) : (
                  <button onClick={() => ativar(e.id)}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium">
                    <Check className="w-3.5 h-3.5" /> Reativar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          empresa={modal === 'novo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); carregar() }}
        />
      )}
    </div>
  )
}
