<template>
  <div class="fee-detail">
    <!-- 顶部标题 + 维度切换 + 月份选择 -->
    <div class="fee-head">
      <div>
        <h2 class="page-title">费用详情</h2>
        <p class="text-muted" style="margin: 4px 0 0">{{ dimLabel }} × 课程数 = 费用</p>
      </div>
      <div class="fee-head-controls">
        <el-radio-group v-model="dimension" @change="loadReport">
          <el-radio-button value="student">学生</el-radio-button>
          <el-radio-button value="organization">机构</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-model="month"
          type="month"
          :clearable="false"
          value-format="YYYY-MM"
          placeholder="选择月份"
          @change="loadReport"
        />
      </div>
    </div>

    <!-- 汇总 -->
    <div class="fee-total card">
      <span class="text-muted">{{ monthLabel }} · 共 {{ rows.length }}{{ dimUnit }} · {{ totalCourses }} 节</span>
      <span class="fee-total-value">¥{{ formatMoney(totalFee) }}</span>
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
            <span class="fee-name">
              <span class="fee-name-text">{{ r.name || '未分类' }}</span>
              <span v-if="subText(r)" class="fee-sub">{{ subText(r) }}</span>
            </span>
            <span class="fee-count">{{ formula(r) }}</span>
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
import { dashboardApi } from '@/api/dashboard'
import { formatMoney, dayjs } from '@/utils/date'

/* 默认选中上月，统计该月整月数据 */
const month = ref(dayjs().subtract(1, 'month').format('YYYY-MM'))
const dimension = ref('student')
const rows = ref([])

const dimLabel = computed(() => (dimension.value === 'organization' ? '机构' : '学生'))
const dimUnit = computed(() => (dimension.value === 'organization' ? '个机构' : '名学生'))
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

/* 学生维度显示机构名，机构维度显示该机构下所有学生名（· 分割） */
function subText(r) {
  return dimension.value === 'organization' ? r.studentNames || '' : r.organizationName || ''
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
  const r = await dashboardApi.incomeReportRange(start, end)
  rows.value = (dimension.value === 'organization' ? r.organizationFeeDetail : r.studentFeeDetail) || []
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
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

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

  .fee-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;

    .fee-name-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 1;
    }

    .fee-sub {
      font-size: 12px;
      font-weight: 400;
      color: var(--color-muted);
      padding: 1px 8px;
      border-radius: 999px;
      background: var(--color-surface);
      white-space: nowrap;
      flex-shrink: 0;
      max-width: 40%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .fee-count {
    font-size: 12px;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
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