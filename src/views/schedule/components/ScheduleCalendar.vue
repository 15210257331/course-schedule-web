<template>
  <div class="calendar-main">
    <!-- 周/日视图 -->
    <div v-if="view !== 'month'" class="grid-wrap">
      <el-card shadow="never" class="calendar-card">
        <div class="week-header">
          <div class="time-gutter">
            <div class="gutter-corner">
              <span>{{ weekNoText }}</span>
            </div>
          </div>
          <div v-for="d in days" :key="d.date" class="day-head" :class="{ today: d.date === todayStr }">
            <div class="day-label">{{ d.label }}</div>
            <div class="day-date">{{ dayText(d) }}</div>
          </div>
        </div>

        <div class="week-body" ref="gridRef">
          <!-- 时间刻度 -->
          <div class="time-col">
            <div
              v-for="s in slots"
              :key="s.hour"
              class="time-cell"
              :style="{ height: `${s.span * 60 * PX_PER_MIN}px` }"
              :class="{ disabled: s.disabled }"
            >
              {{ s.label }}
            </div>
          </div>

          <!-- 每日列 -->
          <div
            v-for="(d, di) in days"
            :key="d.date"
            class="day-col"
            :data-index="di"
            :class="{ weekend: isWeekend(d.date) }"
          >
            <!-- 固定时段单元格（12-13 午休禁用） -->
            <div
              v-for="s in slots"
              :key="s.hour"
              class="slot-cell"
              :class="{
                disabled: s.disabled,
                'drop-hover': dragActive && !s.disabled && hoverSlot && hoverSlot.col === di && hoverSlot.hour === s.hour
              }"
              :style="slotCellStyle(s)"
            >
              <span v-if="dragActive && !s.disabled && hoverSlot && hoverSlot.col === di && hoverSlot.hour === s.hour" class="slot-hint">
                松手排课到这里
              </span>
            </div>
            <VueDraggable
              class="drop-zone"
              :model-value="[]"
              :group="{ name: 'courses', pull: false, put: true }"
              :sort="false"
              :animation="0"
              :invert-swap="true"
              :swap-threshold="0.5"
              direction="vertical"
              :empty-insert-threshold="9999"
              ghost-class="dp-slot-ghost"
              @add="emit('templateDrop', $event, d.date)"
            />
            <div
              v-for="c in coursesOf(d.date)"
              :key="c.id"
              class="course-block"
              :class="[blockClass(c), { highlighted: c.id === highlightedId }]"
              :style="blockStyle(c)"
              :data-cid="c.id"
              @pointerdown="emit('courseDrag', $event, c, di)"
              @click.stop
              @dblclick.stop="emit('courseDblclick', c)"
            >
              <div class="cb-title">{{ blockTitle(c) }}</div>
              <div class="cb-meta-row">
                <span v-if="c.organizationName" class="cb-pill cb-pill-org">{{ c.organizationName }}</span>
                <span v-if="c.courseType" class="cb-pill" :style="{ background: courseTypeColor(c.courseType) }">{{ c.courseType }}</span>
              </div>
              <div class="cb-time-row">{{ timeTextOf(c) }}</div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 月视图 -->
    <div v-else class="month-wrap">
      <el-card shadow="never">
        <div class="month-grid">
          <div v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w" class="month-head">
            {{ w }}
          </div>
          <div
            v-for="cell in monthCells"
            :key="cell.date"
            class="month-cell"
            :class="{ dim: !cell.inMonth, today: cell.date === todayStr }"
            @click="emit('goDay', cell.date)"
          >
            <VueDraggable
              class="month-drop-zone"
              :model-value="[]"
              :group="{ name: 'courses', pull: false, put: true }"
              :sort="false"
              :animation="150"
              ghost-class="dp-ghost-month"
              @add="emit('templateDropMonth', $event, cell.date)"
              @click.stop
            />
            <div class="month-day">{{ cell.label }}</div>
            <div v-if="coursesOf(cell.date).length" class="month-count">{{ coursesOf(cell.date).length }} 节</div>
            <div
              v-for="c in coursesOf(cell.date).slice(0, 3)"
              :key="c.id"
              class="month-event"
              :style="monthEventStyle(c)"
              @dblclick.stop="emit('courseDblclick', c)"
            >
              {{ timeOf(c).slice(0, 5) }} {{ c.title }}
            </div>
            <div v-if="coursesOf(cell.date).length > 3" class="text-muted">
              +{{ coursesOf(cell.date).length - 3 }} 更多
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { VueDraggable } from 'vue-draggable-plus'
import { toMinutes, COURSE_COLORS, courseTypeColor } from '@/utils/date'

