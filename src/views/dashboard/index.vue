<template>
  <div class="dashboard">
    <!-- 顶部欢迎区 -->
    <PageHead :nickname="authStore.user?.nickname" />

    <!-- 收入统计 -->
    <div class="income-head">
      <p class="income-title" style="margin: 0">收入统计</p>
      <el-button link type="primary" @click="router.push({ name: 'income' })">详情</el-button>
    </div>

    <!-- 统计卡片 -->
    <StatCards :cards="statCards" />

    <div class="grid-main">
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">收入趋势</h3>
          <el-radio-group v-model="days" size="small" @change="loadReport">
            <el-radio-button :value="7">近 7 天</el-radio-button>
            <el-radio-button :value="30">近 30 天</el-radio-button>
            <el-radio-button :value="90">近 90 天</el-radio-button>
          </el-radio-group>
        </div>
        <div class="trend-meta">
          <span class="text-muted">
            共 ¥{{ formatMoney(report.total) }} · {{ report.totalMinutes }} 小时 · {{ report.courseCount }} 节
          </span>
        </div>
        <div ref="trendRef" class="trend-chart" />
      </div>

      <TodayCourses :courses="todayCourses" />
    </div>

    <!-- 收入构成（机构 / 学生 / 科目） -->
    <div class="grid-pie">
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">机构占比</h3>
        </div>
        <div ref="orgRef" class="pie-chart" />
      </div>
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">学生占比</h3>
        </div>
        <div ref="studentRef" class="pie-chart" />
      </div>
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">学段占比</h3>
        </div>
        <div ref="subjectRef" class="pie-chart" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Calendar, Coin, TrendCharts, Wallet } from '@element-plus/icons-vue'
import { dashboardApi } from '@/api/dashboard'
import { formatMoney, dayjs } from '@/utils/date'
import { useAuthStore } from '@/store/auth'
import PageHead from './components/PageHead.vue'
import StatCards from './components/StatCards.vue'
import TodayCourses from './components/TodayCourses.vue'

const authStore = useAuthStore()
const router = useRouter()

const summary = reactive({})
const todayCourses = ref([])
const report = reactive({ total: 0, totalMinutes: 0, courseCount: 0 })
const days = ref(30)

const trendRef = ref()
const orgRef = ref()
const studentRef = ref()
const subjectRef = ref()
let trendChart = null
const pieCharts = []

const statCards = computed(() => [
  {
    label: '今日收入',
    value: `¥${formatMoney(summary.todayIncome)}`,
    icon: Wallet,
    color: '#635bff',
    bg: 'rgba(99, 91, 255, 0.1)'
  },
  {
    label: '上月收入',
    value: `¥${formatMoney(summary.lastMonthIncome)}`,
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
    label: '本年收入',
    value: `¥${formatMoney(summary.yearIncome)}`,
    icon: Calendar,
    color: '#0073e6',
    bg: 'rgba(0, 115, 230, 0.1)'
  }
])

function chartColors() {
  const dark = document.documentElement.classList.contains('dark')
  return {
    axis: dark ? '#9094a1' : '#697386',
    split: dark ? '#2e303a' : '#e3e8ee'
  }
}

function renderTrend(data) {
  if (!trendRef.value) return
  const daysArr = data.map((d) => dayjs(d.day).format('M月D日'))
  const values = data.map((d) => Number(d.income))
  const c = chartColors()
  if (!trendChart) trendChart = echarts.init(trendRef.value)
  trendChart.setOption(
    {
      grid: { left: 44, right: 16, top: 20, bottom: 30 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: daysArr,
        boundaryGap: false,
        axisLine: { lineStyle: { color: c.split } },
        axisLabel: {
          color: c.axis,
          interval: daysArr.length > 40 ? Math.ceil(daysArr.length / 12) - 1 : 'auto',
          rotate: daysArr.length > 40 ? 30 : 0
        }
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
    },
    true
  )
}

function pieOption(data, palette) {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c}（{d}%）' },
    color: palette,
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '46%'],
        data: data.map((d) => ({ name: d.name || '未分类', value: Number(d.value) })),
        label: { formatter: '{b}\n¥{c}', fontSize: 11 },
        itemStyle: { borderRadius: 4, borderColor: 'transparent', borderWidth: 2 }
      }
    ]
  }
}

function renderPies(r) {
  const palette = ['#635bff', '#30b130', '#f5a623', '#df1b41', '#0073e6', '#8a84ff']
  const defs = [
    { el: orgRef.value, option: pieOption(r.byOrganization || [], palette) },
    { el: studentRef.value, option: pieOption(r.byStudent || [], [...palette].reverse()) },
    {
      el: subjectRef.value,
      option: pieOption(r.byStage || [], ['#0073e6', '#635bff', '#30b130', '#f5a623', '#df1b41'])
    }
  ]
  defs.forEach((d, i) => {
    if (!d.el) return
    if (!pieCharts[i]) pieCharts[i] = echarts.init(d.el)
    pieCharts[i].setOption(d.option, true)
  })
}

async function loadReport() {
  const r = await dashboardApi.incomeReport(days.value)
  Object.assign(report, r)
  await nextTick()
  renderTrend(r.trend || [])
  renderPies(r)
}

async function load() {
  const [s, courses] = await Promise.all([dashboardApi.summary(), dashboardApi.todayCourses()])
  Object.assign(summary, s)
  todayCourses.value = courses
  await loadReport()
}

function resize() {
  trendChart?.resize()
  pieCharts.forEach((c) => c?.resize())
}

onMounted(() => {
  load()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  trendChart?.dispose()
  trendChart = null
  pieCharts.forEach((c) => c?.dispose())
})
</script>

<style lang="scss" scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// ---------- 收入统计区头 ----------
.income-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
}

.income-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-ink);
}

.trend-meta {
  margin-bottom: 4px;
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

.grid-pie {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 960px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.trend-chart {
  height: 260px;
}
.pie-chart {
  height: 240px;
}

// ---------- 快捷入口 ----------
.section-label {
  margin: 8px 0 0;
}
</style>
