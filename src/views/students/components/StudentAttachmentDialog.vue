<template>
  <el-dialog
    :model-value="visible"
    :title="`「${studentName}」的课件`"
    width="640px"
    @update:model-value="$emit('update:visible', $event)"
    @open="load"
  >
    <div v-loading="loading" class="att-list">
      <template v-if="list.length">
        <div v-for="a in list" :key="a.id" class="att-card" :class="`is-${fileType(a)}`">
          <div class="att-thumb">
            <img v-if="isImage(a)" :src="a.filePath" alt="" loading="lazy" />
            <el-icon v-else class="att-thumb-icon"><component :is="typeIcon(a)" /></el-icon>
          </div>
          <div class="att-body">
            <div class="att-name" :title="a.fileName">{{ a.fileName }}</div>
            <div v-if="a.studentName && a.studentName !== studentName" class="att-students" :title="a.studentName">
              <el-icon><User /></el-icon><span>{{ a.studentName }}</span>
            </div>
            <div class="att-meta">
              <span class="att-tag" :class="`is-${fileType(a)}`">{{ fileTypeLabel(a) }}</span>
              <span class="att-size">{{ formatSize(a.fileSize) }}</span>
              <span class="att-date">{{ formatDate(a.createdAt) }}</span>
            </div>
          </div>
          <div class="att-ops">
            <el-tooltip v-if="isPreviewable(a)" content="预览" placement="top">
              <el-icon class="att-op" @click="preview(a)"><View /></el-icon>
            </el-tooltip>
            <el-tooltip content="下载" placement="top">
              <el-icon class="att-op" @click="download(a)"><Download /></el-icon>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-icon class="att-op danger" @click="remove(a)"><Delete /></el-icon>
            </el-tooltip>
          </div>
        </div>
      </template>
      <el-empty v-else-if="!loading" description="暂无课件" :image-size="70" />
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>

    <el-image-viewer v-if="viewerVisible" teleported :url-list="viewerUrl ? [viewerUrl] : []" @close="viewerVisible = false" />
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  View, Download, Delete, User,
  Document, Picture, Tickets, Notebook, Film, Files, Collection
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { attachmentList, attachmentDownload, attachmentRemove } from '@/api/attachment'

const props = defineProps({
  visible: { type: Boolean, default: false },
  student: { type: Object, default: null }
})
const emit = defineEmits(['update:visible', 'removed'])

const list = ref([])
const loading = ref(false)
const viewerVisible = ref(false)
const viewerUrl = ref('')

const studentName = computed(() => props.student?.studentName || props.student?.title || '学生')

async function load() {
  if (!props.student?.id) return
  loading.value = true
  try {
    list.value = (await attachmentList(props.student.id)) || []
  } finally {
    loading.value = false
  }
}

/* ============ 类型判定（与课件管理页一致） ============ */
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
function extOf(a) {
  return (a.fileName || '').split('.').pop().toLowerCase()
}
function isImage(a) {
  return IMAGE_EXTS.includes(extOf(a))
}
function isPdf(a) {
  return extOf(a) === 'pdf'
}
function isPreviewable(a) {
  return isImage(a) || isPdf(a)
}
function fileType(a) {
  const ext = extOf(a)
  if (IMAGE_EXTS.includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'doc' || ext === 'docx') return 'word'
  if (ext === 'xls' || ext === 'xlsx') return 'excel'
  if (ext === 'ppt' || ext === 'pptx') return 'ppt'
  if (ext === 'txt') return 'txt'
  if (ext === 'zip') return 'zip'
  return 'file'
}
function typeIcon(a) {
  const t = fileType(a)
  if (t === 'image') return Picture
  if (t === 'pdf') return Collection
  if (t === 'word') return Document
  if (t === 'excel') return Tickets
  if (t === 'ppt') return Film
  if (t === 'zip') return Files
  return Notebook
}
function fileTypeLabel(a) {
  const ext = extOf(a)
  if (IMAGE_EXTS.includes(ext)) return '图片'
  if (ext === 'pdf') return 'PDF'
  if (ext === 'doc' || ext === 'docx') return 'Word'
  if (ext === 'xls' || ext === 'xlsx') return 'Excel'
  if (ext === 'ppt' || ext === 'pptx') return 'PPT'
  if (ext === 'txt') return '文本'
  if (ext === 'zip') return '压缩包'
  return '文件'
}
function formatSize(bytes) {
  if (bytes == null) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}
