import request from '@/utils/request'

/** 课程模板列表（按学生姓名模糊查询） */
export const templateList = (name) => request.post('/course-templates/list', { name })

/** 课程模板分页列表 */
export const templatePage = (data) => request.post('/course-templates/page', data)

/** 新增课程模板 */
export const templateCreate = (data) => request.post('/course-templates', data)

/** 编辑课程模板 */
export const templateUpdate = (id, data) => request.put(`/course-templates/${id}`, data)

/** 删除课程模板 */
export const templateRemove = (id) => request.delete(`/course-templates/${id}`)