const props = defineProps({
  view: { type: String, default: 'week' },
  days: { type: Array, default: () => [] },
  courses: { type: Array, default: () => [] },
  draggingTemplate: { type: Object, default: null }
})
const emit = defineEmits([
  'update:view',
  'templateDrop',
  'templateDropMonth',
  'courseDrag',
  'courseDblclick',
  'goDay'
])

const HOUR_MIN = 8
const HOUR_MAX = 21
const PX_PER_MIN = 0.65

/* 卡片与单元格四周留白（上下各 5px，与左右 5px 一致） */
const BLOCK_GAP = 5

const todayStr = dayjs().format('YYYY-MM-DD')
const pad = (n) => String(n).padStart(2, '0')
/* 固定时段单元格：08-10 / 10-12 / 12-13(午休禁用) / 13-15 / 15-17 / 17-19 / 19-21 */
const SLOT_STARTS = [8, 10, 12, 13, 15, 17, 19]
const slots = SLOT_STARTS.map((h, i) => {
  const span = (SLOT_STARTS[i + 1] ?? HOUR_MAX) - h
  return { hour: h, span, label: `${pad(h)}:00 - ${pad(h + span)}:00`, disabled: span === 1 }
})

/* 拖拽期间单元格的可落地/悬停高亮（dragActive 来自模板 HTML5 拖拽或课程块移动） */
const dragActive = ref(false)
const hoverSlot = ref(null)

function slotCellStyle(s) {
  return {
    top: `${(s.hour - HOUR_MIN) * 60 * PX_PER_MIN}px`,
    height: `${s.span * 60 * PX_PER_MIN}px`
  }
}

const gridRef = ref()
const highlightedId = ref(null)

/* 定位并高亮某个课程（提醒中心跳转）：切到该课程后高亮 + 滚动到可视区 */
function locateCourse(id) {
  highlightedId.value = id
  const el = gridRef.value?.querySelector(`.course-block[data-cid="${id}"]`)
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  setTimeout(() => (highlightedId.value = null), 3000)
}

/* 左上角：本年第几周（ISO 周，周一起算） */
const weekNoText = computed(() => {
  const d = dayjs(props.days[0]?.date)
  if (!d.isValid()) return ''
  const start = d.startOf('year')
  const offset = (d.day() + 6) % 7 - (start.day() + 6) % 7
  const week = Math.floor((d.diff(start, 'day') - offset) / 7) + 1
  return `第${week}周`
})

/* 拖拽经过时按单元格粒度计算悬停落点（吸附到整格，不做分钟级换算） */
function syncDragOver(x, y) {
  const cols = gridRef.value?.querySelectorAll('.day-col')
  if (!cols) return
  let hit = null
  cols.forEach((col, i) => {
    const r = col.getBoundingClientRect()
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      const minutes = (y - r.top) / PX_PER_MIN + HOUR_MIN * 60
      const slot = slots.find((s) => minutes >= s.hour * 60 && minutes < (s.hour + s.span) * 60)
      if (slot && !slot.disabled) hit = { col: i, hour: slot.hour }
    }
  })
  hoverSlot.value = hit
}

function onDocDragOver(e) {
  dragActive.value = true
  syncDragOver(e.clientX, e.clientY)
}

function endDragUI() {
  // 延迟一帧再清除：drop 事件先于 Sortable @add 触发，避免高亮在落点计算前闪没
  setTimeout(() => {
    dragActive.value = false
    hoverSlot.value = null
  }, 150)
}

onMounted(() => {
  document.addEventListener('dragover', onDocDragOver)
  document.addEventListener('drop', endDragUI)
  document.addEventListener('dragend', endDragUI)
})
onBeforeUnmount(() => {
  document.removeEventListener('dragover', onDocDragOver)
  document.removeEventListener('drop', endDragUI)
  document.removeEventListener('dragend', endDragUI)
})

/* 月视图格子：以 days[0] 为网格起点铺满 42 格，本月判断直接取 visibleDays 中位数（父组件月视图从当月起算） */
const monthCells = computed(() => {
  const first = props.days[0]?.date
  if (!first) return []
  const start = dayjs(first)
  const ref = props.days[20]?.date ? dayjs(props.days[20].date) : start.add(20, 'day')
  return Array.from({ length: 42 }, (_, i) => {
    const d = start.add(i, 'day')
    return {
      date: d.format('YYYY-MM-DD'),
      day: d.date(),
      label: `${d.month() + 1}月${d.date()}日`,
      inMonth: d.month() === ref.month()
    }
  })
})

