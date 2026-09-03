import request from '@/utils/request'

export const notificationApi = {
  list: (limit = 20) => request.post('/notifications/list', { limit }),
  due: () => request.post('/notifications/due'),
  markRead: (id) => request.post(`/notifications/${id}/read`),
  markAllRead: () => request.post('/notifications/read-all'),
  remove: (id) => request.delete(`/notifications/${id}`)
}