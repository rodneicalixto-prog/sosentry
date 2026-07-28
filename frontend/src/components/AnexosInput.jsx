import React, { useRef, useState } from 'react'
import { Camera, FolderOpen, FileText, Image as ImageIcon, Video, Mic, X, Paperclip } from 'lucide-react'
import { uploadAnexo } from '../lib/supabaseStorage'

async function upload(file) {
  return uploadAnexo(file, 'obs')
}

function TipoIcon({ tipo }) {
  if (tipo === 'foto')      return <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
  if (tipo === 'video')     return <Video     className="w-4 h-4 text-purple-500 flex-shrink-0" />
  if (tipo === 'audio')     return <Mic       className="w-4 h-4 text-green-500 flex-shrink-0" />
  return                           <FileText  className="w-4 h-4 text-orange-500 flex-shrink-0" />
}

export default function AnexosInput({ value = [], onChange, disabled }) {
  const camRef     = useRef(null)
  const galeriaRef = useRef(null)
  const docRef     = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro]         = useState('')

  async function handleFiles(files) {
    if (!files?.length) return
    setErro(''); setEnviando(true)
    try {
      const novos = await Promise.all(Array.from(files).map(upload))
      onChange([...value, ...novos])
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
      if (camRef.current)     camRef.current.value = ''
      if (galeriaRef.current) galeriaRef.current.value = ''
      if (docRef.current)     docRef.current.value = ''
    }
  }

  function remover(idx) {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" disabled={disabled || enviando}
          onClick={() => camRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition-colors disabled:opacity-50">
          <Camera className="w-3.5 h-3.5" /> Câmera
        </button>
        <button type="button" disabled={disabled || enviando}
          onClick={() => galeriaRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors disabled:opacity-50">
          <FolderOpen className="w-3.5 h-3.5" /> Galeria
        </button>
        <button type="button" disabled={disabled || enviando}
          onClick={() => docRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors disabled:opacity-50">
          <Paperclip className="w-3.5 h-3.5" /> Arquivo
        </button>
        {enviando && (
          <span className="flex items-center gap-1.5 text-xs text-blue-600">
            <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Enviando…
          </span>
        )}
      </div>

      <input ref={camRef}     type="file" multiple accept="image/*" capture="environment"
        className="hidden" disabled={disabled} onChange={e => handleFiles(e.target.files)} />
      <input ref={galeriaRef} type="file" multiple accept="image/*,video/*,audio/*"
        className="hidden" disabled={disabled} onChange={e => handleFiles(e.target.files)} />
      <input ref={docRef}     type="file" multiple accept="application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden" disabled={disabled} onChange={e => handleFiles(e.target.files)} />

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((a, i) => (
            <div key={i} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <TipoIcon tipo={a.tipo} />
              <a href={a.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-xs text-blue-600 underline truncate">{a.nome}</a>
              {!disabled && (
                <button type="button" onClick={() => remover(i)} className="text-gray-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
