<template>
  <div class="fee-detail">
    <!-- 顶部标题 + 维度切换 + 月份选择 -->
    <div class="fee-head">
      <div>
        <h2 class="page-title">费用详情</h2>
        <p class="text-muted" style="margin: 4px 0 0">机构 × 课程数 = 费用</p>
      </div>
      <div class="fee-head-controls">
        <el-date-picker
          v-model="month"
          type="month"
          :clearable="false"
          value-format="YYYY-MM"
          placeholder="选择月份"
          @change="loadReport"
        />
        <el-button :icon="Download" :disabled="!rows.length" @click="exportCsv">导出</el-button>
      </div>
    </div>

    <!-- 汇总 -->
    <div class="fee-total card">
      <span class="text-muted">{{ monthLabel }} · 共 {{ rows.length }} 个机构 · {{ totalCourses }} 节课</span>
      <div class="fee-total-right">
        <span class="settle-chip settle-chip--done">已结清 ¥{{ formatMoney(settledFee) }}</span>
        <span class="settle-chip settle-chip--due">未结清 ¥{{ formatMoney(unsettledFee) }}</span>
        <span class="fee-total-value">¥{{ formatMoney(totalFee) }}</span>
      </div>
    </div>

    <!-- 明细卡片列表 -->
    <div class="card">
      <div class="card-head">
        <h3 class="card-title">明细列表</h3>
        <span class="text-muted">按费用降序</span>
      </div>
      <div v-if="rows.length" class="fee-list">
        <div v-for="(r, i) in rows" :key="i" class="fee-item">
          <div class="fee-item-top">
            <span class="fee-rank">{{ i + 1 }}</span>
            <div class="fee-main">
              <span class="fee-name">
                <span class="fee-name-text">{{ r.name || '未分类' }}</span>
              </span>
              <!-- 每个学生标签后跟费用计算，排在机构右侧，横向排列，数据多时折行 -->
              <div v-if="orgStudentItems(r).length" class="fee-students">
                <span v-for="(s, si) in orgStudentItems(r)" :key="si" class="fee-student">
                  <span class="fee-student-tag" :style="s.style">{{ s.name }}</span>
                  <span class="fee-student-formula">{{ s.formula }}</span>
                </span>
              </div>
            </div>
            <el-switch
              v-model="r.settled"
              size="small"
              inline-prompt
              active-text="已结"
              inactive-text="未结"
              @change="onToggleSettled(r)"
            />
            <span class="fee-amount">¥{{ formatMoney(r.fee) }}</span>
          </div>
          <div class="fee-bar">
            <div class="fee-bar-fill" :style="{ width: barWidth(r.fee) }" />
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无费用数据" :image-size="80" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { dashboardIncomeReportRange, dashboardUpdateSettlement } from '@/api/dashboard'
import { formatMoney, dayjs } from '@/utils/date'

/* 默认选中上月，统计该月整月数据 */
const month = ref(dayjs().subtract(1, 'month').format('YYYY-MM'))
const rows = ref([])
const settledFee = ref(0)
const unsettledFee = ref(0)
/* 机构维度下，每个机构内各学生的费用明细（用于在机构行下展开「N节 × 单价」） */
const orgStudentDetail = ref([])

const monthLabel = computed(() => dayjs(month.value).format('YYYY年M月'))
const totalCourses = computed(() => rows.value.reduce((s, r) => s + (Number(r.courseCount) || 0), 0))
const totalFee = computed(() => rows.value.reduce((s, r) => s + (Number(r.fee) || 0), 0))

/* 单价 = 费用 / 课程数，展示成「N节 × 单价 = 费用」 */
function formula(r) {
  const cnt = Number(r.courseCount) || 0
  const fee = Number(r.fee) || 0
  if (!cnt) return '0 节'
  const unit = Number((fee / cnt).toFixed(2))
  return `${cnt}节 × ${unit} = ${fee}`
}

/* 机构行下的学生名标签（一个学生一个标签） */
function subTags(r) {
  return (r.studentNames || '').split('·').filter(Boolean)
}

/* 取该机构行对应的学生级费用明细（排除家教列，因为家教在机构维度是独立行） */
function orgStudentsOf(r) {
  if (r.targetType === 'tutor') return []
  return orgStudentDetail.value.filter(
    (d) => (d.organizationName || '未分类') === (r.name || '未分类')
  )
}

/* 每个学生 = 标签 + 费用计算，按明细数据组装（数据缺失时回退到学生名标签） */
function orgStudentItems(r) {
  const detail = orgStudentsOf(r)
  const detailMap = new Map(detail.map((d) => [d.studentName, d]))
  const names = detail.length
    ? detail.map((d) => d.studentName)
    : subTags(r)
  return names.map((name) => {
    const d = detailMap.get(name)
    return {
      name: name || '未分类',
      formula: d ? formula(d) : '',
      style: tagStyle(name || '未分类')
    }
  })
}

