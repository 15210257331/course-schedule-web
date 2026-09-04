import request from '@/utils/request'

/** 工作台汇总数据（今日课程数、待结算收入等） */
export const dashboardSummary = () => request.post('/dashboard/summary')

/** 今日课程列表 */
export const dashboardTodayCourses = () => request.post('/dashboard/today-courses')

/** 收入报表（近 N 天） */
export const dashboardIncomeReport = (days = 30) => request.post('/dashboard/income-report', { days })

/** 收入报表（自定义时间范围） */
export const dashboardIncomeReportRange = (start, end) => request.post('/dashboard/income-report', { start, end })

/** 更新课程结算状态 */
export const dashboardUpdateSettlement = (data) => request.put('/dashboard/settlement', data)
