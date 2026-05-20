import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import api from '../api/client'
import PasswordStrength from '../components/PasswordStrength'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-4">Link inválido ou expirado.</p>
          <Link to="/recuperar-senha" className="btn-primary">Solicitar novo link</Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (novaSenha !== confirmar) { setStatus('erro'); setMsg('As senhas não coincidem.'); return }
    if (novaSenha.length < 6) { setStatus('erro'); setMsg('A senha deve ter no mínimo 6 caracteres.'); return }
    setLoading(true)
    setStatus(null)
    try {
      const { data } = await api.post('/api/auth/reset-password', { token, novaSenha })
      setMsg(data.msg)
      setStatus('ok')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      const m = err?.response?.data?.error || 'Erro ao redefinir senha.'
      setMsg(m)
      setStatus('erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4 shadow-lg">
            <ShieldCheck className="w-9 h-9 text-accent-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SOS Entry</h1>
          <p className="text-white/60 text-sm mt-1">Redefinir senha</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Criar nova senha</h2>

          {status === 'ok' && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-5 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{msg} Redirecionando para o login…</span>
            </div>
          )}

          {status === 'erro' && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{msg}</span>
            </div>
          )}

          {status !== 'ok' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="novaSenha">Nova senha</label>
                <div className="relative">
                  <input
                    id="novaSenha"
                    type={show ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Mínimo 6 caracteres"
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button type="button" onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength senha={novaSenha} />
              </div>
              <div>
                <label className="label" htmlFor="confirmar">Confirmar nova senha</label>
                <input
                  id="confirmar"
                  type={show ? 'text' : 'password'}
                  className={`input ${confirmar && confirmar !== novaSenha ? 'border-red-400' : ''}`}
                  placeholder="Repita a senha"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  required
                />
                {confirmar && confirmar !== novaSenha && (
                  <p className="mt-1 text-xs text-red-600">As senhas não coincidem</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !novaSenha || !confirmar}
                className="btn-primary w-full justify-center py-2.5"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando…</>
                ) : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