/* 标签配色：按名称哈希取色，同名稳定同色、不同名不同色 */
const TAG_COLORS = [
  { bg: 'rgba(99, 91, 255, 0.12)', color: '#635bff' },
  { bg: 'rgba(48, 177, 48, 0.14)', color: '#2f9e2f' },
  { bg: 'rgba(245, 166, 35, 0.16)', color: '#d98c00' },
  { bg: 'rgba(0, 115, 230, 0.12)', color: '#0073e6' },
  { bg: 'rgba(223, 27, 65, 0.12)', color: '#df1b41' },
  { bg: 'rgba(43, 179, 163, 0.14)', color: '#2BB3A3' },
  { bg: 'rgba(138, 132, 255, 0.14)', color: '#8a84ff' }
]

function hashStr(s) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

function tagStyle(name) {
  const c = TAG_COLORS[hashStr(name) % TAG_COLORS.length]
  return { color: c.color, background: c.bg }
}

/* 进度条宽度 = 该生费用 / 最高费用，最高者占满 */
const maxFee = computed(() => rows.value.reduce((m, r) => Math.max(m, Number(r.fee) || 0), 0))
function barWidth(fee) {
  const n = Number(fee) || 0
  if (!maxFee.value) return '0%'
  return `${Math.max(4, Math.round((n / maxFee.value) * 100))}%`
}

async function loadReport() {
  const m = dayjs(month.value)
  const start = m.startOf('month').format('YYYY-MM-DD')
  const end = m.endOf('month').format('YYYY-MM-DD')
  const r = await dashboardIncomeReportRange(start, end)
  rows.value = r.organizationFeeDetail || []
  orgStudentDetail.value = r.organizationStudentDetail || []
  settledFee.value = Number(r.settled) || 0
  unsettledFee.value = Number(r.unsettled) || 0
}

/* 手动切换某机构/家教行的结清状态 */
async function onToggleSettled(r) {
  const payload = {
    settleMonth: month.value,
    targetType: r.targetType,
    targetKey: r.targetKey,
    settled: !!r.settled
  }
  try {
    await dashboardUpdateSettlement(payload)
    ElMessage.success(r.settled ? '已标记为已结清' : '已标记为未结清')
    // 同步顶部汇总
    const fee = Number(r.fee) || 0
    if (r.settled) {
      settledFee.value += fee
      unsettledFee.value -= fee
    } else {
      settledFee.value -= fee
      unsettledFee.value += fee
    }
  } catch (e) {
    // 失败回滚开关
    r.settled = !r.settled
  }
}

/* 导出当前维度明细为 CSV（Excel 兼容，带 BOM 与转义） */
function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv() {
  const head = ['排名', '名称', '学生', '课程数', '单价(元)', '费用(元)']
  const lines = [head.join(',')]
  rows.value.forEach((r, i) => {
    const cnt = Number(r.courseCount) || 0
    const fee = Number(r.fee) || 0
    const unit = cnt ? (fee / cnt).toFixed(2) : '0.00'
    lines.push(
      [
        i + 1,
        r.name || '未分类',
        r.studentNames || '',
        cnt,
        unit,
        fee.toFixed(2)
      ].map(csvCell).join(',')
    )
  })
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `费用明细-${month.value}-机构.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadReport()
})
</script>

<style lang="scss" scoped>
.fee-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.fee-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.fee-head-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-ink);
}

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
    margin-bottom: 16px;

    .card-title {
      margin: 0;
    }
  }
}

.fee-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  .fee-total-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .settle-chip {
    font-size: 12px;
    font-weight: 600;
    padding: 3px 12px;
    border-radius: 999px;
    font-variant-numeric: tabular-nums;

    &--done {
      color: #2f9e2f;
      background: rgba(48, 177, 48, 0.12);
    }

    &--due {
      color: #d98c00;
      background: rgba(245, 166, 35, 0.16);
    }
  }

  .fee-total-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-primary);
    font-variant-numeric: tabular-nums;
  }
}

.fee-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.fee-item {
  .fee-item-top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .fee-rank {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    color: var(--color-muted);
    background: var(--color-surface);
    flex-shrink: 0;
  }

  .fee-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 14px;
  }

  .fee-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;

    .fee-name-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 1;
    }
  }

  .fee-amount {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
    min-width: 88px;
    text-align: right;
  }

  /* 学生费用明细：紧随机构名称右侧横向排列，数据多时折行 */
  .fee-students {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
  }

  .fee-student {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    .fee-student-tag {
      font-weight: 500;
      padding: 1px 8px;
      border-radius: 999px;
    }

    .fee-student-formula {
      color: var(--color-muted);
    }
  }

  .fee-bar {
    height: 8px;
    border-radius: 999px;
    background: var(--color-surface);
    overflow: hidden;
  }

  .fee-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--color-primary), #8a84ff);
    transition: width 0.3s ease;
  }
}
</style>