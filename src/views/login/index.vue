<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h1 class="brand-name">TeacherOS</h1>
        <p class="brand-sub">兼职教师工作台 · 课程与收入管理</p>
      </div>

      <el-tabs v-model="mode" class="tabs" stretch>
        <el-tab-pane label="登录" name="login">
          <el-form ref="loginRef" :model="loginForm" :rules="loginRules" @keyup.enter="handleLogin">
            <el-form-item prop="username">
              <el-input v-model="loginForm.username" placeholder="用户名" :prefix-icon="User" size="large" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="密码"
                :prefix-icon="Lock"
                size="large"
                show-password
              />
            </el-form-item>
            <el-button type="primary" size="large" class="submit" :loading="loading" @click="handleLogin">
              登 录
            </el-button>
            <div class="forgot-row">
              <el-button link type="primary" @click="openReset">忘记密码？</el-button>
            </div>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form ref="regRef" :model="regForm" :rules="regRules" @keyup.enter="handleRegister">
            <el-form-item prop="username">
              <el-input v-model="regForm.username" placeholder="用户名" size="large" :prefix-icon="User" />
            </el-form-item>
            <el-form-item prop="nickname">
              <el-input v-model="regForm.nickname" placeholder="昵称（可选）" size="large" :prefix-icon="UserFilled" />
            </el-form-item>
            <el-form-item prop="email">
              <el-input v-model="regForm.email" placeholder="邮箱（必填，用于找回密码）" size="large" :prefix-icon="Message" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="regForm.password"
                type="password"
                placeholder="密码"
                size="large"
                :prefix-icon="Lock"
                show-password
              />
            </el-form-item>
            <el-form-item prop="confirm">
              <el-input
                v-model="regForm.confirm"
                type="password"
                placeholder="确认密码"
                size="large"
                :prefix-icon="Lock"
                show-password
              />
            </el-form-item>
            <el-button type="primary" size="large" class="submit" :loading="loading" @click="handleRegister">
              注 册
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>

    <p class="footer-text">高效管理你的每一节课</p>

    <!-- 忘记密码弹窗 -->
    <el-dialog v-model="resetVisible" title="重置密码" width="420px" @closed="initReset">
      <el-form ref="resetRef" :model="resetForm" :rules="resetRules" label-width="80px">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="resetForm.email" placeholder="注册时填写的邮箱" />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <div class="captcha-row">
            <el-input v-model="resetForm.code" placeholder="6 位验证码" maxlength="6" />
            <el-button :disabled="countdown > 0" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="resetForm.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input v-model="resetForm.confirm" type="password" show-password placeholder="再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetLoading" @click="submitReset">重置密码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, UserFilled, Message } from '@element-plus/icons-vue'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const mode = ref('login')
const loading = ref(false)
const loginRef = ref()
const regRef = ref()

const loginForm = reactive({ username: '', password: '' })
const regForm = reactive({ username: '', nickname: '', email: '', password: '', confirm: '' })

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const regRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_, v, cb) => (v === regForm.password ? cb() : cb(new Error('两次密码不一致'))),
      trigger: 'blur'
    }
  ]
}

function afterLogin(data) {
  authStore.setLogin({ token: data.token, user: data })
  ElMessage.success('欢迎回来')
  router.push(route.query.redirect || { name: 'schedule' })
}

async function handleLogin() {
  await loginRef.value.validate()
  loading.value = true
  try {
    const data = await authApi.login(loginForm)
    afterLogin(data)
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  await regRef.value.validate()
  loading.value = true
  try {
    const data = await authApi.register({
      username: regForm.username,
      nickname: regForm.nickname,
      email: regForm.email,
      password: regForm.password
    })
    afterLogin(data)
  } finally {
    loading.value = false
  }
}

// ---------- 忘记密码 ----------
const resetVisible = ref(false)
const resetLoading = ref(false)
const resetRef = ref()
const countdown = ref(0)
let countdownTimer = null
const resetForm = reactive({ email: '', code: '', newPassword: '', confirm: '' })
const resetRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_, v, cb) => (v === resetForm.newPassword ? cb() : cb(new Error('两次密码不一致'))),
      trigger: 'blur'
    }
  ]
}

function openReset() {
  resetVisible.value = true
}

function initReset() {
  if (countdownTimer) clearInterval(countdownTimer)
  countdown.value = 0
  resetForm.email = ''
  resetForm.code = ''
  resetForm.newPassword = ''
  resetForm.confirm = ''
}

async function sendCode() {
  if (!resetForm.email) {
    ElMessage.warning('请先输入邮箱')
    return
  }
  await authApi.sendResetCode(resetForm.email)
  ElMessage.success('验证码已发送，请查收')
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(countdownTimer)
  }, 1000)
}

async function submitReset() {
  await resetRef.value.validate()
  resetLoading.value = true
  try {
    await authApi.resetPassword({
      email: resetForm.email,
      code: resetForm.code,
      newPassword: resetForm.newPassword
    })
    ElMessage.success('密码已重置，请用新密码登录')
    resetVisible.value = false
  } finally {
    resetLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: var(--color-surface);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 24px;

  .brand-mark {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--color-primary);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(99, 91, 255, 0.3);

    svg {
      width: 22px;
      height: 22px;
    }
  }

  .brand-name {
    margin: 14px 0 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--color-ink);
  }

  .brand-sub {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--color-muted);
  }
}

.tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 20px;
  }

  :deep(.el-tabs__item) {
    font-size: 14px;
  }
}

.submit {
  width: 100%;
  margin-top: 4px;
}

.forgot-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.captcha-row {
  display: flex;
  gap: 8px;
  width: 100%;

  .el-input {
    flex: 1;
  }
}

.footer-text {
  margin-top: 24px;
  font-size: 12px;
  color: var(--color-muted);
}
</style>
