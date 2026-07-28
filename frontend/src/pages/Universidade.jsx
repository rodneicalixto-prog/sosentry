import React, { useEffect, useState, useRef } from 'react'
import {
  Play, Plus, Pencil, Trash2, X, Upload, Star, StarOff,
  GraduationCap, CheckCircle, AlertCircle, ChevronUp, ChevronDown, ImageIcon, Video
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { uploadArquivo } from '../lib/supabaseStorage'

async function uploadFile(file, folder) {
  return uploadArquivo(file, `universidade/${folder}`)
}

function getEmbedUrl(url) {
  if (!url) return null
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`
  // Vimeo
  const vmMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1`
  return null // direct file
}

function isYouTubeOrVimeo(url) {
  return !!(url?.match(/youtube\.com|youtu\.be|vimeo\.com/))
}

function getYouTubeThumbnail(url) {
  const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/)
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
  return null
}

// ─── Player Modal ─────────────────────────────────────────────────────────────

function PlayerModal({ video, onClose }) {
  const embedUrl = getEmbedUrl(video.videoUrl)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="relative w-full max-w-4xl mx-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1 text-sm">
          <X className="w-5 h-5" /> Fechar
        </button>
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
          {embedUrl ? (
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture" title={video.titulo} />
          ) : (
            <video src={video.videoUrl} controls autoPlay className="w-full h-full" />
          )}
        </div>
        <div className="mt-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">{video.categoria}</p>
          <h2 className="text-xl font-bold">{video.titulo}</h2>
          {video.descricao && <p className="text-sm text-white/70 mt-1">{video.descricao}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ video, onPlay, onEdit, onDelete, isAdmin }) {
  const [hovered, setHovered] = useState(false)
  const thumb = video.thumbUrl || getYouTubeThumbnail(video.videoUrl)

  return (
    <div
      className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-800 transition-transform duration-200 hover:scale-105 hover:z-10 hover:shadow-2xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onPlay(video)}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-900 relative">
        {thumb ? (
          <img src={thumb} alt={video.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-10 h-10 text-gray-600" />
          </div>
        )}
        {/* Play overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
          </div>
        </div>
        {!video.ativo && (
          <span className="absolute top-2 left-2 bg-gray-700/90 text-white text-xs px-2 py-0.5 rounded">Oculto</span>
        )}
      </div>

      {/* Title bar */}
      <div className="p-3">
        <p className="text-white text-sm font-semibold line-clamp-2 leading-snug">{video.titulo}</p>
        {video.descricao && (
          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{video.descricao}</p>
        )}
      </div>

      {/* Admin buttons */}
      {isAdmin && hovered && (
        <div className="absolute top-2 right-2 flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(video)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(video)}
            className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-sm">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Admin Modal (Add/Edit) ───────────────────────────────────────────────────

function AdminModal({ video, onClose, onSaved }) {
  const [titulo, setTitulo]       = useState(video?.titulo     || '')
  const [descricao, setDescricao] = useState(video?.descricao  || '')
  const [categoria, setCategoria] = useState(video?.categoria  || 'Geral')
  const [videoUrl, setVideoUrl]   = useState(video?.videoUrl   || '')
  const [thumbUrl, setThumbUrl]   = useState(video?.thumbUrl   || '')
  const [destaque, setDestaque]   = useState(video?.destaque   || false)
  const [ordem, setOrdem]         = useState(video?.ordem      ?? 0)
  const [ativo, setAtivo]         = useState(video?.ativo      ?? true)
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')
  const [uploadVideoProgress, setUploadVideoProgress] = useState('')
  const [uploadThumbProgress, setUploadThumbProgress] = useState('')

  const videoFileRef = useRef(null)
  const thumbFileRef = useRef(null)

  async function handleVideoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { setErro('Selecione um arquivo de vídeo'); return }
    if (file.size > 500 * 1024 * 1024) { setErro('Vídeo muito grande (máx 500 MB)'); return }
    setErro(''); setUploadVideoProgress('Enviando vídeo...')
    try {
      const url = await uploadFile(file, 'videos')
      setVideoUrl(url)
      setUploadVideoProgress('Vídeo enviado!')
      setTimeout(() => setUploadVideoProgress(''), 2000)
    } catch (e) {
      setErro(e.message); setUploadVideoProgress('')
    }
    e.target.value = ''
  }

  async function handleThumbFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErro('Selecione uma imagem para capa'); return }
    setErro(''); setUploadThumbProgress('Enviando capa...')
    try {
      const url = await uploadFile(file, 'thumbs')
      setThumbUrl(url)
      setUploadThumbProgress('Capa enviada!')
      setTimeout(() => setUploadThumbProgress(''), 2000)
    } catch (e) {
      setErro(e.message); setUploadThumbProgress('')
    }
    e.target.value = ''
  }

  async function salvar(e) {
    e.preventDefault()
    if (!titulo.trim()) { setErro('Título obrigatório'); return }
    if (!videoUrl.trim()) { setErro('Vídeo ou URL obrigatório'); return }
    setSalvando(true); setErro('')
    try {
      const payload = { titulo, descricao, categoria, videoUrl, thumbUrl, destaque, ordem: Number(ordem), ativo }
      if (video?.id) {
        await api.patch(`/api/universidade/${video.id}`, payload)
      } else {
        await api.post('/api/universidade', payload)
      }
      onSaved()
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const autoThumb = getYouTubeThumbnail(videoUrl)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">{video?.id ? 'Editar Vídeo' : 'Novo Vídeo'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={salvar} className="px-6 py-5 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{erro}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Título <span className="text-red-400">*</span></label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={200}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              placeholder="Ex: Como registrar uma entrada de veículo" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Categoria</label>
            <input type="text" value={categoria} onChange={e => setCategoria(e.target.value)} maxLength={100}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              placeholder="Ex: Portaria, Relatórios, Configurações…" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} maxLength={500}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 resize-none"
              placeholder="Breve descrição do conteúdo do vídeo" />
          </div>

          {/* Vídeo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Vídeo <span className="text-red-400">*</span></label>
            <div className="space-y-2">
              <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                placeholder="https://youtube.com/watch?v=... ou URL do vídeo" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">ou</span>
                <button type="button" onClick={() => videoFileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload de arquivo
                </button>
                {uploadVideoProgress && (
                  <span className="text-xs text-blue-400">{uploadVideoProgress}</span>
                )}
              </div>
              <input ref={videoFileRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFile} />
            </div>
            {videoUrl && isYouTubeOrVimeo(videoUrl) && (
              <p className="text-xs text-green-400 mt-1">✓ YouTube/Vimeo detectado — thumbnail automática</p>
            )}
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Imagem de Capa</label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <input type="url" value={thumbUrl} onChange={e => setThumbUrl(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  placeholder="URL da imagem (opcional)" />
                <div className="flex items-center gap-2 mt-1.5">
                  <button type="button" onClick={() => thumbFileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium">
                    <ImageIcon className="w-3.5 h-3.5" /> Upload capa
                  </button>
                  {autoThumb && !thumbUrl && (
                    <button type="button" onClick={() => setThumbUrl(autoThumb)}
                      className="text-xs text-blue-400 hover:text-blue-300">
                      Usar thumbnail do YouTube
                    </button>
                  )}
                  {uploadThumbProgress && <span className="text-xs text-blue-400">{uploadThumbProgress}</span>}
                </div>
                <input ref={thumbFileRef} type="file" accept="image/*" className="hidden" onChange={handleThumbFile} />
              </div>
              {(thumbUrl || autoThumb) && (
                <img src={thumbUrl || autoThumb} alt="preview"
                  className="w-20 h-12 object-cover rounded-lg border border-gray-700 flex-shrink-0" />
              )}
            </div>
          </div>

          {/* Options row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ordem</label>
              <input type="number" value={ordem} onChange={e => setOrdem(e.target.value)} min={0}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-2 justify-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={destaque} onChange={e => setDestaque(e.target.checked)}
                  className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-400 bg-gray-700 border-gray-600" />
                <span className="text-sm text-gray-300">Destaque (Banner)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 bg-gray-700 border-gray-600" />
                <span className="text-sm text-gray-300">Publicado</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors">
              {salvando ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando…</>
              ) : (video?.id ? 'Salvar Alterações' : 'Adicionar Vídeo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Universidade() {
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')

  const [videos, setVideos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [playing, setPlaying]     = useState(null)
  const [editando, setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [feedback, setFeedback]   = useState('')

  async function carregar() {
    setLoading(true)
    try {
      const url = isAdmin ? '/api/universidade/admin' : '/api/universidade'
      const { data } = await api.get(url)
      setVideos(data)
    } catch { setVideos([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  async function handleDelete(video) {
    try {
      await api.delete(`/api/universidade/${video.id}`)
      setFeedback('Vídeo removido.')
      setConfirmDel(null)
      carregar()
      setTimeout(() => setFeedback(''), 3000)
    } catch { setFeedback('Erro ao remover vídeo.') }
  }

  const featured = videos.find(v => v.destaque) || videos[0]
  const featuredThumb = featured?.thumbUrl || getYouTubeThumbnail(featured?.videoUrl || '')

  // Group videos by category
  const porCategoria = videos.reduce((acc, v) => {
    const cat = v.categoria || 'Geral'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(v)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-950 -mt-0 text-white">

      {/* Admin toolbar */}
      {isAdmin && (
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <GraduationCap className="w-4 h-4" />
            <span>Modo Administrador</span>
            {feedback && <span className="text-green-400 ml-2">{feedback}</span>}
          </div>
          <button
            onClick={() => setEditando({})}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Adicionar Vídeo
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-gray-500">
          <GraduationCap className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-semibold">Nenhum vídeo disponível</p>
          {isAdmin && (
            <p className="text-sm mt-1">Clique em "Adicionar Vídeo" para começar.</p>
          )}
        </div>
      ) : (
        <>
          {/* ── Hero Banner ── */}
          {featured && (
            <div className="relative w-full h-72 sm:h-96 md:h-[480px] bg-gray-900 overflow-hidden">
              {featuredThumb && (
                <img src={featuredThumb} alt={featured.titulo}
                  className="absolute inset-0 w-full h-full object-cover opacity-40" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
              <div className="relative h-full flex flex-col justify-end px-6 pb-8 max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">{featured.categoria}</span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">{featured.titulo}</h1>
                {featured.descricao && (
                  <p className="text-gray-300 text-sm sm:text-base line-clamp-2 mb-4">{featured.descricao}</p>
                )}
                <button
                  onClick={() => setPlaying(featured)}
                  className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-gray-200 text-gray-900 rounded-lg font-bold text-sm w-fit transition-colors shadow-lg">
                  <Play className="w-5 h-5" fill="currentColor" /> Assistir Agora
                </button>
              </div>
            </div>
          )}

          {/* ── Category Rows ── */}
          <div className="px-4 sm:px-6 pb-12 space-y-8 mt-6">
            {Object.entries(porCategoria).map(([cat, vids]) => (
              <section key={cat}>
                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  {cat}
                  <span className="text-xs font-normal text-gray-500">{vids.length} vídeo{vids.length !== 1 ? 's' : ''}</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {vids.map(v => (
                    <VideoCard
                      key={v.id}
                      video={v}
                      onPlay={setPlaying}
                      onEdit={setEditando}
                      onDelete={setConfirmDel}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {/* Player modal */}
      {playing && <PlayerModal video={playing} onClose={() => setPlaying(null)} />}

      {/* Admin add/edit modal */}
      {editando !== null && (
        <AdminModal
          video={editando?.id ? editando : null}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); carregar() }}
        />
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Remover vídeo?</h3>
            <p className="text-gray-400 text-sm mb-5">"{confirmDel.titulo}" será removido permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 text-sm">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDel)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
