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
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { settingList, settingSave } from '@/api/setting'
import { localCacheEnabled, setLocalCacheEnabled } from '@/utils/idb'

const saving = ref(false)
const form = reactive({
  defaultDuration: 60,
  reminderOffset: 30,
  defaultFee: 300,
  browserNotify: false,
  defaultView: 'week',
  idbCache: true
})

async function load() {
  const map = await settingList()
  form.defaultDuration = Number(map.defaultDuration || 60)
  form.reminderOffset = Number(map.reminderOffset || 30)
  form.defaultFee = Number(map.defaultFee || 300)
  form.browserNotify = map.browserNotify === 'true'
  form.defaultView = map.defaultView || 'week'
  form.idbCache = map.idbCache === 'true' || localCacheEnabled()
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

onMounted(load)
</script>