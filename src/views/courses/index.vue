<template>
  <div class="page-container">
    <div class="flex-between mb-16">
      <h2 class="page-title">课程管理</h2>
      <div class="flex">
        <el-button type="primary" :icon="Plus" class="mr-8" @click="create">新增课程</el-button>
        <el-button :icon="Download" @click="exportCsv">导出</el-button>
      </div>
    </div>
    <el-card>
      <div class="flex filter-bar filter-left">
        <el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 200px"
          class="mr-8"
        />
        <!-- 学生姓名联想下拉：选项来自学生管理，按姓名筛选 -->
        <el-select
          v-model="filters.studentName"
          placeholder="学生姓名"
          clearable
          filterable
          style="width: 150px"
          class="mr-8"
        >
          <el-option v-for="s in studentOptions" :key="s.id" :label="s.studentName" :value="s.studentName" />
        </el-select>
        <div class="flex-grow" />
        <el-button :icon="RefreshLeft" class="mr-8" @click="resetFilters">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>

      <CourseTable :list="list" :loading="loading" class="mt-16" @edit="edit" @remove="remove" />

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
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Plus, Search, RefreshLeft } from '@element-plus/icons-vue'
import { coursePage, courseRemove } from '@/api/course'
import { studentPage } from '@/api/student'
import { useMetaStore } from '@/store/meta'
import CourseFormDialog from '@/components/CourseFormDialog.vue'
import CourseTable from './components/CourseTable.vue'

const metaStore = useMetaStore()
const list = ref([])
const total = ref(0)
const loading = ref(false)
const filters = reactive({ studentName: '' })
const range = ref([dayjs().subtract(1, 'month').format('YYYY-MM-DD'), dayjs().add(1, 'month').format('YYYY-MM-DD')])
const dialogVisible = ref(false)
const dialogRef = ref()
const route = useRoute()

/* 学生姓名联想下拉选项（去重，与课件/课表页共用 metaStore 缓存） */
const studentOptions = computed(() => {
  const seen = new Set()
  return metaStore.students.filter((s) => {
    if (!s.studentName || seen.has(s.studentName)) return false
    seen.add(s.studentName)
    return true
  })
})

async function ensureStudents() {
  try {
    if (!metaStore.students.length) {
      const res = await studentPage({ pageNum: 1, pageSize: 100 })
      metaStore.setStudents(res.list || [])
    }
  } catch (e) {
    /* 忽略：下拉为空可手输查询 */
  }
}

/* 分页（服务端分页，默认每页 20 条） */
const page = ref(1)
const pageSize = ref(20)

/* 组装查询参数（分页查询与 CSV 导出共用，保证导出跟随当前筛选） */
function queryPayload(pageNum, pageSizeVal) {
  const [start, end] = range.value
  return {
    pageNum,
    pageSize: pageSizeVal,
    studentName: filters.studentName.trim() || undefined,
    start: `${start}T00:00:00`,
    end: `${dayjs(end).add(1, 'day').format('YYYY-MM-DD')}T00:00:00`
  }
}

async function fetchData() {
  loading.value = true
  try {
    const res = await coursePage(queryPayload(page.value, pageSize.value))
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
  filters.studentName = ''
  range.value = [dayjs().subtract(1, 'month').format('YYYY-MM-DD'), dayjs().add(1, 'month').format('YYYY-MM-DD')]
  load()
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
async function remove(row) {
  await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '提示', { type: 'warning' })
  await courseRemove(row.id)
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
  const res = await coursePage(queryPayload(1, 100000))
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
    filters.studentName = String(route.query.title)
    range.value = [dayjs().subtract(1, 'year').format('YYYY-MM-DD'), dayjs().add(1, 'year').format('YYYY-MM-DD')]
  }
  ensureStudents()
  load()
})
</script>

<style lang="scss" scoped>
.page-title {
  margin: 0;
    font-size: 20px;
  font-weight: 700;
  color: var(--color-ink);
}
.filter-bar {
  flex-wrap: wrap;
}
.filter-left {
  justify-content: flex-start;
}
.flex-grow {
  flex: 1;
}
.flex-end {
  display: flex;
  justify-content: flex-end;
}
</style>
