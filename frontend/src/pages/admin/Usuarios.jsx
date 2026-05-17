import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusCircle, Pencil, X, CheckCircle, AlertCircle, UserX, UserCheck } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'

const ROLE_LEVELS = { operador: 1, supervisor: 2, admin: 3, superadmin: 4 }
const ROLE_LABELS = { operador: 'Operador', supervisor: 'Supervisor', admin: 'Admin', superadmin: 'Super Admin' }
const TURNOS = ['Manhã', 'Tarde', 'Noite', 'Integral', '']

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

export default function Usuarios() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [modalError, setModalError] = useState('')

  const maxRole = currentUser?.role || 'operador'
  const maxLevel = ROLE_LEVELS[maxRole] || 1

  const availableRoles = Object.entries(ROLE_LEVELS)
    .filter(([, level]) => level < maxLevel)
    .map(([role]) => role)

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/api/users')
      setUsers(data)
    } catch {
      setError('Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  const openCreate = () => {
    setEditingUser(null)
    setModalError('')
    reset({
      nome: '',
      login: '',
      email: '',
      senha: '',
      role: '',
      turno: '',
      telefone: '',
    })
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditingUser(u)
    setModalError('')
    reset({
      nome: u.nome || '',
      login: u.login || '',
      email: u.email || '',
      senha: '',
      role: u.role || '',
      turno: u.turno || '',
      telefone: u.telefone || '',
    })
    setShowModal(true)
  }

  const onSubmit = async (formData) => {
    setModalError('')
    try {
      const payload = { ...formData }
      if (!payload.senha) delete payload.senha

      if (editingUser) {
        await api.patch(`/api/users/${editingUser.id}`, payload)
        setSuccess('Usuário atualizado com sucesso.')
      } else {
        await api.post('/api/users', payload)
        setSuccess('Usuário criado com sucesso.')
      }
      setShowModal(false)
      fetchUsers()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setModalError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Erro ao salvar usuário.',
      )
    }
  }

  const toggleAtivo = async (u) => {
    try {
      await api.patch(`/api/users/${u.id}`, { ativo: !u.ativo })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ativo: !u.ativo } : x)))
    } catch {
      setError('Erro ao alterar status do usuário.')
    }
  }

  return (
    <div className="space-y-5">
      {showModal && (
        <Modal
          title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
          onClose={() => setShowModal(false)}
        >
          {modalError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {modalError}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Nome <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`input ${errors.nome ? 'border-red-400' : ''}`}
                  {...register('nome', { required: 'Informe o nome' })}
                />
                <InputError message={errors.nome?.message} />
              </div>

              <div>
                <label className="label">Login <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`input ${errors.login ? 'border-red-400' : ''}`}
                  {...register('login', { required: 'Informe o login' })}
                />
                <InputError message={errors.login?.message} />
              </div>

              <div>
                <label className="label">E-mail</label>
                <input
                  type="email"
                  className="input"
                  {...register('email')}
                />
              </div>

              <div>
                <label className="label">
                  Senha {!editingUser && <span className="text-red-500">*</span>}
                  {editingUser && <span className="text-gray-400 font-normal">(deixe em branco para manter)</span>}
                </label>
                <input
                  type="password"
                  className={`input ${errors.senha ? 'border-red-400' : ''}`}
                  {...register('senha', {
                    required: !editingUser ? 'Informe a senha' : false,
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })}
                />
                <InputError message={errors.senha?.message} />
              </div>

              <div>
                <label className="label">Perfil <span className="text-red-500">*</span></label>
                <select
                  className={`input ${errors.role ? 'border-red-400' : ''}`}
                  {...register('role', { required: 'Selecione o perfil' })}
                >
                  <option value="">Selecione…</option>
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <InputError message={errors.role?.message} />
              </div>

              <div>
                <label className="label">Turno</label>
                <select className="input" {...register('turno')}>
                  <option value="">Selecione…</option>
                  {TURNOS.filter(Boolean).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Telefone</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="(00) 00000-0000"
                  {...register('telefone')}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando…
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerenciamento de usuários do sistema</p>
        </div>
        <button onClick={openCreate} className="btn-accent">
          <PlusCircle className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {success && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
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
                  <th className="table-th hidden md:table-cell">E-mail</th>
                  <th className="table-th">Perfil</th>
                  <th className="table-th hidden lg:table-cell">Turno</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium">{u.nome || u.login}</td>
                    <td className="table-td hidden sm:table-cell text-gray-500">{u.login}</td>
                    <td className="table-td hidden md:table-cell text-gray-500">{u.email || '—'}</td>
                    <td className="table-td">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="table-td hidden lg:table-cell text-gray-500">{u.turno || '—'}</td>
                    <td className="table-td">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.ativo !== false
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {u.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="btn-secondary btn-sm"
                          title="Editar"
                          disabled={ROLE_LEVELS[u.role] >= maxLevel}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleAtivo(u)}
                          className={`btn-sm btn ${
                            u.ativo !== false
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200'
                              : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200'
                          }`}
                          title={u.ativo !== false ? 'Desativar' : 'Ativar'}
                          disabled={ROLE_LEVELS[u.role] >= maxLevel}
                        >
                          {u.ativo !== false ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
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
