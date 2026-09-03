import request from '@/utils/request'

export const settingApi = {
  list: () => request.post('/settings/list'),
  save: (settings) => request.put('/settings', { settings })
}
