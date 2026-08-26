<template>
  <div class="schedule">
    <div class="toolbar flex-between mb-16">
      <div class="flex">
        <el-button-group>
          <el-button :type="view === 'day' ? 'primary' : ''" @click="view = 'day'">日</el-button>
          <el-button :type="view === 'week' ? 'primary' : ''" @click="view = 'week'">周</el-button>
          <el-button :type="view === 'month' ? 'primary' : ''" @click="view = 'month'">月</el-button>
        </el-button-group>
        <el-button :icon="ArrowLeft" circle class="mr-8" @click="shift(-1)" />
        <el-button :icon="ArrowRight" circle @click="shift(1)" />
        <span class="range-label">{{ rangeLabel }}</span>
        <el-button :icon="Refresh" @click="goToday">今天</el-button>
      </div>
      <div class="flex">
        <el-button :icon="CopyDocument" @click="copyNextWeek">复制到下周</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate()">新增课程</el-button>
      </div>
    </div>

    <!-- 周/日视图 -->
    <div v-if="view !== 'month'" class="grid-wrap">
      <el-card shadow="never" class="calendar-card">
        <div class="week-header">
          <div class="time-gutter" />
          <div
            v-for="d in visibleDays"
            :key="d.date"
            class="day-head"
            :class="{ today: d.date === todayStr }"
          >
            <div class="day-label">{{ d.label }}</div>
            <div class="day-date">{{ d.day }}</div>
          </div>
        </div>

        <div class="week-body" ref="gridRef">
          <!-- 时间刻度 -->
          <div class="time-col">
            <div v-for="h in hours" :key="h" class="time-cell">{{ h }}:00</div>
          </div>

          <!-- 每日列 -->
          <div
            v-for="(d, di) in visibleDays"
            :key="d.date"
            class="day-col"
            :data-index="di"
            @click.self="createAt(d.date)"
          >
            <div class="col-bg" />
            <div
              v-for="c in coursesOf(d.date)"
              :key="c.id"
              class="course-block"
              :style="blockStyle(c, d.date)"
              @mousedown.prevent="startDrag($event, c, di)"
              @click.stop="openDetail(c)"
            >
              <div class="cb-title">{{ c.title }}</div>
              <div class="cb-time">{{ timeOf(c) }}</div>
              <div class="cb-sub">{{ c.studentName || '' }}</div>
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
            @click="goDay(cell.date)"
          >
            <div class="month-day">{{ cell.day }}</div>
            <div v-for="c in coursesOf(cell.date).slice(0, 3)" :key="c.id" class="month-event">
              {{ timeOf(c).slice(0, 5) }} {{ c.title }}
            </div>
            <div v-if="coursesOf(cell.date).length > 3" class="text-muted">
              +{{ coursesOf(cell.date).length - 3 }} 更多
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <CourseFormDialog
      v-model:visible="dialogVisible"
      :default-start="dialogStart"
      :default-end="dialogEnd"
      ref="dialogRef"
      @saved="reload"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox, ElDropdown } from 'element-plus'
import { ArrowLeft, ArrowRight, Refresh, Plus, CopyDocument } from '@element-plus/icons-vue'
import { courseApi } from '@/api/course'
import { useMetaStore } from '@/store/meta'
import { loadSnapshot } from '@/utils/idb'
import { weekDays, mondayOf, toMinutes, formatDateTime, COURSE_COLORS } from '@/utils/date'
import CourseFormDialog from '@/components/CourseFormDialog.vue'

const metaStore = useMetaStore()
const view = ref('week')
const anchor = ref(new Date())
const courses = ref([])
const dialogVisible = ref(false)
const dialogStart = ref('')
const dialogEnd = ref('')
const dialogRef = ref()
const gridRef = ref()

const HOUR_MIN = 7
const HOUR_MAX = 22
const PX_PER_MIN = 0.9

const todayStr = dayjs().format('YYYY-MM-DD')
const hours = Array.from({ length: HOUR_MAX - HOUR_MIN }, (_, i) => HOUR_MIN + i)

/* 视图天数与标签 */
const visibleDays = computed(() => {
  if (view.value === 'day') {
    const d = dayjs(anchor.value)
    const wd = '周' + '日一二三四五六'[d.day()]
    return [{ label: wd, date: d.format('YYYY-MM-DD'), day: d.date() }]
  }
  return weekDays(anchor.value)
})

const rangeLabel = computed(() => {
  if (view.value === 'day') return dayjs(anchor.value).format('YYYY年MM月DD日')
  if (view.value === 'month') return dayjs(anchor.value).format('YYYY年MM月')
  const days = weekDays(anchor.value)
  return `${days[0].date} ~ ${days[6].date}`
})

