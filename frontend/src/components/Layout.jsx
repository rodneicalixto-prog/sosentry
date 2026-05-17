import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'
import Toasts from './Toasts'
import { useAuth } from '../contexts/AuthContext'
import { useRealtimeCtx } from '../contexts/RealtimeContext'

function LiveIndicator() {
  const { conectado } = useRealtimeCtx()
  return (
    <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors
      ${conectado ? 'text-green-700 bg-green-50' : 'text-gray-400 bg-gray-100'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${conectado ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      {conectado ? 'Ao vivo' : 'Offline'}
    </div>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Header */}
        <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <LiveIndicator />
            <NotificationBell />
            <span className="hidden sm:block text-sm text-gray-600 ml-1">
              Olá, <span className="font-semibold text-gray-800">{user?.nome?.split(' ')[0] || user?.login}</span>
            </span>
            <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-xs font-bold select-none">
              {(user?.nome || user?.login || '?')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Toasts flutuantes */}
      <Toasts />
    </div>
  )
}
