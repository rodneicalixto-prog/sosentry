import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

const ROLE_LEVELS = {
  operador: 1,
  supervisor: 2,
  admin: 3,
  superadmin: 4,
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch current user from API using stored token
  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const login = async (login, senha) => {
    const { data } = await api.post('/api/auth/login', { login, senha })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken })
      }
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
    }
  }

  const hasRole = useCallback(
    (minRole) => {
      if (!user) return false
      return (ROLE_LEVELS[user.role] || 0) >= (ROLE_LEVELS[minRole] || 0)
    },
    [user],
  )

  const refreshToken = localStorage.getItem('refreshToken') || null

  const clearTrocaSenhaObrigatoria = () =>
    setUser(u => u ? { ...u, trocaSenhaObrigatoria: false } : u)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, refreshToken, clearTrocaSenhaObrigatoria }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
