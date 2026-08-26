import request from '@/utils/request'

export const salaryRuleApi = {
  list: () => request.get('/salary-rules'),
  create: (data) => request.post('/salary-rules', data),
  update: (id, data) => request.put(`/salary-rules/${id}`, data),
  remove: (id) => request.delete(`/salary-rules/${id}`)
}