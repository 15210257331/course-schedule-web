import request from '@/utils/request'

export const settingApi = {
  list: () => request.get('/settings'),
  save: (settings) => request.put('/settings', { settings })
}

export const snapshotApi = {
  get: () => request.get('/snapshot')
}