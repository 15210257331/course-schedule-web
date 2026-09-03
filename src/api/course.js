import request from '@/utils/request'

export const courseApi = {
  list: (start, end, title) =>
    request.post('/courses/list', { start, end, title }),
  page: (data) => request.post('/courses/page', data),
  get: (id) => request.post('/courses/detail', { id }),
  create: (data) => request.post('/courses', data),
  update: (id, data) => request.put(`/courses/${id}`, data),
  remove: (id) => request.delete(`/courses/${id}`),
  move: (id, data) => request.put(`/courses/${id}/move`, data),
  copyWeek: (week = 1) => request.post('/courses/copy-week', { week })
}