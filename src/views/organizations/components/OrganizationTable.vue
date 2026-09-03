<template>
  <el-table :data="list" v-loading="loading" stripe>
    <el-table-column label="机构名称" align="center">
      <template #default="{ row }">
        <div class="org-name">
          <span class="org-dot" :style="{ background: dotColor(row) }" />
          {{ row.name }}
        </div>
      </template>
    </el-table-column>
    <el-table-column prop="contactName" label="联系人" align="center" />
    <el-table-column prop="contactPhone" label="联系电话" align="center" />
    <el-table-column prop="address" label="地址" align="center" show-overflow-tooltip />
    <el-table-column prop="remark" label="备注" align="center" show-overflow-tooltip />
    <el-table-column label="操作" align="center" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" size="small" @click="emit('edit', row)">编辑</el-button>
        <el-button link type="danger" size="small" @click="emit('remove', row)">删除</el-button>
      </template>
    </el-table-column>
    <template #empty>
      <el-empty description="暂无数据" :image-size="80" />
    </template>
  </el-table>
</template>

<script setup>
import { COURSE_COLORS } from '@/utils/date'

defineProps({
  list: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['edit', 'remove'])

/* 圆点颜色与模板卡片机构标签一致：机构维护了 color 用机构色，否则按机构 id 稳定取色 */
function dotColor(row) {
  if (row.color) return row.color
  return COURSE_COLORS[(row.id || 0) % COURSE_COLORS.length]
}
</script>

<style lang="scss" scoped>
.org-name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  .org-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
}
</style>
