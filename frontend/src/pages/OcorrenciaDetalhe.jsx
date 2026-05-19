import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, AlertCircle, CheckCircle, Image as ImageIcon,
  Video, Mic, FileText, ExternalLink, Phone, Users, Paperclip
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const STATUS_OPTS = [
  { val: 'aberta',      label: 'Aberta',       cls: 'bg-blue-100 text-blue-700' },
  { val: 'em_analise',  label: 'Em análise',   cls: 'bg-yellow-100 text-yellow-700' },
  { val: 'resolvida',   label: 'Resolvida',    cls: 'bg-green-100 text-green-700' },
  { val: 'encaminhada', label: 'Encaminhada',  cls: 'bg-purple-100 text-purple-700' },
  { val: 'arquivada',   label: 'Arquivada',    cls: 'bg-gray-100 text-gray-600' },
]

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function Section({ title, children }) {
  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value, span }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800 whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_OPTS.find(o => o.val === status) || STATUS_OPTS[0]
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
}

export default function OcorrenciaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const [oc, setOc]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [novoStatus, setNovoStatus] = useState('')
  const [atualizando, setAtualizando] = useState(false)
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get(`/api/ocorrencias/${id}`)
      .then(({ data }) => { setOc(data); setNovoStatus(data.status) })
      .catch(() => setError('Ocorrência não encontrada.'))
      .finally(() => setLoading(false))
  }, [id])

  async function atualizarStatus() {
    if (!novoStatus || novoStatus === oc.status) return
    setAtualizando(true)
    try {
      const { data } = await api.patch(`/api/ocorrencias/${id}`, { status: novoStatus })
      setOc(data)
      setSucesso('Status atualizado com sucesso!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao atualizar.')
    } finally {
      setAtualizando(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error && !oc) return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate(-1)} className="btn-secondary btn-sm"><ChevronLeft className="w-4 h-4" /> Voltar</button>
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-4 text-sm flex gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
      </div>
    </div>
  )

  if (!oc) return null
  const envolvidos   = Array.isArray(oc.envolvidos)   ? oc.envolvidos   : []
  const testemunhas  = Array.isArray(oc.testemunhas)  ? oc.testemunhas  : []
  const acionamentos = Array.isArray(oc.acionamentos) ? oc.acionamentos : []
  const anexos       = Array.isArray(oc.anexos)       ? oc.anexos       : []

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/ocorrencias')} className="btn-secondary btn-sm">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ocorrência</h1>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{oc.protocolo}</p>
          </div>
        </div>
        <StatusBadge status={oc.status} />
      </div>

      {sucesso && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />{sucesso}
        </div>
      )}

      {/* Identificação */}
      <Section title="Identificação">
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Categoria"   value={oc.categoria} />
          <Field label="Tipo"        value={oc.tipo} />
          <Field label="Local"       value={oc.local} />
          <Field label="Data / Hora" value={fmt(oc.dataHora)} />
          <Field label="Registrado por"  value={oc.registradoPor?.nome} />
          <Field label="Registrado em"   value={fmt(oc.criadoEm)} />
        </dl>
      </Section>

      {/* Descrição */}
      <Section title="Descrição do fato">
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{oc.descricao}</p>
      </Section>

      {/* Envolvidos */}
      {envolvidos.length > 0 && (
        <Section title={`Envolvidos (${envolvidos.length})`}>
          <div className="space-y-3">
            {envolvidos.map((e, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Envolvido {i+1}</p>
                <dl className="grid grid-cols-2 gap-2">
                  <Field label="Nome"    value={e.nome} />
                  <Field label="CPF"     value={e.cpf} />
                  <Field label="Função"  value={e.funcao} />
                  <Field label="Empresa" value={e.empresa} />
                  {e.contato && <Field label="Contato" value={e.contato} span />}
                </dl>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Testemunhas */}
      {testemunhas.length > 0 && (
        <Section title={`Testemunhas (${testemunhas.length})`}>
          <div className="space-y-3">
            {testemunhas.map((t, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Testemunha {i+1}</p>
                <dl className="grid grid-cols-2 gap-2">
                  <Field label="Nome"     value={t.nome} />
                  <Field label="Contato"  value={t.contato} />
                  {t.observacao && <Field label="Relato" value={t.observacao} span />}
                </dl>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Acionamentos */}
      {acionamentos.length > 0 && (
        <Section title={`Acionamentos (${acionamentos.length})`}>
          <div className="space-y-3">
            {acionamentos.map((a, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-red-500" />
                  <p className="text-sm font-semibold text-gray-800">{a.servico}</p>
                </div>
                <dl className="grid grid-cols-2 gap-2">
                  <Field label="Acionado às"  value={a.horarioAcionamento} />
                  <Field label="Chegada às"   value={a.horarioChegada} />
                  <Field label="Protocolo/BO" value={a.protocolo} />
                  <Field label="Viatura"      value={a.viatura} />
                </dl>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Danos e Providências */}
      {(oc.danosMateriais || oc.estimativaDanos || oc.providencias) && (
        <Section title="Danos e providências">
          <dl className="space-y-3">
            {oc.danosMateriais  && <Field label="Danos materiais"          value={oc.danosMateriais} span />}
            {oc.estimativaDanos && <Field label="Estimativa de danos"      value={`R$ ${Number(oc.estimativaDanos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} span />}
            {oc.providencias    && <Field label="Providências tomadas"     value={oc.providencias} span />}
          </dl>
        </Section>
      )}

      {/* Anexos */}
      {anexos.length > 0 && (
        <Section title={`Anexos (${anexos.length})`}>
          <div className="space-y-2">
            {anexos.map((a, i) => (
              <div key={i} className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5">
                {a.tipo === 'foto'      && <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                {a.tipo === 'video'     && <Video className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                {a.tipo === 'audio'     && <Mic className="w-4 h-4 text-green-500 flex-shrink-0" />}
                {a.tipo === 'documento' && <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                {!a.tipo               && <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-sm text-blue-600 underline truncate">{a.nome}</a>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              </div>
            ))}
            {/* Thumbnails para fotos */}
            {anexos.some(a => a.tipo === 'foto') && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {anexos.filter(a => a.tipo === 'foto').map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                    <img src={a.url} alt={a.nome} className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Atualizar status */}
      {hasRole('supervisor') && (
        <Section title="Atualizar status">
          <div className="flex gap-3 flex-wrap">
            {STATUS_OPTS.map(s => (
              <button key={s.val} type="button" onClick={() => setNovoStatus(s.val)}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${novoStatus === s.val ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                {s.label}
              </button>
            ))}
          </div>
          {novoStatus !== oc.status && (
            <button onClick={atualizarStatus} disabled={atualizando}
              className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold">
              {atualizando ? 'Salvando...' : 'Salvar status'}
            </button>
          )}
        </Section>
      )}
    </div>
  )
}
