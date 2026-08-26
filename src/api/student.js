import request from '@/utils/request'

export const studentApi = {
  list: () => request.get('/students'),
  create: (data) => request.post('/students', data),
  update: (id, data) => request.put(`/students/${id}`, data),
  remove: (id) => request.delete(`/students/${id}`)
}