<template>
  <div class="page-container">
    <div class="flex-between mb-16">
      <h2 class="page-title">机构管理</h2>
      <div class="flex">
        <el-button type="primary" :icon="Plus" class="mr-8" @click="openDialog()">新增机构</el-button>
        <el-button :icon="Download" @click="exportCsv">导出</el-button>
      </div>
    </div>
    <el-card>
      <div class="flex filter-bar">
        <el-input
          v-model="filters.name"
          placeholder="机构名称"
          clearable
          style="width: 180px"
          class="mr-8"
          @keyup.enter="load"
          @clear="load"
        />
        <el-input
          v-model="filters.address"
          placeholder="地址"
          clearable
          style="width: 180px"
          class="mr-8"
          @keyup.enter="load"
          @clear="load"
        />
        <div class="flex-grow" />
        <el-button :icon="RefreshLeft" class="mr-8" @click="resetFilters">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>

      <OrganizationTable :list="list" :loading="loading" class="mt-16" @edit="openDialog" @remove="remove" />

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

    <OrganizationFormDialog v-model:visible="dialogVisible" ref="dialogRef" @saved="load" />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, RefreshLeft, Download } from '@element-plus/icons-vue'
import { organizationPage, organizationRemove, organizationList } from '@/api/organization'
import { useMetaStore } from '@/store/meta'
import OrganizationTable from './components/OrganizationTable.vue'
import OrganizationFormDialog from './components/OrganizationFormDialog.vue'

const metaStore = useMetaStore()
const list = ref([])
const total = ref(0)
const loading = ref(false)
const filters = reactive({ name: '', address: '' })
const dialogVisible = ref(false)
const dialogRef = ref()
const route = useRoute()

const page = ref(1)
const pageSize = ref(20)

async function fetchData() {
  loading.value = true
  try {
    const res = await organizationPage({
      pageNum: page.value,
      pageSize: pageSize.value,
      name: filters.name.trim() || undefined,
      address: filters.address.trim() || undefined
    })
    list.value = res.list || []
    total.value = res.total || 0
    try {
      metaStore.setOrganizations(await organizationList())
    } catch (e) {
      /* 忽略 */
    }
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
  filters.address = ''
  load()
}

function onSizeChange() {
  page.value = 1
  fetchData()
}

async function openDialog(row) {
  dialogVisible.value = true
  await dialogRef.value?.openForEdit(row || null)
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除机构「${row.name}」吗？`, '提示', { type: 'warning' })
  await organizationRemove(row.id)
  ElMessage.success('删除成功')
  load()
}

/* 导出当前筛选条件下的机构列表为 CSV（Excel 兼容，带 BOM 与转义） */
function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function exportCsv() {
  const res = await organizationPage({
    pageNum: 1,
    pageSize: 100000,
    name: filters.name.trim() || undefined,
    address: filters.address.trim() || undefined
  })
  const rows = res.list || []
  const head = ['机构名称', '地址', '备注']
  const lines = [head.join(',')]
  rows.forEach((r) => {
    lines.push([r.name, r.address, r.remark].map(csvCell).join(','))
  })
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '机构列表.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  /* 来自全局搜索的跳转关键字 */
  if (route.query.keyword) filters.name = String(route.query.keyword)
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
  gap: 0;
}
.flex-grow {
  flex: 1;
}
.flex-end {
  display: flex;
  justify-content: flex-end;
}
</style>
