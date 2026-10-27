<template>
  <div class="courseware-page">
    <h2 class="page-title">课件管理</h2>

    <!-- 顶部统计卡片 -->
    <div class="cw-stats">
      <div class="cw-stat-card">
        <div class="cw-stat-icon is-primary"><el-icon><Folder /></el-icon></div>
        <div class="cw-stat-body">
          <div class="cw-stat-value">{{ total }}</div>
          <div class="cw-stat-label">课件总数</div>
        </div>
      </div>
      <div class="cw-stat-card">
        <div class="cw-stat-icon is-student"><el-icon><User /></el-icon></div>
        <div class="cw-stat-body">
          <div class="cw-stat-value">{{ studentCount }}</div>
          <div class="cw-stat-label">关联学生</div>
        </div>
      </div>
      <div class="cw-stat-card">
        <div class="cw-stat-icon is-size"><el-icon><Coin /></el-icon></div>
        <div class="cw-stat-body">
          <div class="cw-stat-value">{{ totalSizeText }}</div>
          <div class="cw-stat-label">总大小</div>
        </div>
      </div>
    </div>

    <el-card class="cw-main-card">
      <!-- 筛选 + 上传 -->
      <div class="flex-between mb-16">
        <div class="flex filter-bar">
          <el-select
            v-model="filters.studentId"
            placeholder="按学生筛选"
            clearable
            filterable
            style="width: 180px"
            class="mr-8"
          >
            <el-option v-for="s in metaStore.students" :key="s.id" :label="s.studentName" :value="s.id" />
          </el-select>
          <el-input
            v-model="filters.keyword"
            placeholder="文件名关键字"
            clearable
            style="width: 180px"
            class="mr-8"
            @keyup.enter="load"
            @clear="load"
          />
          <el-button :icon="RefreshLeft" class="mr-8" @click="resetFilters">重置</el-button>
          <el-button type="primary" :icon="Search" @click="load">查询</el-button>
        </div>
        <el-upload
          :show-file-list="false"
          :http-request="onUpload"
          :before-upload="beforeUpload"
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        >
          <el-button type="primary" :icon="Upload" :loading="uploading">上传课件</el-button>
        </el-upload>
      </div>

      <!-- 卡片网格 -->
      <div v-loading="loading" class="cw-grid-wrap">
        <div v-if="list.length" class="cw-grid">
          <div v-for="a in list" :key="a.id" class="cw-card">
            <div class="cw-thumb" :class="`is-${fileType(a)}`" @click="isPreviewable(a) && previewAttachment(a)">
              <img v-if="isImage(a)" :src="a.filePath" alt="" loading="lazy" />
              <el-icon v-else class="cw-thumb-icon"><component :is="typeIcon(a)" /></el-icon>
              <span class="cw-ext">{{ extLabel(a) }}</span>
              <span class="cw-size">{{ formatSize(a.fileSize) }}</span>
              <span v-if="isPreviewable(a)" class="cw-zoom"><el-icon><ZoomIn /></el-icon></span>
            </div>
            <div class="cw-body">
              <div class="cw-name" :title="a.fileName">{{ a.fileName }}</div>
              <div v-if="a.studentName" class="cw-students" :title="a.studentName">
                <el-icon class="cw-students-icon"><User /></el-icon>
                <span class="cw-students-text">{{ a.studentName }}</span>
              </div>
              <!-- <div class="cw-meta">
                <span class="cw-size">{{ formatSize(a.fileSize) }}</span>
              </div> -->
              <div class="cw-foot">
                <span class="cw-tag" :class="`is-${fileType(a)}`">{{ fileTypeLabel(a) }}</span>
                <span class="cw-date">{{ formatDate(a.createdAt) }}</span>
                <div class="cw-ops">
                  <el-tooltip v-if="isPreviewable(a)" content="预览" placement="top">
                    <el-icon class="cw-op" @click="previewAttachment(a)"><View /></el-icon>
                  </el-tooltip>
                  <el-tooltip content="下载" placement="top">
                    <el-icon class="cw-op" @click="downloadAttachment(a)"><Download /></el-icon>
                  </el-tooltip>
                  <el-tooltip content="修改关联学生" placement="top">
                    <el-icon class="cw-op" @click="openEditStudents(a)"><UserFilled /></el-icon>
                  </el-tooltip>
                  <el-tooltip content="删除" placement="top">
                    <el-icon class="cw-op danger" @click="removeAttachment(a)"><Delete /></el-icon>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
        <el-empty v-else-if="!loading" description="暂无课件，点击右上角「上传课件」添加" :image-size="100" />
      </div>

      <div class="flex-end mt-16">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[12, 24, 48, 96]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="fetchData"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <!-- 上传时选择学生（可多选） -->
    <el-dialog v-model="uploadDialogVisible" title="选择学生" width="480px">
      <p class="upload-tip">课件可关联一个或多个学生，请选择关联学生：</p>
      <p v-if="pendingFileName" class="upload-file">
        <el-icon><Document /></el-icon>
        <span class="upload-file-name" :title="pendingFileName">{{ pendingFileName }}</span>
        <span class="upload-file-size">{{ formatSize(pendingFileSize) }}</span>
      </p>
      <el-select
        v-model="uploadStudentIds"
        placeholder="选择学生（可多选）"
        multiple
        filterable
        collapse-tags
        collapse-tags-tooltip
        style="width: 100%"
        size="large"
      >
        <el-option v-for="s in metaStore.students" :key="s.id" :label="`${s.studentName}（${s.stage || '未设学段'}）`" :value="s.id" />
      </el-select>
      <template #footer>
        <el-button @click="cancelUpload">取消</el-button>
        <el-button type="primary" :disabled="!uploadStudentIds.length" @click="confirmUpload">开始上传</el-button>
      </template>
    </el-dialog>

    <!-- 修改关联学生 -->
    <el-dialog v-model="editStudentsVisible" title="修改关联学生" width="480px">
      <p class="upload-tip">{{ editStudentsFile?.fileName }}</p>
      <el-select
        v-model="editStudentIds"
        placeholder="选择学生（可多选）"
        multiple
        filterable
        collapse-tags
        collapse-tags-tooltip
        style="width: 100%"
        size="large"
      >
        <el-option v-for="s in metaStore.students" :key="s.id" :label="`${s.studentName}（${s.stage || '未设学段'}）`" :value="s.id" />
      </el-select>
      <template #footer>
        <el-button @click="editStudentsVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingStudents" :disabled="!editStudentIds.length" @click="confirmEditStudents">保存</el-button>
      </template>
    </el-dialog>

    <el-image-viewer v-if="viewerVisible" teleported :url-list="viewerUrl ? [viewerUrl] : []" @close="viewerVisible = false" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, RefreshLeft, Upload, View, Download, Delete, ZoomIn, User, UserFilled, Coin, Folder,
  Document, Picture, Tickets, Notebook, Film, Files, Collection
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { attachmentPage, attachmentUpload, attachmentDownload, attachmentRemove, attachmentUpdateStudents } from '@/api/attachment'
import { studentPage } from '@/api/student'
import { useMetaStore } from '@/store/meta'

