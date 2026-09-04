import request from '@/utils/request'

/** 按时间范围查询课程列表 */
export const courseList = (start, end, title) => request.post('/courses/list', { start, end, title })

/** 课程分页列表 */
export const coursePage = (data) => request.post('/courses/page', data)

/** 课程详情 */
export const courseDetail = (id) => request.post('/courses/detail', { id })

/** 新增课程 */
export const courseCreate = (data) => request.post('/courses', data)

/** 编辑课程 */
export const courseUpdate = (id, data) => request.put(`/courses/${id}`, data)

/** 删除课程 */
export const courseRemove = (id) => request.delete(`/courses/${id}`)

/** 拖拽移动课程（调整时间） */
export const courseMove = (id, data) => request.put(`/courses/${id}/move`, data)

/** 复制本周课程到下周 */
export const courseCopyWeek = (week = 1) => request.post('/courses/copy-week', { week })
