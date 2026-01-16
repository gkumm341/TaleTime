const CACHE_NAME = 'taletime-v3'
const IS_LOCAL_DEV_HOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'
const STATIC_CACHE_URLS = [
  '/',
  '/search',
  '/favorites',
  '/history',
  '/manifest.json'
]

// Install event
self.addEventListener('install', (event) => {
  // In local dev, avoid precaching pages/chunks. This prevents stale HTML from
  // being served after restarts (which can lead to ChunkLoadError).
  if (IS_LOCAL_DEV_HOST) {
    self.skipWaiting()
    return
  }

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - Cache First strategy for static resources, Network First for API calls
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // In local dev, don't intercept requests at all.
  if (IS_LOCAL_DEV_HOST) {
    return
  }

  // Never intercept Next.js build artifacts. Caching /_next scripts/styles can
  // cause stale chunk loads (e.g. ChunkLoadError) after rebuilds/deploys.
  if (url.pathname.startsWith('/_next/')) {
    return
  }

  // Cache first strategy for static resources
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      url.pathname.includes('/icon-') ||
      url.pathname === '/manifest.json') {
    
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request)
            .then((fetchResponse) => {
              const responseClone = fetchResponse.clone()
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone)
                })
              return fetchResponse
            })
        })
        .catch(() => {
          // Fallback for images
          if (request.destination === 'image') {
            return new Response('<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280">Image Unavailable</text></svg>', {
              headers: { 'Content-Type': 'image/svg+xml' }
            })
          }
        })
    )
    return
  }

  // Network first strategy for pages and API calls
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses (only GET requests)
        if (response.status === 200 && request.method === 'GET') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone)
            })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request)
          .then((response) => {
            if (response) {
              return response
            }
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/')
            }
            
            // Return a generic offline response
            return new Response('Offline', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            })
          })
      })
  )
})

// Background sync for when the app comes back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any background sync tasks here
      console.log('Background sync triggered')
    )
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey || '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Read Story',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/icon-192x192.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})