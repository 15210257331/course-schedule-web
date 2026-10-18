<template>
  <div class="page-container">
    <div class="flex-between mb-16">
      <h2 class="page-title">学生管理</h2>
      <div class="flex">
        <el-button type="primary" :icon="Plus" class="mr-8" @click="openDialog()">新增学生</el-button>
        <el-button :icon="Download" @click="exportCsv">导出</el-button>
      </div>
    </div>
    <el-card>
      <div class="flex filter-bar">
        <el-input
          v-model="filters.name"
          placeholder="学生姓名"
          clearable
          style="width: 160px"
          class="mr-8"
          @keyup.enter="load"
          @clear="load"
        />
        <el-select v-model="filters.stage" placeholder="学段" clearable style="width: 110px" class="mr-8">
          <el-option v-for="s in STAGES" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filters.courseType" placeholder="课程类型" clearable style="width: 110px" class="mr-8">
          <el-option label="一对一" value="一对一" />
          <el-option label="家教" value="家教" />
          <el-option label="班课" value="班课" />
        </el-select>
        <el-select
          v-model="filters.organizationId"
          placeholder="机构"
          clearable
          filterable
          style="width: 150px"
          class="mr-8"
        >
          <el-option v-for="o in metaStore.organizations" :key="o.id" :label="o.name" :value="o.id" />
        </el-select>
        <div class="flex-grow" />
        <el-button :icon="RefreshLeft" class="mr-8" @click="resetFilters">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>

      <StudentTable
        :list="list"
        :loading="loading"
        class="mt-16"
        @edit="openDialog"
        @remove="remove"
        @attachments="openAttachments"
      />

      <div class="flex-end mt-16">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="fetchData"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <StudentDialog v-model:visible="dialogVisible" ref="dialogRef" @saved="load" />
    <StudentAttachmentDialog v-model:visible="attDialogVisible" :student="attStudent" @removed="load" />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, RefreshLeft, Download } from '@element-plus/icons-vue'
import { studentPage, studentRemove } from '@/api/student'
import { organizationList } from '@/api/organization'
import { useMetaStore } from '@/store/meta'
import StudentTable from './components/StudentTable.vue'
import StudentDialog from '@/components/StudentDialog.vue'
import StudentAttachmentDialog from './components/StudentAttachmentDialog.vue'

/* 学生管理与课表左侧学生列表共用 /students 数据源 */
const metaStore = useMetaStore()
const list = ref([])
const total = ref(0)
const loading = ref(false)
const filters = reactive({ name: '', stage: '', courseType: '', organizationId: null })
const dialogVisible = ref(false)
const dialogRef = ref()
const route = useRoute()

/* 课件列表弹窗 */
const attDialogVisible = ref(false)
const attStudent = ref(null)

const STAGES = ['初一', '初二', '初三', '高一', '高二', '高三']

const page = ref(1)
const pageSize = ref(20)

async function fetchData() {
  loading.value = true
  try {
    const res = await studentPage({
      pageNum: page.value,
      pageSize: pageSize.value,
      name: filters.name.trim() || undefined,
      stage: filters.stage || undefined,
      courseType: filters.courseType || undefined,
      organizationId: filters.organizationId ?? undefined
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
  filters.name = ''
  filters.stage = ''
  filters.courseType = ''
  filters.organizationId = null
  load()
}

function onSizeChange() {
  page.value = 1
  fetchData()
}

/* 机构下拉数据 */
async function ensureMeta() {
  try {
    if (!metaStore.organizations.length) metaStore.setOrganizations(await organizationList())
  } catch (e) {
    /* 忽略 */
  }
}

async function openDialog(row) {
  dialogVisible.value = true
  await dialogRef.value?.openForEdit(row || null)
}

/* 查看某学生的课件列表 */
function openAttachments(row) {
  attStudent.value = row
  attDialogVisible.value = true
}

/* 删除学生：与课表侧栏行为一致（可选同时删除该学生排出的课程） */
async function remove(row) {
  const stuName = [row.studentName, row.stage].filter(Boolean).join(' · ') || row.title
  const ok = await ElMessageBox.confirm(
    `确定删除学生「${stuName}」吗？\n\n若选择“同时删除”，将一并删除该学生已排出的所有课程。`,
    '删除学生',
    {
      type: 'warning',
      confirmButtonText: '同时删除课程',
      cancelButtonText: '仅删除学生',
      distinguishCancelAndClose: true
    }
  )
    .then(() => 'withCourses')
    .catch((action) => (action === 'cancel' ? 'onlyStudent' : null))
  if (!ok) return
  const removed = await studentRemove(row.id, ok === 'withCourses')
  ElMessage.success(ok === 'withCourses' ? `已删除学生「${stuName}」及其 ${removed} 节课程` : `已删除学生「${stuName}」`)
  load()
}

/* 导出当前筛选条件下的学生列表为 CSV（Excel 兼容，带 BOM 与转义） */
function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function locationOf(row) {
  if (row.organizationId != null) return metaStore.orgMap[row.organizationId]?.address || ''
  return row.location || ''
}

async function exportCsv() {
  const res = await studentPage({
    pageNum: 1,
    pageSize: 100000,
    name: filters.name.trim() || undefined,
    stage: filters.stage || undefined,
    courseType: filters.courseType || undefined,
    organizationId: filters.organizationId ?? undefined
  })
  const rows = res.list || []
  const head = ['姓名', '学段', '课程类型', '机构', '上课地点', '课时费(元)', '课件数', '备注']
  const lines = [head.join(',')]
  rows.forEach((r) => {
    lines.push(
      [
        r.studentName,
        r.stage,
        r.courseType,
        r.organizationName,
        locationOf(r),
        r.fee != null ? Number(r.fee).toFixed(2) : '',
        r.attachmentCount ?? '',
        r.note
      ].map(csvCell).join(',')
    )
  })
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '学生列表.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  /* 来自全局搜索的跳转关键字 */
  if (route.query.keyword) filters.name = String(route.query.keyword)
  load()
  ensureMeta()
})
</script>

<style lang="scss" scoped>
.page-title {
  margin: 0;
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
</style>
