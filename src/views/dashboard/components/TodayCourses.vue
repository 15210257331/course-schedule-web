<template>
    <div class="card">
        <div class="card-head">
            <h3 class="card-title">今日课程</h3>
            <span class="badge-count">{{ courses.length }}</span>
        </div>
        <div v-if="!courses.length" class="empty">
            <div class="empty-icon">
                <el-icon :size="24"><Calendar /></el-icon>
            </div>
            <p>今天暂无课程安排</p>
        </div>
        <div v-else class="today-list">
            <div v-for="c in courses" :key="c.id" class="today-item">
                <div class="today-dot" :style="{ background: c.color || '#635bff' }" />
                <div class="today-info">
                    <p class="today-title">{{ c.studentName }} · {{ c.stage }}</p>
                    <p class="today-meta">
                        {{ formatDateTime(c.startTime).slice(11) }} - {{ formatDateTime(c.endTime).slice(11) }}
                        <template v-if="c.organizationName"> · {{ c.organizationName }}</template>
                        <template v-if="c.studentName"> · {{ c.courseType }}</template>
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { Calendar } from "@element-plus/icons-vue"
    import { formatDateTime } from "@/utils/date"

    defineProps({ courses: { type: Array, default: () => [] } })
</script>

<style lang="scss" scoped>
    .card {
        background: var(--color-canvas);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        padding: 20px;
        min-width: 0;

        .card-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;

            .card-title {
                margin: 0;
            }
        }
    }

    .badge-count {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-primary);
        background: rgba(99, 91, 255, 0.1);
        border-radius: 999px;
        padding: 2px 10px;
    }

    .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 0;
        color: var(--color-muted);
        font-size: 13px;

        .empty-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: var(--color-surface);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
        }

        p {
            margin: 0;
        }
    }

    .today-list {
        display: flex;
        flex-direction: column;
        max-height: 260px;
        overflow: auto;
    }

    .today-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--color-border);

        &:last-child {
            border-bottom: none;
        }

        .today-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-primary);
            margin-top: 7px;
            flex-shrink: 0;
        }

        .today-title {
            margin: 0;
            font-size: 14px;
            font-weight: 500;
            color: var(--color-ink);
        }

        .today-meta {
            margin: 3px 0 0;
            font-size: 12px;
            color: var(--color-muted);
        }
    }
</style>
