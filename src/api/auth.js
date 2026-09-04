import request from '@/utils/request'

/** 登录 */
export const authLogin = (data) => request.post('/auth/login', data)

/** 注册 */
export const authRegister = (data) => request.post('/auth/register', data)

/** 获取当前用户信息 */
export const authProfile = () => request.post('/auth/profile')

/** 更新个人资料 */
export const authUpdateProfile = (data) => request.put('/auth/profile', data)

/** 修改密码 */
export const authUpdatePassword = (data) => request.put('/auth/password', data)

/** 发送重置密码验证码到邮箱 */
export const authSendResetCode = (email) => request.post('/auth/reset-code', { email })

/** 通过邮箱验证码重置密码 */
export const authResetPassword = (data) => request.post('/auth/reset-password', data)
