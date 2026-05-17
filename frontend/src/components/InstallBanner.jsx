import React, { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      const dismissed = sessionStorage.getItem('pwa-dismissed')
      if (!dismissed) setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    sessionStorage.setItem('pwa-dismissed', '1')
    setVisible(false)
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-700 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Instalar SOS Entry</p>
          <p className="text-xs text-gray-500 mt-0.5">Adicione à tela inicial para acesso rápido</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={install}
            className="px-3 py-1.5 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800 transition-colors"
          >
            Instalar
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