function coursesOf(date) {
  return props.courses.filter((c) => dayjs(c.startTime).format('YYYY-MM-DD') === date)
}

/* 周六/周日列底色区分 */
function isWeekend(date) {
  const d = dayjs(date).day()
  return d === 0 || d === 6
}

function dayText(d) {
  const date = dayjs(d.date)
  return `${date.month() + 1}月${date.date()}日`
}

/* 时间段文本：HH:mm - HH:mm */
function hmText(v) {
  return v ? dayjs(v).format('HH:mm') : ''
}
function timeOf(c) {
  return `${hmText(c.startTime)} - ${hmText(c.endTime)}`
}

/* 卡片顶部时间标签：开始 - 结束 */
function timeTextOf(c) {
  return timeOf(c)
}

/* 卡片标题：学生姓名 · 阶段，都没有回退课程标题 */
function blockTitle(c) {
  return [c.studentName, c.stage].filter(Boolean).join(' · ') || c.title
}

function topOffset(c) {
  const m = toMinutes(c.startTime)
  return Math.max(0, (m - HOUR_MIN * 60) * PX_PER_MIN) + BLOCK_GAP
}
function heightOf(c) {
  const start = toMinutes(c.startTime)
  const end = toMinutes(c.endTime)
  const effEnd = Math.min(end, HOUR_MAX * 60)
  return Math.max(20, (effEnd - start) * PX_PER_MIN - BLOCK_GAP * 2)
}

function blockStyle(c) {
  const color = c.color || COURSE_COLORS[0]
  return {
    top: `${topOffset(c)}px`,
    height: `${heightOf(c)}px`,
    background: `linear-gradient(180deg, ${hexToRgba(color, 0.16)}, ${hexToRgba(color, 0.07)})`,
    borderColor: hexToRgba(color, 0.45),
    '--cb-accent': color
  }
}

/* 按块高度分档：矮块精简字段（2 小时卡约 68px，完整显示三行；1.5h≈48、1h≈29） */
function blockClass(c) {
  const h = heightOf(c)
  return { 'cb-compact': h < 58, 'cb-tiny': h < 36 }
}

/* 月视图事件颜色：与周视图一致按机构色（父组件已用 orgColor 上色 c.color） */
function monthEventStyle(c) {
  return { background: c.color || COURSE_COLORS[0] }
}

