<template>
  <div class="dashboard">
    <!-- 顶部欢迎区 -->
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ greeting }}，{{ authStore.user?.nickname || '老师' }}</h1>
        <p class="page-sub">{{ todayText }}</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="$router.push({ name: 'schedule' })">
        安排课程
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="card in statCards" :key="card.label" class="stat-card">
        <div class="stat-icon" :style="{ background: card.bg, color: card.color }">
          <el-icon :size="20"><component :is="card.icon" /></el-icon>
        </div>
        <div class="stat-body">
          <p class="stat-label">{{ card.label }}</p>
          <p class="stat-value">{{ card.value }}</p>
        </div>
      </div>
    </div>

    <!-- 趋势 + 今日课程 -->
    <div class="grid-main">
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">收入趋势（近 30 天）</h3>
          <span class="text-muted">总课时 {{ report.totalMinutes }} 小时</span>
        </div>
        <div ref="trendRef" class="trend-chart" />
      </div>

      <div class="card">
        <div class="card-head">
          <h3 class="card-title">今日课程</h3>
          <span class="badge-count">{{ todayCourses.length }}</span>
        </div>
        <div v-if="!todayCourses.length" class="empty">
          <div class="empty-icon">
            <el-icon :size="24"><Calendar /></el-icon>
          </div>
          <p>今天暂无课程安排</p>
        </div>
        <div v-else class="today-list">
          <div v-for="c in todayCourses" :key="c.id" class="today-item">
            <div class="today-dot" />
            <div class="today-info">
              <p class="today-title">{{ c.title }}</p>
              <p class="today-meta">
                {{ formatDateTime(c.startTime).slice(11) }} - {{ formatDateTime(c.endTime).slice(11) }}
                <template v-if="c.studentName"> · {{ c.studentName }}</template>
                <template v-if="c.organizationName"> · {{ c.organizationName }}</template>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 排行 -->
    <div class="grid-rank">
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">机构收入排行（近 30 天）</h3>
        </div>
        <div ref="orgRef" class="rank-chart" />
      </div>
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">学生收入排行（近 30 天）</h3>
        </div>
        <div ref="studentRef" class="rank-chart" />
      </div>
    </div>

    <!-- 快捷入口 -->
    <p class="section-label">快捷入口</p>
    <div class="quick-grid">
      <router-link
        v-for="q in quickLinks"
        :key="q.title"
        :to="{ name: q.name }"
        class="quick-link"
      >
        <span class="quick-icon" :style="{ color: q.color }">
          <el-icon :size="20"><component :is="q.icon" /></el-icon>
        </span>
        <span class="quick-title">{{ q.title }}</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  Plus,
  Calendar,
  Notebook,
  User,
  OfficeBuilding,
  Coin,
  TrendCharts,
  Wallet
} from '@element-plus/icons-vue'
import { dashboardApi } from '@/api/dashboard'
import { formatMoney, formatDateTime } from '@/utils/date'
import { useAuthStore } from '@/store/auth'

const authStore = useAuthStore()

const summary = reactive({})
const todayCourses = ref([])
const report = reactive({ totalMinutes: 0 })

const trendRef = ref()
const orgRef = ref()
const studentRef = ref()
const charts = []

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const todayText = computed(() =>
  new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
)

const statCards = computed(() => [
  {
    label: '今日收入',
    value: `¥${formatMoney(summary.todayIncome)}`,
    icon: Wallet,
    color: '#635bff',
    bg: 'rgba(99, 91, 255, 0.1)'
  },
  {
    label: '本周收入',
    value: `¥${formatMoney(summary.weekIncome)}`,
    icon: TrendCharts,
    color: '#30b130',
    bg: 'rgba(48, 177, 48, 0.1)'
  },
  {
    label: '本月收入',
    value: `¥${formatMoney(summary.monthIncome)}`,
    icon: Coin,
    color: '#f5a623',
    bg: 'rgba(245, 166, 35, 0.1)'
  },
  {
    label: '年收入',
    value: `¥${formatMoney(summary.yearIncome)}`,
    icon: Calendar,
    color: '#0073e6',
    bg: 'rgba(0, 115, 230, 0.1)'
  }
])

