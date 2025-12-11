import { UploadFileItem, UploadResultItem, uploadSingle, validateImageBytes, GlobalVariable } from 'basic'

export interface AvatarLocalImage {
  filename: string
  mime: string
  data: Uint8Array
}

export interface AvatarUploadResult {
  success: boolean
  url?: string
  error?: string
}

export async function uploadAvatarImage(file: AvatarLocalImage, username: string, token?: string): Promise<AvatarUploadResult> {
  if (!validateImageBytes(file.data, file.mime)) { return { success: false, error: 'invalid image' } }
  const item: UploadFileItem = { filename: file.filename, mime: file.mime, data: file.data, extra: { type: 'avatar', username } }
  const endpoint = `${GlobalVariable.BASE_URL}/uploads/harmony/upload-avatar`
  const res: UploadResultItem = await uploadSingle(item, undefined, 0, endpoint, token)
  if (!res.success || !res.url) { return { success: false, error: res.error } }
  return { success: true, url: res.url }
}
