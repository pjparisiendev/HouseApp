self.addEventListener('push', (event) => {
  const payload = event.data?.json() ?? {}
  const title = payload.title ?? 'HouseApp reminder'

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? '',
      icon: '/app/favicon.svg',
      badge: '/app/favicon.svg',
      data: { url: payload.url ?? '/calendar' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/calendar'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }

      return self.clients.openWindow(url)
    }),
  )
})
