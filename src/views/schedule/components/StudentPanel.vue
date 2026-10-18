<template>
    <el-card shadow="never" class="student-panel">
        <div class="sp-header flex-between">
            <div class="sp-title">
                <span class="card-title" style="margin: 0">学生列表</span>
                <el-tooltip content="拖动学生到右侧日历的对应时间段即可排课" placement="top">
                    <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
            </div>
            <el-button type="primary" size="small" :icon="Plus" circle @click="emit('create')" />
        </div>
        <el-input v-model="keyword" placeholder="搜索学生" clearable size="small" :prefix-icon="Search" class="sp-search" />
        <VueDraggable
            :model-value="result"
            class="stu-list"
            :animation="150"
            :group="{ name: 'courses', pull: 'clone', put: false }"
            :sort="false"
            :clone="tpl => emit('clone', tpl)"
            ghost-class="dp-ghost"
            chosen-class="dp-chosen"
            drag-class="dp-drag"
            v-loading="loading"
        >
            <div v-for="t in result" :key="t.id" class="stu-card" :style="cardStyle(t)" :data-id="t.id">
                <div class="stu-body">
                    <div class="stu-title" :title="titleOf(t)">
                        {{ titleOf(t) }}
                    </div>
                    <div class="stu-meta-row">
                        <span v-if="t.courseType" class="stu-pill stu-pill-type" :title="t.courseType" :style="{ background: courseTypeColor(t.courseType) }">{{ t.courseType }}</span>
                        <span v-if="t.organizationName" class="stu-pill stu-pill-org" :title="t.organizationName">{{ t.organizationName }}</span>
                        <span v-else-if="showLocation(t)" class="stu-pill stu-pill-loc" :title="t.location">{{ t.location }}</span>
                    </div>
                    <div class="stu-sub" :title="subOf(t)">
                        {{ subOf(t) }}
                    </div>
                    <span v-if="t.attachmentCount > 0" class="stu-att-badge" :title="`${t.attachmentCount} 个课件，点击查看`" @click.stop="emit('attachments', t)">
                        <el-icon><Paperclip /></el-icon>
                    </span>
                </div>
                <div class="stu-actions" @mousedown.stop>
                    <el-icon class="stu-action" @click.stop="emit('edit', t)"><EditPen /></el-icon>
                    <el-icon class="stu-action danger" @click.stop="emit('remove', t)"><Delete /></el-icon>
                </div>
            </div>
        </VueDraggable>
        <div v-if="!result.length" class="stu-empty text-muted">
            {{ students.length ? "没有匹配的学生" : "暂无学生，点击右上角 + 新增" }}
        </div>
    </el-card>
</template>

<script setup>
    import { computed, ref, watch } from "vue"
    import { Plus, Search, EditPen, Delete, QuestionFilled, Paperclip } from "@element-plus/icons-vue"
    import { VueDraggable } from "vue-draggable-plus"
    import { durationText, COURSE_COLORS, courseTypeColor } from "@/utils/date"
    import { useMetaStore } from "@/store/meta"
    import { studentList } from "@/api/student"

    const props = defineProps({
        students: { type: Array, default: () => [] },
        loading: { type: Boolean, default: false }
    })
    const emit = defineEmits(["create", "edit", "remove", "clone", "attachments"])

    const metaStore = useMetaStore()
    const keyword = ref("")
    const searching = ref(false)

    /* 学生搜索：空关键字用全量列表（父组件传入），有关键字走接口名称模糊查询 */
    const searched = ref(null)
    let searchTimer = null

    function runSearch(kw) {
        if (!kw) {
            searched.value = null
            return
        }
        searching.value = true
        studentList(kw).then((res) => {
            searched.value = res || []
        }).finally(() => {
            searching.value = false
        })
    }

    /* 列表加载态：父级数据加载中，或关键字搜索请求进行中 */
    const loading = computed(() => props.loading || searching.value)

    watch(keyword, (k) => {
        clearTimeout(searchTimer)
        const kw = (k || "").trim()
        if (!kw) {
            searched.value = null
            return
        }
        /* 防抖 250ms 再请求接口 */
        searchTimer = setTimeout(() => runSearch(kw), 250)
    })

    /* 全量列表更新（新增/编辑学生后）时，若正处于搜索态则按当前关键字重新拉取 */
    watch(
        () => props.students,
        () => {
            const kw = keyword.value.trim()
            if (kw) runSearch(kw)
        },
    )

    const result = computed(() => (searched.value == null ? props.students : searched.value))

    /* 颜色基于机构：机构维护了 color 用机构色，未设置则按机构 id 稳定取色；无机构按学生 id */
    function colorOf(t) {
        const org = t.organizationId != null ? metaStore.orgMap[t.organizationId] : null
        if (org?.color) return org.color
        if (t.organizationId != null) return COURSE_COLORS[t.organizationId % COURSE_COLORS.length]
        return COURSE_COLORS[(t.id || 0) % COURSE_COLORS.length]
    }

    /* 无机构且有上课地点（如一对一/家教上门）时，课程类型后面展示地点 */
    function showLocation(t) {
        return t.organizationId == null && t.location
    }

    /* 卡片标题：学生姓名 · 学段，无则回退 title */
    function titleOf(t) {
        return [t.studentName, t.stage].filter(Boolean).join(" · ") || t.title
    }

    /* 副标题：科目 · 时长 */
    function subOf(t) {
        return [t.subject, durationText(t.durationMinutes)].filter(Boolean).join(" · ")
    }

    /* 与日历卡片一致的浅色渐变底 + 细边框 + 强调色变量 */
    function hexToRgba(hex, alpha) {
        const m = /^#?([0-9a-f]{6})$/i.exec(hex || "")
        if (!m) return hex
        const n = parseInt(m[1], 16)
        return `rgba(${n >> 16}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`
    }

    function cardStyle(t) {
        const color = colorOf(t)
        return {
            background: `linear-gradient(180deg, ${hexToRgba(color, 0.16)}, ${hexToRgba(color, 0.07)})`,
            borderColor: hexToRgba(color, 0.45),
            "--cb-accent": color,
        }
    }

