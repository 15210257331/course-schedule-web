<template>
  <div class="page-container">
    <h2 class="page-title">消息推送</h2>
    <el-card>
      <div class="flex-between mb-16">
        <div class="flex filter-bar">
          <el-select v-model="filters.type" placeholder="类型" clearable style="width: 120px" @change="load">
            <el-option label="公告" value="announcement" />
            <el-option label="活动" value="activity" />
            <el-option label="通知" value="notice" />
          </el-select>
          <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px" @change="load">
            <el-option label="已发布" value="published" />
            <el-option label="已撤回" value="revoked" />
          </el-select>
          <el-input
            v-model="filters.keyword"
            placeholder="标题关键词"
            clearable
            style="width: 200px"
            @keyup.enter="load"
            @clear="load"
          />
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
        </div>
        <el-button type="primary" :icon="Plus" @click="openEditor()">发布消息</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="标题" min-width="200">
          <template #default="{ row }">
            <span class="msg-title" @click="openDetail(row)">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="typeTagType(row.type)">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目标范围" width="110" align="center">
          <template #default="{ row }">
            {{ row.targetType === 'all' ? '全部教师' : `指定 ${row.targetCount || 0} 人` }}
          </template>
        </el-table-column>
        <el-table-column label="阅读" width="100" align="center">
          <template #default="{ row }">
            <span>{{ row.readCount || 0 }} / {{ row.targetCount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="150">
          <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
              {{ row.status === 'published' ? '已发布' : '已撤回' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEditor(row)">编辑</el-button>
            <el-button
              v-if="row.status === 'published'"
              link
              type="warning"
              size="small"
              @click="revoke(row)"
            >撤回</el-button>
            <el-button v-else link type="success" size="small" @click="publish(row)">发布</el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无消息" :image-size="80" />
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

    <!-- 消息编辑弹窗 -->
    <MessageFormDialog v-model:visible="editorVisible" :message="editing" @saved="load" />

    <!-- 消息详情弹窗 -->
    <el-dialog v-model="detailVisible" title="消息详情" width="520px">
      <div v-if="detail" class="msg-detail">
        <div class="md-head">
          <el-tag size="small" :type="typeTagType(detail.type)">{{ typeLabel(detail.type) }}</el-tag>
          <h3 class="md-title">{{ detail.title }}</h3>
        </div>
        <p class="md-content">{{ detail.content }}</p>
        <el-descriptions :column="2" border size="small" class="mt-16">
          <el-descriptions-item label="目标范围">
            {{ detail.targetType === 'all' ? '全部教师' : `指定 ${detail.targetCount || 0} 人` }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ detail.status === 'published' ? '已发布' : '已撤回' }}
          </el-descriptions-item>
          <el-descriptions-item label="发布时间">{{ fmtTime(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="阅读数">{{ detail.readCount || 0 }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { adminMessagePage, adminMessageDetail, adminMessageRevoke, adminMessagePublish, adminMessageRemove } from '@/api/admin'
import { dayjs } from '@/utils/date'
import MessageFormDialog from './components/MessageFormDialog.vue'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({ type: '', status: '', keyword: '' })

const editorVisible = ref(false)
const editing = ref(null)

const detailVisible = ref(false)
const detail = ref(null)

function fmtTime(t) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '—'
}

function typeLabel(t) {
  return { announcement: '公告', activity: '活动', notice: '通知' }[t] || '公告'
}

function typeTagType(t) {
  return { announcement: 'primary', activity: 'warning', notice: 'success' }[t] || 'primary'
}

async function fetchData() {
  loading.value = true
  try {
    const res = await adminMessagePage({
      pageNum: page.value,
      pageSize: pageSize.value,
      type: filters.type || undefined,
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

function openEditor(row) {
  editing.value = row || null
  editorVisible.value = true
}

async function openDetail(row) {
  detail.value = await adminMessageDetail(row.id)
  detailVisible.value = true
}

async function revoke(row) {
  await ElMessageBox.confirm(`确定撤回消息「${row.title}」吗？教师端将不再显示。`, '撤回消息', { type: 'warning' })
  await adminMessageRevoke(row.id)
  ElMessage.success('已撤回')
  fetchData()
}

async function publish(row) {
  await adminMessagePublish(row.id)
  ElMessage.success('已发布')
  fetchData()
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除消息「${row.title}」吗？`, '删除消息', { type: 'warning' })
  await adminMessageRemove(row.id)
  ElMessage.success('已删除')
  fetchData()
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
.msg-title {
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}
.msg-detail {
  .md-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .md-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-ink);
  }
  .md-content {
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--color-secondary);
    white-space: pre-wrap;
  }
}
.mt-16 {
  margin-top: 16px;
}
</style>
