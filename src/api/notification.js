import request from '@/utils/request'

/** 提醒列表（课程提醒） */
export const notificationList = (limit = 20) => request.post('/notifications/list', { limit })

/** 获取到期的提醒（用于浏览器弹窗通知） */
export const notificationDue = () => request.post('/notifications/due')

/** 标记某条提醒为已读 */
export const notificationMarkRead = (id) => request.post(`/notifications/${id}/read`)

/** 全部标记为已读 */
export const notificationMarkAllRead = () => request.post('/notifications/read-all')

/** 删除提醒 */
export const notificationRemove = (id) => request.delete(`/notifications/${id}`)