/* hex → rgba，用于卡片整体透明度 */
function hexToRgba(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`
}

/* 供父组件拖拽换算：列元素、常量与落点高亮控制 */
defineExpose({
  gridRef,
  HOUR_MIN,
  HOUR_MAX,
  PX_PER_MIN,
  BLOCK_GAP,
  locateCourse,
  setHoverSlot(col, hour) {
    hoverSlot.value = col == null || hour == null ? null : { col, hour }
  },
  setDragActive(v) {
    dragActive.value = !!v
    if (!v) hoverSlot.value = null
  },
  endDragUI
})
</script>

<style lang="scss" scoped>
.calendar-main {
  flex: 1;
  min-width: 0;
}
.calendar-card {
  :deep(.el-card__body) {
    padding: 0;
  }
}
.week-header {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  .time-gutter {
    width: 96px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    .gutter-corner {
      span {
        display: inline-block;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-muted);
        white-space: nowrap;
        letter-spacing: 0.03em;
      }
    }
  }
  .day-head {
    flex: 1;
    text-align: center;
    padding: 6px 0;
    border-left: 1px solid var(--color-border);
    background: var(--color-surface);
    &.today {
      background: rgba(99, 91, 255, 0.08);
      box-shadow: inset 0 2px 0 var(--color-primary);
      .day-label {
        color: var(--color-primary);
        font-weight: 600;
      }
      .day-date {
        background: var(--color-primary);
        color: #fff;
      }
    }
    .day-label {
      font-size: 12px;
      color: var(--color-muted);
    }
    .day-date {
      display: inline-block;
      min-width: 24px;
      height: 24px;
      line-height: 24px;
      padding: 0 6px;
      border-radius: 12px;
      margin-top: 2px;
      font-weight: 600;
      font-size: 12px;
      color: var(--color-ink);
      white-space: nowrap;
    }
  }
}
.week-body {
  display: flex;
  position: relative;
  .time-col {
    width: 96px;
    flex-shrink: 0;
    .time-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      font-size: 11px;
      color: var(--color-muted);
      border-top: 1px solid var(--color-border);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      &.disabled {
        background: repeating-linear-gradient(
          -45deg,
          var(--color-surface),
          var(--color-surface) 6px,
          var(--color-canvas) 6px,
          var(--color-canvas) 12px
        );
        color: var(--color-border);
      }
    }
  }
  .day-col {
    flex: 1;
    position: relative;
    border-left: 1px solid var(--color-border);
    min-height: calc(780px * 0.65);
    &.weekend {
      background: rgba(99, 91, 255, 0.035);
    }
    /* 固定时段单元格：时间颗粒度即格子，拖拽时可落地态 */
    .slot-cell {
      position: absolute;
      left: 0;
      right: 0;
      box-sizing: border-box;
      border-top: 1px solid var(--color-border);
      transition: box-shadow 0.1s ease;
      &:last-child {
        border-bottom: 1px solid var(--color-border);
      }
      &.disabled {
        background: repeating-linear-gradient(
          -45deg,
          rgba(0, 0, 0, 0.035),
          rgba(0, 0, 0, 0.035) 6px,
          transparent 6px,
          transparent 12px
        );
        cursor: not-allowed;
      }
      &.drop-hover {
        box-shadow: inset 0 0 0 1.5px var(--color-primary);
        border-radius: 6px;
        z-index: 1;
        .slot-hint {
          position: absolute;
          left: 6px;
          top: 5px;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-primary);
          background: rgba(99, 91, 255, 0.08);
          border-radius: 999px;
          padding: 1px 10px;
          pointer-events: none;
        }
      }
    }
    .drop-zone {
      position: absolute;
      inset: 0;
      z-index: 1;
      display: block;
      pointer-events: none;

      :deep(.dp-slot-ghost) {
        display: none !important;
      }
    }
    .course-block {
      position: absolute;
      left: 5px;
      right: 5px;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 3px;
      border-radius: 8px;
      padding: 6px 9px;
      border: 1px solid transparent;
      color: var(--color-ink);
      cursor: grab;
      overflow: hidden;
      font-size: 12px;
      line-height: 1.45;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
      transition: transform 0.12s ease, box-shadow 0.12s ease;
      user-select: none;
      touch-action: none;
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14);
        z-index: 3;
      }
      &:active {
        cursor: grabbing;
      }
      .cb-title {
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cb-time-row {
        // margin-top: auto;
        font-size: 11px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.02em;
        color: var(--cb-accent, var(--color-primary));
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cb-meta-row {
        display: flex;
        gap: 4px;
        overflow: hidden;
        white-space: nowrap;
      }
      .cb-pill {
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
      /* 高度分档：compact 隐藏时间行，tiny 只保留标题行 */
      &.cb-compact {
        .cb-time-row {
          display: none;
        }
      }
      &.cb-tiny {
        padding: 3px 9px;
        .cb-title {
          font-size: 12px;
        }
        .cb-time-row,
        .cb-meta-row {
          display: none;
        }
      }
      /* 提醒跳转高亮：短暂描边脉冲提示用户关注 */
      &.highlighted {
        animation: cb-highlight 0.6s ease 3;
        box-shadow: 0 0 0 2px var(--color-primary);
      }
    }
  }
}

@keyframes cb-highlight {
  0%,
  100% {
    box-shadow: 0 0 0 2px var(--color-primary);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(99, 91, 255, 0.25);
  }
}
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--color-border);
  .month-head {
    text-align: center;
    padding: 8px 0;
    color: var(--color-muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--color-canvas);
  }
  .month-cell {
    position: relative;
    min-height: 96px;
    padding: 6px;
    cursor: pointer;
    background: var(--color-canvas);
    transition: background 0.15s ease;
    &:hover {
      background: var(--color-surface);
    }
    &.dim {
      background: var(--color-surface);
      color: var(--color-muted);
      .month-day {
        color: var(--color-muted);
      }
    }
    &.today {
      box-shadow: inset 0 0 0 2px var(--color-primary);
      .month-day {
        color: var(--color-primary);
        font-weight: 700;
      }
    }
    .month-drop-zone {
      position: absolute;
      inset: 0;
      z-index: 1;
    }
    .month-day {
      position: relative;
      z-index: 2;
      font-size: 13px;
      margin-bottom: 4px;
      color: var(--color-ink);
      pointer-events: none;
    }
    .month-count {
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 2;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.5;
      padding: 0 8px;
      color: var(--color-primary);
      background: rgba(99, 91, 255, 0.1);
      border-radius: 999px;
      font-variant-numeric: tabular-nums;
      pointer-events: none;
    }
    .month-event {
      position: relative;
      z-index: 2;
      font-size: 12px;
      color: #fff;
      border-radius: 4px;
      padding: 1px 6px;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