</script>

<style lang="scss" scoped>
    .student-panel {
        /* 宽度由父级 .side-col 控制；随父列拉伸、与右侧日历等高 */
        width: 100%;
        // flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        :deep(.el-card__body) {
            padding: 16px;
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
        }
        .sp-header {
            flex-shrink: 0;
        }
        .sp-title {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .tip-icon {
            color: var(--color-muted);
            font-size: 15px;
            cursor: help;
            flex-shrink: 0;
            transition: color 0.15s ease;
            &:hover {
                color: var(--color-primary);
            }
        }
        .sp-search {
            margin: 12px 0;
            flex-shrink: 0;
        }
        .stu-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            /* 撑满剩余高度，超出时列表内部滚动（底部与日历底部对齐） */
            flex: 1;
            min-height: 60px;
            overflow-y: auto;
            padding-right: 2px;
            max-height: 460px;
        }
        .stu-card {
            position: relative;
            display: flex;
            align-items: stretch;
            flex-shrink: 0;
            /* 与日历上 2 小时课程卡片同高（120min × 0.65 - 10） */
            height: 68px;
            padding: 6px 9px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            cursor: grab;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
            transition: box-shadow 0.15s ease;
            &:hover {
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14);
                .stu-actions {
                    opacity: 1;
                }
            }
            &:active {
                cursor: grabbing;
            }
            .stu-body {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding-right: 42px; // 给右上角操作区留位
                .stu-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--color-ink);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .stu-meta-row {
                    display: flex;
                    gap: 4px;
                    overflow: hidden;
                    white-space: nowrap;
                }
                .stu-pill {
                    font-size: 10px;
                    font-weight: 600;
                    line-height: 1.6;
                    padding: 0 6px;
                    border-radius: 999px;
                    color: #fff;
                    background: var(--cb-accent, var(--color-primary));
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                }
                /* 课程类型胶囊不收缩，让出空间给右侧地址 */
                .stu-pill-type {
                    flex-shrink: 0;
                    max-width: none;
                }
                .stu-pill-loc {
                    color: var(--color-muted);
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    min-width: 0;
                }
                .stu-sub {
                    margin-top: auto;
                    font-size: 11px;
                    color: var(--color-muted);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            }
            /* 课件角标：仅图标（数量在 title 中提示），点击查看课件列表 */
            .stu-att-badge {
                position: absolute;
                right: 8px;
                bottom: 8px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                font-size: 13px;
                padding: 0;
                border-radius: 999px;
                color: var(--color-primary);
                background: var(--el-color-primary-light-9);
                z-index: 1;
                cursor: pointer;
                transition: color 0.15s ease, background 0.15s ease;
                &:hover {
                    color: var(--color-primary);
                    background: var(--el-color-primary-light-7, var(--color-primary));
                }
                :deep(.el-icon) {
                    font-size: 13px;
                }
            }
            .stu-actions {
                position: absolute;
                top: 8px;
                right: 8px;
                display: flex;
                gap: 6px;
                opacity: 0;
                transition: opacity 0.15s ease;
                .stu-action {
                    font-size: 18px;
                    color: var(--color-muted);
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 4px;
                    transition: color 0.15s ease;
                    &:hover {
                        color: var(--color-primary);
                    }
                    &.danger:hover {
                        color: var(--color-danger);
                    }
                }
            }
        }
        .stu-empty {
            text-align: center;
            padding: 24px 0;
        }
    }
</style>
