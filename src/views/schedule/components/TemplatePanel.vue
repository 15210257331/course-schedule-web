<template>
    <el-card shadow="never" class="template-panel">
        <div class="tp-header flex-between">
            <div class="tp-title">
                <span class="card-title" style="margin: 0">课程模板</span>
                <el-tooltip content="拖动模板到右侧日历的对应时间段即可排课" placement="top">
                    <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
            </div>
            <el-button type="primary" size="small" :icon="Plus" circle @click="emit('create')" />
        </div>
        <el-input v-model="keyword" placeholder="搜索模板" clearable size="small" :prefix-icon="Search" class="tp-search" />
        <VueDraggable
            :model-value="templates"
            class="tpl-list"
            :animation="150"
            :group="{ name: 'courses', pull: 'clone', put: false }"
            :sort="false"
            :clone="tpl => emit('clone', tpl)"
            ghost-class="dp-ghost"
            chosen-class="dp-chosen"
            drag-class="dp-drag"
        >
            <div v-for="t in result" :key="t.id" class="tpl-card" :style="cardStyle(t)" :data-id="t.id">
                <div class="tpl-body">
                    <div class="tpl-title">
                        {{ [t.studentName, t.stage].filter(Boolean).join(" · ") || t.title }}
                    </div>
                    <div class="tpl-meta-row">
                        <span v-if="t.organizationName" class="tpl-pill tpl-pill-org">{{ t.organizationName }}</span>
                        <span v-if="t.courseType" class="tpl-pill" :style="{ background: courseTypeColor(t.courseType) }">{{ t.courseType }}</span>
                    </div>
                    <div class="tpl-sub">
                        {{ [t.subject, durationText(t.durationMinutes)].filter(Boolean).join(" · ") }}
                    </div>
                </div>
                <div class="tpl-actions" @mousedown.stop>
                    <el-icon class="tpl-action" @click.stop="emit('edit', t)"><EditPen /></el-icon>
                    <el-icon class="tpl-action danger" @click.stop="emit('remove', t)"><Delete /></el-icon>
                </div>
            </div>
        </VueDraggable>
        <div v-if="!result.length" class="tpl-empty text-muted">
            {{ templates.length ? "没有匹配的模板" : "暂无模板，点击右上角 + 新建" }}
        </div>
    </el-card>
</template>

<script setup>
    import { computed, ref, watch } from "vue"
    import { Plus, Search, EditPen, Delete, QuestionFilled } from "@element-plus/icons-vue"
    import { VueDraggable } from "vue-draggable-plus"
    import { durationText, COURSE_COLORS, courseTypeColor } from "@/utils/date"
    import { useMetaStore } from "@/store/meta"
    import { templateList } from "@/api/courseTemplate"

    const props = defineProps({ templates: { type: Array, default: () => [] } })
    const emit = defineEmits(["create", "edit", "remove", "clone"])

    const metaStore = useMetaStore()
    const keyword = ref("")

    /* 模板搜索：空关键字用全量列表（父组件传入），有关键字走接口名称模糊查询 */
    const searched = ref(null)
    let searchTimer = null

    function runSearch(kw) {
        if (!kw) {
            searched.value = null
            return
        }
        templateList(kw).then((list) => {
            searched.value = list || []
        })
    }

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

    /* 全量列表更新（新建/编辑模板后）时，若正处于搜索态则按当前关键字重新拉取 */
    watch(
        () => props.templates,
        () => {
            const kw = keyword.value.trim()
            if (kw) runSearch(kw)
        },
    )

    const result = computed(() => (searched.value == null ? props.templates : searched.value))

    /* 颜色基于机构：机构维护了 color 用机构色，未设置则按机构 id 稳定取色；无机构按模板 id */
    function colorOf(t) {
        const org = t.organizationId != null ? metaStore.orgMap[t.organizationId] : null
        if (org?.color) return org.color
        if (t.organizationId != null) return COURSE_COLORS[t.organizationId % COURSE_COLORS.length]
        return COURSE_COLORS[(t.id || 0) % COURSE_COLORS.length]
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
    .template-panel {
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
        .tp-header {
            flex-shrink: 0;
        }
        .tp-title {
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
        .tp-search {
            margin: 12px 0;
            flex-shrink: 0;
        }
        .tpl-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            /* 撑满剩余高度，超出时列表内部滚动（底部与日历底部对齐） */
            flex: 1;
            min-height: 60px;
            overflow-y: auto;
            padding-right: 2px;
            max-height: 414px;
        }
        .tpl-card {
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
                .tpl-actions {
                    opacity: 1;
                }
            }
            &:active {
                cursor: grabbing;
            }
            .tpl-body {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding-right: 42px; // 给右上角操作区留位
                .tpl-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--color-ink);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .tpl-meta-row {
                    display: flex;
                    gap: 4px;
                    overflow: hidden;
                    white-space: nowrap;
                }
                .tpl-pill {
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
                .tpl-sub {
                    margin-top: auto;
                    font-size: 11px;
                    color: var(--color-muted);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            }
            .tpl-actions {
                position: absolute;
                top: 8px;
                right: 8px;
                display: flex;
                gap: 6px;
                opacity: 0;
                transition: opacity 0.15s ease;
                .tpl-action {
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
        .tpl-empty {
            text-align: center;
            padding: 24px 0;
        }
    }
</style>
