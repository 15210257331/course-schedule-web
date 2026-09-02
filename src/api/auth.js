import request from '@/utils/request'

export const authApi = {
  login: (data) => request.post('/auth/login', data),
  register: (data) => request.post('/auth/register', data),
  profile: () => request.get('/auth/profile'),
  updateProfile: (data) => request.put('/auth/profile', data),
  updatePassword: (data) => request.put('/auth/password', data),
  sendResetCode: (email) => request.post('/auth/reset-code', { email }),
  resetPassword: (data) => request.post('/auth/reset-password', data)
}