import request from '@/utils/request'

/** 机构列表（按名称模糊查询） */
export const organizationList = (name) => request.post('/organizations/list', { name })

/** 机构分页列表 */
export const organizationPage = (data) => request.post('/organizations/page', data)

/** 新增机构 */
export const organizationCreate = (data) => request.post('/organizations', data)

/** 编辑机构 */
export const organizationUpdate = (id, data) => request.put(`/organizations/${id}`, data)

/** 删除机构 */
export const organizationRemove = (id) => request.delete(`/organizations/${id}`)
