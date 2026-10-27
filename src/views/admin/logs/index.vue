<template>
    <div class="page-container">
        <h2 class="page-title">操作日志</h2>
        <el-card>
            <div class="flex filter-bar">
                <el-select v-model="filters.module" placeholder="模块" clearable style="width: 140px" class="mr-8">
                    <el-option label="登录认证" value="auth" />
                    <el-option label="教师管理" value="teacher" />
                    <el-option label="消息推送" value="message" />
                    <el-option label="课程" value="course" />
                    <el-option label="学生" value="student" />
                    <el-option label="机构" value="organization" />
                    <el-option label="课件" value="attachment" />
                    <el-option label="数据备份" value="backup" />
                </el-select>
                <el-select v-model="filters.action" placeholder="动作" clearable style="width: 160px" class="mr-8">
                    <el-option label="登录" value="LOGIN" />
                    <el-option label="登录失败" value="LOGIN_FAIL" />
                    <el-option label="新增" value="CREATE" />
                    <el-option label="修改" value="UPDATE" />
                    <el-option label="删除" value="DELETE" />
                    <el-option label="状态变更" value="STATUS" />
                    <el-option label="重置密码" value="RESET_PASSWORD" />
                    <el-option label="撤回" value="REVOKE" />
                    <el-option label="发布" value="PUBLISH" />
                    <el-option label="移动" value="MOVE" />
                    <el-option label="整周复制" value="COPY_WEEK" />
                    <el-option label="立即备份" value="RUN_NOW" />
                    <el-option label="存储切换" value="SET_STORAGE" />
                    <el-option label="恢复" value="RESTORE" />
                </el-select>
                <el-input v-model="filters.keyword" placeholder="用户名 / 详情" clearable style="width: 200px" class="mr-8" @keyup.enter="load" />
                <div class="flex-grow" />
                <el-button :icon="RefreshLeft" class="mr-8" @click="resetFilters">重置</el-button>
                <el-button type="primary" :icon="Search" @click="load">查询</el-button>
            </div>

            <el-table :data="list" v-loading="loading" class="mt-16" stripe>
                <el-table-column label="时间" width="200" align="center">
                    <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
                </el-table-column>
                <el-table-column label="操作人" width="140" show-overflow-tooltip align="center">
                    <template #default="{ row }">{{ row.username || "—" }}</template>
                </el-table-column>
                <el-table-column label="模块" width="100" align="center">
                    <template #default="{ row }">
                        <el-tag size="small" :type="moduleTag(row.module)">{{ moduleLabel(row.module) }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="动作" width="160" align="center">
                    <template #default="{ row }">
                        <el-tag size="small" :type="actionTag(row.action)" effect="plain">{{ actionLabel(row.action) }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="detail" label="详情" min-width="240" show-overflow-tooltip align="center" />
                <el-table-column prop="ip" label="IP" width="130" show-overflow-tooltip align="center">
                    <template #default="{ row }">{{ row.ip || "—" }}</template>
                </el-table-column>
                <el-table-column label="结果" width="80" align="center">
                    <template #default="{ row }">
                        <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                            {{ row.success ? "成功" : "失败" }}
                        </el-tag>
                    </template>
                </el-table-column>
                <template #empty>
                    <el-empty description="暂无日志" :image-size="80" />
                </template>
            </el-table>

            <div class="flex-end mt-16">
                <el-pagination
                    v-model:current-page="page"
                    v-model:page-size="pageSize"
                    :total="total"
                    :page-sizes="[10, 20, 50]"
                    layout="total, sizes, prev, pager, next"
                    background
                    @current-change="fetchData"
                    @size-change="load"
                />
            </div>
        </el-card>
    </div>
</template>

<script setup>
    import { onMounted, reactive, ref } from "vue"
    import { Search, RefreshLeft } from "@element-plus/icons-vue"
    import { adminLogPage } from "@/api/admin"
    import { dayjs } from "@/utils/date"

    const list = ref([])
    const total = ref(0)
    const loading = ref(false)
    const page = ref(1)
    const pageSize = ref(20)
    const filters = reactive({ module: "", action: "", keyword: "" })

    const MODULE_LABEL = {
        auth: "登录认证",
        teacher: "教师管理",
        message: "消息推送",
        course: "课程",
        student: "学生",
        course_template: "课程模板",
        organization: "机构",
        attachment: "课件",
        backup: "数据备份",
    }
    const ACTION_LABEL = {
        LOGIN: "登录",
        LOGIN_FAIL: "登录失败",
        CREATE: "新增",
        UPDATE: "修改",
        DELETE: "删除",
        STATUS: "状态变更",
        RESET_PASSWORD: "重置密码",
        REVOKE: "撤回",
        PUBLISH: "发布",
        MOVE: "移动",
        COPY_WEEK: "整周复制",
        RUN_NOW: "立即备份",
        SET_STORAGE: "存储切换",
        RESTORE: "恢复",
    }

    function fmtTime(t) {
        return t ? dayjs(t).format("YYYY-MM-DD HH:mm:ss") : "—"
    }
    function moduleLabel(m) {
        return MODULE_LABEL[m] || m || "—"
    }
    function moduleTag(m) {
        if (m === "auth") return "info"
        if (m === "teacher" || m === "message" || m === "backup") return "primary"
        return "warning"
    }
    function actionLabel(a) {
        return ACTION_LABEL[a] || a || "—"
    }
    function actionTag(a) {
        if (a === "DELETE" || a === "LOGIN_FAIL" || a === "REVOKE" || a === "RESTORE") return "danger"
        if (a === "CREATE" || a === "PUBLISH" || a === "LOGIN") return "success"
        if (a === "RUN_NOW" || a === "SET_STORAGE" || a === "COPY_WEEK") return "warning"
        return "info"
    }

    async function fetchData() {
        loading.value = true
        try {
            const res = await adminLogPage({
                pageNum: page.value,
                pageSize: pageSize.value,
                module: filters.module || undefined,
                action: filters.action || undefined,
                keyword: filters.keyword.trim() || undefined,
            })
            list.value = res.list || []
            total.value = res.total || 0
        } finally {
            loading.value = false
        }
    }

    function load() {
        page.value = 1
        fetchData()
    }

    /* 重置筛选条件并回到第一页重新查询 */
    function resetFilters() {
        filters.module = ""
        filters.action = ""
        filters.keyword = ""
        load()
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
    .filter-bar {
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
    }
    .flex-grow {
        flex: 1;
    }
    .flex-end {
        display: flex;
        justify-content: flex-end;
    }
</style>
