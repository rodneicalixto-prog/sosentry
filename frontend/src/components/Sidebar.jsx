import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  LogOut as LogOutIcon,
  Users,
  Webhook,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  BarChart2,
  AlertTriangle,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import AlterarSenhaModal from './AlterarSenhaModal'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, minRole: 'supervisor', exact: true },
  { to: '/registros', label: 'Registros', icon: ClipboardList, minRole: 'supervisor' },
  { to: '/registros/novo', label: 'Nova Entrada', icon: PlusCircle, minRole: 'operador', accent: true },
  { to: '/saida', label: 'Registrar Saída', icon: LogOutIcon, minRole: 'operador' },
  { to: '/ocorrencias', label: 'Ocorrências', icon: AlertTriangle, minRole: 'operador' },
]

const ADMIN_NAV = [
  { to: '/admin/relatorios',    label: 'Relatórios',    icon: BarChart2, minRole: 'admin' },
  { to: '/admin/usuarios',      label: 'Usuários',      icon: Users,     minRole: 'admin' },
  { to: '/admin/webhooks',      label: 'Webhooks',      icon: Webhook,   minRole: 'admin' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings,  minRole: 'admin' },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const [alterarSenhaAberto, setAlterarSenhaAberto] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-white/20 text-white'
        : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`

  const accentLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-accent-600 text-white'
        : 'bg-accent-500 hover:bg-accent-600 text-white'
    }`

  return (
    <>
      {/* Overlay on mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-primary-700 flex flex-col z-30 transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-accent-500" />
            <span className="text-xl font-bold text-white tracking-tight">SOS Entry</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white/60 hover:text-white p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.filter((item) => hasRole(item.minRole)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={item.accent ? accentLinkClass : linkClass}
              onClick={onClose}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}

          {hasRole('admin') && (
            <>
              <div className="pt-4 pb-1 px-4">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Administração
                </span>
              </div>
              {ADMIN_NAV.filter((item) => hasRole(item.minRole)).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  onClick={onClose}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-white truncate">{user?.nome || user?.login}</p>
            <p className="text-xs text-white/50 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={() => setAlterarSenhaAberto(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors mb-1"
          >
            <KeyRound className="w-4 h-4" />
            Alterar senha
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {alterarSenhaAberto && (
        <AlterarSenhaModal onClose={() => setAlterarSenhaAberto(false)} />
      )}
    </>
  )
}
