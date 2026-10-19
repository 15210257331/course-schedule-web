<template>
  <div class="page-container">
    <h2 class="page-title">教师管理</h2>
    <el-card>
      <div class="flex filter-bar">
        <el-select v-model="filters.status" placeholder="状态" clearable style="width: 130px" class="mr-8" @change="load">
          <el-option label="正常" value="active" />
          <el-option label="已禁用" value="disabled" />
        </el-select>
        <el-input
          v-model="filters.keyword"
          placeholder="用户名 / 昵称 / 邮箱"
          clearable
          style="width: 220px"
          class="mr-8"
          @keyup.enter="load"
          @clear="load"
        />
        <div class="flex-grow" />
        <el-button :icon="RefreshLeft" class="mr-8" @click="resetFilters">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>

      <el-table :data="list" v-loading="loading" class="mt-16" stripe>
        <el-table-column label="教师" min-width="160" align="center">
          <template #default="{ row }">
            <div class="teacher-cell">
              <span class="teacher-avatar">{{ (row.nickname || row.username || '?').charAt(0) }}</span>
              <div class="teacher-meta">
                <div class="teacher-name">{{ row.nickname || row.username }}</div>
                <div class="teacher-sub">{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" align="center" min-width="180" show-overflow-tooltip />
        <el-table-column prop="subjects" label="任教学科" align="center" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.subjects || '—' }}</template>
        </el-table-column>
        <el-table-column label="课程数" width="80" align="center" prop="courseCount" />
        <el-table-column label="学生数" width="80" align="center" prop="studentCount" />
        <el-table-column label="注册时间" width="150" align="center">
          <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button
              link
              :type="row.status === 'active' ? 'danger' : 'success'"
              size="small"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="warning" size="small" @click="resetPassword(row)">重置密码</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无教师" :image-size="80" />
        </template>
      </el-table>

      <div class="flex-end mt-16">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="fetchData"
          @size-change="load"
        />
      </div>
    </el-card>

    <!-- 教师详情弹窗 -->
    <el-dialog v-model="detailVisible" title="教师详情" width="640px" top="6vh">
      <div v-if="detail" v-loading="detailLoading" class="detail-body">
        <!-- 头部：头像 + 基本信息 -->
        <div class="detail-head">
          <span class="teacher-avatar lg">{{ (detail.nickname || detail.username || '?').charAt(0) }}</span>
          <div class="head-main">
            <div class="head-top">
              <span class="detail-name">{{ detail.nickname || detail.username }}</span>
              <el-tag :type="detail.status === 'active' ? 'success' : 'danger'" size="small">
                {{ detail.status === 'active' ? '正常' : '已禁用' }}
              </el-tag>
            </div>
            <div class="head-sub">
              <span>@{{ detail.username }}</span>
              <span v-if="detail.subjects" class="head-divider">·</span>
              <span v-if="detail.subjects">{{ detail.subjects }}</span>
            </div>
          </div>
          <div class="head-login">
            <span class="head-login-label">最后登录</span>
            <span class="head-login-time">{{ detail.lastLoginAt ? fmtTime(detail.lastLoginAt) : '从未登录' }}</span>
          </div>
        </div>

        <!-- 本月 / 上月课程收入统计 -->
        <div class="stat-grid">
          <div class="stat-card primary">
            <div class="stat-value">{{ detail.monthTotal ?? 0 }}</div>
            <div class="stat-label">本月总课数</div>
          </div>
          <div class="stat-card success">
            <div class="stat-value">{{ detail.monthFinished ?? 0 }}</div>
            <div class="stat-label">本月已上课数</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">¥{{ fmtMoney(detail.monthIncome) }}</div>
            <div class="stat-label">本月已有收入</div>
          </div>
          <div class="stat-card info">
            <div class="stat-value">{{ detail.lastMonthTotal ?? 0 }}</div>
            <div class="stat-label">上月总课数</div>
          </div>
          <div class="stat-card danger">
            <div class="stat-value">¥{{ fmtMoney(detail.lastMonthIncome) }}</div>
            <div class="stat-label">上月收入</div>
          </div>
        </div>

        <!-- 基本资料 -->
        <el-descriptions :column="2" border size="small" class="detail-desc">
          <el-descriptions-item label="邮箱">{{ detail.email || '—' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detail.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="任教学科">{{ detail.subjects || '—' }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ fmtTime(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.status === 'disabled'" label="禁用原因" :span="2">
            {{ detail.disabledReason || '—' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { adminTeacherPage, adminTeacherDetail, adminTeacherUpdateStatus, adminTeacherResetPassword } from '@/api/admin'
import { dayjs } from '@/utils/date'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({ status: '', keyword: '' })

const detailVisible = ref(false)
const detail = ref(null)
const detailLoading = ref(false)

function fmtTime(t) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '—'
}

/* 金额：千分位 + 两位小数（空值显示 0.00） */
function fmtMoney(v) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
}

async function fetchData() {
  loading.value = true
  try {
    const res = await adminTeacherPage({
      pageNum: page.value,
      pageSize: pageSize.value,
      status: filters.status || undefined,
      keyword: filters.keyword.trim() || undefined
    })
    list.value = res.list || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function load() {
  page.value = 1
  fetchData()
}

/* 重置筛选条件并回到第一页重新查询 */
function resetFilters() {
  filters.status = ''
  filters.keyword = ''
  load()
}

async function openDetail(row) {
  detail.value = null
  detailVisible.value = true
  detailLoading.value = true
  try {
    detail.value = await adminTeacherDetail(row.id)
  } finally {
    detailLoading.value = false
  }
}

async function toggleStatus(row) {
  const disabling = row.status === 'active'
  if (disabling) {
    const { value } = await ElMessageBox.prompt(
      `确定禁用教师「${row.nickname || row.username}」吗？禁用后该教师将无法登录。`,
      '禁用账号',
      { type: 'warning', confirmButtonText: '禁用', cancelButtonText: '取消', inputPlaceholder: '禁用原因（可选）', inputValue: '' }
    )
    await adminTeacherUpdateStatus({ id: row.id, status: 'disabled', reason: value || '' })
    ElMessage.success('已禁用')
  } else {
    await ElMessageBox.confirm(`确定启用教师「${row.nickname || row.username}」吗？`, '启用账号', { type: 'info' })
    await adminTeacherUpdateStatus({ id: row.id, status: 'active' })
    ElMessage.success('已启用')
  }
  fetchData()
}

async function resetPassword(row) {
  await ElMessageBox.confirm(
    `确定重置「${row.nickname || row.username}」的密码吗？新密码将发送至其邮箱。`,
    '重置密码',
    { type: 'warning', confirmButtonText: '重置', cancelButtonText: '取消' }
  )
  await adminTeacherResetPassword(row.id)
  ElMessage.success('密码已重置并发送至教师邮箱')
}

onMounted(load)
</script>

<style lang="scss" scoped>
.page-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-ink);
}
.filter-bar {
  flex-wrap: wrap;
}
.flex-grow {
  flex: 1;
}
.flex-end {
  display: flex;
  justify-content: flex-end;
}
.teacher-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.teacher-avatar {
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

  &.lg {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }
}
.teacher-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-ink);
}
.teacher-sub {
  font-size: 12px;
  color: var(--color-muted);
}

/* ---------- 详情弹窗 ---------- */
.detail-body {
  .detail-head {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 4px 0 2px;
  }

  .head-main {
    flex: 1;
    min-width: 0;
  }

  .head-top {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .detail-name {
    font-size: 17px;
    font-weight: 700;
    color: var(--color-ink);
  }

  .head-sub {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    font-size: 12px;
    color: var(--color-muted);

    .head-divider {
      color: var(--color-border);
    }
  }

  .head-login {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;

    .head-login-label {
      font-size: 11px;
      color: var(--color-muted);
    }
    .head-login-time {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-secondary);
      font-variant-numeric: tabular-nums;
    }
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin: 16px 0;

    @media (max-width: 720px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-card {
    padding: 12px 10px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    text-align: center;

    .stat-value {
      font-size: 17px;
      font-weight: 700;
      line-height: 1.3;
      font-variant-numeric: tabular-nums;
    }
    .stat-label {
      margin-top: 3px;
      font-size: 12px;
      color: var(--color-muted);
    }

    &.primary .stat-value { color: #635bff; }
    &.success .stat-value { color: #30b130; }
    &.warning .stat-value { color: #f5a623; }
    &.info .stat-value { color: #0073e6; }
    &.danger .stat-value { color: #df1b41; }
  }

  .detail-desc {
    margin-top: 2px;
  }
}
</style>
