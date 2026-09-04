import request from '@/utils/request'

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

/* ---------- 教师端 - 系统消息 ---------- */

/** 系统消息列表（公告/活动/通知） */
export const messageList = (limit = 20) => request.post('/messages/list', { limit })

/** 标记某条系统消息为已读 */
export const messageMarkRead = (id) => request.post('/messages/read', { id })
