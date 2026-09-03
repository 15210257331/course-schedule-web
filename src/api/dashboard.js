import request from '@/utils/request'

export const dashboardApi = {
  summary: () => request.post('/dashboard/summary'),
  todayCourses: () => request.post('/dashboard/today-courses'),
  incomeReport: (days = 30) => request.post('/dashboard/income-report', { days }),
  incomeReportRange: (start, end) => request.post('/dashboard/income-report', { start, end }),
  updateSettlement: (data) => request.put('/dashboard/settlement', data)
}