import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'

const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function NovoAgendamento() {
  const nav = useNavigate()
  const [portarias, setPortarias] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [form, setForm] = useState({
    portariaId: '', departamento: '', pedidoInterno: '', observacoes: '',
    emailDestino: '', whatsappDestino: '', empresaId: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [linkGerado, setLinkGerado] = useState(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    api.get('/api/portarias').then(r => setPortarias(r.data))
    api.get('/api/empresas', { params: { ativo: true } }).then(r => setEmpresas(r.data)).catch(() => {})
  }, [])

  function handle(e) {
    const { name, value } = e.target
    if (name === 'empresaId') {
      const emp = empresas.find(e => e.id === value)
      setForm(f => ({
        ...f,
        empresaId: value,
        emailDestino:    emp ? emp.email    : f.emailDestino,
        whatsappDestino: emp ? emp.whatsapp : f.whatsappDestino,
      }))
    } else {
      setForm(f => ({ ...f, [name]: value }))
    }
  }

  async function gerar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const payload = { ...form }
      if (!payload.empresaId) delete payload.empresaId
      const { data } = await api.post('/api/agendamentos', payload)
      setLinkGerado(data.link)
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao gerar link')
    } finally {
      setSalvando(false)
    }
  }

  function copiar() {
    navigator.clipboard.writeText(linkGerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function enviarWhatsApp() {
    const msg = encodeURIComponent(
      `Olá! Para agendar a entrega, preencha os dados no link abaixo:\n${linkGerado}\n\nO link expira em 72 horas.`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  if (linkGerado) return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="text-4xl mb-3 text-center">🔗</div>
        <h1 className="text-xl font-bold text-gray-800 text-center mb-2">Link gerado com sucesso!</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Envie este link para a empresa fornecedora. O link expira em 72 horas.
        </p>
        <div className="bg-gray-50 border rounded-lg p-3 font-mono text-xs text-gray-700 break-all mb-4">
          {linkGerado}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={copiar}
            className="flex-1 border border-blue-700 text-blue-700 py-2 rounded-lg font-medium hover:bg-blue-50 transition">
            {copiado ? '✓ Copiado!' : 'Copiar link'}
          </button>
          <button onClick={enviarWhatsApp}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition">
            Enviar via WhatsApp
          </button>
        </div>
        <div className="flex gap-3 mt-3">
          <button onClick={() => nav('/admin/agendamentos')}
            className="flex-1 text-sm text-gray-500 hover:underline text-center py-2">
            Ver todos os agendamentos
          </button>
          <button onClick={() => setLinkGerado(null)}
            className="flex-1 text-sm text-blue-700 hover:underline text-center py-2">
            Gerar outro link
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Novo Agendamento de Carga</h1>
      <form onSubmit={gerar} className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Portaria *</label>
          <select name="portariaId" value={form.portariaId} onChange={handle} required className={inp}>
            <option value="">Selecione a portaria...</option>
            {portarias.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Departamento responsável *</label>
          <select name="departamento" value={form.departamento} onChange={handle} required className={inp}>
            <option value="">Selecione...</option>
            {['Compras','Vendas','Logística','Produção','Almoxarifado','Comercial','Outro'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Número do Pedido Interno</label>
          <input name="pedidoInterno" value={form.pedidoInterno} onChange={handle}
            placeholder="Ex: PED-2026-001" className={inp} />
        </div>

        {empresas.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor cadastrado</label>
            <select name="empresaId" value={form.empresaId} onChange={handle} className={inp}>
              <option value="">— Selecionar fornecedor (preenche e-mail e WhatsApp) —</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Ao selecionar, os campos abaixo serão preenchidos automaticamente.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail da empresa</label>
          <input name="emailDestino" value={form.emailDestino} onChange={handle} type="email"
            placeholder="contato@empresa.com.br" className={inp} />
          <p className="text-xs text-gray-400 mt-1">O link será enviado automaticamente por e-mail.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp da empresa</label>
          <input name="whatsappDestino" value={form.whatsappDestino} onChange={handle} type="tel"
            placeholder="(11) 99999-9999" className={inp} />
          <p className="text-xs text-gray-400 mt-1">O link será enviado via WhatsApp.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações para a empresa</label>
          <textarea name="observacoes" value={form.observacoes} onChange={handle} rows={3}
            placeholder="Instruções adicionais que aparecerão no formulário da empresa..."
            className={inp + ' resize-none'} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => nav('/admin/agendamentos')}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="flex-1 bg-blue-700 text-white py-2 rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50">
            {salvando ? 'Gerando...' : 'Gerar Link'}
          </button>
        </div>
      </form>
    </div>
  )
}
