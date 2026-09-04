<template>
  <div class="page-container">
    <h2 class="page-title">数据看板</h2>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="c in statCards" :key="c.label" class="stat-card">
        <div class="stat-icon" :style="{ color: c.color, background: c.bg }">
          <el-icon :size="20"><component :is="c.icon" /></el-icon>
        </div>
        <div class="stat-meta">
          <div class="stat-value">{{ c.value }}</div>
          <div class="stat-label">{{ c.label }}</div>
          <div v-if="c.sub" class="stat-sub">{{ c.sub }}</div>
        </div>
      </div>
    </div>

    <!-- 趋势图 -->
    <el-card class="mt-16">
      <div class="chart-head">
        <span class="chart-title">平台趋势</span>
        <el-radio-group v-model="days" size="small" @change="load">
          <el-radio-button :value="7">近 7 天</el-radio-button>
          <el-radio-button :value="30">近 30 天</el-radio-button>
          <el-radio-button :value="90">近 90 天</el-radio-button>
        </el-radio-group>
      </div>
      <div v-if="hasTrend" ref="trendRef" class="trend-chart"></div>
      <el-empty v-else description="暂无数据" :image-size="80" />
    </el-card>

    <!-- 最新动态 -->
    <div class="mt-16 list-grid">
      <el-card>
        <div class="chart-head">
          <span class="chart-title">最新注册教师</span>
          <el-button link type="primary" size="small" @click="router.push({ name: 'adminTeachers' })">查看全部</el-button>
        </div>
        <div v-if="recentTeachers.length" class="teacher-list">
          <div v-for="t in recentTeachers" :key="t.id" class="teacher-row">
            <span class="t-avatar">{{ (t.nickname || t.username || '?').charAt(0) }}</span>
            <div class="t-meta">
              <div class="t-name">{{ t.nickname || t.username }}</div>
              <div class="t-sub">{{ t.email || t.username }}</div>
            </div>
            <div class="t-right">
              <el-tag :type="t.status === 'active' ? 'success' : 'danger'" size="small">
                {{ t.status === 'active' ? '正常' : '禁用' }}
              </el-tag>
              <span class="t-time">{{ fmtDate(t.createdAt) }}</span>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无教师" :image-size="60" />
      </el-card>

      <el-card>
        <div class="chart-head">
          <span class="chart-title">最新消息</span>
          <el-button link type="primary" size="small" @click="router.push({ name: 'adminMessages' })">查看全部</el-button>
        </div>
        <div v-if="recentMessages.length" class="msg-list">
          <div v-for="m in recentMessages" :key="m.id" class="msg-row">
            <el-tag size="small" :type="msgTagType(m.type)" class="msg-tag">{{ msgLabel(m.type) }}</el-tag>
            <div class="m-meta">
              <div class="m-title">{{ m.title }}</div>
              <div class="m-sub">{{ fmtDate(m.createdAt) }}</div>
            </div>
            <div class="m-right">
              <span class="m-read">{{ m.readCount || 0 }}/{{ m.targetCount || 0 }} 已读</span>
              <el-tag :type="m.status === 'published' ? 'success' : 'info'" size="small">
                {{ m.status === 'published' ? '已发布' : '已撤回' }}
              </el-tag>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无消息" :image-size="60" />
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { User, UserFilled, Calendar, Bell } from '@element-plus/icons-vue'
import { adminDashboardOverview } from '@/api/admin'
import { dayjs } from '@/utils/date'

const router = useRouter()
const days = ref(30)
const loading = ref(false)

const cards = ref({})
const teacherTrend = ref([])
const courseTrend = ref([])
const recentTeachers = ref([])
const recentMessages = ref([])

const trendRef = ref()
let trendChart = null

const hasTrend = computed(() => teacherTrend.value.length > 0 || courseTrend.value.length > 0)

