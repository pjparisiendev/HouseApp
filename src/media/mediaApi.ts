import { api, apiBlob } from '../api'
import type { ProcessedImage } from './imageProcessor'

export interface MediaItem {
  id: string
  mimeType: string
  byteSize: number
  width: number
  height: number
  position: number
  isPrimary: boolean
  originalName: string
}

export interface MediaDto {
  id: number
  mime_type: string
  byte_size: number
  width: number
  height: number
  position: number
  is_primary: boolean
  original_name?: string | null
}

export function mapMedia(media: MediaDto): MediaItem {
  return {
    id: String(media.id),
    mimeType: media.mime_type,
    byteSize: media.byte_size,
    width: media.width,
    height: media.height,
    position: media.position,
    isPrimary: media.is_primary,
    originalName: media.original_name ?? 'Photo',
  }
}

export async function uploadProcessedImage(
  endpoint: string,
  image: ProcessedImage,
) {
  const body = new FormData()
  body.append('image', image.file)
  body.append('original_name', image.originalName)
  await api(endpoint, { method: 'POST', body })
}

export function fetchMediaContent(mediaId: string) {
  return apiBlob(`/media/${mediaId}/content`)
}

export function removeMedia(mediaId: string) {
  return api(`/media/${mediaId}`, { method: 'DELETE' })
}

export function makeMediaPrimary(mediaId: string) {
  return api(`/media/${mediaId}/primary`, { method: 'PUT' })
}
