<template>
  <div class="page-container backup-page">
    <h2 class="page-title">数据备份</h2>

    <!-- 自动备份设置 -->
    <el-card class="setting-card" shadow="never">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-title">
            <el-icon class="setting-icon"><FolderOpened /></el-icon>
            <span>存储位置</span>
          </div>
          <p class="setting-desc">
            每天晚上 22:00 自动备份全库关键数据。选择备份文件保存到哪里，切换后立即生效。
          </p>
        </div>
        <div class="setting-control">
          <el-segmented
            v-model="useCos"
            :options="storageOptions"
            :disabled="savingSetting"
            @change="onStorageToggle"
          />
          <el-tag class="state-tag" :type="useCos === 'cos' ? 'warning' : 'info'" effect="plain" round>
            {{ useCos === 'cos' ? '备份至腾讯云 COS' : '备份至服务器本地' }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 备份记录列表 -->
    <el-card shadow="never">
      <div class="list-header">
        <div class="list-title">
          <span class="card-title">备份记录</span>
          <span class="badge">{{ list.length }}</span>
        </div>
        <div class="list-actions">
          <span class="muted-text">保留最近 14 份 · 失败不中断</span>
          <el-upload
            accept=".json"
            :show-file-list="false"
            :before-upload="confirmRestore"
            :http-request="doRestore"
          >
            <el-button type="warning" plain :icon="Upload" :loading="restoring">导入备份</el-button>
          </el-upload>
          <el-button
            type="primary"
            :icon="Promotion"
            :loading="running"
            @click="runBackup"
          >立即备份</el-button>
          <el-button :icon="Refresh" circle @click="load" />
        </div>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="备份时间" width="200" align="center">
          <template #default="{ row }">
            <div class="time-cell">
              <el-icon class="time-icon"><Clock /></el-icon>
              <span>{{ fmtTime(row.createdAt) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件名" min-width="200" show-overflow-tooltip align="center"/>
        <el-table-column label="存储位置" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.storageType === 'cos' ? 'warning' : 'info'" effect="light" round>
              {{ row.storageType === 'cos' ? '腾讯云COS' : '服务器本地' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="110" align="center">
          <template #default="{ row }">
            <span class="size-cell">{{ fmtSize(row.fileSize) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <span class="status-pill" :class="row.status === 'success' ? 'is-ok' : 'is-fail'">
              <span class="dot" />
              {{ row.status === 'success' ? '成功' : '失败' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="失败原因" min-width="160" show-overflow-tooltip align="center">
          <template #default="{ row }">
            <span :class="{ 'muted-text': !row.errorMsg }">{{ row.errorMsg || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'success'"
              link
              type="primary"
              :icon="Download"
              :loading="row._downloading"
              @click="download(row)"
            >下载</el-button>
            <span v-else class="muted-text">—</span>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无备份记录" :image-size="80" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, Download, FolderOpened, Promotion, Refresh, Upload } from '@element-plus/icons-vue'
import { adminBackupRecent, adminBackupDownload, adminBackupStorageSetting, adminBackupStorageSave, adminBackupRun, adminBackupRestore } from '@/api/admin'
import { dayjs } from '@/utils/date'

const list = ref([])
const loading = ref(false)
const useCos = ref('local')
const savingSetting = ref(false)
const running = ref(false)
const restoring = ref(false)

const storageOptions = [
  { label: '服务器本地', value: 'local' },
  { label: '腾讯云COS', value: 'cos' }
]

function fmtTime(t) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '—'
}

function fmtSize(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function load() {
  loading.value = true
  try {
    const res = await adminBackupRecent(20)
    list.value = (res || []).map(r => ({ ...r, _downloading: false }))
  } finally {
    loading.value = false
  }
  loadStorageSetting()
}

async function loadStorageSetting() {
  try {
    const res = await adminBackupStorageSetting()
    useCos.value = res?.storageType === 'cos' ? 'cos' : 'local'
  } catch (e) {
    /* 忽略 */
  }
}

async function onStorageToggle() {
  savingSetting.value = true
  try {
    const res = await adminBackupStorageSave(useCos.value)
    useCos.value = res?.storageType === 'cos' ? 'cos' : 'local'
    ElMessage.success(useCos.value === 'cos' ? '备份已切换为腾讯云 COS' : '备份已切换为服务器本地')
  } catch (e) {
    /* 拦截器已提示 */
  } finally {
    savingSetting.value = false
  }
}

async function runBackup() {
  running.value = true
  try {
    const res = await adminBackupRun()
    ElMessage.success(`备份完成（${res?.storageType === 'cos' ? '腾讯云COS' : '服务器本地'}）`)
  } catch (e) {
    /* 拦截器已提示 */
  } finally {
    running.value = false
    // 无论成功失败，后端都已写一条记录，刷新列表让其展示
    await load()
  }
}

async function download(row) {
  row._downloading = true
  try {
    const blob = await adminBackupDownload(row.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = row.fileName || 'backup.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    ElMessage.error('下载失败，请稍后重试')
  } finally {
    row._downloading = false
  }
}

// 导入备份恢复：选文件后二次确认，确认后上传；:before-upload 返回 false 会阻止默认上传，
// 但我们用 :http-request 接管上传，这里只负责弹确认框
async function confirmRestore(file) {
  try {
    await ElMessageBox.confirm(
      `将用「${file.name}」覆盖当前数据：清空并还原全部课程 / 模板 / 机构等业务数据（教师账号保留），此操作不可撤销。确定继续？`,
      '导入备份',
      { type: 'warning', confirmButtonText: '确认覆盖', cancelButtonText: '取消', confirmButtonClass: 'el-button--warning' }
    )
    return true
  } catch {
    return false
  }
}

async function doRestore({ file }) {
  restoring.value = true
  try {
    const res = await adminBackupRestore(file)
    const tables = res?.tables?.length || 0
    const rows = res?.rows || 0
    const skipped = res?.skipped?.length || 0
    ElMessage.success(`已恢复 ${rows} 行，涉及 ${tables} 张表${skipped ? `，跳过 ${skipped} 项` : ''}`)
    await load()
  } catch (e) {
    /* 拦截器已提示 */
  } finally {
    restoring.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.page-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-ink);
}

.backup-page {
  .setting-card {
    margin-bottom: 16px;
  }
}

/* ---------- 存储位置设置卡片 ---------- */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.setting-info {
  .setting-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-ink);
    margin-bottom: 6px;
  }
  .setting-icon {
    color: var(--color-primary);
    font-size: 18px;
  }
  .setting-desc {
    margin: 0;
    font-size: 13px;
    color: var(--color-muted);
    line-height: 1.5;
  }
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.state-tag {
  font-weight: 500;
}

/* ---------- 列表卡片头部 ---------- */
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.list-title {
  display: flex;
  align-items: center;
  gap: 8px;

  .card-title {
    margin: 0;
  }
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--el-color-primary-light-9, #f3f2ff);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
}

.list-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ---------- 表格单元格美化 ---------- */
.time-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;

  .time-icon {
    color: var(--color-muted);
  }
}

.size-cell {
  font-variant-numeric: tabular-nums;
  color: var(--color-secondary);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  &.is-ok {
    color: var(--color-success);
    .dot {
      background: var(--color-success);
      box-shadow: 0 0 0 3px rgba(48, 177, 48, 0.15);
    }
  }

  &.is-fail {
    color: var(--color-danger);
    .dot {
      background: var(--color-danger);
      box-shadow: 0 0 0 3px rgba(223, 27, 65, 0.15);
    }
  }
}

.muted-text {
  color: var(--color-muted);
  font-size: 13px;
}

@media (max-width: 720px) {
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .setting-control {
    width: 100%;
    justify-content: space-between;
  }
}
</style>