const statCards = computed(() => [
  {
    label: '教师总数',
    value: cards.value.teacherTotal ?? 0,
    sub: `正常 ${cards.value.teacherActive ?? 0} · 禁用 ${cards.value.teacherDisabled ?? 0}`,
    icon: User,
    color: '#635bff',
    bg: 'rgba(99, 91, 255, 0.1)'
  },
  {
    label: '本月新增教师',
    value: cards.value.teacherNewMonth ?? 0,
    sub: `今日 +${cards.value.teacherNewToday ?? 0}`,
    icon: UserFilled,
    color: '#30b130',
    bg: 'rgba(48, 177, 48, 0.1)'
  },
  {
    label: '本月课程数',
    value: cards.value.courseMonth ?? 0,
    sub: `今日 ${cards.value.courseToday ?? 0} · 累计 ${cards.value.courseTotal ?? 0}`,
    icon: Calendar,
    color: '#f5a623',
    bg: 'rgba(245, 166, 35, 0.1)'
  },
  {
    label: '消息触达',
    value: cards.value.messageTotal ?? 0,
    sub: `阅读率 ${cards.value.readRate ?? 0}%（${cards.value.readTotal ?? 0}/${cards.value.targetTotal ?? 0}）`,
    icon: Bell,
    color: '#0073e6',
    bg: 'rgba(0, 115, 230, 0.1)'
  }
])

function fmtDate(t) {
  return t ? dayjs(t).format('M月D日') : '—'
}

function msgLabel(t) {
  return { announcement: '公告', activity: '活动', notice: '通知' }[t] || '公告'
}

function msgTagType(t) {
  return { announcement: 'primary', activity: 'warning', notice: 'success' }[t] || 'primary'
}

function chartColors() {
  const dark = document.documentElement.classList.contains('dark')
  return {
    axis: dark ? '#9094a1' : '#697386',
    split: dark ? '#2e303a' : '#e3e8ee'
  }
}

function renderTrend() {
  if (!trendRef.value) {
    trendChart?.dispose()
    trendChart = null
    return
  }
  const c = chartColors()
  const dayArr = teacherTrend.value.map((d) => dayjs(d.day).format('M月D日'))
  if (!trendChart) trendChart = echarts.init(trendRef.value)
  trendChart.setOption(
    {
      grid: { left: 44, right: 16, top: 36, bottom: 30 },
      tooltip: { trigger: 'axis' },
      legend: { data: ['新增教师', '课程数'], textStyle: { color: c.axis }, top: 0 },
      xAxis: {
        type: 'category',
        data: dayArr,
        boundaryGap: true,
        axisLine: { lineStyle: { color: c.split } },
        axisLabel: {
          color: c.axis,
          interval: dayArr.length > 40 ? Math.ceil(dayArr.length / 12) - 1 : 'auto',
          rotate: dayArr.length > 40 ? 30 : 0
        }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: c.axis },
        splitLine: { lineStyle: { color: c.split } }
      },
      series: [
        {
          name: '新增教师',
          type: 'line',
          data: teacherTrend.value.map((d) => Number(d.count)),
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.12 },
          itemStyle: { color: '#635bff' }
        },
        {
          name: '课程数',
          type: 'line',
          data: courseTrend.value.map((d) => Number(d.count)),
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.12 },
          itemStyle: { color: '#30b130' }
        }
      ]
    },
    true
  )
}

async function load() {
  loading.value = true
  try {
    const res = await adminDashboardOverview(days.value)
    cards.value = res.cards || {}
    teacherTrend.value = res.teacherTrend || []
    courseTrend.value = res.courseTrend || []
    recentTeachers.value = res.recentTeachers || []
    recentMessages.value = res.recentMessages || []
    await nextTick()
    renderTrend()
  } finally {
    loading.value = false
  }
}

function onResize() {
  trendChart?.resize()
}

onMounted(() => {
  load()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  trendChart?.dispose()
  trendChart = null
})
</script>

<style lang="scss" scoped>
.page-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-ink);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-ink);
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 2px;
}

.stat-sub {
  font-size: 11px;
  color: var(--color-tertiary);
  margin-top: 2px;
}

.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
}

.trend-chart {
  height: 300px;
}

.list-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.teacher-list,
.msg-list {
  display: flex;
  flex-direction: column;
}

.teacher-row,
.msg-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }
}

.t-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(99, 91, 255, 0.1);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.t-meta,
.m-meta {
  flex: 1;
  min-width: 0;
}

.t-name,
.m-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-ink);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.t-sub,
.m-sub {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 1px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.t-right,
.m-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.t-time,
.m-read {
  font-size: 12px;
  color: var(--color-muted);
}

.msg-tag {
  flex-shrink: 0;
}

.mt-16 {
  margin-top: 16px;
}
</style>
