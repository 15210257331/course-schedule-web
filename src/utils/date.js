import dayjs from 'dayjs'

export { dayjs }

/** 格式化时间：YYYY-MM-DD HH:mm */
export function formatDateTime(v) {
  return v ? dayjs(v).format('YYYY-MM-DD HH:mm') : ''
}

/** 格式化日期 */
export function formatDate(v) {
  return v ? dayjs(v).format('YYYY-MM-DD') : ''
}

/** 金额格式化，兜底 0 */
export function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 计算本周周一的日期字符串 */
export function mondayOf(date = new Date()) {
  const d = dayjs(date)
  const wd = (d.day() + 6) % 7
  return d.subtract(wd, 'day').format('YYYY-MM-DD')
}

/** 周视图一周 7 天的日期与标签 */
export function weekDays(anchor = new Date()) {
  const monday = dayjs(mondayOf(anchor))
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return labels.map((label, i) => {
    const d = monday.add(i, 'day')
    return { label, date: d.format('YYYY-MM-DD'), day: d.date() }
  })
}

/** 分钟时长转 "N小时M分钟" */
export function durationText(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h <= 0) return `${m} 分钟`
  if (m <= 0) return `${h} 小时`
  return `${h} 小时 ${m} 分钟`
}

/** 时间转分钟（当天内） */
export function toMinutes(dateStr) {
  if (!dateStr) return 0
  const d = dayjs(dateStr)
  return d.hour() * 60 + d.minute()
}

export const COURSE_COLORS = [
  '#635bff',
  '#30b130',
  '#f5a623',
  '#df1b41',
  '#0073e6',
  '#8a84ff',
  '#2BB3A3',
  '#F5729B'
]

/** 课程类型对应的标签色（日历/模板卡片的类型胶囊使用） */
export const COURSE_TYPE_COLORS = {
  一对一: '#635bff',
  家教: '#0073e6',
  班课: '#2BB3A3'
}
export const COURSE_TYPE_DEFAULT_COLOR = '#64748b'

export function courseTypeColor(type) {
  return COURSE_TYPE_COLORS[type] || COURSE_TYPE_DEFAULT_COLOR
}