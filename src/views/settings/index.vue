<template>
  <div class="page-container settings">
    <el-card>
      <h3 class="card-title">系统设置</h3>
      <el-form label-width="160px" style="max-width: 640px">
        <el-form-item label="默认课程时长(分钟)">
          <el-input-number v-model="form.defaultDuration" :min="15" :max="300" :step="15" />
        </el-form-item>
        <el-form-item label="默认课程提醒(分钟)">
          <el-input-number v-model="form.reminderOffset" :min="0" :max="1440" :step="5" />
        </el-form-item>
        <el-form-item label="默认课时费(元/小时)">
          <el-input-number v-model="form.defaultFee" :precision="2" :min="0" :controls="false" />
        </el-form-item>
        <el-form-item label="浏览器通知">
          <el-switch v-model="form.browserNotify" />
          <span class="text-muted ml-8">到点提醒（需浏览器授权）</span>
        </el-form-item>
        <el-form-item label="默认视图">
          <el-select v-model="form.defaultView" style="width: 180px">
            <el-option label="日视图" value="day" />
            <el-option label="周视图" value="week" />
            <el-option label="月视图" value="month" />
          </el-select>
        </el-form-item>
        <el-form-item label="本地缓存">
          <el-switch v-model="form.idbCache" />
          <span class="text-muted ml-8">开启后首次拉取、之后本地极速加载</span>
        </el-form-item>
        <el-button type="primary" :loading="saving" @click="save">保存设置</el-button>
      </el-form>
    </el-card>

    <el-card class="mt-16">
      <h3 class="card-title">数据管理</h3>
      <p class="text-muted mb-16">
        本地缓存了业务快照以加速启动。清除后可强制从服务器重新拉取最新数据。
      </p>
      <div class="data-actions">
        <el-button type="warning" :icon="Delete" @click="clearCache">清除本地缓存</el-button>
        <el-button :icon="Download" :loading="exporting" @click="exportBackup">导出数据备份</el-button>
        <el-button :icon="Upload" :loading="importing" @click="triggerImport">导入数据备份</el-button>
      </div>
      <p class="text-muted field-tip">
        导出会生成一份 JSON 备份文件；导入将用该文件内容覆盖服务器上的全部数据，请谨慎操作。
      </p>
      <input ref="fileInput" type="file" accept=".json,application/json" style="display: none" @change="onImportFile" />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Upload, Download } from '@element-plus/icons-vue'
import { settingList, settingSave } from '@/api/setting'
import { backupExportData, backupImportData } from '@/api/backup'
import { setLocalCacheEnabled, idb } from '@/utils/idb'

const saving = ref(false)
const exporting = ref(false)
const importing = ref(false)
const fileInput = ref()
const form = reactive({
  defaultDuration: 60,
  reminderOffset: 30,
  defaultFee: 300,
  browserNotify: false,
  defaultView: 'week',
  idbCache: false
})

async function load() {
  const map = await settingList()
  form.defaultDuration = Number(map.defaultDuration || 60)
  form.reminderOffset = Number(map.reminderOffset || 30)
  form.defaultFee = Number(map.defaultFee || 300)
  form.browserNotify = map.browserNotify === 'true'
  form.defaultView = map.defaultView || 'week'
  form.idbCache = map.idbCache === 'true'
}

async function save() {
  saving.value = true
  try {
    await settingSave({
      defaultDuration: String(form.defaultDuration),
      reminderOffset: String(form.reminderOffset),
      defaultFee: String(form.defaultFee),
      browserNotify: String(form.browserNotify),
      defaultView: form.defaultView,
      idbCache: String(form.idbCache)
    })
    setLocalCacheEnabled(form.idbCache)
    ElMessage.success('设置已保存')
  } finally {
    saving.value = false
  }
}

async function clearCache() {
  await ElMessageBox.confirm('确定清除本地缓存吗？', '提示', { type: 'warning' })
  await idb.clear()
  ElMessage.success('已清除，将在下次访问时重新同步')
}

async function exportBackup() {
  exporting.value = true
  try {
    const blob = await backupExportData()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `teacheros-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    ElMessage.success('备份已导出')
  } finally {
    exporting.value = false
  }
}

function triggerImport() {
  fileInput.value?.click()
}

async function onImportFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    const text = await file.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (err) {
      ElMessage.error('文件不是有效的 JSON 备份')
      return
    }
    await ElMessageBox.confirm(
      '导入将覆盖服务器上的全部数据（机构、模板、课程、提醒、设置），且不可撤销。确定继续吗？',
      '导入备份',
      { type: 'warning', confirmButtonText: '覆盖导入', confirmButtonClass: 'el-button--danger' }
    )
    importing.value = true
    try {
      const count = await backupImportData(data)
      ElMessage.success(`导入成功，共恢复 ${count ?? 0} 条课程`)
      await idb.clear()
    } finally {
      importing.value = false
    }
  } catch (err) {
    /* 用户取消或 request 拦截器已提示 */
  }
}

onMounted(load)
</script>