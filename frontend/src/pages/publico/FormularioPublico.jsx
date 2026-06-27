import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const TIPOS_VEICULO = ['Truck', 'Toco', 'VUC', 'Bitrem', 'Rodotrem', 'Furgão', 'Utilitário', 'Outro']

export default function FormularioPublico() {
  const { token } = useParams()
  const [agendamento, setAgendamento] = useState(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [nfArquivo, setNfArquivo] = useState(null)
  const [form, setForm] = useState({
    empresa: '', cnpj: '', motorista: '', cpfMotorista: '',
    placa: '', tipoVeiculo: '', numeroNF: '', valorNF: '',
    dataEntrega: '', horarioPref: '', observacoes: '',
  })

  useEffect(() => {
    axios.get(`/api/publico/agendamento/${token}`)
      .then(r => setAgendamento(r.data))
      .catch(e => setErro(e.response?.data?.error || 'Link inválido ou expirado'))
      .finally(() => setCarregando(false))
  }, [token])

  function handle(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (nfArquivo) fd.append('nfArquivo', nfArquivo)
      const { data } = await axios.post(`/api/publico/agendamento/${token}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setQrCode(data.qrCode)
      setConcluido(true)
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-500">Carregando...</div>
    </div>
  )

  if (erro) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h1>
        <p className="text-gray-600">{erro}</p>
        <p className="mt-4 text-sm text-gray-400">Entre em contato com o responsável pelo agendamento.</p>
      </div>
    </div>
  )

  if (concluido) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Dados enviados com sucesso!</h1>
        <p className="text-gray-600 mb-6">
          Guarde o QR Code abaixo. O motorista deverá apresentá-lo na portaria no dia da entrega.
        </p>
        {qrCode && (
          <div className="flex flex-col items-center gap-4">
            <img src={qrCode} alt="QR Code" className="border-2 border-gray-200 rounded-lg w-64 h-64" />
            <a
              href={qrCode}
              download="qrcode-agendamento.png"
              className="bg-blue-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-800 transition"
            >
              Baixar QR Code
            </a>
          </div>
        )}
        <p className="mt-6 text-xs text-gray-400">
          A portaria será notificada automaticamente quando este agendamento for aprovado internamente.
        </p>
      </div>
    </div>
  )

  const dtMin = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-blue-700 text-white rounded-xl p-6 mb-6">
          <h1 className="text-2xl font-bold mb-1">Agendamento de Entrega</h1>
          <p className="text-blue-100 text-sm">
            {agendamento?.portaria?.nome} — {agendamento?.departamento}
            {agendamento?.pedidoInterno && ` · Pedido ${agendamento.pedidoInterno}`}
          </p>
          {agendamento?.observacoes && (
            <p className="mt-2 text-blue-200 text-sm">{agendamento.observacoes}</p>
          )}
        </div>

        <form onSubmit={enviar} className="bg-white rounded-xl shadow p-6 space-y-6">
          <section>
            <h2 className="font-semibold text-gray-700 mb-3">Dados da Empresa</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Razão Social *</label>
                <input name="empresa" value={form.empresa} onChange={handle} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">CNPJ</label>
                <input name="cnpj" value={form.cnpj} onChange={handle} placeholder="00.000.000/0000-00"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-gray-700 mb-3">Dados do Motorista e Veículo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nome do Motorista *</label>
                <input name="motorista" value={form.motorista} onChange={handle} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">CPF do Motorista *</label>
                <input name="cpfMotorista" value={form.cpfMotorista} onChange={handle} required placeholder="000.000.000-00"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Placa *</label>
                <input name="placa" value={form.placa} onChange={handle} required placeholder="ABC-1234"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tipo de Veículo *</label>
                <select name="tipoVeiculo" value={form.tipoVeiculo} onChange={handle} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-gray-700 mb-3">Nota Fiscal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Número da NF *</label>
                <input name="numeroNF" value={form.numeroNF} onChange={handle} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Valor da NF (R$)</label>
                <input name="valorNF" value={form.valorNF} onChange={handle} type="number" step="0.01" min="0" placeholder="0,00"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Arquivo da NF (PDF, XML, imagem — máx. 10MB)</label>
                <input type="file" accept=".pdf,.xml,.jpg,.jpeg,.png"
                  onChange={e => setNfArquivo(e.target.files[0])}
                  className="w-full border rounded-lg px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-gray-700 mb-3">Previsão de Entrega</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data prevista *</label>
                <input name="dataEntrega" value={form.dataEntrega} onChange={handle} required type="date" min={dtMin}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Horário preferencial *</label>
                <input name="horarioPref" value={form.horarioPref} onChange={handle} required type="time"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Observações</label>
                <textarea name="observacoes" value={form.observacoes} onChange={handle} rows={3}
                  placeholder="Informações adicionais sobre a carga, acessos especiais, etc."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </section>

          <button type="submit" disabled={enviando}
            className="w-full bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50">
            {enviando ? 'Enviando...' : 'Confirmar Agendamento e Gerar QR Code'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Este link é de uso único e exclusivo para este agendamento.
        </p>
      </div>
    </div>
  )
}
