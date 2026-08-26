<template>
  <div class="page-container">
    <div class="stat-grid mb-16">
      <el-card class="stat-card">
        <div class="stat-label">近 {{ days }} 天收入</div>
        <div class="stat-value">¥{{ formatMoney(report.total) }}</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-label">授课时长</div>
        <div class="stat-value">{{ report.totalMinutes }} <span class="unit">小时</span></div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-label">课时数</div>
        <div class="stat-value">{{ report.courseCount }} <span class="unit">节</span></div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-label">统计周期</div>
        <div class="stat-value" style="font-size: 20px">
          <el-select v-model="days" style="width: 110px" @change="load">
            <el-option :value="7" label="近 7 天" />
            <el-option :value="30" label="近 30 天" />
            <el-option :value="90" label="近 90 天" />
            <el-option :value="365" label="近一年" />
          </el-select>
        </div>
      </el-card>
    </div>

    <el-card class="mb-16">
      <h3 class="card-title">收入趋势</h3>
      <div ref="trendRef" class="trend-chart" />
    </el-card>

    <el-row :gutter="16">
      <el-col :span="8">
        <el-card>
          <h3 class="card-title">机构排行</h3>
          <div ref="orgRef" class="chart" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <h3 class="card-title">学生排行</h3>
          <div ref="studentRef" class="chart" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <h3 class="card-title">科目排行</h3>
          <div ref="subjectRef" class="chart" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, nextTick } from 'vue'
import * as echarts from 'echarts'
import { dashboardApi } from '@/api/dashboard'
import { formatMoney } from '@/utils/date'

const days = ref(30)
const report = reactive({})
const trendRef = ref()
const orgRef = ref()
const studentRef = ref()
const subjectRef = ref()
const charts = []

function chartColors() {
  const dark = document.documentElement.classList.contains('dark')
  return {
    axis: dark ? '#9094a1' : '#697386',
    split: dark ? '#2e303a' : '#e3e8ee'
  }
}

function pieOption(data, palette) {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c}' },
    color: palette,
    series: [
      {
        type: 'pie',
        radius: ['40%', '68%'],
        data: data.map((d) => ({ name: d.name || '未分类', value: Number(d.value) })),
        label: { formatter: '{b}\n¥{c}' }
      }
    ]
  }
}

function render(el, option) {
  if (!el) return
  const chart = echarts.init(el)
  chart.setOption(option)
  charts.push(chart)
}

async function load() {
  const r = await dashboardApi.incomeReport(days.value)
  Object.assign(report, r)
  await nextTick()
  const daysArr = (r.trend || []).map((d) => d.day.slice(5))
  const values = (r.trend || []).map((d) => Number(d.income))
  const c = chartColors()
  render(trendRef.value, {
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: daysArr,
      boundaryGap: false,
      axisLabel: { color: c.axis },
      axisLine: { lineStyle: { color: c.split } }
    },
    yAxis: { type: 'value', axisLabel: { color: c.axis }, splitLine: { lineStyle: { color: c.split } } },
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
  const palette = ['#635bff', '#30b130', '#f5a623', '#df1b41', '#0073e6', '#8a84ff']
  render(orgRef.value, pieOption(r.byOrganization || [], palette))
  render(studentRef.value, pieOption(r.byStudent || [], [...palette].reverse()))
  render(subjectRef.value, pieOption(r.bySubject || [], ['#0073e6', '#635bff', '#30b130', '#f5a623', '#df1b41']))
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
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 900px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  .stat-card {
    .stat-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      margin-top: 8px;
      color: var(--color-ink);
      font-variant-numeric: tabular-nums;
      .unit {
        font-size: 14px;
        font-weight: 400;
        color: var(--color-muted);
      }
    }
  }
}
.trend-chart {
  height: 260px;
}
.chart {
  height: 280px;
}

@media (max-width: 960px) {
  :deep(.el-row .el-col) {
    width: 100%;
    margin-bottom: 16px;
  }
}
</style>