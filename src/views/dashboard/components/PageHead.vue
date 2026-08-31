<template>
  <div class="page-head">
    <div>
      <h1 class="page-title">{{ greeting }}，{{ nickname }}</h1>
      <p class="page-sub">{{ todayText }}</p>
    </div>
    <el-button type="primary" :icon="Plus" @click="$router.push({ name: 'schedule' })">安排课程</el-button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'

defineProps({ nickname: { type: String, default: '老师' } })

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const todayText = computed(() =>
  new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
)
</script>

<style lang="scss" scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  .page-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--color-ink);
  }

  .page-sub {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--color-muted);
  }
}
</style>
