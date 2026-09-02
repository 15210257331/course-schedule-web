<template>
  <div class="page-container">
    <h2 class="page-title">机构管理</h2>
    <el-card>
      <div class="flex-between mb-16">
        <div class="flex">
          <span class="search-label">机构名称</span>
          <el-input
            v-model="keyword"
            placeholder="请输入机构名称"
            clearable
            style="width: 220px"
            class="mr-8"
            @keyup.enter="load"
            @clear="load"
          />
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
          <span class="text-muted search-count">共 {{ total }} 个机构</span>
        </div>
        <el-button type="primary" :icon="Plus" @click="openDialog()">新增机构</el-button>
      </div>

      <OrganizationTable :list="list" :loading="loading" @edit="openDialog" @remove="remove" />

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
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { organizationApi } from '@/api/organization'
import { useMetaStore } from '@/store/meta'
import { loadOrganizations } from '@/utils/idb'
import OrganizationTable from './components/OrganizationTable.vue'
import OrganizationFormDialog from './components/OrganizationFormDialog.vue'

const metaStore = useMetaStore()
const list = ref([])
const total = ref(0)
const loading = ref(false)
const keyword = ref('')
const dialogVisible = ref(false)
const dialogRef = ref()
const route = useRoute()

const page = ref(1)
const pageSize = ref(20)

async function fetchData() {
  loading.value = true
  try {
    const res = await organizationApi.page({
      pageNum: page.value,
      pageSize: pageSize.value,
      name: keyword.value.trim() || undefined
    })
    list.value = res.list || []
    total.value = res.total || 0
    try {
      metaStore.setOrganizations(await loadOrganizations())
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
  await organizationApi.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(() => {
  /* 来自全局搜索的跳转关键字 */
  if (route.query.keyword) keyword.value = String(route.query.keyword)
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
  margin-right: 8px;
  font-size: 13px;
  color: var(--color-muted);
  white-space: nowrap;
}
.search-count {
  margin-left: 16px;
}
.flex-end {
  display: flex;
  justify-content: flex-end;
}
</style>
