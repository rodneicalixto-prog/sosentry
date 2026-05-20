import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusCircle, Pencil, X, CheckCircle, AlertCircle, UserX, UserCheck, MessageCircle, KeyRound, Send, Lock } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import PasswordStrength from '../../components/PasswordStrength'

const ROLE_LEVELS = { operador: 1, supervisor: 2, admin: 3, superadmin: 4 }
const ROLE_LABELS = { operador: 'Operador', supervisor: 'Supervisor', admin: 'Admin', superadmin: 'Super Admin' }
const TURNOS = ['Manhã', 'Tarde', 'Noite', 'Integral']

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function InputError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-1 disabled:opacity-50 ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function ResetSenhaModal({ targetUser, onClose, onSuccess }) {
  const [modo, setModo] = useState('manual')
  const [novaSenha, setNovaSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const temTelefone = !!targetUser?.telefone

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const payload = { modo }
      if (modo === 'manual') payload.novaSenha = novaSenha
      await api.post(`/api/users/${targetUser.id}/reset-senha`, payload)
      const msg = modo === 'whatsapp'
        ? 'Link de redefinição enviado via WhatsApp.'
        : 'Senha temporária definida. O usuário precisará alterá-la no próximo login.'
      setSucesso(msg)
      setTimeout(() => { onSuccess?.(); onClose() }, 2500)
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Redefinir senha</h2>
              <p className="text-xs text-gray-500">{targetUser?.nome || targetUser?.login}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {sucesso ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-gray-800">{sucesso}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModo('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    modo === 'manual' ? 'border-primary-700 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Senha temporária
                </button>
                <button
                  type="button"
                  onClick={() => setModo('whatsapp')}
                  disabled={!temTelefone}
                  title={!temTelefone ? 'Usuário sem telefone cadastrado' : undefined}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    modo === 'whatsapp' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  Link WhatsApp
                </button>
              </div>

              {modo === 'manual' && (
                <div>
                  <label className="label">Nova senha temporária</label>
                  <input
                    type="password"
                    className="input"
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    required
                  />
                  <PasswordStrength senha={novaSenha} />
                  <p className="mt-1.5 text-xs text-gray-500">O usuário será obrigado a criar uma nova senha no próximo login.</p>
                </div>
              )}

              {modo === 'whatsapp' && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                  Um link de redefinição de senha será enviado para o WhatsApp do usuário
                  {targetUser?.telefone ? ` (${targetUser.telefone})` : ''}. O link expira em 1 hora.
                </div>
              )}

              {erro && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {erro}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button
                  type="submit"
                  disabled={loading || (modo === 'manual' && novaSenha.length < 8)}
                  className="btn-primary flex-1 justify-center"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando…</>
                  ) : modo === 'whatsapp' ? 'Enviar link' : 'Definir senha'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Usuarios() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [modalError, setModalError] = useState('')
  const [recebeWhatsapp, setRecebeWhatsapp] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)

  const maxRole = currentUser?.role || 'operador'
  const maxLevel = ROLE_LEVELS[maxRole] || 1
  const isSuperadmin = maxRole === 'superadmin'

  const availableRoles = Object.entries(ROLE_LABELS)
    .filter(([role]) => isSuperadmin || ROLE_LEVELS[role] < maxLevel)
    .map(([role, label]) => ({ role, label }))

  const fetchUsers = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await api.get('/api/users')
      setUsers(data)
    } catch {
      setError('Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const openCreate = () => {
    setEditingUser(null); setModalError(''); setRecebeWhatsapp(false)
    reset({ nome: '', login: '', email: '', senha: '', role: '', turno: '', setor: '', telefone: '' })
    setShowModal(true)
  }

  const stripPrefix = (tel) => (tel || '').replace(/^55/, '')

  const openEdit = (u) => {
    setEditingUser(u); setModalError(''); setRecebeWhatsapp(!!u.recebeWhatsapp)
    reset({ nome: u.nome||'', login: u.login||'', email: u.email||'', senha: '', role: u.role||'', turno: u.turno||'', setor: u.setor||'', telefone: stripPrefix(u.telefone) })
    setShowModal(true)
  }

  const onSubmit = async (formData) => {
    setModalError('')
    try {
      const payload = { ...formData, recebeWhatsapp }
      if (!payload.senha) delete payload.senha
      if (payload.telefone) {
        const d = payload.telefone.replace(/\D/g, '')
        payload.telefone = d ? '55' + d : ''
      }
      if (editingUser) {
        await api.patch(`/api/users/${editingUser.id}`, payload)
        setSuccess('Usuário atualizado com sucesso.')
      } else {
        await api.post('/api/users', payload)
        setSuccess('Usuário criado com sucesso.')
      }
      setShowModal(false); fetchUsers()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setModalError(err?.response?.data?.error || 'Erro ao salvar usuário.')
    }
  }

  const toggleAtivo = async (u) => {
    const acao = u.ativo !== false ? 'desativar' : 'ativar'
    if (!window.confirm(`Deseja ${acao} o usuário "${u.nome || u.login}"?`)) return
    try {
      await api.patch(`/api/users/${u.id}`, { ativo: !u.ativo })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ativo: !u.ativo } : x))
    } catch {
      setError('Erro ao alterar status do usuário.')
    }
  }

  return (
    <div className="space-y-5">
      {resetTarget && (
        <ResetSenhaModal
          targetUser={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={() => {}}
        />
      )}
      {showModal && (
        <Modal title={editingUser ? 'Editar Usuário' : 'Novo Usuário'} onClose={() => setShowModal(false)}>
          {modalError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{modalError}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Nome <span className="text-red-500">*</span></label>
                <input type="text" className={`input ${errors.nome ? 'border-red-400' : ''}`}
                  {...register('nome', { required: 'Informe o nome' })} />
                <InputError message={errors.nome?.message} />
              </div>

              <div>
                <label className="label">Login <span className="text-red-500">*</span></label>
                <input type="text" className={`input ${errors.login ? 'border-red-400' : ''}`}
                  autoComplete="off"
                  {...register('login', { required: 'Informe o login' })} />
                <InputError message={errors.login?.message} />
              </div>

              <div>
                <label className="label">E-mail</label>
                <input type="email" className="input" autoComplete="off" {...register('email')} />
              </div>

              <div>
                <label className="label">
                  Senha{!editingUser && <span className="text-red-500 ml-0.5">*</span>}
                  {editingUser && <span className="text-gray-400 font-normal text-xs ml-1">(em branco = manter)</span>}
                </label>
                <input type="password" className={`input ${errors.senha ? 'border-red-400' : ''}`}
                  autoComplete="new-password"
                  {...register('senha', {
                    required: !editingUser ? 'Informe a senha' : false,
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })} />
                <InputError message={errors.senha?.message} />
              </div>

              <div>
                <label className="label">Perfil <span className="text-red-500">*</span></label>
                <select className={`input ${errors.role ? 'border-red-400' : ''}`}
                  {...register('role', { required: 'Selecione o perfil' })}>
                  <option value="">Selecione…</option>
                  {availableRoles.map(({ role, label }) => (
                    <option key={role} value={role}>{label}</option>
                  ))}
                </select>
                <InputError message={errors.role?.message} />
              </div>

              <div>
                <label className="label">Setor / Departamento</label>
                <input type="text" className="input" placeholder="ex: Logística, RH, TI…"
                  maxLength={100} {...register('setor')} />
              </div>

              <div>
                <label className="label">Turno</label>
                <select className="input" {...register('turno')}>
                  <option value="">Selecione…</option>
                  {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="label">
                  Telefone / WhatsApp
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-sm text-gray-600 font-medium select-none">+55</span>
                  <input type="tel" className="input rounded-l-none flex-1" placeholder="11 99999-9999"
                    {...register('telefone')} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      Recebe notificações WhatsApp
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Este usuário será notificado em todas as entradas e saídas
                    </p>
                  </div>
                  <Toggle checked={recebeWhatsapp} onChange={setRecebeWhatsapp} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando…</>
                ) : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerenciamento de usuários do sistema</p>
        </div>
        <button onClick={openCreate} className="btn-accent">
          <PlusCircle className="w-4 h-4" />Novo Usuário
        </button>
      </div>

      {success && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{success}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">Nenhum usuário encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-th">Nome</th>
                  <th className="table-th hidden sm:table-cell">Login</th>
                  <th className="table-th hidden md:table-cell">Setor</th>
                  <th className="table-th">Perfil</th>
                  <th className="table-th hidden lg:table-cell">Turno</th>
                  <th className="table-th text-center">WhatsApp</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium">{u.nome || u.login}</td>
                    <td className="table-td hidden sm:table-cell text-gray-500">{u.login}</td>
                    <td className="table-td hidden md:table-cell text-gray-500">{u.setor || '—'}</td>
                    <td className="table-td">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="table-td hidden lg:table-cell text-gray-500">{u.turno || '—'}</td>
                    <td className="table-td text-center">
                      {u.recebeWhatsapp
                        ? <MessageCircle className="w-4 h-4 text-green-500 mx-auto" title="Recebe notificações WhatsApp" />
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${u.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="btn-secondary btn-sm" title="Editar"
                          disabled={!isSuperadmin && ROLE_LEVELS[u.role] >= maxLevel}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setResetTarget(u)}
                          className="btn-sm btn bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200"
                          title="Redefinir senha"
                          disabled={!isSuperadmin && ROLE_LEVELS[u.role] >= maxLevel}>
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleAtivo(u)}
                          className={`btn-sm btn ${u.ativo !== false ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200' : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200'}`}
                          title={u.ativo !== false ? 'Desativar' : 'Ativar'}
                          disabled={!isSuperadmin && ROLE_LEVELS[u.role] >= maxLevel}>
                          {u.ativo !== false ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
