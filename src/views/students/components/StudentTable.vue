<template>
  <el-table :data="list" v-loading="loading" stripe>
    <el-table-column label="姓名" align="center">
      <template #default="{ row }">{{ row.studentName || '-' }}</template>
    </el-table-column>
    <el-table-column label="学段" align="center">
      <template #default="{ row }">{{ row.stage || '-' }}</template>
    </el-table-column>
    <el-table-column label="类型" align="center">
      <template #default="{ row }">
        <span v-if="row.courseType" class="cb-pill" :style="{ background: courseTypeColor(row.courseType) }">{{ row.courseType }}</span>
        <span v-else>-</span>
      </template>
    </el-table-column>
    <el-table-column label="机构" align="center">
      <template #default="{ row }">
        <span v-if="row.organizationName" class="cb-pill" :style="{ background: orgColor(row) }">{{ row.organizationName }}</span>
        <span v-else>-</span>
      </template>
    </el-table-column>
    <el-table-column prop="subject" label="科目" align="center" />
    <el-table-column label="课时费" align="center">
      <template #default="{ row }">¥{{ formatMoney(row.fee) }}</template>
    </el-table-column>
    <el-table-column label="备注" align="center" show-overflow-tooltip>
      <template #default="{ row }">{{ row.note || '-' }}</template>
    </el-table-column>
    <template #empty>
      <el-empty description="暂无数据" :image-size="80" />
    </template>
  </el-table>
</template>

<script setup>
import { formatMoney, COURSE_COLORS, courseTypeColor } from '@/utils/date'
import { useMetaStore } from '@/store/meta'

defineProps({
  list: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const metaStore = useMetaStore()

/* 机构标签色：机构维护了 color 用机构色，否则按模板 color，再按机构 id / 模板 id 稳定取色（与日历一致） */
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