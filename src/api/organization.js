import request from '@/utils/request'

export const organizationApi = {
  list: () => request.get('/organizations'),
  create: (data) => request.post('/organizations', data),
  update: (id, data) => request.put(`/organizations/${id}`, data),
  remove: (id) => request.delete(`/organizations/${id}`)
}