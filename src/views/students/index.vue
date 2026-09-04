<template>
  <div class="page-container">
    <h2 class="page-title">学生管理</h2>
    <el-card>
      <div class="flex-between mb-16">
        <div class="flex">
          <span class="search-label">姓名</span>
          <el-input
            v-model="keyword"
            placeholder="请输入学生姓名"
            clearable
            style="width: 220px"
            class="mr-8"
            @keyup.enter="load"
            @clear="load"
          />
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
          <!-- <span class="text-muted search-count">共 {{ total }} 名学生</span> -->
        </div>
      </div>

      <StudentTable :list="list" :loading="loading" />

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
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { templatePage } from '@/api/courseTemplate'
import StudentTable from './components/StudentTable.vue'

/* 一个模板代表一个学生：学生列表由课程模板聚合而来 */
const list = ref([])
const total = ref(0)
const loading = ref(false)
const keyword = ref('')
const route = useRoute()

const page = ref(1)
const pageSize = ref(20)

async function fetchData() {
  loading.value = true
  try {
    const res = await templatePage({
      pageNum: page.value,
      pageSize: pageSize.value,
      name: keyword.value.trim() || undefined
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

function onSizeChange() {
  page.value = 1
  fetchData()
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