const quickLinks = [
  { name: 'schedule', title: '课程表', icon: Calendar, color: '#635bff' },
  { name: 'courses', title: '课程管理', icon: Notebook, color: '#30b130' },
  { name: 'students', title: '学生管理', icon: User, color: '#f5a623' },
  { name: 'organizations', title: '机构管理', icon: OfficeBuilding, color: '#0073e6' },
  { name: 'salaryRules', title: '收费规则', icon: Coin, color: '#df1b41' },
  { name: 'income', title: '收入统计', icon: TrendCharts, color: '#5a6071' }
]

function mountChart(el, option) {
  if (!el) return
  const chart = echarts.init(el)
  chart.setOption(option)
  charts.push(chart)
}

function chartColors() {
  const dark = document.documentElement.classList.contains('dark')
  return {
    axis: dark ? '#9094a1' : '#697386',
    split: dark ? '#2e303a' : '#e3e8ee'
  }
}

function renderTrend(data) {
  const days = data.map((d) => d.day.slice(5))
  const values = data.map((d) => Number(d.income))
  const c = chartColors()
  mountChart(trendRef.value, {
    grid: { left: 44, right: 16, top: 20, bottom: 30 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: days,
      boundaryGap: false,
      axisLine: { lineStyle: { color: c.split } },
      axisLabel: { color: c.axis }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: c.axis },
      splitLine: { lineStyle: { color: c.split } }
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.12 },
        itemStyle: { color: '#635bff' }
      }
    ]
  })
}

function renderBar(el, data, color) {
  const names = data.map((d) => d.name || '未分类')
  const values = data.map((d) => Number(d.value))
  const c = chartColors()
  mountChart(el, {
    grid: { left: 90, right: 20, top: 20, bottom: 30 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'value',
      axisLabel: { color: c.axis },
      splitLine: { lineStyle: { color: c.split } }
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: { color: c.axis },
      axisLine: { lineStyle: { color: c.split } }
    },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: { color, borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 16
      }
    ]
  })
}

async function load() {
  const [s, courses, r] = await Promise.all([
    dashboardApi.summary(),
    dashboardApi.todayCourses(),
    dashboardApi.incomeReport(30)
  ])
  Object.assign(summary, s)
  todayCourses.value = courses
  Object.assign(report, r)
  await nextTick()
  renderTrend(r.trend || [])
  renderBar(orgRef.value, r.byOrganization || [], '#635bff')
  renderBar(studentRef.value, r.byStudent || [], '#30b130')
}

function resize() {
  charts.forEach((c) => c.resize())
}

onMounted(() => {
  load()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  charts.forEach((c) => c.dispose())
})
</script>

<style lang="scss" scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// ---------- 页头 ----------
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  .page-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--color-ink);
  }

  .page-sub {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--color-muted);
  }
}

// ---------- 统计卡片 ----------
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 900px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  .stat-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-body {
    min-width: 0;
  }

  .stat-label {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    margin: 4px 0 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
  }
}

// ---------- 通用卡片 ----------
.card {
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 20px;
  min-width: 0;

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .card-title {
      margin: 0;
    }
  }
}

.grid-main {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 960px) {
    grid-template-columns: 2fr 1fr;
  }
}

.grid-rank {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 960px) {
    grid-template-columns: 1fr 1fr;
  }
}

.trend-chart {
  height: 260px;
}
.rank-chart {
  height: 260px;
}

// ---------- 今日课程 ----------
.badge-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(99, 91, 255, 0.1);
  border-radius: 999px;
  padding: 2px 10px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--color-muted);
  font-size: 13px;

  .empty-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--color-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  p {
    margin: 0;
  }
}

.today-list {
  display: flex;
  flex-direction: column;
  max-height: 260px;
  overflow: auto;
}

.today-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }

  .today-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-primary);
    margin-top: 7px;
    flex-shrink: 0;
  }

  .today-title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink);
  }

  .today-meta {
    margin: 3px 0 0;
    font-size: 12px;
    color: var(--color-muted);
  }
}

// ---------- 快捷入口 ----------
.section-label {
  margin: 8px 0 0;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 960px) {
    grid-template-columns: repeat(6, 1fr);
  }
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    border-color: rgba(99, 91, 255, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transform: translateY(-1px);
  }

  .quick-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .quick-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-ink);
  }
}
</style>
