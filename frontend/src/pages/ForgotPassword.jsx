import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import api from '../api/client'

export default function ForgotPassword() {
  const [login, setLogin] = useState('')
  const [status, setStatus] = useState(null) // null | 'ok' | 'erro'
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!login.trim()) return
    setLoading(true)
    setStatus(null)
    try {
      const { data } = await api.post('/api/auth/forgot-password', { login: login.trim() })
      setMsg(data.msg)
      setStatus('ok')
    } catch (err) {
      const m = err?.response?.data?.error || 'Erro ao processar solicitação.'
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
          <p className="text-white/60 text-sm mt-1">Recuperação de senha</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Esqueci minha senha</h2>
          <p className="text-sm text-gray-500 mb-6">
            Informe seu login. Se houver um telefone cadastrado, enviaremos um link de redefinição pelo WhatsApp.
          </p>

          {status === 'ok' && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-5 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{msg}</span>
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
                <label className="label" htmlFor="login">Login</label>
                <input
                  id="login"
                  type="text"
                  className="input"
                  placeholder="Seu usuário"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !login.trim()}
                className="btn-primary w-full justify-center py-2.5"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando…</>
                ) : 'Enviar link pelo WhatsApp'}
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-primary-700 hover:text-primary-800 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
