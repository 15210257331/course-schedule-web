<template>
  <div class="page-container">
    <el-card>
      <div class="flex-between mb-16">
        <div class="flex">
          <el-date-picker
            v-model="range"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 260px"
            @change="load"
          />
          <el-input
            v-model="keyword"
            placeholder="搜索标题/学生/科目"
            clearable
            style="width: 220px"
            class="mr-8"
            @keyup.enter="load"
            @clear="load"
          />
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
        </div>
        <el-button type="primary" :icon="Plus" @click="create">新增课程</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="title" label="课程" min-width="160" />
        <el-table-column label="学生" width="100">
          <template #default="{ row }">{{ row.studentName || '-' }}</template>
        </el-table-column>
        <el-table-column label="机构" width="120">
          <template #default="{ row }">{{ row.organizationName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="subject" label="科目" width="90" />
        <el-table-column label="时间" width="240">
          <template #default="{ row }">
            {{ formatDateTime(row.startTime) }} ~ {{ formatDateTime(row.endTime).slice(11) }}
          </template>
        </el-table-column>
        <el-table-column label="课时费" width="100" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.fee) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="edit(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="duplicate(row)">复制</el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <CourseFormDialog v-model:visible="dialogVisible" ref="dialogRef" @saved="load" />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { courseApi } from '@/api/course'
import { useMetaStore } from '@/store/meta'
import { loadSnapshot } from '@/utils/idb'
import { formatDateTime, formatMoney } from '@/utils/date'
import CourseFormDialog from '@/components/CourseFormDialog.vue'

const metaStore = useMetaStore()
const list = ref([])
const loading = ref(false)
const keyword = ref('')
const range = ref([dayjs().subtract(1, 'month').format('YYYY-MM-DD'), dayjs().add(1, 'month').format('YYYY-MM-DD')])
const dialogVisible = ref(false)
const dialogRef = ref()

function statusText(s) {
  return { scheduled: '待上课', completed: '已完成', cancelled: '已取消' }[s] || s
}
function statusType(s) {
  return { scheduled: 'primary', completed: 'success', cancelled: 'info' }[s] || 'info'
}

async function load() {
  loading.value = true
  try {
    const [start, end] = range.value
    let data
    try {
      const snap = await loadSnapshot()
      metaStore.setSnapshot(snap)
      data = snap.courses || []
      data = data.filter(
        (c) => dayjs(c.startTime).isAfter(start) && dayjs(c.startTime).isBefore(dayjs(end).add(1, 'day'))
      )
    } catch (e) {
      data = await courseApi.list(`${start}T00:00:00`, `${dayjs(end).add(1, 'day').format('YYYY-MM-DD')}T00:00:00`)
    }
    if (keyword.value) {
      const k = keyword.value.toLowerCase()
      data = data.filter(
        (c) =>
          c.title?.toLowerCase().includes(k) ||
          c.studentName?.toLowerCase().includes(k) ||
          c.subject?.toLowerCase().includes(k)
      )
    }
    list.value = data.sort((a, b) => (a.startTime > b.startTime ? 1 : -1))
  } finally {
    loading.value = false
  }
}

function create() {
  dialogVisible.value = true
}
async function edit(row) {
  dialogVisible.value = true
  await dialogRef.value?.openForEdit(row)
}
async function duplicate(row) {
  const start = dayjs(row.startTime).add(1, 'day').format('YYYY-MM-DDTHH:mm:ss')
  const end = dayjs(row.endTime).add(1, 'day').format('YYYY-MM-DDTHH:mm:ss')
  await courseApi.copy(row.id, { startTime: start, endTime: end })
  ElMessage.success('已复制')
  load()
}
async function remove(row) {
  await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '提示', { type: 'warning' })
  await courseApi.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>