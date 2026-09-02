<template>
  <div class="page-container">
    <h2 class="page-title">课程管理</h2>
    <el-card>
      <div class="flex-between mb-16">
        <div class="flex">
          <span class="search-label">上课时间</span>
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
          <span class="search-label">标题</span>
          <el-input
            v-model="keyword"
            placeholder="请输入标题"
            clearable
            style="width: 220px"
            class="mr-8"
            @keyup.enter="load"
            @clear="load"
          />
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
        </div>
        <div class="flex">
          <el-button :icon="Download" @click="exportCsv">导出</el-button>
          <el-button type="primary" :icon="Plus" @click="create">新增课程</el-button>
        </div>
      </div>

      <CourseTable :list="list" :loading="loading" @edit="edit" @duplicate="duplicate" @remove="remove" />

      <div class="flex-end mt-16">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <CourseFormDialog v-model:visible="dialogVisible" ref="dialogRef" @saved="load" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Plus, Search } from '@element-plus/icons-vue'
import { courseApi } from '@/api/course'
import CourseFormDialog from '@/components/CourseFormDialog.vue'
import CourseTable from './components/CourseTable.vue'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const keyword = ref('')
const range = ref([dayjs().subtract(1, 'month').format('YYYY-MM-DD'), dayjs().add(1, 'month').format('YYYY-MM-DD')])
const dialogVisible = ref(false)
const dialogRef = ref()
const route = useRoute()

/* 分页（服务端分页，默认每页 20 条） */
const page = ref(1)
const pageSize = ref(20)

async function fetchData() {
  loading.value = true
  try {
    const [start, end] = range.value
    const res = await courseApi.page({
      pageNum: page.value,
      pageSize: pageSize.value,
      title: keyword.value.trim() || undefined,
      start: `${start}T00:00:00`,
      end: `${dayjs(end).add(1, 'day').format('YYYY-MM-DD')}T00:00:00`
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

function onPageChange() {
  fetchData()
}

function onSizeChange() {
  page.value = 1
  fetchData()
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

/* 导出当前筛选条件下的全部课程为 CSV（Excel 兼容） */
function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const statusText = { scheduled: '待上课', completed: '已结束' }

async function exportCsv() {
  const [start, end] = range.value
  const res = await courseApi.page({
    pageNum: 1,
    pageSize: 100000,
    title: keyword.value.trim() || undefined,
    start: `${start}T00:00:00`,
    end: `${dayjs(end).add(1, 'day').format('YYYY-MM-DD')}T00:00:00`
  })
  const rows = res.list || []
  const head = ['学生', '科目', '学段', '课程类型', '上课机构', '开始时间', '结束时间', '课时费(元)', '状态', '上课地点', '备注']
  const lines = [head.join(',')]
  rows.forEach((r) => {
    lines.push(
      [
        r.studentName,
        r.subject,
        r.stage,
        r.courseType,
        r.organizationName,
        r.startTime,
        r.endTime,
        r.fee != null ? Number(r.fee).toFixed(2) : '',
        statusText[r.status] || r.status || '',
        r.location,
        r.note
      ].map(csvCell).join(',')
    )
  })
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `课程-${start}-${end}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  /* 来自全局搜索的跳转关键字 */
  if (route.query.title) {
    keyword.value = String(route.query.title)
    range.value = [dayjs().subtract(1, 'year').format('YYYY-MM-DD'), dayjs().add(1, 'year').format('YYYY-MM-DD')]
  }
  load()
})
</script>

<style lang="scss" scoped>
.page-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-ink);
}
.search-label {
  margin-left: 12px;
  margin-right: 8px;
  font-size: 13px;
  color: var(--color-muted);
  white-space: nowrap;
}
.flex-end {
  display: flex;
  justify-content: flex-end;
}
</style>
