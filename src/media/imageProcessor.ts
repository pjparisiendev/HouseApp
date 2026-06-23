export const IMAGE_PROCESSING_PROFILE = {
  maxInputBytes: 8 * 1024 * 1024,
  targetBytes: Math.floor(1.5 * 1024 * 1024),
  maxDimension: 1600,
  initialQuality: 0.85,
  minimumQuality: 0.7,
} as const

const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface ProcessedImage {
  file: File
  originalName: string
  width: number
  height: number
  originalBytes: number
  processedBytes: number
}

export function calculateImageDimensions(
  width: number,
  height: number,
  maxDimension = IMAGE_PROCESSING_PROFILE.maxDimension,
) {
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function validateSourceImage(file: Pick<File, 'size' | 'type'>) {
  if (!supportedTypes.has(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP image.')
  }
  if (file.size > IMAGE_PROCESSING_PROFILE.maxInputBytes) {
    throw new Error('The original image must be 8 MB or smaller.')
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('The image could not be encoded.')),
      type,
      quality,
    )
  })
}

async function decodeImage(file: File) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      })
      return {
        source: bitmap as CanvasImageSource,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      }
    } catch {
      // Fall through to the broadly supported HTML image decoder.
    }
  }

  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url
  await image.decode()
  return {
    source: image as CanvasImageSource,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(url),
  }
}

function drawImage(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('Image processing is unavailable in this browser.')
  context.clearRect(0, 0, width, height)
  context.drawImage(source, 0, 0, width, height)
}

async function encodeAtBestSize(canvas: HTMLCanvasElement) {
  for (
    let quality = IMAGE_PROCESSING_PROFILE.initialQuality;
    quality >= IMAGE_PROCESSING_PROFILE.minimumQuality - 0.001;
    quality -= 0.05
  ) {
    const blob = await encodePreferredImage(
      (type, requestedQuality) => canvasToBlob(canvas, type, requestedQuality),
      quality,
    )
    if (blob.size <= IMAGE_PROCESSING_PROFILE.targetBytes) return blob
  }

  return null
}

export async function encodePreferredImage(
  encode: (type: string, quality: number) => Promise<Blob>,
  quality: number,
) {
  const webp = await encode('image/webp', quality)
  return webp.type === 'image/webp'
    ? webp
    : encode('image/jpeg', quality)
}

export async function processImage(file: File): Promise<ProcessedImage> {
  validateSourceImage(file)
  const decoded = await decodeImage(file)
  const canvas = document.createElement('canvas')

  try {
    let dimensions = calculateImageDimensions(decoded.width, decoded.height)
    let blob: Blob | null = null

    for (let attempt = 0; attempt < 8 && !blob; attempt += 1) {
      drawImage(canvas, decoded.source, dimensions.width, dimensions.height)
      blob = await encodeAtBestSize(canvas)
      if (!blob) {
        dimensions = {
          width: Math.max(1, Math.round(dimensions.width * 0.9)),
          height: Math.max(1, Math.round(dimensions.height * 0.9)),
        }
      }
    }

    if (!blob || blob.size > IMAGE_PROCESSING_PROFILE.targetBytes) {
      throw new Error('The image could not be reduced below 1.5 MB.')
    }

    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    const processedFile = new File([blob], `${baseName}.${extension}`, {
      type: blob.type,
      lastModified: Date.now(),
    })

    return {
      file: processedFile,
      originalName: file.name,
      width: canvas.width,
      height: canvas.height,
      originalBytes: file.size,
      processedBytes: processedFile.size,
    }
  } finally {
    decoded.cleanup()
  }
}
