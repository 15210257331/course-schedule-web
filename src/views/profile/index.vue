<template>
  <div class="page-container profile">
    <el-row :gutter="16">
      <el-col :span="10">
        <el-card>
          <h3 class="card-title">个人资料</h3>
          <div class="avatar-box">
            <el-upload
              class="avatar-uploader"
              :show-file-list="false"
              accept="image/*"
              :http-request="doUpload"
            >
              <el-avatar :size="72" :src="form.avatar || undefined">
                {{ (form.nickname || '教')[0] }}
              </el-avatar>
              <div class="avatar-upload-tip">点击上传头像</div>
            </el-upload>
          </div>
          <el-form :model="form" label-width="80px">
            <el-form-item label="用户名">
              <el-input :model-value="authStore.user?.username" disabled />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="form.nickname" />
            </el-form-item>
            <el-form-item label="头像 URL">
              <el-input v-model="form.avatar" placeholder="https://..." />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="form.email" />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="form.phone" />
            </el-form-item>
            <el-form-item label="任教学科">
              <el-select
                v-model="form.subjects"
                multiple
                placeholder="选择您任教的学科（可多选）"
                style="width: 100%"
              >
                <el-option v-for="s in SUBJECT_OPTIONS" :key="s" :label="s" :value="s" />
              </el-select>
              <div class="text-muted field-tip">新建课程模板时科目限定为所选任教学科</div>
            </el-form-item>
            <el-button type="primary" :loading="saving" @click="saveProfile">保存资料</el-button>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card class="mb-16">
          <h3 class="card-title">修改密码</h3>
          <el-form ref="pwdRef" :model="pwd" :rules="pwdRules" label-width="80px" style="max-width: 420px">
            <el-form-item label="原密码" prop="oldPassword">
              <el-input v-model="pwd.oldPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="pwd.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirm">
              <el-input v-model="pwd.confirm" type="password" show-password />
            </el-form-item>
            <el-button type="primary" :loading="savingPwd" @click="savePassword">修改密码</el-button>
          </el-form>
        </el-card>

        <el-card>
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
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Upload, Download } from '@element-plus/icons-vue'
import { authApi } from '@/api/auth'
import { uploadApi } from '@/api/upload'
import { backupApi } from '@/api/backup'
import { useAuthStore } from '@/store/auth'
import { idb } from '@/utils/idb'

const authStore = useAuthStore()
const router = useRouter()
const saving = ref(false)
const savingPwd = ref(false)
const pwdRef = ref()
const exporting = ref(false)
const importing = ref(false)
const fileInput = ref()

const form = reactive({ nickname: '', avatar: '', email: '', phone: '', subjects: [] })
const SUBJECT_OPTIONS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '道法']
const pwd = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_, v, cb) => (v === pwd.newPassword ? cb() : cb(new Error('两次密码不一致'))),
      trigger: 'blur'
    }
  ]
}

async function loadProfile() {
  const user = await authApi.profile()
  form.nickname = user.nickname
  form.avatar = user.avatar || ''
  form.email = user.email || ''
  form.phone = user.phone || ''
  form.subjects = user.subjects ? user.subjects.split(',').filter(Boolean) : []
}

async function saveProfile() {
  saving.value = true
  try {
    const user = await authApi.updateProfile({ ...form, subjects: form.subjects.join(',') })
    authStore.setUser({ ...authStore.user, ...user })
    ElMessage.success('资料已保存')
  } finally {
    saving.value = false
  }
}

async function doUpload({ file }) {
  try {
    const res = await uploadApi.uploadAvatar(file)
    form.avatar = res.url
    ElMessage.success('头像已上传，保存资料后生效')
  } catch (e) {
    /* request 拦截器已提示 */
  }
}

async function savePassword() {
  await pwdRef.value.validate()
  savingPwd.value = true
  try {
    await authApi.updatePassword({ oldPassword: pwd.oldPassword, newPassword: pwd.newPassword })
    ElMessage.success('密码已修改，请重新登录')
    setTimeout(() => {
      authStore.logout()
      router.replace({ name: 'login' })
    }, 800)
  } finally {
    savingPwd.value = false
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
    const blob = await backupApi.exportData()
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
      const count = await backupApi.importData(data)
      ElMessage.success(`导入成功，共恢复 ${count ?? 0} 条课程`)
      await idb.clear()
    } finally {
      importing.value = false
    }
  } catch (err) {
    /* 用户取消或 request 拦截器已提示 */
  }
}

onMounted(loadProfile)
</script>

<style lang="scss" scoped>
.profile {
  .avatar-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }
  .avatar-uploader {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  }
  .avatar-upload-tip {
    margin-top: 8px;
    font-size: 12px;
    color: var(--color-muted);
  }
  .field-tip {
    font-size: 12px;
    line-height: 1.5;
    margin-top: 4px;
  }
  .data-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>