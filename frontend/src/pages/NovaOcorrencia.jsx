import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Check, HardHat, Shield, Users, Car,
  Wrench, Globe, AlertTriangle, Heart, MoreHorizontal, Plus, Trash2,
  Phone, FileText, Image as ImageIcon, Mic, Video, X, Upload
} from 'lucide-react'
import api from '../api/client'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || 'https://yshvniyhtnyhnjcecbft.supabase.co'
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaHZuaXlodG55aG5qY2VjYmZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDcyMTMsImV4cCI6MjA5MjI4MzIxM30.0tYb9047OInZtAW3SAi2zS-m7sudE3Ui-HjZxIfj87c'
const BUCKET = 'fotos-saida'

const CATEGORIAS = [
  { label: 'Segurança do Trabalho', icon: HardHat,       cor: 'yellow', tipos: ['Acidente de trabalho','Quase-acidente (near miss)','EPI não utilizado','Condição insegura','Incêndio / Explosão','Derramamento de produto químico','Outro'] },
  { label: 'Segurança Patrimonial', icon: Shield,         cor: 'red',    tipos: ['Furto interno','Roubo','Invasão de área','Vandalismo','Acesso não autorizado','Suspeito na área','Outro'] },
  { label: 'Conflitos Internos',    icon: Users,          cor: 'orange', tipos: ['Briga entre funcionários','Assédio moral','Assédio sexual','Desobediência a normas','Ameaça','Outro'] },
  { label: 'Veículos e Estacionamento', icon: Car,        cor: 'blue',   tipos: ['Acidente de veículo na área','Veículo danificado','Veículo abandonado','Bloqueio de acesso','Furto de veículo','Outro'] },
  { label: 'Infraestrutura',        icon: Wrench,         cor: 'gray',   tipos: ['Falta de energia','Vazamento de água / gás','Problema elétrico','Equipamento danificado','Elevador com defeito','Ar-condicionado','Outro'] },
  { label: 'Ocorrências Externas',  icon: Globe,          cor: 'purple', tipos: ['Manifestação / Greve','Acidente na via pública','Problema com vizinho','Desastre natural','Outro'] },
  { label: 'Danos ao Patrimônio',   icon: AlertTriangle,  cor: 'red',    tipos: ['Quebra de equipamento','Dano em instalação','Pichação / Depredação','Incêndio em propriedade','Outro'] },
  { label: 'Saúde / Mal-estar',     icon: Heart,          cor: 'pink',   tipos: ['Mal-estar de funcionário','Intoxicação','Acidente com lesão','Crise epiléptica','Parada cardiorrespiratória','Outro'] },
  { label: 'Outras Ocorrências',    icon: MoreHorizontal, cor: 'slate',  tipos: ['Ocorrência não categorizada','Outro'] },
]

const COR_MAP = {
  yellow: { bg: 'bg-yellow-50 border-yellow-300',  icon: 'text-yellow-600', active: 'bg-yellow-500 border-yellow-500 text-white' },
  red:    { bg: 'bg-red-50 border-red-300',         icon: 'text-red-600',    active: 'bg-red-500 border-red-500 text-white' },
  orange: { bg: 'bg-orange-50 border-orange-300',   icon: 'text-orange-600', active: 'bg-orange-500 border-orange-500 text-white' },
  blue:   { bg: 'bg-blue-50 border-blue-300',       icon: 'text-blue-600',   active: 'bg-blue-600 border-blue-600 text-white' },
  gray:   { bg: 'bg-gray-50 border-gray-300',       icon: 'text-gray-600',   active: 'bg-gray-600 border-gray-600 text-white' },
  purple: { bg: 'bg-purple-50 border-purple-300',   icon: 'text-purple-600', active: 'bg-purple-600 border-purple-600 text-white' },
  pink:   { bg: 'bg-pink-50 border-pink-300',       icon: 'text-pink-600',   active: 'bg-pink-500 border-pink-500 text-white' },
  slate:  { bg: 'bg-slate-50 border-slate-300',     icon: 'text-slate-600',  active: 'bg-slate-600 border-slate-600 text-white' },
}

const SERVICOS = ['SAMU','Bombeiros','Polícia Militar','Guarda Municipal','Defesa Civil','Concessionária','Manutenção Interna','Outro']

