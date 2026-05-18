import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { RealtimeProvider } from './contexts/RealtimeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import ErrorBoundary from './components/ErrorBoundary'
import InstallBanner from './components/InstallBanner'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Registros from './pages/Registros'
import NovaEntrada from './pages/NovaEntrada'
import RegistroDetalhe from './pages/RegistroDetalhe'
import Usuarios   from './pages/admin/Usuarios'
import Webhooks   from './pages/admin/Webhooks'
import Whatsapp   from './pages/admin/Whatsapp'
import Relatorios from './pages/admin/Relatorios'
import RegistrarSaida from './pages/RegistrarSaida'

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <AuthProvider>
      <RealtimeProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-senha" element={<ForgotPassword />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute minRole="operador">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/"
              element={
                <ProtectedRoute minRole="supervisor">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registros"
              element={
                <ProtectedRoute minRole="supervisor">
                  <Registros />
                </ProtectedRoute>
              }
            />
            <Route path="/registros/novo" element={<NovaEntrada />} />
            <Route path="/registros/:id" element={<RegistroDetalhe />} />
            <Route path="/saida" element={<RegistrarSaida />} />

            <Route
              path="/admin/relatorios"
              element={
                <ProtectedRoute minRole="admin">
                  <Relatorios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute minRole="admin">
                  <Usuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/webhooks"
              element={
                <ProtectedRoute minRole="admin">
                  <Webhooks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/whatsapp"
              element={
                <ProtectedRoute minRole="admin">
                  <Whatsapp />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <InstallBanner />
      </RealtimeProvider>
      </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
