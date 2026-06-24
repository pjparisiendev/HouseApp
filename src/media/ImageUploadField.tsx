import { IonIcon, IonNote, IonSpinner } from '@ionic/react'
import { cameraOutline, cloudUploadOutline } from 'ionicons/icons'
import { useState } from 'react'
import { processImage, type ProcessedImage } from './imageProcessor'

interface ImageUploadFieldProps {
  currentCount: number
  maxFiles?: number
  disabled?: boolean
  onProcessed: (images: ProcessedImage[]) => void
}

export function ImageUploadField({
  currentCount,
  maxFiles = 5,
  disabled = false,
  onProcessed,
}: ImageUploadFieldProps) {
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const remaining = Math.max(0, maxFiles - currentCount)

  async function handleFiles(files: FileList | null) {
    if (!files?.length || remaining === 0) return
    setProcessing(true)
    setMessage('')
    try {
      const selected = Array.from(files).slice(0, remaining)
      let processedCount = 0
      for (const file of selected) {
        onProcessed([await processImage(file)])
        processedCount += 1
      }
      if (files.length > remaining) {
        setMessage(`Only ${remaining} more photo${remaining === 1 ? '' : 's'} can be added.`)
      } else if (processedCount > 1) {
        setMessage(`${processedCount} photos were optimized and added.`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The image could not be processed. No more selected photos were added.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="shared-image-uploader">
      <div className="inventory-image-actions">
        <label className={`file-picker-button${disabled || remaining === 0 ? ' disabled' : ''}`}>
          <IonIcon icon={cameraOutline} /> Take photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={disabled || processing || remaining === 0}
            onChange={(event) => {
              void handleFiles(event.target.files)
              event.currentTarget.value = ''
            }}
          />
        </label>
        <label className={`file-picker-button${disabled || remaining === 0 ? ' disabled' : ''}`}>
          <IonIcon icon={cloudUploadOutline} /> Upload photos
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={disabled || processing || remaining === 0}
            onChange={(event) => {
              void handleFiles(event.target.files)
              event.currentTarget.value = ''
            }}
          />
        </label>
        {processing && <IonSpinner name="crescent" />}
      </div>
      <IonNote>
        {remaining > 0
          ? `${remaining} photo${remaining === 1 ? '' : 's'} remaining. Photos are optimized for phone memory before upload.`
          : 'The gallery is full.'}
      </IonNote>
      {message && <IonNote color="danger">{message}</IonNote>}
    </div>
  )
}
