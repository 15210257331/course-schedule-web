import request from '@/utils/request'

/** 学生列表（按学生姓名模糊查询） */
export const studentList = (name) => request.post('/students/list', { name })

/** 学生分页列表 */
export const studentPage = (data) => request.post('/students/page', data)

/** 新增学生 */
export const studentCreate = (data) => request.post('/students', data)

/** 编辑学生 */
export const studentUpdate = (id, data) => request.put(`/students/${id}`, data)

/** 删除学生（withCourses=true 时连带删除该学生排出的课程） */
export const studentRemove = (id, withCourses = false) =>
  request.delete(`/students/${id}`, { data: { withCourses } })