/* 月视图格子 */
const monthCells = computed(() => {
  const base = dayjs(anchor.value).startOf('month')
  const firstWeekday = (base.day() + 6) % 7 // 周一起始
  const start = base.subtract(firstWeekday, 'day')
  return Array.from({ length: 42 }, (_, i) => {
    const d = start.add(i, 'day')
    return { date: d.format('YYYY-MM-DD'), day: d.date(), inMonth: d.month() === base.month() }
  })
})

function coursesOf(date) {
  return courses.value.filter((c) => dayjs(c.startTime).format('YYYY-MM-DD') === date)
}

function timeOf(c) {
  return `${formatDateTime(c.startTime).slice(11)} - ${formatDateTime(c.endTime).slice(11)}`
}

function topOffset(c) {
  const m = toMinutes(c.startTime)
  return Math.max(0, (m - HOUR_MIN * 60) * PX_PER_MIN)
}
function heightOf(c) {
  const start = toMinutes(c.startTime)
  const end = toMinutes(c.endTime)
  const effEnd = Math.min(end, HOUR_MAX * 60)
  return Math.max(20, (effEnd - start) * PX_PER_MIN)
}

function blockStyle(c, date) {
  const color = c.color || COURSE_COLORS[0]
  return {
    top: `${topOffset(c)}px`,
    height: `${heightOf(c)}px`,
    background: color,
    borderLeft: `3px solid ${color}`
  }
}

function shift(dir) {
  if (view.value === 'day') anchor.value = dayjs(anchor.value).add(dir, 'day').toDate()
  else if (view.value === 'week') anchor.value = dayjs(anchor.value).add(dir, 'week').toDate()
  else anchor.value = dayjs(anchor.value).add(dir, 'month').toDate()
  reload()
}
function goToday() {
  anchor.value = new Date()
  reload()
}
function goDay(date) {
  view.value = 'day'
  anchor.value = dayjs(date).toDate()
  reload()
}

async function reload() {
  const start = rangeStart()
  const end = rangeEnd()
  // 优先使用 IndexedDB 快照，缺失时走接口
  try {
    const snap = await loadSnapshot()
    metaStore.setSnapshot(snap)
    const local = snap.courses || []
    const covered = local.filter((c) => dayjs(c.startTime).isAfter(start) && dayjs(c.startTime).isBefore(end))
    if (covered.length) {
      courses.value = local
      return
    }
  } catch (e) {
    /* 忽略，回退接口 */
  }
  courses.value = await courseApi.list(start.format('YYYY-MM-DDTHH:mm:ss'), end.format('YYYY-MM-DDTHH:mm:ss'))
}

function rangeStart() {
  if (view.value === 'month') return dayjs(anchor.value).startOf('month').subtract(7, 'day')
  if (view.value === 'day') return dayjs(anchor.value).startOf('day')
  return dayjs(mondayOf(anchor.value)).startOf('day')
}
function rangeEnd() {
  if (view.value === 'month') return dayjs(anchor.value).endOf('month').add(7, 'day')
  if (view.value === 'day') return dayjs(anchor.value).endOf('day')
  return dayjs(mondayOf(anchor.value)).add(7, 'day')
}

function openCreate(date) {
  dialogStart.value = date ? `${date}T00:00:00` : ''
  dialogEnd.value = ''
  dialogVisible.value = true
}
function createAt(date) {
  const hour = new Date().getHours()
  const start = dayjs(`${date}T09:00:00`).format('YYYY-MM-DDTHH:mm:ss')
  const end = dayjs(`${date}T09:00:00`).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss')
  dialogStart.value = start
  dialogEnd.value = end
  dialogVisible.value = true
}

async function openDetail(c) {
  try {
    const action = await ElMessageBox.confirm(
      `${c.title}\n${formatDateTime(c.startTime)} - ${formatDateTime(c.endTime)}`,
      '课程操作',
      { confirmButtonText: '编辑', cancelButtonText: '复制', distinguishCancelAndClose: true }
    )
    if (action === 'confirm') editCourse(c)
  } catch (e) {
    if (e === 'cancel') duplicateCourse(c)
  }
}

async function editCourse(c) {
  dialogVisible.value = true
  await dialogRef.value?.openForEdit(c)
}

async function duplicateCourse(c) {
  const start = dayjs(c.startTime).add(1, 'day').format('YYYY-MM-DDTHH:mm:ss')
  const end = dayjs(c.endTime).add(1, 'day').format('YYYY-MM-DDTHH:mm:ss')
  await courseApi.copy(c.id, { startTime: start, endTime: end })
  ElMessage.success('已复制到次日')
  reload()
}

