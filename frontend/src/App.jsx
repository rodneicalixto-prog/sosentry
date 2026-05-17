import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Registros from './pages/Registros'
import NovaEntrada from './pages/NovaEntrada'
import RegistroDetalhe from './pages/RegistroDetalhe'
import Usuarios from './pages/admin/Usuarios'
import Webhooks from './pages/admin/Webhooks'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

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
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
