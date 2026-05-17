// Versão muda a cada deploy para invalidar cache automaticamente
const BUILD = '__BUILD_VERSION__'
const CACHE = `sosentry-${BUILD}`

const STATIC = [
  '/index.html',
  '/manifest.json',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // allSettled: falha em 1 arquivo não impede instalação dos outros
      Promise.allSettled(STATIC.map(url => c.add(url)))
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // API: sempre rede, nunca cacheia
  if (url.pathname.startsWith('/api/')) return

  if (request.method !== 'GET') return

  // HTML: network-first para garantir versão atualizada
  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
          }
          return res
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Demais assets: cache-first
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
        }
        return res
      })
    }).catch(() => {
      if (request.mode === 'navigate') return caches.match('/index.html')
    })
  )
})

// Push notifications
self.addEventListener('push', (e) => {
  if (!e.data) return
  const data = e.data.json()
  const title = data.title || 'SOS Entry'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: data.actions || [],
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

// Clique na notificação → abre/foca o app na URL correta
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = e.notification.data?.url || '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        existing.navigate(target)
      } else {
        clients.openWindow(target)
      }
    })
  )
})
