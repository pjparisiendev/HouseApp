/* eslint-disable react-hooks/set-state-in-effect */
import { IonBadge, IonButton, IonIcon, IonNote } from '@ionic/react'
import {
  chevronBackOutline,
  chevronForwardOutline,
  starOutline,
  trashOutline,
} from 'ionicons/icons'
import { useEffect, useMemo, useState } from 'react'
import { fetchMediaContent, type MediaItem } from './mediaApi'

interface ImageGalleryProps {
  media: MediaItem[]
  alt: string
  editable?: boolean
  onDelete?: (mediaId: string) => Promise<void>
  onPrimary?: (mediaId: string) => Promise<void>
}

export function ImageGallery({
  media,
  alt,
  editable = false,
  onDelete,
  onPrimary,
}: ImageGalleryProps) {
  const ordered = useMemo(
    () => [...media].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position),
    [media],
  )
  const [selectedId, setSelectedId] = useState(ordered[0]?.id ?? '')
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    setSelectedId((current) =>
      ordered.some((item) => item.id === current) ? current : ordered[0]?.id ?? '',
    )
  }, [ordered])

  useEffect(() => {
    let active = true
    const createdUrls: string[] = []
    setUrls({})
    setError('')
    Promise.all(
      ordered.map(async (item) => {
        const blob = await fetchMediaContent(item.id)
        const url = URL.createObjectURL(blob)
        createdUrls.push(url)
        return [item.id, url] as const
      }),
    )
      .then((entries) => active && setUrls(Object.fromEntries(entries)))
      .catch(() => active && setError('One or more photos could not be loaded.'))

    return () => {
      active = false
      createdUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [ordered])

  const selectedIndex = Math.max(0, ordered.findIndex((item) => item.id === selectedId))
  const selected = ordered[selectedIndex]

  if (!selected) return null

  function move(offset: number) {
    const index = (selectedIndex + offset + ordered.length) % ordered.length
    setSelectedId(ordered[index].id)
  }

  return (
    <div className="shared-image-gallery">
      <div className="gallery-main">
        {urls[selected.id] ? (
          <img src={urls[selected.id]} alt={`${alt} ${selectedIndex + 1}`} />
        ) : (
          <IonNote>{error || 'Loading photo...'}</IonNote>
        )}
        {ordered.length > 1 && (
          <>
            <IonButton className="gallery-previous" fill="solid" aria-label="Previous photo" onClick={() => move(-1)}>
              <IonIcon slot="icon-only" icon={chevronBackOutline} />
            </IonButton>
            <IonButton className="gallery-next" fill="solid" aria-label="Next photo" onClick={() => move(1)}>
              <IonIcon slot="icon-only" icon={chevronForwardOutline} />
            </IonButton>
          </>
        )}
        <IonBadge className="gallery-count">{selectedIndex + 1} / {ordered.length}</IonBadge>
      </div>

      <div className="gallery-thumbnails">
        {ordered.map((item, index) => (
          <button
            className={item.id === selected.id ? 'active' : ''}
            type="button"
            key={item.id}
            onClick={() => setSelectedId(item.id)}
          >
            {urls[item.id] && <img src={urls[item.id]} alt={`${alt} thumbnail ${index + 1}`} />}
            {item.isPrimary && <IonIcon icon={starOutline} />}
          </button>
        ))}
      </div>

      {editable && (
        <div className="gallery-actions">
          {!selected.isPrimary && onPrimary && (
            <IonButton size="small" fill="outline" onClick={() => void onPrimary(selected.id)}>
              <IonIcon slot="start" icon={starOutline} /> Make primary
            </IonButton>
          )}
          {onDelete && (
            <IonButton size="small" fill="clear" color="danger" onClick={() => void onDelete(selected.id)}>
              <IonIcon slot="start" icon={trashOutline} /> Delete photo
            </IonButton>
          )}
        </div>
      )}
    </div>
  )
}