const STEPS = [
  'Categoria e Tipo',
  'Local e Horário',
  'Descrição',
  'Envolvidos',
  'Testemunhas',
  'Acionamentos',
  'Danos e Providências',
  'Anexos',
  'Revisão',
]

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function envolvido() { return { nome: '', cpf: '', funcao: '', empresa: '', contato: '' } }
function testemunha() { return { nome: '', contato: '', observacao: '' } }
function acionamento() { return { servico: '', horarioAcionamento: '', horarioChegada: '', protocolo: '', viatura: '' } }

async function uploadAnexo(file) {
  const ext  = file.name.split('.').pop() || 'bin'
  const nome = `ocorrencias/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${nome}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!resp.ok) throw new Error(`Upload falhou: ${resp.status}`)
  return {
    nome: file.name,
    url:  `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${nome}`,
    tipo: file.type.startsWith('image/') ? 'foto' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'documento',
  }
}

export default function NovaOcorrencia() {
  const navigate = useNavigate()
  const anexoRef = useRef(null)

  const [step, setStep]           = useState(0)
  const [categoria, setCategoria] = useState(null)
  const [tipo, setTipo]           = useState('')
  const [local, setLocal]         = useState('')
  const [dataHora, setDataHora]   = useState(() => {
    const now = new Date()
    now.setSeconds(0, 0)
    return now.toISOString().slice(0, 16)
  })
  const [descricao, setDescricao]     = useState('')
  const [envolvidos, setEnvolvidos]   = useState([])
  const [testemunhas, setTestemunhas] = useState([])
  const [acionamentos, setAcionamentos] = useState([])
  const [danosMateriais, setDanosMateriais]     = useState('')
  const [estimativaDanos, setEstimativaDanos]   = useState('')
  const [providencias, setProvidencias]         = useState('')
  const [anexos, setAnexos]           = useState([])
  const [status, setStatus]           = useState('aberta')
  const [enviando, setEnviando]       = useState(false)
  const [erroAnexo, setErroAnexo]     = useState('')
  const [erroStep, setErroStep]       = useState('')
  const [uploadando, setUploadando]   = useState(false)

  const catInfo = CATEGORIAS.find(c => c.label === categoria)

  function validarStep() {
    if (step === 0 && !categoria) return 'Selecione uma categoria'
    if (step === 0 && !tipo)      return 'Selecione o tipo de ocorrência'
    if (step === 1 && !local.trim())  return 'Informe o local da ocorrência'
    if (step === 2 && !descricao.trim()) return 'Descreva o fato ocorrido'
    return ''
  }

  function avancar() {
    const err = validarStep()
    if (err) { setErroStep(err); return }
    setErroStep('')
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function voltar() {
    setErroStep('')
    setStep(s => Math.max(s - 1, 0))
  }

  // --- Envolvidos ---
  function addEnvolvido() { setEnvolvidos(v => [...v, envolvido()]) }
  function setEnvField(i, k, v) { setEnvolvidos(arr => arr.map((e, idx) => idx === i ? { ...e, [k]: v } : e)) }
  function removeEnv(i) { setEnvolvidos(arr => arr.filter((_, idx) => idx !== i)) }

  // --- Testemunhas ---
  function addTestemunha() { setTestemunhas(v => [...v, testemunha()]) }
  function setTestField(i, k, v) { setTestemunhas(arr => arr.map((t, idx) => idx === i ? { ...t, [k]: v } : t)) }
  function removeTest(i) { setTestemunhas(arr => arr.filter((_, idx) => idx !== i)) }

  // --- Acionamentos ---
  function addAcionamento() { setAcionamentos(v => [...v, acionamento()]) }
  function setAcField(i, k, v) { setAcionamentos(arr => arr.map((a, idx) => idx === i ? { ...a, [k]: v } : a)) }
  function removeAc(i) { setAcionamentos(arr => arr.filter((_, idx) => idx !== i)) }

  // --- Anexos ---
  async function handleAnexos(files) {
    if (!files?.length) return
    setErroAnexo(''); setUploadando(true)
    const novos = []
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) { setErroAnexo(`Arquivo ${file.name} excede 50 MB`); continue }
      try {
        novos.push(await uploadAnexo(file))
      } catch (e) {
        setErroAnexo(e.message)
      }
    }
    if (novos.length) setAnexos(v => [...v, ...novos])
    setUploadando(false)
    if (anexoRef.current) anexoRef.current.value = ''
  }

  async function salvar() {
    setEnviando(true)
    try {
      const { data } = await api.post('/api/ocorrencias', {
        categoria, tipo, local, dataHora, descricao,
        envolvidos, testemunhas, acionamentos,
        danosMateriais, estimativaDanos: estimativaDanos || null,
        providencias, anexos, status,
      })
      navigate(`/ocorrencias/${data.id}`)
    } catch (e) {
      setErroStep(e.response?.data?.error || 'Erro ao salvar ocorrência.')
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/ocorrencias')} className="btn-secondary btn-sm">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nova Ocorrência</h1>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Etapa {step + 1} de {STEPS.length}</span>
          <span className="text-sm text-gray-400">{STEPS[step]}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${i === step ? 'bg-blue-100 text-blue-700 font-semibold' : i < step ? 'bg-green-100 text-green-700' : 'text-gray-400'}`}>
              {i < step ? <Check className="w-3 h-3 inline" /> : i + 1} {i === step || i < step ? s : ''}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 mb-4">
        {erroStep && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{erroStep}</div>
        )}

        {/* STEP 0 — Categoria e Tipo */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">Qual é a categoria da ocorrência?</h2>
              <p className="text-sm text-gray-400 mb-3">Escolha a categoria que melhor descreve o evento.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CATEGORIAS.map(cat => {
                  const c = COR_MAP[cat.cor]
                  const ativo = categoria === cat.label
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => { setCategoria(cat.label); setTipo('') }}
                      className={`flex items-center gap-3 border-2 rounded-xl p-3 text-left transition-all ${ativo ? c.active : c.bg + ' hover:opacity-80'}`}
                    >
                      <cat.icon className={`w-5 h-5 flex-shrink-0 ${ativo ? 'text-white' : c.icon}`} />
                      <span className={`text-sm font-medium ${ativo ? 'text-white' : 'text-gray-800'}`}>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {categoria && (
              <div>
                <h2 className="text-base font-semibold text-gray-800 mb-1">Qual é o tipo específico?</h2>
                <p className="text-sm text-gray-400 mb-3">Selecione o tipo dentro da categoria <strong>{categoria}</strong>.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {catInfo.tipos.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`flex items-center gap-2 border-2 rounded-xl p-3 text-left transition-all ${tipo === t ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 hover:border-blue-300 text-gray-700'}`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tipo === t ? 'bg-white' : 'bg-gray-300'}`} />
                      <span className="text-sm font-medium">{t}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 1 — Local e Horário */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">Onde e quando ocorreu?</h2>
              <p className="text-sm text-gray-400 mb-4">Informe o local exato e o horário da ocorrência.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Local da ocorrência <span className="text-red-500">*</span></label>
              <input className={inp} placeholder="Ex: Portaria 1, Estacionamento, Corredor B, Refeitório..." value={local} onChange={e => setLocal(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Seja específico: setor, andar, corredor, área externa, etc.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data e horário da ocorrência <span className="text-red-500">*</span></label>
              <input type="datetime-local" className={inp} value={dataHora} onChange={e => setDataHora(e.target.value)} />
            </div>
          </div>
        )}

        {/* STEP 2 — Descrição */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">Descreva o fato detalhadamente</h2>
              <p className="text-sm text-gray-400 mb-4">Relate o que aconteceu, como aconteceu e quaisquer outras informações relevantes. Seja o mais detalhado possível.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição completa <span className="text-red-500">*</span></label>
              <textarea
                className={inp + ' h-48 resize-none'}
                placeholder="Descreva o ocorrido com o máximo de detalhes: o que aconteceu, como, sequência de eventos, condições no momento, etc."
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                maxLength={5000}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{descricao.length}/5000</p>
            </div>
          </div>
        )}

        {/* STEP 3 — Envolvidos */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">Pessoas envolvidas na ocorrência</h2>
              <p className="text-sm text-gray-400 mb-4">Adicione todos que participaram diretamente da ocorrência (vítimas, autores, etc.).</p>
            </div>
            {envolvidos.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                Nenhum envolvido adicionado.<br />Se não houver envolvidos identificados, avance para a próxima etapa.
              </div>
            )}
            {envolvidos.map((e, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3 relative">
                <button type="button" onClick={() => removeEnv(i)} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Envolvido {i + 1}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Nome completo <span className="text-red-500">*</span></label>
                    <input className={inp} placeholder="Nome" value={e.nome} onChange={ev => setEnvField(i,'nome',ev.target.value)} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                    <input className={inp} placeholder="000.000.000-00" value={e.cpf} onChange={ev => setEnvField(i,'cpf',ev.target.value)} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Função / Cargo</label>
                    <input className={inp} placeholder="Ex: Motorista, Operador..." value={e.funcao} onChange={ev => setEnvField(i,'funcao',ev.target.value)} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
                    <input className={inp} placeholder="Empresa" value={e.empresa} onChange={ev => setEnvField(i,'empresa',ev.target.value)} /></div>
                  <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Contato (telefone/e-mail)</label>
                    <input className={inp} placeholder="Contato" value={e.contato} onChange={ev => setEnvField(i,'contato',ev.target.value)} /></div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addEnvolvido}
              className="flex items-center gap-2 w-full justify-center border-2 border-dashed border-blue-300 rounded-xl py-3 text-blue-600 hover:bg-blue-50 text-sm font-medium">
              <Plus className="w-4 h-4" /> Adicionar envolvido
            </button>
          </div>
        )}

        {/* STEP 4 — Testemunhas */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">Testemunhas</h2>
              <p className="text-sm text-gray-400 mb-4">Adicione as pessoas que presenciaram a ocorrência.</p>
            </div>
            {testemunhas.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                Nenhuma testemunha adicionada.<br />Se não houver testemunhas, avance para a próxima etapa.
              </div>
            )}
            {testemunhas.map((t, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3 relative">
                <button type="button" onClick={() => removeTest(i)} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Testemunha {i + 1}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Nome completo <span className="text-red-500">*</span></label>
                    <input className={inp} placeholder="Nome" value={t.nome} onChange={ev => setTestField(i,'nome',ev.target.value)} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Contato</label>
                    <input className={inp} placeholder="Telefone ou e-mail" value={t.contato} onChange={ev => setTestField(i,'contato',ev.target.value)} /></div>
                  <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                    <input className={inp} placeholder="O que a testemunha relatou..." value={t.observacao} onChange={ev => setTestField(i,'observacao',ev.target.value)} /></div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addTestemunha}
              className="flex items-center gap-2 w-full justify-center border-2 border-dashed border-blue-300 rounded-xl py-3 text-blue-600 hover:bg-blue-50 text-sm font-medium">
              <Plus className="w-4 h-4" /> Adicionar testemunha
            </button>
          </div>
        )}

        {/* STEP 5 — Acionamentos */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">Acionamento de equipes externas</h2>
              <p className="text-sm text-gray-400 mb-4">Registre se SAMU, Bombeiros, Polícia ou outros serviços foram acionados.</p>
            </div>
            {acionamentos.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Phone className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                Nenhuma equipe acionada.<br />Se não foi necessário acionar nenhum serviço, avance.
              </div>
            )}
            {acionamentos.map((a, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3 relative">
                <button type="button" onClick={() => removeAc(i)} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acionamento {i + 1}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Serviço acionado <span className="text-red-500">*</span></label>
                    <select className={inp} value={a.servico} onChange={ev => setAcField(i,'servico',ev.target.value)}>
                      <option value="">Selecionar...</option>
                      {SERVICOS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Horário do acionamento</label>
                    <input type="time" className={inp} value={a.horarioAcionamento} onChange={ev => setAcField(i,'horarioAcionamento',ev.target.value)} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Horário de chegada</label>
                    <input type="time" className={inp} value={a.horarioChegada} onChange={ev => setAcField(i,'horarioChegada',ev.target.value)} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Nº protocolo / BO</label>
                    <input className={inp} placeholder="Ex: BO-2026/1234" value={a.protocolo} onChange={ev => setAcField(i,'protocolo',ev.target.value)} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Nº da viatura</label>
                    <input className={inp} placeholder="Ex: 123-A" value={a.viatura} onChange={ev => setAcField(i,'viatura',ev.target.value)} /></div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addAcionamento}
              className="flex items-center gap-2 w-full justify-center border-2 border-dashed border-blue-300 rounded-xl py-3 text-blue-600 hover:bg-blue-50 text-sm font-medium">
              <Plus className="w-4 h-4" /> Adicionar acionamento
            </button>
          </div>
        )}

        {/* STEP 6 — Danos e Providências */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">Danos materiais e providências</h2>
              <p className="text-sm text-gray-400 mb-4">Descreva eventuais danos e as providências tomadas.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição dos danos materiais</label>
              <textarea className={inp + ' h-28 resize-none'} placeholder="Descreva os danos materiais causados pela ocorrência..."
                value={danosMateriais} onChange={e => setDanosMateriais(e.target.value)} maxLength={2000} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimativa de valor dos danos (R$)</label>
              <input type="number" min="0" step="0.01" className={inp} placeholder="0,00"
                value={estimativaDanos} onChange={e => setEstimativaDanos(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Providências tomadas</label>
              <textarea className={inp + ' h-28 resize-none'} placeholder="Descreva as ações imediatas tomadas: isolamento da área, atendimento médico, notificações realizadas, etc."
                value={providencias} onChange={e => setProvidencias(e.target.value)} maxLength={3000} />
            </div>
          </div>
        )}

        {/* STEP 7 — Anexos */}
        {step === 7 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">Fotos, vídeos e documentos</h2>
              <p className="text-sm text-gray-400 mb-4">Adicione evidências da ocorrência: fotos, vídeos, áudios ou documentos (máx 50 MB cada).</p>
            </div>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => !uploadando && anexoRef.current?.click()}
            >
              {uploadando ? (
                <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Toque para adicionar arquivos</p>
                  <p className="text-xs text-gray-400 mt-1">Fotos · Vídeos · Áudios · PDFs · máx 50 MB cada</p>
                </>
              )}
              <input
                ref={anexoRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={e => handleAnexos(e.target.files)}
              />
            </div>
            {erroAnexo && <p className="text-xs text-red-600">{erroAnexo}</p>}
            {anexos.length > 0 && (
              <div className="space-y-2">
                {anexos.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 bg-white">
                    {a.tipo === 'foto'      && <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                    {a.tipo === 'video'     && <Video className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                    {a.tipo === 'audio'     && <Mic className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {a.tipo === 'documento' && <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 underline truncate">{a.nome}</a>
                    <button type="button" onClick={() => setAnexos(arr => arr.filter((_,idx) => idx !== i))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 8 — Revisão */}
        {step === 8 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">Revisão e conclusão</h2>
              <p className="text-sm text-gray-400 mb-4">Revise os dados e defina o status inicial da ocorrência.</p>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Categoria', categoria],
                ['Tipo', tipo],
                ['Local', local],
                ['Data e Horário', dataHora ? new Date(dataHora).toLocaleString('pt-BR') : '—'],
                ['Envolvidos', `${envolvidos.length} pessoa(s)`],
                ['Testemunhas', `${testemunhas.length} testemunha(s)`],
                ['Acionamentos', `${acionamentos.length} serviço(s)`],
                ['Anexos', `${anexos.length} arquivo(s)`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">{l}</span>
                  <span className="text-gray-800 font-semibold text-right">{v || '—'}</span>
                </div>
              ))}
              <div className="py-2 border-b border-gray-100">
                <span className="text-gray-400 font-medium block mb-1">Descrição</span>
                <p className="text-gray-700 text-sm line-clamp-3">{descricao}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status inicial da ocorrência</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { val: 'aberta',     label: 'Aberta',      cor: 'blue' },
                  { val: 'em_analise', label: 'Em análise',  cor: 'yellow' },
                  { val: 'resolvida',  label: 'Resolvida',   cor: 'green' },
                  { val: 'encaminhada',label: 'Encaminhada', cor: 'purple' },
                  { val: 'arquivada',  label: 'Arquivada',   cor: 'gray' },
                ].map(s => (
                  <button key={s.val} type="button" onClick={() => setStatus(s.val)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${status === s.val ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={voltar}
            className="flex items-center gap-2 px-5 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={avancar}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold">
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={salvar} disabled={enviando}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold">
            <Check className="w-4 h-4" />
            {enviando ? 'Salvando...' : 'Registrar Ocorrência'}
          </button>
        )}
      </div>
    </div>
  )
}
