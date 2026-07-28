// Configuração e helpers de upload para o Supabase Storage.
//
// A URL e a anon key vêm de variáveis de ambiente injetadas no build do Vite
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Não há fallback hardcoded:
// se faltarem, o upload falha com mensagem clara em vez de mandar os arquivos
// para o projeto errado silenciosamente.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const BUCKET = 'fotos-saida'

/** Prefixo público dos arquivos do bucket — usado para montar as URLs finais. */
export const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`

function assertConfigurado() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase Storage não configurado — defina VITE_SUPABASE_URL e ' +
      'VITE_SUPABASE_ANON_KEY no build do frontend.'
    )
  }
}

/**
 * Envia um arquivo para o bucket e devolve a URL pública.
 * @param {File} file
 * @param {string} [pasta] subpasta dentro do bucket (ex.: 'obs', 'ocorrencias')
 */
export async function uploadArquivo(file, pasta = '') {
  assertConfigurado()

  const ext = file.name.split('.').pop() || 'bin'
  const base = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const caminho = pasta ? `${pasta}/${base}` : base

  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminho}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`Falha no upload: ${resp.status} ${txt}`)
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${caminho}`
}

/** Classifica o arquivo nas categorias usadas pelos anexos de ocorrência. */
export function tipoDoArquivo(file) {
  if (file.type.startsWith('image/')) return 'foto'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'documento'
}

/** Envia um arquivo e devolve o formato de anexo usado nas ocorrências. */
export async function uploadAnexo(file, pasta) {
  return {
    nome: file.name,
    url: await uploadArquivo(file, pasta),
    tipo: tipoDoArquivo(file),
  }
}
