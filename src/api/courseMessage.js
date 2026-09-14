import request from '@/utils/request'

/** 课程提醒列表 */
export const courseMessageList = (limit = 20) => request.post('/course-messages/list', { limit })

/** 获取到期的提醒（用于浏览器弹窗通知） */
export const courseMessageDue = () => request.post('/course-messages/due')

/** 标记某条提醒为已读 */
export const courseMessageMarkRead = (id) => request.post(`/course-messages/${id}/read`)

/** 全部标记为已读 */
export const courseMessageMarkAllRead = () => request.post('/course-messages/read-all')

/** 删除提醒 */
export const courseMessageRemove = (id) => request.delete(`/course-messages/${id}`)
