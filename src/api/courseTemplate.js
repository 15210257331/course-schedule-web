import request from '@/utils/request'

export const templateApi = {
  list: (name) => request.post('/course-templates/list', { name }),
  page: (data) => request.post('/course-templates/page', data),
  create: (data) => request.post('/course-templates', data),
  update: (id, data) => request.put(`/course-templates/${id}`, data),
  remove: (id) => request.delete(`/course-templates/${id}`)
}
