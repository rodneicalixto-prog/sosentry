import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  // If already logged in, redirect
  if (user) {
    navigate(from, { replace: true })
    return null
  }

  const onSubmit = async ({ login: loginVal, senha }) => {
    setServerError('')
    try {
      await login(loginVal, senha)
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Credenciais inválidas. Verifique e tente novamente.'
      setServerError(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4 shadow-lg">
            <ShieldCheck className="w-9 h-9 text-accent-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SOS Entry</h1>
          <p className="text-white/60 text-sm mt-1">Controle de Portaria Industrial</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Entrar no sistema</h2>

          {serverError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label className="label" htmlFor="login">
                Login
              </label>
              <input
                id="login"
                type="text"
                autoComplete="username"
                className={`input ${errors.login ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="Seu usuário"
                {...register('login', { required: 'Informe o login' })}
              />
              {errors.login && (
                <p className="mt-1 text-xs text-red-600">{errors.login.message}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="senha">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.senha ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="Sua senha"
                  {...register('senha', { required: 'Informe a senha' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.senha && (
                <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando…
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          &copy; {new Date().getFullYear()} SOS Entry
        </p>
      </div>
    </div>
  )
}
