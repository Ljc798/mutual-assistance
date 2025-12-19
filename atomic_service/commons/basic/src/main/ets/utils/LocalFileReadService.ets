import fs from '@ohos.file.fs'

export async function readFileAsBytes(path: string): Promise<Uint8Array> {
  const realPath = normalizePath(path)
  try {
    const file = await fs.open(realPath, fs.OpenMode.READ_ONLY)
    const stat = await fs.stat(realPath)
    console.info('[LocalFileRead] open.ok', JSON.stringify({ path: realPath, size: stat.size }))
    const buf = new ArrayBuffer(stat.size)
    await fs.read(file.fd, buf)
    await fs.close(file.fd)
    return new Uint8Array(buf)
  } catch (error) {
    const msg: string = (error && (error as Error).message) ? (error as Error).message : 'open failed'
    console.warn('[LocalFileRead] open.fail', JSON.stringify({ path: realPath, message: msg }))
    // 尝试备用前缀映射
    const alt1: string = buildAltPath('/storage/', path)
    try {
      const file = await fs.open(alt1, fs.OpenMode.READ_ONLY)
      const stat = await fs.stat(alt1)
      console.info('[LocalFileRead] alt1.ok', JSON.stringify({ path: alt1, size: stat.size }))
      const buf = new ArrayBuffer(stat.size)
      await fs.read(file.fd, buf)
      await fs.close(file.fd)
      return new Uint8Array(buf)
    } catch (error2) {
      const msg2: string = (error2 && (error2 as Error).message) ? (error2 as Error).message : 'alt1 failed'
      console.warn('[LocalFileRead] alt1.fail', JSON.stringify({ path: alt1, message: msg2 }))
      const alt2: string = buildAltPath('/data/storage/el2/base/', path)
      const file = await fs.open(alt2, fs.OpenMode.READ_ONLY)
      const stat = await fs.stat(alt2)
      console.info('[LocalFileRead] alt2.ok', JSON.stringify({ path: alt2, size: stat.size }))
      const buf = new ArrayBuffer(stat.size)
      await fs.read(file.fd, buf)
      await fs.close(file.fd)
      return new Uint8Array(buf)
    }
  }
}

export function guessMimeByName(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) { return 'image/jpeg' }
  if (lower.endsWith('.png')) { return 'image/png' }
  if (lower.endsWith('.gif')) { return 'image/gif' }
  return 'application/octet-stream'
}

function normalizePath(input: string): string {
  if (!input) { return input }
  if (input.startsWith('file://media/')) {
    return '/storage/' + input.substring('file://'.length)
  }
  if (input.startsWith('/media/')) {
    return '/storage' + input
  }
  return input
}

function buildAltPath(prefix: string, input: string): string {
  if (input.startsWith('file://')) { return prefix + input.substring('file://'.length) }
  if (input.startsWith('/')) { return prefix + input.substring(1) }
  return prefix + input
}