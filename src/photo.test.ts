import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resizePhoto } from './photo'

let drawImage: ReturnType<typeof vi.fn>
let canvasRef: { width: number; height: number }

function setup(width: number, height: number, blob: Blob | null = new Blob(['x'])) {
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height }))
  drawImage = vi.fn()
  const realCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag !== 'canvas') return realCreate(tag)
    canvasRef = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (cb: (b: Blob | null) => void) => cb(blob),
    } as never
    return canvasRef as never
  })
}

describe('resizePhoto', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('caps the longest side at 1000 for a landscape image', async () => {
    setup(4000, 3000)
    await resizePhoto(new File(['x'], 'a.jpg'))
    expect([canvasRef.width, canvasRef.height]).toEqual([1000, 750])
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1000, 750)
  })

  it('caps the longest side at 1000 for a portrait image', async () => {
    setup(3000, 4000)
    await resizePhoto(new File(['x'], 'a.jpg'))
    expect([canvasRef.width, canvasRef.height]).toEqual([750, 1000])
  })

  it('never upscales small images', async () => {
    setup(400, 300)
    await resizePhoto(new File(['x'], 'a.jpg'))
    expect([canvasRef.width, canvasRef.height]).toEqual([400, 300])
  })

  it('leaves an image exactly at the limit unchanged', async () => {
    setup(1000, 500)
    await resizePhoto(new File(['x'], 'a.jpg'))
    expect([canvasRef.width, canvasRef.height]).toEqual([1000, 500])
  })

  it('honours a custom maxSide and rounds dimensions', async () => {
    setup(1001, 333)
    await resizePhoto(new File(['x'], 'a.jpg'), 500)
    expect(canvasRef.width).toBe(500)
    expect(canvasRef.height).toBe(Math.round(333 * (500 / 1001)))
  })

  it('asks for EXIF orientation and rejects when toBlob yields null', async () => {
    setup(100, 100, null)
    await expect(resizePhoto(new File(['x'], 'a.jpg'))).rejects.toThrow('resize failed')
    expect(createImageBitmap).toHaveBeenCalledWith(expect.any(File), { imageOrientation: 'from-image' })
  })
})
