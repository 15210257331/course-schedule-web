import request from '@/utils/request'

export const dashboardApi = {
  summary: () => request.get('/dashboard/summary'),
  todayCourses: () => request.get('/dashboard/today-courses'),
  incomeReport: (days = 30) => request.get('/dashboard/income-report', { params: { days } })
}