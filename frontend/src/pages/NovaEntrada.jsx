import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ChevronLeft, CheckCircle, AlertCircle, UserPlus } from 'lucide-react'
import api from '../api/client'
import AnexosInput from '../components/AnexosInput'

function formatCPF(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatPlaca(value) {
  const v = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
  // Mercosul: ABC1D23 — 3 letters + 1 digit + 1 letter + 2 digits
  // Old: ABC1234 — 3 letters + 4 digits
  if (v.length <= 3) return v
  if (v.length <= 7) return v.slice(0, 3) + '-' + v.slice(3)
  return v
}

function InputError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

export default function NovaEntrada() {
  const navigate = useNavigate()
  const [portarias, setPortarias] = useState([])
  const [temAjudante, setTemAjudante] = useState(false)
  const [obsAnexos, setObsAnexos] = useState([])
  const [success, setSuccess] = useState('')
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      portariaId: '',
      nomeMotorista: '',
      cpfMotorista: '',
      telefoneMotorista: '',
      placa: '',
      tipoVeiculo: '',
      empresa: '',
      notaFiscal: '',
      tipoOperacao: '',
      tipoMaterial: '',
      tipoEmbalagem: '',
      quantidade: '',
      obsMaterial: '',
      obsGeral: '',
      nomeAjudante: '',
      cpfAjudante: '',
      telefoneAjudante: '',
      rgAjudante: '',
      setorDestino: '',
      falarCom: '',
      autorizadoPor: '',
    },
  })

  useEffect(() => {
    api
      .get('/api/portarias')
      .then(({ data }) => setPortarias(data))
      .catch(() => setPortarias([]))
  }, [])

  const portariaId = watch('portariaId')
  const tipoOperacao = watch('tipoOperacao')
  const portariaSelecionada = portarias.find(p => p.id === portariaId)
  const isPedestre = portariaSelecionada?.tipo === 'pedestres'
  const isColeta = tipoOperacao?.toLowerCase() === 'coleta'

  const handleCPFMotorista = (e) => {
    setValue('cpfMotorista', formatCPF(e.target.value), { shouldValidate: false })
  }

  const handleCPFAjudante = (e) => {
    setValue('cpfAjudante', formatCPF(e.target.value), { shouldValidate: false })
  }

  const handlePlaca = (e) => {
    setValue('placa', formatPlaca(e.target.value), { shouldValidate: false })
  }

  const prefixTel = (v) => {
    const d = (v || '').replace(/\D/g, '')
    return d ? '55' + d : ''
  }

  const onSubmit = async (formData) => {
    setServerError('')
    setSuccess('')
    try {
      const payload = { ...formData, temAjudante, obsAnexos }
      if (payload.telefoneMotorista) payload.telefoneMotorista = prefixTel(payload.telefoneMotorista)
      if (!temAjudante) {
        ;['nomeAjudante', 'cpfAjudante', 'telefoneAjudante', 'rgAjudante'].forEach(k => delete payload[k])
      } else if (payload.telefoneAjudante) {
        payload.telefoneAjudante = prefixTel(payload.telefoneAjudante)
      }

      const { data } = await api.post('/api/registros', payload)
      setSuccess(`Entrada registrada com sucesso! Protocolo: ${data.protocolo || data.id}`)
      reset()
      setTemAjudante(false)
      setObsAnexos([])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Erro ao registrar entrada. Verifique os dados e tente novamente.'
      setServerError(msg)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary btn-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Entrada</h1>
          <p className="text-sm text-gray-500">
            {isPedestre ? 'Registro de entrada de visitante' : 'Registro de entrada de veículo'}
          </p>
        </div>
      </div>

      {success && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {serverError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Portaria */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">
            Portaria
          </h2>
          <div>
            <label className="label" htmlFor="portariaId">
              Portaria <span className="text-red-500">*</span>
            </label>
            <select
              id="portariaId"
              className={`input ${errors.portariaId ? 'border-red-400' : ''}`}
              {...register('portariaId', { required: 'Selecione a portaria' })}
            >
              <option value="">Selecione a portaria…</option>
              {portarias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.numero ? `${p.numero} — ` : ''}{p.nome}
                </option>
              ))}
            </select>
            <InputError message={errors.portariaId?.message} />
          </div>
        </div>

        {/* Motorista / Visitante */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">
            {isPedestre ? 'Visitante' : 'Motorista'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="nomeMotorista">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                id="nomeMotorista"
                type="text"
                className={`input ${errors.nomeMotorista ? 'border-red-400' : ''}`}
                placeholder="Nome completo"
                {...register('nomeMotorista', { required: isPedestre ? 'Informe o nome do visitante' : 'Informe o nome do motorista' })}
              />
              <InputError message={errors.nomeMotorista?.message} />
            </div>

            <div>
              <label className="label" htmlFor="cpfMotorista">
                CPF <span className="text-red-500">*</span>
              </label>
              <input
                id="cpfMotorista"
                type="text"
                className={`input ${errors.cpfMotorista ? 'border-red-400' : ''}`}
                placeholder="000.000.000-00"
                maxLength={14}
                {...register('cpfMotorista', { required: 'Informe o CPF do motorista' })}
                onChange={handleCPFMotorista}
              />
              <InputError message={errors.cpfMotorista?.message} />
            </div>

            <div>
              <label className="label" htmlFor="telefoneMotorista">
                Telefone
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-sm text-gray-600 font-medium select-none">+55</span>
                <input
                  id="telefoneMotorista"
                  type="tel"
                  className="input rounded-l-none flex-1"
                  placeholder="11 99999-9999"
                  {...register('telefoneMotorista')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Veículo (apenas transportes) */}
        {!isPedestre && (
          <div className="card p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">
              Veículo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="placa">
                  Placa <span className="text-red-500">*</span>
                </label>
                <input
                  id="placa"
                  type="text"
                  className={`input font-mono uppercase ${errors.placa ? 'border-red-400' : ''}`}
                  placeholder="ABC-1234"
                  maxLength={8}
                  {...register('placa', { required: !isPedestre ? 'Informe a placa' : false })}
                  onChange={handlePlaca}
                />
                <InputError message={errors.placa?.message} />
              </div>

              <div>
                <label className="label" htmlFor="tipoVeiculo">
                  Tipo de Veículo <span className="text-red-500">*</span>
                </label>
                <select
                  id="tipoVeiculo"
                  className={`input ${errors.tipoVeiculo ? 'border-red-400' : ''}`}
                  {...register('tipoVeiculo', { required: !isPedestre ? 'Selecione o tipo de veículo' : false })}
                >
                  <option value="">Selecione…</option>
                  <option value="Caminhão">Caminhão</option>
                  <option value="Carreta">Carreta</option>
                  <option value="Van">Van</option>
                  <option value="Carro">Carro</option>
                  <option value="Moto">Moto</option>
                  <option value="Outro">Outro</option>
                </select>
                <InputError message={errors.tipoVeiculo?.message} />
              </div>
            </div>
          </div>
        )}

        {/* Destino (apenas pedestres) */}
        {isPedestre && (
          <div className="card p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">
              Destino
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="setorDestino">
                  Setor / Departamento destino
                </label>
                <input
                  id="setorDestino"
                  type="text"
                  className="input"
                  placeholder="Ex: RH, Financeiro, Produção…"
                  maxLength={150}
                  {...register('setorDestino')}
                />
              </div>

              <div>
                <label className="label" htmlFor="falarCom">
                  Falar com
                </label>
                <input
                  id="falarCom"
                  type="text"
                  className="input"
                  placeholder="Nome da pessoa ou ramal"
                  maxLength={150}
                  {...register('falarCom')}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="autorizadoPor">
                  Entrada autorizada por
                </label>
                <input
                  id="autorizadoPor"
                  type="text"
                  className="input"
                  placeholder="Nome de quem autorizou a entrada"
                  maxLength={150}
                  {...register('autorizadoPor')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Operação */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">
            Operação
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="empresa">
                Empresa
              </label>
              <input
                id="empresa"
                type="text"
                className="input"
                placeholder="Nome da empresa"
                {...register('empresa')}
              />
            </div>

            {!isPedestre && (
              <div>
                <label className="label" htmlFor="notaFiscal">
                  Nota Fiscal
                </label>
                <input
                  id="notaFiscal"
                  type="text"
                  className="input"
                  placeholder="Número da NF"
                  maxLength={50}
                  {...register('notaFiscal')}
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="tipoOperacao">
                Tipo de Operação <span className="text-red-500">*</span>
              </label>
              <select
                id="tipoOperacao"
                className={`input ${errors.tipoOperacao ? 'border-red-400' : ''}`}
                {...register('tipoOperacao', { required: 'Selecione o tipo de operação' })}
              >
                <option value="">Selecione…</option>
                {isPedestre ? (
                  <>
                    <option value="Visita">Visita</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Prestação de Serviço">Prestação de Serviço</option>
                    <option value="Entrevista">Entrevista</option>
                    <option value="Outros">Outros</option>
                  </>
                ) : (
                  <>
                    <option value="Entrega">Entrega</option>
                    <option value="Coleta">Coleta</option>
                    <option value="Prestação de Serviço">Prestação de Serviço</option>
                    <option value="Outros">Outros</option>
                  </>
                )}
              </select>
              <InputError message={errors.tipoOperacao?.message} />
            </div>

            {!isPedestre && (
              <>
                <div>
                  <label className="label" htmlFor="tipoMaterial">
                    Tipo de Material
                  </label>
                  <select
                    id="tipoMaterial"
                    className="input"
                    {...register('tipoMaterial')}
                  >
                    <option value="">Selecione…</option>
                    <option value="Embalagem">Embalagem</option>
                    <option value="Matéria Prima">Matéria Prima</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="tipoEmbalagem">
                    Tipo de Embalagem
                  </label>
                  <select
                    id="tipoEmbalagem"
                    className="input"
                    {...register('tipoEmbalagem')}
                  >
                    <option value="">Selecione…</option>
                    <option value="Paletes">Paletes</option>
                    <option value="Caixas">Caixas</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="quantidade">
                    Quantidade
                  </label>
                  <input
                    id="quantidade"
                    type="number"
                    min="1"
                    className="input"
                    placeholder="Ex: 10"
                    {...register('quantidade', { min: { value: 1, message: 'Mínimo 1' } })}
                  />
                  <InputError message={errors.quantidade?.message} />
                </div>

                <div className="sm:col-span-2">
                  <label className="label" htmlFor="obsMaterial">
                    Observação do Material
                  </label>
                  <input
                    id="obsMaterial"
                    type="text"
                    className="input"
                    placeholder="Detalhes sobre o material"
                    maxLength={500}
                    {...register('obsMaterial')}
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="label" htmlFor="obsGeral">
                Observação Geral
              </label>
              <textarea
                id="obsGeral"
                rows={3}
                className="input resize-none"
                placeholder="Informações adicionais…"
                maxLength={2000}
                {...register('obsGeral')}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Fotos e Arquivos da Observação</label>
              <AnexosInput value={obsAnexos} onChange={setObsAnexos} />
            </div>
          </div>
        </div>

        {/* Ajudante (apenas transportes) */}
        {!isPedestre && <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Ajudante</h2>
            <button
              type="button"
              onClick={() => setTemAjudante((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 ${
                temAjudante ? 'bg-primary-700' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={temAjudante}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  temAjudante ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {temAjudante && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="nomeAjudante">
                  Nome do Ajudante <span className="text-red-500">*</span>
                </label>
                <input
                  id="nomeAjudante"
                  type="text"
                  className={`input ${errors.nomeAjudante ? 'border-red-400' : ''}`}
                  placeholder="Nome completo"
                  {...register('nomeAjudante', {
                    required: temAjudante ? 'Informe o nome do ajudante' : false,
                  })}
                />
                <InputError message={errors.nomeAjudante?.message} />
              </div>

              <div>
                <label className="label" htmlFor="cpfAjudante">
                  CPF do Ajudante
                </label>
                <input
                  id="cpfAjudante"
                  type="text"
                  className="input"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  {...register('cpfAjudante')}
                  onChange={handleCPFAjudante}
                />
              </div>

              <div>
                <label className="label" htmlFor="rgAjudante">
                  RG do Ajudante
                </label>
                <input
                  id="rgAjudante"
                  type="text"
                  className="input"
                  placeholder="Número do RG"
                  {...register('rgAjudante')}
                />
              </div>

              <div>
                <label className="label" htmlFor="telefoneAjudante">
                  Telefone do Ajudante
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-sm text-gray-600 font-medium select-none">+55</span>
                  <input
                    id="telefoneAjudante"
                    type="tel"
                    className="input rounded-l-none flex-1"
                    placeholder="11 99999-9999"
                    {...register('telefoneAjudante')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-accent px-6">
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registrando…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Registrar Entrada
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
