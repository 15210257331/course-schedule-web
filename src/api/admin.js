import request from '@/utils/request'
import { UPLOAD_TIMEOUT } from './attachment'

/* ---------- 管理端 - 教师管理 ---------- */

/** 教师分页列表 */
export const adminTeacherPage = (data) => request.post('/admin/teachers/page', data)

/** 教师详情 */
export const adminTeacherDetail = (id) => request.post('/admin/teachers/detail', { id })

/** 启用/禁用教师账号 */
export const adminTeacherUpdateStatus = (data) => request.post('/admin/teachers/status', data)

/** 重置教师密码（新密码发送至邮箱） */
export const adminTeacherResetPassword = (id) => request.post('/admin/teachers/reset-password', { id })

/* ---------- 管理端 - 消息推送 ---------- */

/** 消息分页列表 */
export const adminMessagePage = (data) => request.post('/admin/messages/page', data)

/** 消息详情 */
export const adminMessageDetail = (id) => request.post('/admin/messages/detail', { id })

/** 消息阅读明细（哪些老师已读 / 未读） */
export const adminMessageReadDetail = (id) => request.post('/admin/messages/read-detail', { id })

/** 发布消息 */
export const adminMessageCreate = (data) => request.post('/admin/messages', data)

/** 编辑消息 */
export const adminMessageUpdate = (data) => request.post('/admin/messages/update', data)

/** 撤回消息（教师端不再显示） */
export const adminMessageRevoke = (id) => request.post('/admin/messages/revoke', { id })

/** 重新发布已撤回的消息 */
export const adminMessagePublish = (id) => request.post('/admin/messages/publish', { id })

/** 删除消息 */
export const adminMessageRemove = (id) => request.post('/admin/messages/delete', { id })

/** 搜索教师选项（指定目标教师时用） */
export const adminMessageTeacherOptions = (keyword) => request.post('/admin/messages/teacher-options', { keyword })

/* ---------- 管理端 - 数据看板 ---------- */

/** 数据看板概览（近 N 天统计） */
export const adminDashboardOverview = (days = 30) => request.post('/admin/dashboard/overview', { days })

/* ---------- 管理端 - 操作日志 ---------- */

/** 操作日志分页列表 */
export const adminLogPage = (data) => request.post('/admin/logs/page', data)

/* ---------- 管理端 - 自动备份记录 ---------- */

/** 最近自动备份记录 */
export const adminBackupRecent = (limit = 20) => request.post('/admin/backup/recent', { limit })

/** 下载自动备份文件（返回 blob） */
export const adminBackupDownload = (id) => request.post('/admin/backup/download', { id }, { responseType: 'blob' })

/** 全局备份存储位置（cos/local） */
export const adminBackupStorageSetting = () => request.post('/admin/backup/storage-setting')

/** 更新全局备份存储位置 */
export const adminBackupStorageSave = (storageType) => request.post('/admin/backup/storage-setting/save', { storageType })

/** 立即手动备份一次（按当前全局存储位置） */
export const adminBackupRun = () => request.post('/admin/backup/run')

/** 导入备份 JSON 恢复数据库（清空当前业务数据后全量还原，账号表保留） */
export const adminBackupRestore = (file) => {
  const form = new FormData()
  form.append('file', file)
  return request.post('/admin/backup/restore', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT
  })
}

/* ---------- 教师端 - 系统消息 ---------- */

/** 系统消息列表（公告/活动/通知） */
export const messageList = (limit = 20) => request.post('/messages/list', { limit })

/** 标记某条系统消息为已读 */
export const messageMarkRead = (id) => request.post('/messages/read', { id })

/** 全部系统消息标记为已读 */
export const messageMarkAllRead = () => request.post('/messages/read-all')
