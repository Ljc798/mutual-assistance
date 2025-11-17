import { UploadFileItem, UploadResultItem, uploadBatch, validateImageBytes } from 'basic'

export interface SquareLocalImage {
  filename: string
  mime: string
  data: Uint8Array
}

export interface SquareUploadResult {
  success: boolean
  urls: string[]
  failed: number
}

export async function uploadSquareImages(files: SquareLocalImage[], userId: number, concurrency: number = 3): Promise<SquareUploadResult> {
  const items: UploadFileItem[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (!validateImageBytes(f.data, f.mime)) { continue }
    items.push({ filename: f.filename, mime: f.mime, data: f.data, extra: { type: 'square', postId: 'temp', userId } })
  }
  const results: UploadResultItem[] = await uploadBatch(items, concurrency, 3)
  const urls: string[] = []
  let failed = 0
  for (const r of results) { if (r.success && r.url) { urls.push(r.url) } else { failed++ } }
  return { success: failed === 0, urls, failed }
}