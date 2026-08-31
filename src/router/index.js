import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/schedule',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '工作台' }
      },
      {
        path: 'schedule',
        name: 'schedule',
        component: () => import('@/views/schedule/index.vue'),
        meta: { title: '课程表' }
      },
      {
        path: 'courses',
        name: 'courses',
        component: () => import('@/views/courses/index.vue'),
        meta: { title: '课程管理' }
      },
      {
        path: 'students',
        name: 'students',
        component: () => import('@/views/students/index.vue'),
        meta: { title: '学生管理' }
      },
      {
        path: 'organizations',
        name: 'organizations',
        component: () => import('@/views/organizations/index.vue'),
        meta: { title: '机构管理' }
      },
      {
        path: 'income',
        name: 'income',
        component: () => import('@/views/income/index.vue'),
        meta: { title: '费用详情' }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '用户中心' }
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '系统设置' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/schedule'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · TeacherOS` : 'TeacherOS'
  const authStore = useAuthStore()
  if (!to.meta.public && !authStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.public && authStore.isLoggedIn) {
    return { name: 'schedule' }
  }
  return true
})

export default router