async function copyNextWeek() {
  await ElMessageBox.confirm('将本周全部课程复制到下周，确定吗？', '复制课程')
  const count = await courseApi.copyWeek(1)
  ElMessage.success(`已复制 ${count} 节课到下周`)
  reload()
}

/* 拖拽：改时间/改天 */
let dragState = null
function startDrag(e, c, sourceDayIndex) {
  dragState = { cid: c.id, sourceDayIndex, offsetMin: dragOffsetMinutes(e, c) }
  const onMove = (ev) => {
    if (!dragState) return
    const pos = resolveDrop(ev)
    if (!pos) return
    // 显示拖拽提示（简单起见：随光标移动用 title 提示）
    e.target.style.opacity = '0.5'
  }
  const onUp = async (ev) => {
    const pos = resolveDrop(ev)
    const state = dragState
    dragState = null
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    if (!pos || !state) return
    const src = courses.value.find((x) => x.id === state.cid)
    if (!src) return
    const dur = dayjs(src.endTime).diff(dayjs(src.startTime), 'minute')
    const newStart = dayjs(pos.date).add(pos.minute - state.offsetMin, 'minute').format('YYYY-MM-DDTHH:mm:ss')
    const newEnd = dayjs(newStart).add(dur, 'minute').format('YYYY-MM-DDTHH:mm:ss')
    await courseApi.move(src.id, { startTime: newStart, endTime: newEnd })
    reload()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function dragOffsetMinutes(e, c) {
  const gridRect = gridRef.value.getBoundingClientRect()
  const bodyTop = gridRect.top + headerHeight()
  const m = ((e.clientY - bodyTop) / PX_PER_MIN) + HOUR_MIN * 60
  return Math.round(m - toMinutes(c.startTime))
}
function headerHeight() {
  return 48
}
function resolveDrop(e) {
  const grid = gridRef.value
  if (!grid) return null
  const columns = grid.querySelectorAll('.day-col')
  let target = null
  columns.forEach((col, i) => {
    const r = col.getBoundingClientRect()
    if (e.clientX >= r.left && e.clientX <= r.right) {
      const bodyTop = grid.getBoundingClientRect().top + headerHeight()
      const minute = ((e.clientY - bodyTop) / PX_PER_MIN) + HOUR_MIN * 60
      target = { date: visibleDays.value[i]?.date, minute: Math.round(minute / 15) * 15, index: i }
    }
  })
  return target
}

onMounted(reload)
</script>

<style lang="scss" scoped>
.toolbar {
  flex-wrap: wrap;
  gap: 12px;
  .range-label {
    margin: 0 12px;
    font-weight: 600;
    color: var(--color-ink);
  }
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
    width: 64px;
    flex-shrink: 0;
  }
  .day-head {
    flex: 1;
    text-align: center;
    padding: 12px 0;
    border-left: 1px solid var(--color-border);
    &.today {
      background: rgba(99, 91, 255, 0.06);
      .day-date {
        background: var(--color-primary);
        color: #fff;
      }
    }
    .day-label {
      font-size: 13px;
      color: var(--color-muted);
    }
    .day-date {
      display: inline-block;
      width: 28px;
      height: 28px;
      line-height: 28px;
      border-radius: 50%;
      margin-top: 4px;
      font-weight: 600;
      color: var(--color-ink);
    }
  }
}
.week-body {
  display: flex;
  position: relative;
  .time-col {
    width: 64px;
    flex-shrink: 0;
    .time-cell {
      height: calc(60px * 0.9);
      text-align: right;
      padding-right: 8px;
      font-size: 12px;
      color: var(--color-muted);
      border-top: 1px solid var(--color-border);
    }
  }
  .day-col {
    flex: 1;
    position: relative;
    border-left: 1px solid var(--color-border);
    min-height: calc(900px * 0.9);
    .col-bg {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(to bottom, var(--color-border) 1px, transparent 1px);
      background-size: 100% calc(60px * 0.9);
      pointer-events: none;
      opacity: 0.5;
    }
    .course-block {
      position: absolute;
      left: 2px;
      right: 2px;
      border-radius: 6px;
      padding: 4px 6px;
      color: #fff;
      cursor: pointer;
      overflow: hidden;
      font-size: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
      .cb-title {
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cb-time {
        opacity: 0.9;
      }
      .cb-sub {
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
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
    .month-day {
      font-size: 13px;
      margin-bottom: 4px;
      color: var(--color-ink);
    }
    .month-event {
      font-size: 12px;
      color: #fff;
      background: var(--color-primary);
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