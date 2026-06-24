import { api } from './api'

interface PushKeyResponse {
  public_key?: string | null
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)

  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)))
}

export function pushNotificationsSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function enablePushNotifications() {
  if (!pushNotificationsSupported()) {
    throw new Error('Push notifications are not supported on this device.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const { public_key: publicKey } = await api<PushKeyResponse>('/push/public-key')
  if (!publicKey) {
    throw new Error('Push notifications are not configured on the server yet.')
  }

  const registration = await navigator.serviceWorker.ready
  const existingSubscription = await registration.pushManager.getSubscription()
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  await api('/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      ...subscription.toJSON(),
      content_encoding: 'aes128gcm',
    }),
  })
}
