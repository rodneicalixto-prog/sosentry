import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { RealtimeProvider } from './contexts/RealtimeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import AlterarSenhaModal from './components/AlterarSenhaModal'

import ErrorBoundary from './components/ErrorBoundary'
import InstallBanner from './components/InstallBanner'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Registros from './pages/Registros'
import NovaEntrada from './pages/NovaEntrada'
import RegistroDetalhe from './pages/RegistroDetalhe'
import Usuarios      from './pages/admin/Usuarios'
import Webhooks      from './pages/admin/Webhooks'
import Relatorios    from './pages/admin/Relatorios'
import Configuracoes from './pages/admin/Configuracoes'
import RegistrarSaida from './pages/RegistrarSaida'
import Ocorrencias from './pages/Ocorrencias'
import NovaOcorrencia from './pages/NovaOcorrencia'
import OcorrenciaDetalhe from './pages/OcorrenciaDetalhe'
import Universidade from './pages/Universidade'
import Agendamentos from './pages/admin/Agendamentos'
import NovoAgendamento from './pages/admin/NovoAgendamento'
import AgendamentoDetalhe from './pages/admin/AgendamentoDetalhe'
import FormularioPublico from './pages/publico/FormularioPublico'

function TrocaSenhaOverlay() {
  const { user, clearTrocaSenhaObrigatoria } = useAuth()
  if (!user?.trocaSenhaObrigatoria) return null
  return <AlterarSenhaModal onClose={clearTrocaSenhaObrigatoria} />
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <AuthProvider>
      <RealtimeProvider>
        <Routes>
          {/* Rota pública — sem autenticação */}
          <Route path="/agendamento/:token" element={<FormularioPublico />} />

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
            <Route path="/ocorrencias"        element={<Ocorrencias />} />
            <Route path="/ocorrencias/nova"   element={<NovaOcorrencia />} />
            <Route path="/ocorrencias/:id"    element={<OcorrenciaDetalhe />} />
            <Route path="/universidade"       element={<Universidade />} />
            <Route
              path="/admin/agendamentos"
              element={
                <ProtectedRoute minRole="supervisor">
                  <Agendamentos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/agendamentos/novo"
              element={<NovoAgendamento />}
            />
            <Route
              path="/admin/agendamentos/:id"
              element={
                <ProtectedRoute minRole="supervisor">
                  <AgendamentoDetalhe />
                </ProtectedRoute>
              }
            />

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
              path="/admin/configuracoes"
              element={
                <ProtectedRoute minRole="admin">
                  <Configuracoes />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TrocaSenhaOverlay />
        <InstallBanner />
      </RealtimeProvider>
      </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
