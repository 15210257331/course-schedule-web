<template>
    <div class="layout">
        <!-- 顶部固定导航（Stripe / 掠影网络风格） -->
        <header class="topbar" :class="{ scrolled }">
            <nav class="topbar-inner">
                <!-- 品牌 -->
                <router-link to="/schedule" class="brand">
                    <span class="brand-mark">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </span>
                    <span class="brand-text">TeacherOS</span>
                </router-link>

                <!-- 桌面端导航 -->
                <div class="nav-links">
                    <router-link v-for="item in navItems" :key="item.name" :to="{ name: item.name }" class="nav-link" :class="{ active: isActive(item.name) }">
                        {{ item.title }}
                    </router-link>
                </div>

                <div class="search-zone">
                    <div class="search-box">
                        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                        </svg>
                        <input v-model="searchKeyword" class="search-input" placeholder="搜索课程 / 学生 / 机构" @focus="searchOpen = true" @input="onSearchInput" />
                        <button v-if="searchKeyword" class="search-clear" @click.stop="clearSearch">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div v-if="searchOpen && searchKeyword" class="search-dropdown" @mousedown.prevent>
                        <div v-if="searching" class="search-tip text-muted">搜索中…</div>
                        <template v-else>
                            <div v-if="!searchResults.length" class="search-tip text-muted">未找到匹配结果</div>
                            <template v-else>
                                <div v-if="searchResults.some(r => r.kind === 'course')" class="search-group">
                                    <div class="search-group-title">课程</div>
                                    <div v-for="r in searchResults.filter(x => x.kind === 'course')" :key="'c' + r.id" class="search-item" @click="goSearch(r)">
                                        <span class="si-title">{{ r.title }}</span>
                                        <span class="si-sub">{{ r.studentName }} {{ r.startTime }}</span>
                                    </div>
                                </div>
                                <div v-if="searchResults.some(r => r.kind === 'student')" class="search-group">
                                    <div class="search-group-title">学生</div>
                                    <div v-for="r in searchResults.filter(x => x.kind === 'student')" :key="'s' + r.id" class="search-item" @click="goSearch(r)">
                                        <span class="si-title">{{ r.studentName }}</span>
                                        <span class="si-sub">{{ r.subject }} {{ r.stage }}</span>
                                    </div>
                                </div>
                                <div v-if="searchResults.some(r => r.kind === 'org')" class="search-group">
                                    <div class="search-group-title">机构</div>
                                    <div v-for="r in searchResults.filter(x => x.kind === 'org')" :key="'o' + r.id" class="search-item" @click="goSearch(r)">
                                        <span class="si-title">{{ r.name }}</span>
                                        <span class="si-sub">{{ r.address }}</span>
                                    </div>
                                </div>
                            </template>
                        </template>
                    </div>
                </div>

                <div class="topbar-right">
                    <!-- 主题切换 -->
                    <button class="icon-btn" aria-label="切换主题" @click="toggleTheme">
                        <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                            />
                        </svg>
                        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                        </svg>
                    </button>

                    <!-- 提醒中心（仅教师端；管理员通过消息推送发公告，自身不接收） -->
                    <el-popover v-if="!isAdmin" width="340" trigger="click" placement="bottom-end" popper-class="notify-popper">
                        <template #reference>
                            <button class="icon-btn" aria-label="提醒中心">
                                <el-badge :value="unreadCount" :hidden="!unreadCount" :max="99">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="1.5"
                                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                        />
                                    </svg>
                                </el-badge>
                            </button>
                        </template>
                        <div class="notify-panel">
                            <div class="np-head">
                                <span class="np-title">提醒中心</span>
                                <el-button link type="primary" size="small" @click="markAllRead">全部已读</el-button>
                            </div>
                            <div v-if="!notifyFeed.length" class="np-empty">暂无消息</div>
                            <div v-else class="np-list">
                                <div
                                    v-for="item in notifyFeed"
                                    :key="item.key"
                                    class="notify-item"
                                    :class="[{ unread: !item.raw.isRead }, `kind-${item.kind}`]"
                                    @click="openFeedItem(item)"
                                >
                                    <div class="ni-body">
                                        <div class="ni-top">
                                            <span class="ni-title">
                                                <span class="msg-tag" :class="item.kind === 'reminder' ? 'reminder' : item.raw.type">{{ item.kind === "reminder" ? "提醒" : msgTypeLabel(item.raw.type) }}</span>
                                                {{ item.raw.title }}
                                            </span>
                                            <span class="ni-time">{{ item.kind === "reminder" ? notifyTime(item.raw) : msgTime(item.raw) }}</span>
                                        </div>
                                        <p class="ni-content">{{ item.raw.content }}</p>
                                    </div>
                                    <button
                                        v-if="item.kind === 'reminder'"
                                        class="notify-del"
                                        title="删除提醒"
                                        @click.stop="removeNotification(item.raw)"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <button v-else class="notify-del" title="查看详情" @click.stop="showMessageDetail(item.raw)">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </el-popover>

                    <!-- 用户菜单 -->
                    <div class="user-zone">
                        <button class="avatar-btn" @click.stop="userMenuOpen = !userMenuOpen">
                            {{ userInitial }}
                        </button>
                        <transition name="dd">
                            <div v-if="userMenuOpen" class="user-menu">
                                <div class="user-menu-head">
                                    <p class="user-menu-name">{{ authStore.user?.nickname || "教师" }}</p>
                                    <p class="user-menu-sub">{{ authStore.user?.email || "" }}</p>
                                    <span v-if="userSubject" class="user-tag">主要任教 · {{ userSubject }}</span>
                                </div>
                                <div class="user-menu-body">
                                    <router-link :to="{ name: 'profile' }" class="user-menu-item" @click="userMenuOpen = false">
                                        <el-icon><User /></el-icon>
                                        个人中心
                                    </router-link>
                                    <router-link v-if="!isAdmin" :to="{ name: 'settings' }" class="user-menu-item" @click="userMenuOpen = false">
                                        <el-icon><Setting /></el-icon>
                                        系统设置
                                    </router-link>
                                </div>
                                <div class="user-menu-foot">
                                    <button class="user-menu-item danger" @click="handleLogout">
                                        <el-icon><SwitchButton /></el-icon>
                                        退出登录
                                    </button>
                                </div>
                            </div>
                        </transition>
                    </div>

                    <!-- 移动端菜单按钮 -->
                    <button class="icon-btn mobile-menu-btn" aria-label="菜单" @click="mobileOpen = !mobileOpen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path v-if="!mobileOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
                            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </nav>

            <!-- 移动端导航抽屉 -->
            <transition name="slide">
                <div v-if="mobileOpen" class="mobile-nav">
                    <div class="mobile-nav-inner">
                        <router-link
                            v-for="item in navItems"
                            :key="item.name"
                            :to="{ name: item.name }"
                            class="mobile-nav-link"
                            :class="{ active: isActive(item.name) }"
                            @click="mobileOpen = false"
                        >
                            {{ item.title }}
                        </router-link>
                    </div>
                </div>
            </transition>
        </header>

        <!-- 主内容：居中容器 -->
        <main class="main">
            <div class="main-inner">
                <router-view />
            </div>
        </main>
    </div>
