<template>
    <div class="toolbar mb-16">
        <div class="toolbar-center">
            <el-button-group class="view-switch">
                <el-button :type="view === 'day' ? 'primary' : ''" @click="emit('update:view', 'day')">日</el-button>
                <el-button :type="view === 'week' ? 'primary' : ''" @click="emit('update:view', 'week')">周</el-button>
                <el-button :type="view === 'month' ? 'primary' : ''" @click="emit('update:view', 'month')">月</el-button>
            </el-button-group>
            <el-button :icon="ArrowLeft" circle @click="emit('shift', -1)" />
            <span class="range-label">{{ rangeLabel }}</span>
            <el-button :icon="ArrowRight" circle @click="emit('shift', 1)" />
            <el-button @click="emit('today')">今日</el-button>
        </div>
        <div class="toolbar-side right">
            <el-button :icon="CopyDocument" @click="emit('copyNextWeek')">复制到下周</el-button>
            <el-button type="primary" :icon="Plus" @click="emit('create')">新增课程</el-button>
        </div>
    </div>
</template>

<script setup>
    import { ArrowLeft, ArrowRight, Plus, CopyDocument } from "@element-plus/icons-vue"

    defineProps({
        view: { type: String, default: "week" },
        rangeLabel: { type: String, default: "" },
    })
    const emit = defineEmits(["update:view", "shift", "today", "copyNextWeek", "create"])
</script>

<style lang="scss" scoped>
    .toolbar {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;

        .toolbar-center {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-width: 0;

            .range-label {
                min-width: 190px;
                text-align: center;
                font-weight: 600;
                color: var(--color-ink);
            }
        }

        .toolbar-side.right {
            display: flex;
            align-items: center;
            gap: 8px;
            justify-content: flex-end;
        }

        // 窄屏时操作区换行
        @media (max-width: 1100px) {
            .toolbar-center {
                order: -1;
                width: 100%;
                margin-bottom: 4px;
            }
        }
    }
</style>
