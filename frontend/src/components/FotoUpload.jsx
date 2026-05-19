import React, { useRef, useState, useEffect } from 'react'
import { Camera, X, Image as ImageIcon } from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yshvniyhtnyhnjcecbft.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaHZuaXlodG55aG5qY2VjYmZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDcyMTMsImV4cCI6MjA5MjI4MzIxM30.0tYb9047OInZtAW3SAi2zS-m7sudE3Ui-HjZxIfj87c'
const BUCKET = 'fotos-saida'

export async function uploadFoto(file) {
  const ext = file.name.split('.').pop() || 'jpg'
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${nome}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type || 'image/jpeg',
    },
    body: file,
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`Falha no upload: ${resp.status} ${txt}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${nome}`
}

export default function FotoUpload({ label, obrigatorio = false, value, onChange, disabled }) {
  const inputRef = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [preview, setPreview] = useState(null)

  // Revoga o blob URL quando o preview muda ou o componente desmonta (evita memory leak)
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  async function handleFile(file) {
    if (!file) return
    const tipos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
    if (!tipos.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
      setErro('Apenas imagens são aceitas (JPG, PNG, WEBP, HEIC)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErro('Imagem muito grande (máx 10 MB)')
      return
    }
    setErro('')
    setPreview(URL.createObjectURL(file))
    setEnviando(true)
    try {
      const url = await uploadFoto(file)
      onChange(url)
    } catch (e) {
      setErro(e.message)
      setPreview(null)
      onChange(null)
    } finally {
      setEnviando(false)
    }
  }

  function remover() {
    setPreview(null)
    onChange(null)
    setErro('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <ImageIcon className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
        {label}{obrigatorio && <span className="text-red-500 ml-1">*</span>}
      </label>

      {!value && !enviando && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Toque para tirar foto ou selecionar da galeria</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, HEIC · máx 10 MB</p>
          {/* Sem capture="environment" para permitir câmera E galeria em todos os dispositivos */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {enviando && (
        <div className="border border-gray-200 rounded-lg p-4 flex items-center gap-3 bg-blue-50">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-sm text-blue-700">Enviando foto...</span>
        </div>
      )}

      {value && !enviando && (
        <div className="relative inline-block w-full">
          <img
            src={preview || value}
            alt="Foto"
            className="w-full max-h-56 object-contain rounded-lg border border-gray-200 bg-gray-50"
          />
          <button
            type="button"
            onClick={remover}
            disabled={disabled}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-xs text-blue-600 underline truncate"
          >
            Ver foto em tamanho completo
          </a>
        </div>
      )}

      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  )
}
