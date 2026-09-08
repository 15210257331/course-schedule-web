import request from '@/utils/request'

/** 上传附件（可指定分组 groupId；不挂业务对象时缺省作为通用附件入库） */
export const attachmentUpload = (file, { groupId = null, bizType = null, bizId = null } = {}) => {
  const formData = new FormData()
  formData.append('file', file)
  if (groupId != null) formData.append('groupId', groupId)
  if (bizType != null) formData.append('bizType', bizType)
  if (bizId != null) formData.append('bizId', bizId)
  return request.post('/upload/attachment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/** 附件列表（按业务对象筛选，兼容旧调用） */
export const attachmentList = (bizType, bizId) =>
  request.post('/attachments/list', { bizType, bizId })

/** 当前用户全部附件（附件管理页面，跨业务对象统一展示） */
export const attachmentListAll = () => request.post('/attachments/list-all')

/** 移动附件到分组（groupId 为 null 表示移出分组） */
export const attachmentMoveGroup = (id, groupId) =>
  request.post('/attachments/move-group', { id, groupId })

/** 下载附件（返回 blob，由调用方触发浏览器下载） */
export const attachmentDownload = (id) =>
  request.post('/attachments/download', { id }, { responseType: 'blob' })

/** 删除附件 */
export const attachmentRemove = (id) => request.delete(`/attachments/${id}`)

/* ========== 附件分组 ========== */

/** 分组列表 */
export const attachmentGroupList = () => request.post('/attachment-groups/list')

/** 新建分组 */
export const attachmentGroupCreate = (name) => request.post('/attachment-groups', { name })

/** 重命名分组 */
export const attachmentGroupUpdate = (id, name) => request.put(`/attachment-groups/${id}`, { name })

/** 删除分组（其下附件一并删除） */
export const attachmentGroupRemove = (id) => request.delete(`/attachment-groups/${id}`)