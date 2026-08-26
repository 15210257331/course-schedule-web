import request from '@/utils/request'

export const courseApi = {
  list: (start, end) =>
    request.get('/courses', { params: { start, end } }),
  get: (id) => request.get(`/courses/${id}`),
  create: (data) => request.post('/courses', data),
  update: (id, data) => request.put(`/courses/${id}`, data),
  remove: (id) => request.delete(`/courses/${id}`),
  copy: (id, data) => request.post(`/courses/${id}/copy`, data),
  move: (id, data) => request.put(`/courses/${id}/move`, data),
  copyWeek: (week = 1) => request.post('/courses/copy-week', null, { params: { week } })
}