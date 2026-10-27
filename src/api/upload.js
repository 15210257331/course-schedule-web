import request from '@/utils/request'
import { UPLOAD_TIMEOUT } from './attachment'

/** 上传头像 */
export const uploadAvatar = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT
  })
}
