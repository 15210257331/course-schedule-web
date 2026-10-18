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
    <el-table-column label="上课地点" align="center" show-overflow-tooltip>
      <template #default="{ row }">{{ locationOf(row) }}</template>
    </el-table-column>
    <el-table-column label="课时费" align="center">
      <template #default="{ row }">¥{{ formatMoney(row.fee) }}</template>
    </el-table-column>
    <el-table-column label="课件" align="center" width="80">
      <template #default="{ row }">
        <el-tooltip v-if="row.attachmentCount > 0" :content="`${row.attachmentCount} 个课件，点击查看`" placement="top">
          <el-icon class="att-icon is-link" @click="emit('attachments', row)"><Paperclip /></el-icon>
        </el-tooltip>
        <span v-else class="text-muted">-</span>
      </template>
    </el-table-column>
    <el-table-column label="备注" align="center" show-overflow-tooltip>
      <template #default="{ row }">{{ row.note || '-' }}</template>
    </el-table-column>
    <el-table-column label="操作" align="center" fixed="right" width="120">
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
import { formatMoney, COURSE_COLORS, courseTypeColor } from '@/utils/date'
import { useMetaStore } from '@/store/meta'
import { Paperclip } from '@element-plus/icons-vue'


defineProps({
  list: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['edit', 'remove', 'attachments'])

const metaStore = useMetaStore()

/* 机构标签色：机构维护了 color 用机构色，否则按机构 id 稳定取色（与日历一致） */
function orgColor(row) {
  const org = row.organizationId != null ? metaStore.orgMap[row.organizationId] : null
  if (org?.color) return org.color
  if (row.organizationId != null) return COURSE_COLORS[row.organizationId % COURSE_COLORS.length]
  return COURSE_COLORS[(row.id || 0) % COURSE_COLORS.length]
}

/* 上课地点：有机构显示机构地址，否则显示学生维护的地点 */
function locationOf(row) {
  if (row.organizationId != null) return metaStore.orgMap[row.organizationId]?.address || '-'
  return row.location || '-'
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
.att-icon {
  font-size: 16px;
  color: var(--color-muted);
  &.is-link {
    cursor: pointer;
    transition: color 0.15s ease;
    &:hover {
      color: var(--color-primary);
    }
  }
}
</style>