const metaStore = useMetaStore()
const list = ref([])
const total = ref(0)
const loading = ref(false)
const filters = reactive({ studentId: null, keyword: '' })

const page = ref(1)
const pageSize = ref(12)

/* 上传流程：先选学生再上传 */
const uploading = ref(false)
const uploadDialogVisible = ref(false)
const uploadStudentIds = ref([])
const pendingFileName = ref('')
const pendingFileSize = ref(0)
let pendingFile = null

/* 修改关联学生 */
const editStudentsVisible = ref(false)
const editStudentsFile = ref(null)
const editStudentIds = ref([])
const savingStudents = ref(false)

const viewerVisible = ref(false)
const viewerUrl = ref('')

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

/* 当前筛选下的关联学生数与总大小（列表页统计） */
const studentCount = computed(() => new Set(list.value.flatMap(a => (a.studentIds || '').split(',').filter(Boolean).map(Number))).size)
const totalSizeText = computed(() => {
  const sum = list.value.reduce((acc, a) => acc + (a.fileSize || 0), 0)
  return formatSize(sum)
})

async function fetchData() {
  loading.value = true
  try {
    const res = await attachmentPage({
      pageNum: page.value,
      pageSize: pageSize.value,
      studentId: filters.studentId ?? undefined,
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

function resetFilters() {
  filters.studentId = null
  filters.keyword = ''
  load()
}

function onSizeChange() {
  page.value = 1
  fetchData()
}

/* 学生下拉数据（与课表/学生管理共用同一数据源） */
async function ensureStudents() {
  try {
    if (!metaStore.students.length) {
      const res = await studentPage({ pageNum: 1, pageSize: 100 })
      metaStore.setStudents(res.list || [])
    }
  } catch (e) {
    /* 忽略 */
  }
}

/* ============ 类型判定 ============ */
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
function extLabel(a) {
  const ext = extOf(a)
  if (!ext) return 'FILE'
  return ext.length <= 4 ? ext.toUpperCase() : ext.slice(0, 4).toUpperCase()
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

/* ============ 上传 ============ */
function beforeUpload(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip']
  if (!allowed.includes(ext)) {
    ElMessage.error(`「${file.name}」类型不支持`)
    return false
  }
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 20MB')
    return false
  }
  return true
}

/* 上传前必须先选择学生（课件可关联多个学生） */
async function onUpload({ file }) {
  pendingFile = file
  pendingFileName.value = file.name
  pendingFileSize.value = file.size
  await ensureStudents()
  if (!metaStore.students.length) {
    ElMessage.warning('请先在「学生管理」中新增学生，再上传课件')
    pendingFile = null
    return
  }
  uploadStudentIds.value = filters.studentId ? [filters.studentId] : []
  uploadDialogVisible.value = true
}

function cancelUpload() {
  uploadDialogVisible.value = false
  uploadStudentIds.value = []
  pendingFile = null
  pendingFileName.value = ''
  pendingFileSize.value = 0
}

async function confirmUpload() {
  if (!pendingFile || !uploadStudentIds.value.length) return
  uploading.value = true
  try {
    await attachmentUpload(pendingFile, uploadStudentIds.value)
    ElMessage.success(`「${pendingFile.name}」上传成功`)
    uploadDialogVisible.value = false
    uploadStudentIds.value = []
    pendingFile = null
    pendingFileName.value = ''
    pendingFileSize.value = 0
    fetchData()
  } catch (e) {
    /* 错误由拦截器提示 */
  } finally {
    uploading.value = false
  }
}

/* ============ 修改关联学生 ============ */
async function openEditStudents(a) {
  await ensureStudents()
  editStudentsFile.value = a
  editStudentIds.value = (a.studentIds || '').split(',').filter(Boolean).map(Number)
  editStudentsVisible.value = true
}

async function confirmEditStudents() {
  if (!editStudentsFile.value || !editStudentIds.value.length) return
  savingStudents.value = true
  try {
    await attachmentUpdateStudents(editStudentsFile.value.id, editStudentIds.value)
    ElMessage.success('关联学生已更新')
    editStudentsVisible.value = false
    /* 重新拉当前页，刷新卡片上的关联学生姓名 */
    fetchData()
  } catch (e) {
    /* 错误由拦截器提示 */
  } finally {
    savingStudents.value = false
  }
}

/* ============ 下载 / 删除 / 预览 ============ */
async function downloadAttachment(a) {
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

async function removeAttachment(a) {
  try {
    await ElMessageBox.confirm(`确定删除课件「${a.fileName}」吗？`, '删除课件', { type: 'warning' })
  } catch (e) {
    return
  }
  try {
    await attachmentRemove(a.id)
    list.value = list.value.filter(x => x.id !== a.id)
    total.value = Math.max(0, total.value - 1)
    ElMessage.success('已删除')
  } catch (e) {
    /* 错误由拦截器提示 */
  }
}

function previewAttachment(a) {
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

onMounted(() => {
  load()
  ensureStudents()
})
</script>

<style lang="scss" scoped>
.page-title {
  margin: 0 0 16px;
   font-size: 20px;
  font-weight: 700;
  color: var(--color-ink);
}

/* 统计卡片 */
.cw-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.cw-stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  &:hover {
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
    transform: translateY(-2px);
  }
  .cw-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    font-size: 22px;
    &.is-primary {
      background: var(--el-color-primary-light-9);
      color: var(--color-primary);
    }
    &.is-student {
      background: #e8f0fe;
      color: #2b6cb0;
    }
    &.is-size {
      background: #fdf0e3;
      color: #e05a00;
    }
  }
  .cw-stat-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }
  .cw-stat-label {
    margin-top: 2px;
    font-size: 12px;
    color: var(--color-muted);
  }
}

.filter-bar {
  flex-wrap: wrap;
}
.upload-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--color-muted);
}
/* 待上传文件信息（显示在学生选择上方） */
.upload-file {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  font-size: 13px;

  .upload-file-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .upload-file-size {
    flex-shrink: 0;
    color: var(--color-muted);
  }
}

/* 卡片网格：区域内滚动，不撑长页面 */
.cw-grid-wrap {
  max-height: calc(100vh - 380px);
  min-height: 240px;
  overflow-y: auto;
  /* 滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }
}
.cw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 16px;
}
.cw-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 8px 20px rgba(99, 91, 255, 0.12);
    transform: translateY(-2px);
    .cw-ops {
      opacity: 1;
    }
  }

  .cw-thumb {
    position: relative;
    height: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    // padding: 10px;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .cw-thumb-icon {
      font-size: 44px;
    }
    .cw-ext {
      position: absolute;
      left: 10px;
      bottom: 10px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      color: #fff;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
    }
    .cw-size {
       position: absolute;
      right: 10px;
      bottom: 10px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      color: #fff;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
    }
    .cw-zoom {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: #fff;
      background: rgba(15, 23, 42, 0.35);
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    &.is-image { cursor: zoom-in; }
    &.is-pdf { background: #fdeaea; .cw-thumb-icon { color: #d63031; } }
    &.is-word { background: #e8f0fe; .cw-thumb-icon { color: #2b6cb0; } }
    &.is-excel { background: #e6f6e9; .cw-thumb-icon { color: #1a9a4a; } }
    &.is-ppt { background: #fdf0e3; .cw-thumb-icon { color: #e05a00; } }
    &.is-txt { background: #eef0f3; .cw-thumb-icon { color: #5a6071; } }
    &.is-zip { background: #efedff; .cw-thumb-icon { color: #635bff; } }
    &.is-file { background: #eef0f3; .cw-thumb-icon { color: #5a6071; } }
    &:hover .cw-zoom {
      opacity: 1;
    }
  }

  .cw-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 10px 0px 10px;
    border-top: 1px solid var(--color-border);
  }
  .cw-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cw-students {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-primary);
    .cw-students-icon {
      font-size: 13px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .cw-students-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-all;
    }
  }
  .cw-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }
  .cw-size {
    font-size: 11px;
    color: var(--color-muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .cw-foot {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 0px;
    border-top: 1px dashed var(--color-border);
  }
  .cw-tag {
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
  .cw-date {
    font-size: 10px;
    color: var(--color-muted);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cw-ops {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
    .cw-op {
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
.flex-end {
  display: flex;
  justify-content: flex-end;
}
</style>
