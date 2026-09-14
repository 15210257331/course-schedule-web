import request from '@/utils/request'

/** 上传附件到指定课程模板（学生） */
export const attachmentUpload = (file, templateId) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('templateId', templateId)
  return request.post('/upload/attachment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/** 某课程模板下的附件列表 */
export const attachmentList = (templateId) =>
  request.post('/attachments/list', { templateId })

/** 下载附件（返回 blob，由调用方触发浏览器下载） */
export const attachmentDownload = (id) =>
  request.post('/attachments/download', { id }, { responseType: 'blob' })

/** 删除附件 */
export const attachmentRemove = (id) => request.delete(`/attachments/${id}`)
