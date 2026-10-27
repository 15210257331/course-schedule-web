import request from '@/utils/request'

/** 上传类接口超时（大文件走慢速上行带宽时 15s 不够用） */
export const UPLOAD_TIMEOUT = 5 * 60 * 1000

/** 上传课件并关联到多个学生（studentIds 为学生 id 数组，至少一个） */
export const attachmentUpload = (file, studentIds) => {
  const ids = Array.isArray(studentIds) ? studentIds : (studentIds ? [studentIds] : [])
  const formData = new FormData()
  formData.append('file', file)
  ids.forEach(id => formData.append('studentIds', id))
  return request.post('/upload/attachment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT
  })
}

/** 某学生关联的课件列表 */
export const attachmentList = (studentId) =>
  request.post('/attachments/list', { studentId })

/** 课件分页列表（课件管理页，支持按学生/关键字筛选） */
export const attachmentPage = (data) => request.post('/attachments/page', data)

/** 下载课件（返回 blob，由调用方触发浏览器下载） */
export const attachmentDownload = (id) =>
  request.post('/attachments/download', { id }, { responseType: 'blob' })

/** 修改课件关联的学生（全量覆盖，studentIds 至少一个） */
export const attachmentUpdateStudents = (id, studentIds) =>
  request.post('/attachments/update-students', { id, studentIds })

/** 删除课件 */
export const attachmentRemove = (id) => request.delete(`/attachments/${id}`)
