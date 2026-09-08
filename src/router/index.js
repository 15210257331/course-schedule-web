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
        path: 'attachments',
        name: 'attachments',
        component: () => import('@/views/attachments/index.vue'),
        meta: { title: '附件管理' }
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
    path: '/admin',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/admin/teachers',
    meta: { requiresAdmin: true },
    children: [
      {
        path: 'dashboard',
        name: 'adminDashboard',
        component: () => import('@/views/admin/dashboard/index.vue'),
        meta: { title: '数据看板', requiresAdmin: true }
      },
      {
        path: 'teachers',
        name: 'adminTeachers',
        component: () => import('@/views/admin/teachers/index.vue'),
        meta: { title: '教师管理', requiresAdmin: true }
      },
      {
        path: 'messages',
        name: 'adminMessages',
        component: () => import('@/views/admin/messages/index.vue'),
        meta: { title: '消息推送', requiresAdmin: true }
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
    /* 管理员登录后默认进入数据看板 */
    return authStore.user?.role === 'ADMIN' ? { name: 'adminDashboard' } : { name: 'schedule' }
  }
  /* 管理端页面：非管理员跳转课程表 */
  if (to.meta.requiresAdmin && authStore.user?.role !== 'ADMIN') {
    return { name: 'schedule' }
  }
  /* 教师端页面：管理员跳转数据看板 */
  if (!to.meta.requiresAdmin && !to.meta.public && authStore.user?.role === 'ADMIN') {
    return { name: 'adminDashboard' }
  }
  return true
})

export default router