</template>

<script setup>
    import { computed, onBeforeUnmount, onMounted, ref } from "vue"
    import { useRoute, useRouter } from "vue-router"
    import { ElMessageBox } from "element-plus"
    import { User, Setting, SwitchButton } from "@element-plus/icons-vue"
    import { useAuthStore } from "@/store/auth"
    import { notificationList, notificationDue, notificationMarkRead, notificationMarkAllRead, notificationRemove } from "@/api/notification"
    import { messageList, messageMarkRead, messageMarkAllRead } from "@/api/admin"
    import { settingList } from "@/api/setting"
    import { authProfile } from "@/api/auth"
    import { coursePage } from "@/api/course"
    import { templateList } from "@/api/courseTemplate"
    import { organizationList } from "@/api/organization"
    import { dayjs } from "@/utils/date"

    const route = useRoute()
    const router = useRouter()
    const authStore = useAuthStore()

    const isAdmin = computed(() => authStore.user?.role === "ADMIN")
    const navItems = computed(() => {
        /* 管理员：仅管理端菜单；教师：教师端菜单 */
        if (isAdmin.value) {
            return [
                { name: "adminDashboard", title: "数据看板" },
                { name: "adminTeachers", title: "教师管理" },
                { name: "adminMessages", title: "消息推送" },
            ]
        }
        return [
            { name: "dashboard", title: "工作台" },
            { name: "schedule", title: "课程表" },
            { name: "courses", title: "课程管理" },
            { name: "students", title: "学生管理" },
            { name: "organizations", title: "机构管理" },
            { name: "income", title: "收入" },
        ]
    })

    function isActive(name) {
        return route.name === name
    }

    // ---------- 主题 ----------
    const isDark = ref(document.documentElement.classList.contains("dark"))
    function toggleTheme() {
        isDark.value = !isDark.value
        document.documentElement.classList.toggle("dark", isDark.value)
        localStorage.setItem("theme", isDark.value ? "dark" : "light")
    }

    // ---------- 滚动阴影 ----------
    const scrolled = ref(false)
    function onScroll() {
        scrolled.value = window.scrollY > 4
    }

    // ---------- 用户菜单 ----------
    const userMenuOpen = ref(false)
    const userInitial = computed(() => (authStore.user?.nickname || authStore.user?.username || "教").charAt(0).toUpperCase())
    /* 主要任教学科：取 subjects（逗号分隔）第一项 */
    const userSubject = computed(() => {
        const s = authStore.user?.subjects
        return s
            ? s
                  .split(",")
                  .map(x => x.trim())
                  .filter(Boolean)[0] || ""
            : ""
    })

    async function handleLogout() {
        userMenuOpen.value = false
        await ElMessageBox.confirm("确定要退出登录吗？", "提示", { type: "warning" })
        authStore.logout()
        router.push({ name: "login" })
    }

    // ---------- 移动端 ----------
    const mobileOpen = ref(false)

    // ---------- 提醒 ----------
    const notifications = ref([])
    const messages = ref([])
    const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length + messages.value.filter(m => !m.isRead).length)

    /* 合并提醒与系统消息，按时间倒序展示（去掉 tab 后的统一列表） */
    const notifyFeed = computed(() => {
        const items = [
            ...notifications.value.map(n => ({ kind: "reminder", raw: n, key: `r-${n.id}`, time: n.remindAt || n.createdAt })),
            ...messages.value.map(m => ({ kind: "message", raw: m, key: `m-${m.id}`, time: m.createdAt })),
        ]
        return items.sort((a, b) => dayjs(b.time || 0).valueOf() - dayjs(a.time || 0).valueOf())
    })

    function openFeedItem(item) {
        if (item.kind === "reminder") openNotification(item.raw)
        else openMessage(item.raw)
    }

    async function loadNotifications() {
        try {
            notifications.value = await notificationList(20)
        } catch (e) {
            /* 静默 */
        }
    }

    /* 提醒时间：今天显示 HH:mm，更早显示 M月D日 HH:mm */
    function notifyTime(n) {
        const t = n.remindAt || n.createdAt
        if (!t) return ""
        const d = dayjs(t)
        const now = dayjs()
        if (d.isSame(now, "day")) return d.format("HH:mm")
        return d.format("M月D日 HH:mm")
    }

    async function markAllRead() {
        await notificationMarkAllRead()
        await messageMarkAllRead()
        loadNotifications()
        loadMessages()
    }

    /* 点击提醒：标记已读并跳转对应课程（课程表日视图） */
    async function openNotification(n) {
        if (!n.isRead) {
            try {
                await notificationMarkRead(n.id)
            } catch (e) {
                /* 忽略 */
            }
        }
        //if (n.courseId != null) {
        //  router.push({ name: 'schedule', query: { course: n.courseId } })
        // }
        await loadNotifications()
    }

    async function removeNotification(n) {
        try {
            await notificationRemove(n.id)
            await loadNotifications()
        } catch (e) {
            /* 静默 */
        }
    }

    // ---------- 系统消息（公告） ----------
    async function loadMessages() {
        try {
            messages.value = await messageList(20)
        } catch (e) {
            /* 静默 */
        }
    }

    function msgTypeLabel(type) {
        return { announcement: "公告", activity: "活动", notice: "通知" }[type] || "公告"
    }

    function msgTime(m) {
        const t = m.createdAt
        if (!t) return ""
        const d = dayjs(t)
        const now = dayjs()
        if (d.isSame(now, "day")) return d.format("HH:mm")
        return d.format("M月D日 HH:mm")
    }

    async function openMessage(m) {
        if (!m.isRead) {
            try {
                await messageMarkRead(m.id)
                await loadMessages()
            } catch (e) {
                /* 忽略 */
            }
        }
    }

    /* 消息详情弹窗 */
    function showMessageDetail(m) {
        ElMessageBox.alert(m.content, `【${msgTypeLabel(m.type)}】${m.title}`, {
            confirmButtonText: "知道了",
            callback: () => openMessage(m),
        })
    }

    // ---------- 全局搜索 ----------
    const searchKeyword = ref("")
    const searchOpen = ref(false)
    const searching = ref(false)
    const searchResults = ref([])
    let searchTimer = null

    function mergeSearch(courses, templates, orgs) {
        const out = []
        ;(courses || []).slice(0, 5).forEach(c => out.push({ kind: "course", id: c.id, title: c.title, studentName: c.studentName, subject: c.subject, startTime: c.startTime }))
        ;(templates || []).slice(0, 5).forEach(t => out.push({ kind: "student", id: t.id, studentName: t.studentName, subject: t.subject, stage: t.stage }))
        ;(orgs || []).slice(0, 5).forEach(o => out.push({ kind: "org", id: o.id, name: o.name, address: o.address }))
        return out
    }

    async function doSearch() {
        const kw = searchKeyword.value.trim()
        if (!kw) {
            searchResults.value = []
            searching.value = false
            return
        }
        searching.value = true
        try {
            const [courses, templates, orgs] = await Promise.all([
                coursePage({ pageNum: 1, pageSize: 10, title: kw })
                    .then(r => r.list || [])
                    .catch(() => []),
                templateList(kw).catch(() => []),
                organizationList(kw).catch(() => []),
            ])
            searchResults.value = mergeSearch(courses, templates, orgs)
        } finally {
            searching.value = false
        }
    }

    function onSearchInput() {
        // 只要在输入就重新打开下拉框：点击结果/search 清空后焦点并未离开输入框，
        // focus 事件不会再触发，若不在此置 true 会导致第二次输入时下拉框不出、看似无响应
        searchOpen.value = true
        clearTimeout(searchTimer)
        searchTimer = setTimeout(doSearch, 300)
    }

    function clearSearch() {
        searchKeyword.value = ""
        searchResults.value = []
        searchOpen.value = false
    }

    function goSearch(r) {
        clearSearch()
        if (r.kind === "course") {
            router.push({ name: "courses", query: { title: r.title } })
        } else if (r.kind === "student") {
            router.push({ name: "students", query: { keyword: r.studentName } })
        } else if (r.kind === "org") {
            router.push({ name: "organizations", query: { keyword: r.name } })
        }
    }

    function onDocClick(e) {
        if (e.target.closest(".user-zone")) return
        userMenuOpen.value = false
        if (!e.target.closest(".search-zone")) searchOpen.value = false
    }

    /* 到点提醒轮询：有未读的到期提醒时刷新角标，并（若开启浏览器通知）弹系统通知 */
    let reminderTimer = null
    async function requestNotifyPermission() {
        if (!("Notification" in window)) return false
        if (Notification.permission === "granted") return true
        if (Notification.permission === "denied") return false
        const p = await Notification.requestPermission()
        return p === "granted"
    }
    async function pollDueReminders() {
        try {
            const due = await notificationDue()
            if (!due || !due.length) return
            let settings = {}
            try {
                settings = await settingList()
            } catch (e) {
                /* 忽略 */
            }
            const browserNotify = settings.browserNotify === "true"
            if (browserNotify && (await requestNotifyPermission())) {
                for (const n of due) {
                    new Notification(n.title || "课程提醒", { body: n.content })
                    await notificationMarkRead(n.id)
                }
            }
            loadNotifications()
        } catch (e) {
            /* 静默 */
        }
    }

    onMounted(() => {
        /* 管理员：无提醒中心/课程轮询，无需加载教师端数据 */
        if (!isAdmin.value) {
            loadNotifications()
            loadMessages()
            reminderTimer = setInterval(pollDueReminders, 60_000)
        }
        /* 刷新用户资料，保证任教学科标签始终可用（老会话 localStorage 里可能没有 subjects） */
        authProfile()
            .then(u => u && authStore.setUser({ ...authStore.user, ...u }))
            .catch(() => {})
        window.addEventListener("scroll", onScroll, { passive: true })
        document.addEventListener("click", onDocClick)
    })
    onBeforeUnmount(() => {
        if (reminderTimer) clearInterval(reminderTimer)
        window.removeEventListener("scroll", onScroll)
        document.removeEventListener("click", onDocClick)
    })
