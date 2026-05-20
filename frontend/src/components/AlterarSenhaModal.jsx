import React, { useState } from 'react'
import { X, Eye, EyeOff, KeyRound, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../api/client'
import PasswordStrength from './PasswordStrength'
import { useAuth } from '../contexts/AuthContext'

export default function AlterarSenhaModal({ onClose }) {
  const { user, refreshToken } = useAuth()
  const obrigatorio = user?.trocaSenhaObrigatoria

  const [senhaAtual,  setSenhaAtual]  = useState('')
  const [novaSenha,   setNovaSenha]   = useState('')
  const [confirmar,   setConfirmar]   = useState('')
  const [mostrar,     setMostrar]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [erro,        setErro]        = useState('')
  const [sucesso,     setSucesso]     = useState(false)

  const naoCoincide = confirmar && confirmar !== novaSenha

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (novaSenha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (novaSenha.length < 8)   { setErro('A nova senha deve ter no mínimo 8 caracteres.'); return }
    setErro('')
    setLoading(true)
    try {
      await api.patch('/api/auth/minha-senha', {
        senhaAtual: obrigatorio ? undefined : senhaAtual,
        novaSenha,
        refreshToken,
      })
      setSucesso(true)
      setTimeout(onClose, 2000)
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao alterar senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Alterar senha</h2>
              {obrigatorio && (
                <p className="text-xs text-amber-600 font-medium">Troca obrigatória definida pelo administrador</p>
              )}
            </div>
          </div>
          {!obrigatorio && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {sucesso ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-gray-800">Senha alterada com sucesso!</p>
              <p className="text-sm text-gray-500">Suas outras sessões foram encerradas.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {obrigatorio && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  Por segurança, você precisa criar uma nova senha antes de continuar.
                </div>
              )}

              {!obrigatorio && (
                <div>
                  <label className="label">Senha atual</label>
                  <div className="relative">
                    <input
                      type={mostrar ? 'text' : 'password'}
                      className="input pr-10"
                      value={senhaAtual}
                      onChange={e => setSenhaAtual(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setMostrar(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="label">Nova senha</label>
                <div className="relative">
                  <input
                    type={mostrar ? 'text' : 'password'}
                    className="input pr-10"
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setMostrar(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength senha={novaSenha} />
              </div>

              <div>
                <label className="label">Confirmar nova senha</label>
                <input
                  type={mostrar ? 'text' : 'password'}
                  className={`input ${naoCoincide ? 'border-red-400' : ''}`}
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {naoCoincide && (
                  <p className="mt-1 text-xs text-red-600">As senhas não coincidem</p>
                )}
              </div>

              {erro && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {erro}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                {!obrigatorio && (
                  <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || naoCoincide || !novaSenha || (!obrigatorio && !senhaAtual)}
                  className="btn-primary flex-1 justify-center"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando…</>
                  ) : 'Salvar nova senha'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
