<template>
  <div class="page-container">
    <h2 class="page-title">教师管理</h2>
    <el-card>
      <div class="flex-between mb-16">
        <div class="flex filter-bar">
          <el-select v-model="filters.status" placeholder="状态" clearable style="width: 130px" @change="load">
            <el-option label="正常" value="active" />
            <el-option label="已禁用" value="disabled" />
          </el-select>
          <el-input
            v-model="filters.keyword"
            placeholder="用户名 / 昵称 / 邮箱"
            clearable
            style="width: 220px"
            @keyup.enter="load"
            @clear="load"
          />
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
        </div>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="教师" min-width="160">
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
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column prop="subjects" label="任教学科" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.subjects || '—' }}</template>
        </el-table-column>
        <el-table-column label="课程数" width="80" align="center" prop="courseCount" />
        <el-table-column label="学生数" width="80" align="center" prop="studentCount" />
        <el-table-column label="注册时间" width="150">
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
    <el-dialog v-model="detailVisible" title="教师详情" width="440px">
      <div v-if="detail" class="detail-body">
        <div class="detail-head">
          <span class="teacher-avatar lg">{{ (detail.nickname || detail.username || '?').charAt(0) }}</span>
          <div>
            <div class="detail-name">{{ detail.nickname || detail.username }}</div>
            <div class="detail-sub">@{{ detail.username }}</div>
            <el-tag :type="detail.status === 'active' ? 'success' : 'danger'" size="small" class="mt-4">
              {{ detail.status === 'active' ? '正常' : '已禁用' }}
            </el-tag>
          </div>
        </div>
        <el-descriptions :column="1" border size="small" class="mt-16">
          <el-descriptions-item label="邮箱">{{ detail.email || '—' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detail.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="任教学科">{{ detail.subjects || '—' }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ fmtTime(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="最后登录">{{ detail.lastLoginAt ? fmtTime(detail.lastLoginAt) : '从未登录' }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.status === 'disabled'" label="禁用原因">
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
import { Search } from '@element-plus/icons-vue'
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

function fmtTime(t) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '—'
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

async function openDetail(row) {
  detail.value = await adminTeacherDetail(row.id)
  detailVisible.value = true
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
  gap: 8px;
  align-items: center;
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
.detail-body {
  .detail-head {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .detail-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-ink);
  }
  .detail-sub {
    font-size: 12px;
    color: var(--color-muted);
    margin-bottom: 4px;
  }
}
.mt-16 {
  margin-top: 16px;
}
.mt-4 {
  margin-top: 4px;
}
</style>