</script>

<style lang="scss" scoped>
    .layout {
        min-height: 100%;
    }

    // ---------- 顶部导航 ----------
    .topbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 40;
        border-bottom: 1px solid transparent;
        background: var(--color-canvas);
        transition:
            background 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;

        &.scrolled {
            background: color-mix(in srgb, var(--color-canvas) 90%, transparent);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom-color: var(--color-border);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
    }

    .topbar-inner {
        max-width: 1280px;
        margin: 0 auto;
        height: 56px;
        padding: 0 16px;
        display: flex;
        align-items: center;
        gap: 24px;

        @media (min-width: 640px) {
            padding: 0 24px;
        }
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;

        .brand-mark {
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: var(--color-primary);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #fff;

            svg {
                width: 14px;
                height: 14px;
            }
        }

        .brand-text {
            font-size: 15px;
            font-weight: 600;
            color: var(--color-ink);
        }
    }

    .nav-links {
        display: none;
        align-items: center;
        gap: 2px;
        flex: 1;

        @media (min-width: 960px) {
            display: flex;
        }

        .nav-link {
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 500;
            border-radius: 8px;
            color: var(--color-tertiary);
            transition:
                color 0.15s ease,
                background 0.15s ease;

            &:hover {
                color: var(--color-ink);
                background: var(--color-surface);
            }

            &.active {
                color: var(--color-primary);
                background: var(--color-surface);
            }
        }
    }

    .search-zone {
        position: relative;
        flex: 1;
        max-width: 320px;
        margin-left: auto;
    }

    .search-box {
        position: relative;
        display: flex;
        align-items: center;

        .search-icon {
            position: absolute;
            left: 10px;
            width: 15px;
            height: 15px;
            color: var(--color-muted);
            pointer-events: none;
        }

        .search-input {
            width: 100%;
            height: 32px;
            padding: 0 28px 0 32px;
            font-size: 13px;
            color: var(--color-ink);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: 8px;
            outline: none;
            transition:
                border-color 0.15s ease,
                box-shadow 0.15s ease;

            &::placeholder {
                color: var(--color-muted);
            }

            &:focus {
                border-color: var(--color-primary);
                box-shadow: 0 0 0 2px rgba(99, 91, 255, 0.12);
            }
        }

        .search-clear {
            position: absolute;
            right: 6px;
            width: 20px;
            height: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: transparent;
            color: var(--color-muted);
            cursor: pointer;
            border-radius: 4px;

            svg {
                width: 13px;
                height: 13px;
            }

            &:hover {
                color: var(--color-ink);
                background: var(--color-surface);
            }
        }
    }

    .search-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        max-height: 384px;
        overflow-y: auto;
        background: var(--color-canvas);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        padding: 4px 0;
        z-index: 60;

        .search-tip {
            padding: 10px 14px;
            font-size: 13px;
        }

        .search-group {
            padding: 4px 0;
        }

        .search-group-title {
            padding: 6px 14px 4px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.04em;
            color: var(--color-muted);
            text-transform: uppercase;
        }

        .search-item {
            display: flex;
            align-items: baseline;
            gap: 10px;
            padding: 7px 14px;
            cursor: pointer;
            transition: background 0.12s ease;

            &:hover {
                background: var(--color-surface);
            }

            .si-title {
                font-size: 13px;
                font-weight: 500;
                color: var(--color-ink);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .si-sub {
                font-size: 12px;
                color: var(--color-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;
                text-align: right;
            }
        }
    }

    .topbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .icon-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--color-muted);
        background: transparent;
        border: none;
        cursor: pointer;
        transition:
            color 0.15s ease,
            background 0.15s ease;

        svg {
            width: 18px;
            height: 18px;
        }

        &:hover {
            color: var(--color-ink);
            background: var(--color-surface);
        }

        :deep(.el-badge__content) {
            border: none;
        }
    }

    // ---------- 用户菜单 ----------
    .user-zone {
        position: relative;
    }

    .avatar-btn {
        height: 32px;
        width: 32px;
        border-radius: 50%;
        background: rgba(99, 91, 255, 0.1);
        color: var(--color-primary);
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
        transition: background 0.15s ease;

        &:hover {
            background: rgba(99, 91, 255, 0.15);
        }
    }

    .user-menu {
        position: absolute;
        right: 0;
        top: 100%;
        margin-top: 8px;
        width: 190px;
        background: var(--color-canvas);
        border-radius: 10px;
        border: 1px solid var(--color-border);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        padding: 4px 0;
        z-index: 50;

        .user-menu-head {
            padding: 12px 16px;
            border-bottom: 1px solid var(--color-border);

            .user-menu-name {
                font-size: 13px;
                font-weight: 500;
                color: var(--color-ink);
                margin: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .user-menu-sub {
                font-size: 12px;
                color: var(--color-muted);
                margin: 2px 0 0;
            }

            .user-tag {
                display: inline-block;
                margin-top: 8px;
                padding: 2px 8px;
                font-size: 12px;
                font-weight: 500;
                color: var(--color-primary);
                background: rgba(99, 91, 255, 0.1);
                border-radius: 999px;
            }
        }

        .user-menu-body {
            padding: 4px 0;
        }

        .user-menu-foot {
            border-top: 1px solid var(--color-border);
            padding-top: 4px;
        }

        .user-menu-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 16px;
            font-size: 13px;
            color: var(--color-secondary);
            background: transparent;
            border: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            transition:
                color 0.15s ease,
                background 0.15s ease;

            .el-icon {
                color: var(--color-muted);
                font-size: 16px;
            }

            &:hover {
                color: var(--color-ink);
                background: var(--color-surface);
            }

            &.danger:hover {
                color: var(--color-danger);
                background: rgba(223, 27, 65, 0.05);

                .el-icon {
                    color: var(--color-danger);
                }
            }
        }
    }

    // ---------- 移动端 ----------
    .mobile-menu-btn {
        @media (min-width: 960px) {
            display: none;
        }
    }

    .mobile-nav {
        border-top: 1px solid var(--color-border);
        background: var(--color-canvas);

        @media (min-width: 960px) {
            display: none;
        }

        .mobile-nav-inner {
            max-width: 1280px;
            margin: 0 auto;
            padding: 8px 16px;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .mobile-nav-link {
            display: block;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            color: var(--color-tertiary);
            transition: background 0.15s ease;

            &:hover {
                background: var(--color-surface);
            }

            &.active {
                color: var(--color-primary);
                background: var(--color-surface);
            }
        }
    }

    // ---------- 主内容 ----------
    .main {
        padding-top: 56px;
        min-height: 100vh;
    }

    .main-inner {
        max-width: 1280px;
        margin: 0 auto;
        padding: 24px 16px 48px;

        @media (min-width: 640px) {
            padding: 32px 24px 64px;
        }
    }

    // ---------- 过渡动画 ----------
    .dd-enter-active {
        transition: all 0.2s ease-out;
    }
    .dd-leave-active {
        transition: all 0.15s ease-in;
    }
    .dd-enter-from,
    .dd-leave-to {
        opacity: 0;
        transform: translateY(-8px) scale(0.98);
    }

    .slide-enter-active {
        transition: all 0.2s ease-out;
    }
    .slide-leave-active {
        transition: all 0.15s ease-in;
    }
    .slide-enter-from,
    .slide-leave-to {
        opacity: 0;
        transform: translateY(-8px);
    }
</style>

<style lang="scss">
    // 提醒面板（popper 挂载在 body，需非 scoped）
    .notify-popper {
        .notify-panel {
            margin: -4px 0;
        }

        .msg-tag {
            display: inline-block;
            padding: 0 5px;
            margin-right: 4px;
            font-size: 11px;
            line-height: 16px;
            border-radius: 4px;
            color: var(--color-primary);
            background: rgba(99, 91, 255, 0.1);
            vertical-align: 1px;

            &.reminder {
                color: #2563eb;
                background: rgba(37, 99, 235, 0.1);
            }
            &.activity {
                color: #e67e22;
                background: rgba(230, 126, 34, 0.1);
            }
            &.notice {
                color: #16a34a;
                background: rgba(22, 163, 74, 0.1);
            }
        }

        .np-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2px 2px 12px;
            border-bottom: 1px solid var(--color-border);

            .np-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--color-ink);
            }
        }

        .np-empty {
            padding: 36px 0 28px;
            text-align: center;
            font-size: 13px;
            color: var(--color-muted);
        }

        .np-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
            max-height: 420px;
            overflow-y: auto;
            padding-right: 4px;
        }

        .notify-item {
            position: relative;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 12px 30px 12px 14px;
            min-height: 72px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: 10px;
            cursor: pointer;
            overflow: hidden;

            /* 左侧色条标记消息类型 */
            &::after {
                content: "";
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: transparent;
            }

            &.kind-reminder::after {
                background: #2563eb;
            }
            &.kind-message::after {
                background: var(--color-primary);
            }

            .ni-body {
                flex: 1;
                min-width: 0;
            }

            .ni-top {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 8px;
            }

            .ni-title {
                font-size: 13px;
                font-weight: 500;
                color: var(--color-ink);
                min-width: 0;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }

            .ni-time {
                font-size: 12px;
                color: var(--color-muted);
                flex-shrink: 0;
                font-variant-numeric: tabular-nums;
            }

            .ni-content {
                margin: 4px 0 0;
                font-size: 12px;
                color: var(--color-muted);
                line-height: 1.5;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            &.unread {
                border-color: rgba(99, 91, 255, 0.32);
                background: rgba(99, 91, 255, 0.04);

                &::before {
                    content: "";
                    position: absolute;
                    right: 8px;
                    top: 8px;
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--color-primary);
                }

                .ni-title {
                    font-weight: 600;
                    color: var(--color-ink);
                }
            }

            .notify-del {
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                width: 20px;
                height: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: none;
                background: transparent;
                color: var(--color-muted);
                cursor: pointer;
                border-radius: 4px;
                opacity: 0;
                transition:
                    opacity 0.12s ease,
                    color 0.12s ease,
                    background 0.12s ease;

                svg {
                    width: 14px;
                    height: 14px;
                }

                &:hover {
                    color: var(--color-danger);
                    background: rgba(223, 27, 65, 0.08);
                }
            }

            &:hover .notify-del {
                opacity: 1;
            }
        }
    }
</style>
