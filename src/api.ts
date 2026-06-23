const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

let apiToken = localStorage.getItem('houseapp-token')

export class ApiError extends Error {
  readonly status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.status = status
  }
}

export function setApiToken(token: string | null) {
  apiToken = token
  if (token) localStorage.setItem('houseapp-token', token)
  else localStorage.removeItem('houseapp-token')
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (apiToken) headers.set('Authorization', `Bearer ${apiToken}`)

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (response.status === 401) setApiToken(null)

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string
      errors?: Record<string, string[]>
    }
    const firstError = body.errors
      ? Object.values(body.errors).flat()[0]
      : undefined
    throw new ApiError(firstError ?? body.message ?? 'Request failed.', response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function apiBlob(path: string): Promise<Blob> {
  const headers = new Headers({ Accept: 'image/*' })
  if (apiToken) headers.set('Authorization', `Bearer ${apiToken}`)

  const response = await fetch(`${API_BASE}${path}`, { headers })
  if (response.status === 401) setApiToken(null)
  if (!response.ok) throw new ApiError('The image could not be loaded.', response.status)

  return response.blob()
}
