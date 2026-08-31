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
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, UserFilled } from '@element-plus/icons-vue'
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
const regForm = reactive({ username: '', nickname: '', password: '', confirm: '' })

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const regRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
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
      password: regForm.password
    })
    afterLogin(data)
  } finally {
    loading.value = false
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

.footer-text {
  margin-top: 24px;
  font-size: 12px;
  color: var(--color-muted);
}
</style>
