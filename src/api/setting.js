import request from '@/utils/request'

/** 获取系统设置（默认课时费、默认时长、提醒开关等） */
export const settingList = () => request.post('/settings/list')

/** 保存系统设置 */
export const settingSave = (settings) => request.put('/settings', { settings })