function formatDate(t) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : ''
}

/* ============ 下载 / 删除 / 预览 ============ */
async function download(a) {
  try {
    const blob = await attachmentDownload(a.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = a.fileName || 'courseware'
    link.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    /* 错误由拦截器提示 */
  }
}

async function remove(a) {
  try {
    await ElMessageBox.confirm(`确定删除课件「${a.fileName}」吗？`, '删除课件', { type: 'warning' })
  } catch (e) {
    return
  }
  try {
    await attachmentRemove(a.id)
    list.value = list.value.filter(x => x.id !== a.id)
    ElMessage.success('已删除')
    emit('removed')
  } catch (e) {
    /* 错误由拦截器提示 */
  }
}

function preview(a) {
  if (isImage(a)) {
    viewerUrl.value = a.filePath
    viewerVisible.value = true
    return
  }
  if (isPdf(a)) {
    const win = window.open('', '_blank')
    attachmentDownload(a.id)
      .then(blob => {
        const url = URL.createObjectURL(blob)
        if (win) win.location.href = url
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      })
      .catch(() => { if (win) win.close() })
  }
}
</script>

<style lang="scss" scoped>
.att-list {
  min-height: 120px;
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.att-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 4px 12px rgba(99, 91, 255, 0.1);
    .att-ops {
      opacity: 1;
    }
  }

  .att-thumb {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .att-thumb-icon {
      font-size: 22px;
    }
    &.is-image { background: #e6f6e9; .att-thumb-icon { color: #1a9a4a; } }
    &.is-pdf { background: #fdeaea; .att-thumb-icon { color: #d63031; } }
    &.is-word { background: #e8f0fe; .att-thumb-icon { color: #2b6cb0; } }
    &.is-excel { background: #e6f6e9; .att-thumb-icon { color: #1a9a4a; } }
    &.is-ppt { background: #fdf0e3; .att-thumb-icon { color: #e05a00; } }
    &.is-txt { background: #eef0f3; .att-thumb-icon { color: #5a6071; } }
    &.is-zip { background: #efedff; .att-thumb-icon { color: #635bff; } }
    &.is-file { background: #eef0f3; .att-thumb-icon { color: #5a6071; } }
  }
  .att-body {
    flex: 1;
    min-width: 0;
    .att-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-ink);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .att-students {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
      font-size: 11px;
      color: var(--color-primary);
      white-space: nowrap;
      overflow: hidden;
      :deep(.el-icon) {
        font-size: 12px;
        flex-shrink: 0;
      }
    }
    .att-meta {
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      .att-tag {
        font-size: 10px;
        font-weight: 600;
        line-height: 1.6;
        padding: 0 6px;
        border-radius: 4px;
        white-space: nowrap;
        &.is-image { background: #e6f6e9; color: #1a9a4a; }
        &.is-pdf { background: #fdeaea; color: #d63031; }
        &.is-word { background: #e8f0fe; color: #2b6cb0; }
        &.is-excel { background: #e6f6e9; color: #1a9a4a; }
        &.is-ppt { background: #fdf0e3; color: #e05a00; }
        &.is-txt { background: #eef0f3; color: #5a6071; }
        &.is-zip { background: #efedff; color: #635bff; }
        &.is-file { background: #eef0f3; color: #5a6071; }
      }
      .att-size,
      .att-date {
        font-size: 11px;
        color: var(--color-muted);
        white-space: nowrap;
      }
    }
  }
  .att-ops {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
    .att-op {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      font-size: 15px;
      color: var(--color-muted);
      cursor: pointer;
      border-radius: 6px;
      transition: color 0.15s ease, background 0.15s ease;
      &:hover {
        color: var(--color-primary);
        background: var(--el-color-primary-light-9);
      }
      &.danger:hover {
        color: var(--color-danger);
        background: var(--el-color-danger-light-9);
      }
    }
  }
}
</style>
