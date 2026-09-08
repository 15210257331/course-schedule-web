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
        <el-card>
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
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authProfile, authUpdateProfile, authUpdatePassword } from '@/api/auth'
import { uploadAvatar } from '@/api/upload'
import { useAuthStore } from '@/store/auth'

const authStore = useAuthStore()
const router = useRouter()
const saving = ref(false)
const savingPwd = ref(false)
const pwdRef = ref()

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
  const user = await authProfile()
  form.nickname = user.nickname
  form.avatar = user.avatar || ''
  form.email = user.email || ''
  form.phone = user.phone || ''
  form.subjects = user.subjects ? user.subjects.split(',').filter(Boolean) : []
}

async function saveProfile() {
  saving.value = true
  try {
    const user = await authUpdateProfile({ ...form, subjects: form.subjects.join(',') })
    authStore.setUser({ ...authStore.user, ...user })
    ElMessage.success('资料已保存')
  } finally {
    saving.value = false
  }
}

async function doUpload({ file }) {
  try {
    const res = await uploadAvatar(file)
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
    await authUpdatePassword({ oldPassword: pwd.oldPassword, newPassword: pwd.newPassword })
    ElMessage.success('密码已修改，请重新登录')
    setTimeout(() => {
      authStore.logout()
      router.replace({ name: 'login' })
    }, 800)
  } finally {
    savingPwd.value = false
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