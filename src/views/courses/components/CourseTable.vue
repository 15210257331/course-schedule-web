<template>
  <el-table :data="list" v-loading="loading" stripe>
    <el-table-column label="学生" align="center">
      <template #default="{ row }">{{ row.studentName || '-' }}</template>
    </el-table-column>
    <el-table-column prop="subject" label="科目" align="center" />
    <el-table-column label="学段" align="center">
      <template #default="{ row }">{{ row.stage || '-' }}</template>
    </el-table-column>
    <el-table-column label="课程类型" align="center">
      <template #default="{ row }">
        <span v-if="row.courseType" class="cb-pill" :style="{ background: courseTypeColor(row.courseType) }">{{ row.courseType }}</span>
        <span v-else>-</span>
      </template>
    </el-table-column>
    <el-table-column label="上课机构" align="center">
      <template #default="{ row }">
        <span v-if="row.organizationName" class="cb-pill" :style="{ background: orgColor(row) }">{{ row.organizationName }}</span>
        <span v-else>-</span>
      </template>
    </el-table-column>
    <el-table-column label="时间" align="center" min-width="210">
      <template #default="{ row }">
        {{ formatDateTime(row.startTime) }} ~ {{ formatDateTime(row.endTime).slice(11) }}
      </template>
    </el-table-column>
    <el-table-column label="课时费" align="center">
      <template #default="{ row }">¥{{ formatMoney(row.fee) }}</template>
    </el-table-column>
    <el-table-column label="操作" align="center" min-width="220" fixed="right">
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
import { formatDateTime, formatMoney, COURSE_COLORS, courseTypeColor } from '@/utils/date'
import { useMetaStore } from '@/store/meta'

defineProps({
  list: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['edit', 'remove'])

const metaStore = useMetaStore()

/* 机构标签色：机构维护了 color 用机构色，否则按课程 color，再按机构 id / 课程 id 稳定取色（与日历卡片一致） */
function orgColor(row) {
  const org = row.organizationId != null ? metaStore.orgMap[row.organizationId] : null
  if (org?.color) return org.color
  if (row.color) return row.color
  if (row.organizationId != null) return COURSE_COLORS[row.organizationId % COURSE_COLORS.length]
  return COURSE_COLORS[(row.id || 0) % COURSE_COLORS.length]
}
</script>

<style lang="scss" scoped>
/* 与日历卡片 .cb-pill 同款标签 */
.cb-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.6;
  padding: 0 6px;
  border-radius: 999px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>