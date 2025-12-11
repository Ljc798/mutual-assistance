import http from '@ohos.net.http'
import { GlobalVariable } from '../components/GlobalVariable'

export type UploadScene = 'square' | 'avatar'

export interface UploadExtraFields {
  type: UploadScene
  username?: string
  postId?: string
  userId?: number
}

export interface UploadFileItem {
  filename: string
  mime: string
  data: Uint8Array
  extra: UploadExtraFields
}

export interface UploadResultItem {
  success: boolean
  url?: string
  error?: string
}

export interface UploadProgressEvent {
  index: number
  loaded: number
  total: number
}

function buildBoundary(): string {
  const ts = Date.now().toString(36)
  const rand = Math.floor(Math.random() * 1e9).toString(36)
  return `----ArkTsBoundary_${ts}_${rand}`
}

function encodeText(value: string): Uint8Array {
  const codes: number[] = []
  let i = 0
  while (i < value.length) {
    let codePoint = value.charCodeAt(i)
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = ((codePoint - 0xd800) * 0x400) + (next - 0xdc00) + 0x10000
        i += 1
      }
    }
    if (codePoint < 0x80) { codes.push(codePoint) }
    else if (codePoint < 0x800) {
      codes.push(0xc0 | (codePoint >> 6))
      codes.push(0x80 | (codePoint & 0x3f))
    } else if (codePoint < 0x10000) {
      codes.push(0xe0 | (codePoint >> 12))
      codes.push(0x80 | ((codePoint >> 6) & 0x3f))
      codes.push(0x80 | (codePoint & 0x3f))
    } else {
      codes.push(0xf0 | (codePoint >> 18))
      codes.push(0x80 | ((codePoint >> 12) & 0x3f))
      codes.push(0x80 | ((codePoint >> 6) & 0x3f))
      codes.push(0x80 | (codePoint & 0x3f))
    }
    i += 1
  }
  const out = new Uint8Array(codes.length)
  for (let j = 0; j < codes.length; j++) { out[j] = codes[j] }
  return out
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0
  for (const p of parts) { total += p.length }
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) { out.set(p, offset); offset += p.length }
  return out
}

function buildMultipartBody(item: UploadFileItem, boundary: string): ArrayBuffer {
  const dashBoundary = `--${boundary}`
  const crlf = `\r\n`
  const headParts: string[] = []
  headParts.push(`${dashBoundary}${crlf}`)
  headParts.push(`Content-Disposition: form-data; name="type"${crlf}${crlf}${item.extra.type}${crlf}`)
  if (item.extra.username) { headParts.push(`${dashBoundary}${crlf}Content-Disposition: form-data; name="username"${crlf}${crlf}${item.extra.username}${crlf}`) }
  if (item.extra.postId) { headParts.push(`${dashBoundary}${crlf}Content-Disposition: form-data; name="postId"${crlf}${crlf}${item.extra.postId}${crlf}`) }
  if (item.extra.userId !== undefined) { headParts.push(`${dashBoundary}${crlf}Content-Disposition: form-data; name="userId"${crlf}${crlf}${item.extra.userId}${crlf}`) }
  headParts.push(`${dashBoundary}${crlf}`)
  headParts.push(`Content-Disposition: form-data; name="image"; filename="${item.filename}"${crlf}`)
  headParts.push(`Content-Type: ${item.mime}${crlf}${crlf}`)
  const tail = `${crlf}${dashBoundary}--${crlf}`
  const headBytes = encodeText(headParts.join(''))
  const tailBytes = encodeText(tail)
  const bytes = concatBytes([headBytes, item.data, tailBytes])
  return bytes.buffer
}

interface MultipartHeader { 'Content-Type': string }
interface MultipartHeaderWithLength { 'Content-Type': string, 'Content-Length': string }
interface MultipartHeaderAuthLen { 'Content-Type': string, 'Content-Length': string, Authorization?: string }

interface GeneratedTypeLiteralInterface_1 {
  success: boolean;
  imageUrl?: string;
  message?: string;
}

export async function uploadSingle(
  item: UploadFileItem,
  progress?: (evt: UploadProgressEvent) => void,
  index: number = 0,
  endpoint?: string,
  authToken?: string
): Promise<UploadResultItem> {
  const boundary = buildBoundary()
  const body = buildMultipartBody(item, boundary)
  const client = http.createHttp()
  try {
    const headersWithLen: MultipartHeaderAuthLen = { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': `${(body as ArrayBuffer).byteLength}` }
    if (authToken && authToken.length > 0) { headersWithLen.Authorization = `Bearer ${authToken}` }
    const options: http.HttpRequestOptions = {
      method: http.RequestMethod.POST,
      header: headersWithLen as Object,
      connectTimeout: GlobalVariable.TIME_OUT,
      readTimeout: GlobalVariable.TIME_OUT,
      extraData: body
    }
    const sz = (body as ArrayBuffer).byteLength
    console.info('[UploadManager] request.start', JSON.stringify({ index, filename: item.filename, size: sz }))
    if (progress) { progress({ index, loaded: sz, total: sz }) }
    const url = endpoint && endpoint.length > 0 ? endpoint : `${GlobalVariable.BASE_URL}/uploads/upload-image`
    const res = await client.request(url, options)
    console.info('[UploadManager] response.code', JSON.stringify({ index, code: res.responseCode }))
    if (res.responseCode >= 200 && res.responseCode < 300) {
      const text = typeof res.result === 'string' ? res.result : JSON.stringify(res.result)
      const parsed = JSON.parse(text) as GeneratedTypeLiteralInterface_1
      console.info('[UploadManager] response.body', text)
      if (!parsed.success || !parsed.imageUrl) { return { success: false, error: parsed.message ?? 'upload failed' } }
      console.info('[UploadManager] response.ok', JSON.stringify({ index, url: parsed.imageUrl }))
      return { success: true, url: parsed.imageUrl }
    }
    return { success: false, error: `HTTP ${res.responseCode}` }
  } catch (error) {
    const msg: string = (error && (error as Error).message) ? (error as Error).message : 'upload error'
    return { success: false, error: msg }
  } finally {
    client.destroy()
  }
}

async function startWorker(workerId: number, workerCount: number, items: UploadFileItem[], maxRetries: number, progress?: (evt: UploadProgressEvent) => void, results?: UploadResultItem[]): Promise<void> {
  const out = results!
  for (let idx = workerId; idx < items.length; idx += workerCount) {
    let attempt = 0
    let last: UploadResultItem | undefined
    while (attempt < maxRetries) {
      const r = await uploadSingle(items[idx], progress, idx)
      if (r.success) { out[idx] = r; last = r; break }
      attempt++
      last = r
    }
    if (!out[idx]) { out[idx] = last ?? { success: false, error: 'unknown' } }
  }
}

export async function uploadBatch(items: UploadFileItem[], concurrency: number = 3, maxRetries: number = 3, progress?: (evt: UploadProgressEvent) => void): Promise<UploadResultItem[]> {
  const results: UploadResultItem[] = new Array(items.length)
  const workerCount = Math.max(1, Math.min(concurrency, items.length))
  const tasks: Promise<void>[] = []
  for (let i = 0; i < workerCount; i++) {
    tasks.push(startWorker(i, workerCount, items, maxRetries, progress, results))
  }
  await Promise.all(tasks)
  return results
}

export function validateImageBytes(data: Uint8Array, mime: string): boolean {
  const MAX = 5 * 1024 * 1024
  const allowed: string[] = ['image/jpeg', 'image/png', 'image/gif']
  if (data.length > MAX) { return false }
  return allowed.indexOf(mime) >= 0
}
