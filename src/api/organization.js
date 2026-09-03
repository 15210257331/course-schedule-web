import request from '@/utils/request'

export const organizationApi = {
  list: (name) => request.post('/organizations/list', { name }),
  page: (data) => request.post('/organizations/page', data),
  create: (data) => request.post('/organizations', data),
  update: (id, data) => request.put(`/organizations/${id}`, data),
  remove: (id) => request.delete(`/organizations/${id}`)
}