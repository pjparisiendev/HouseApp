import { describe, expect, it, vi } from 'vitest'
import {
  calculateImageDimensions,
  encodePreferredImage,
  IMAGE_PROCESSING_PROFILE,
  validateSourceImage,
} from './imageProcessor'

describe('calculateImageDimensions', () => {
  it('scales landscape and portrait images within the maximum dimension', () => {
    expect(calculateImageDimensions(4000, 3000)).toEqual({
      width: 1600,
      height: 1200,
    })
    expect(calculateImageDimensions(2000, 4000)).toEqual({
      width: 800,
      height: 1600,
    })
  })

  it('does not enlarge a smaller image', () => {
    expect(calculateImageDimensions(800, 600)).toEqual({
      width: 800,
      height: 600,
    })
  })
})

describe('validateSourceImage', () => {
  it('accepts supported images at the raw size limit', () => {
    expect(() =>
      validateSourceImage({
        type: 'image/jpeg',
        size: IMAGE_PROCESSING_PROFILE.maxInputBytes,
      }),
    ).not.toThrow()
  })

  it('rejects unsupported and oversized source files', () => {
    expect(() =>
      validateSourceImage({ type: 'image/gif', size: 100 }),
    ).toThrow('JPG, PNG, or WebP')
    expect(() =>
      validateSourceImage({
        type: 'image/jpeg',
        size: IMAGE_PROCESSING_PROFILE.maxInputBytes + 1,
      }),
    ).toThrow('8 MB or smaller')
  })
})

describe('encodePreferredImage', () => {
  it('uses WebP when the browser returns WebP', async () => {
    const webp = new Blob(['webp'], { type: 'image/webp' })
    const encode = vi.fn().mockResolvedValue(webp)

    await expect(encodePreferredImage(encode, 0.85)).resolves.toBe(webp)
    expect(encode).toHaveBeenCalledOnce()
  })

  it('falls back to JPEG when WebP encoding is unavailable', async () => {
    const unsupported = new Blob(['png'], { type: 'image/png' })
    const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' })
    const encode = vi.fn()
      .mockResolvedValueOnce(unsupported)
      .mockResolvedValueOnce(jpeg)

    await expect(encodePreferredImage(encode, 0.85)).resolves.toBe(jpeg)
    expect(encode).toHaveBeenNthCalledWith(1, 'image/webp', 0.85)
    expect(encode).toHaveBeenNthCalledWith(2, 'image/jpeg', 0.85)
  })
})
