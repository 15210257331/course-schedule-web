<template>
  <div class="schedule">
    <div class="schedule-board">
      <!-- 左侧：页面标题 + 课程模板 -->
      <div class="side-col">
        <h1 class="page-title">课程日历</h1>
        <TemplatePanel
          :templates="templates"
          @create="tplDialogVisible = true"
          @edit="editTemplate"
          @remove="removeTemplate"
          @clone="cloneTemplate"
        />
      </div>

      <!-- 右侧：操作栏 + 日历 -->
      <div class="main-col">
        <ScheduleToolbar
          :range-label="rangeLabel"
          :view="view"
          @update:view="view = $event"
          @shift="shift"
          @today="goToday"
          @copy-next-week="copyNextWeek"
          @create="openCreate()"
        />
        <ScheduleCalendar
          ref="calendarRef"
          :view="view"
          :days="visibleDays"
          :courses="coloredCourses"
          :dragging-template="draggingTemplate"
          @update:view="view = $event"
          @template-drop="onTemplateDrop"
          @template-drop-month="onTemplateDropMonth"
          @course-drag="startDrag"
          @course-dblclick="openDetail"
          @go-day="goDay"
        />

        <!-- 日历底下靠右统计：仅周视图（本周课程/已上/收入） -->
        <transition name="fade">
          <div v-if="view === 'week'" class="week-stats">
            <div class="ws-item">
              <span class="ws-label">本周</span>
              <span class="ws-value">{{ weekStats.total }}<em>节</em></span>
            </div>
            <span class="ws-divider" />
            <div class="ws-item">
              <span class="ws-label">已上</span>
              <span class="ws-value">{{ weekStats.done }}<em>节</em></span>
            </div>
            <span class="ws-divider" />
            <div class="ws-item ws-income">
              <span class="ws-label">收入</span>
              <span class="ws-value">¥{{ formatMoney(weekStats.income) }}</span>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <CourseFormDialog
      v-model:visible="dialogVisible"
      :default-start="dialogStart"
      :default-end="dialogEnd"
      ref="dialogRef"
      @saved="reload"
    />
    <CourseTemplateDialog v-model:visible="tplDialogVisible" ref="tplDialogRef" @saved="reloadTemplates" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { courseApi } from '@/api/course'
import { templateApi } from '@/api/courseTemplate'
import { useMetaStore } from '@/store/meta'
import { loadCourses, loadCourseTemplates, loadStudents, loadOrganizations } from '@/utils/idb'
import { weekDays, mondayOf, toMinutes, COURSE_COLORS } from '@/utils/date'
import CourseFormDialog from '@/components/CourseFormDialog.vue'
import CourseTemplateDialog from '@/components/CourseTemplateDialog.vue'
import ScheduleToolbar from './components/ScheduleToolbar.vue'
import TemplatePanel from './components/TemplatePanel.vue'
import ScheduleCalendar from './components/ScheduleCalendar.vue'

const view = ref('week')
const anchor = ref(new Date())
const courses = ref([])
const dialogVisible = ref(false)
const dialogStart = ref('')
const dialogEnd = ref('')
const dialogRef = ref()
const calendarRef = ref()

const metaStore = useMetaStore()

/* 课程模板侧栏 */
const templates = ref([])
const tplDialogVisible = ref(false)
const tplDialogRef = ref()

/* 日历常量（与 ScheduleCalendar 内保持一致）：固定时段单元格 */
const HOUR_MIN = 8
const HOUR_MAX = 21
const PX_PER_MIN = 0.65
/* 单元格边界分钟数（末位补 HOUR_MAX），落点吸附以这些边界为准 */
const SLOT_BOUNDS = [8, 10, 12, 13, 15, 17, 19, HOUR_MAX].map((h) => h * 60)

/* 颜色基于机构：机构维护了 color 用机构色，未设置则按机构 id 稳定取色；无机构按 id 取色 */
function orgColor(organizationId, fallbackId) {
  const org = organizationId != null ? metaStore.orgMap[organizationId] : null
  if (org?.color) return org.color
  if (organizationId != null) return COURSE_COLORS[organizationId % COURSE_COLORS.length]
  return COURSE_COLORS[(fallbackId || 0) % COURSE_COLORS.length]
}

/* 给课程补学生姓名（学生表冗余）与机构色，日历卡片直接用 c.studentName / c.color */
const coloredCourses = computed(() =>
  courses.value.map((c) => {
    const studentName = c.studentName || (c.studentId != null ? metaStore.studentMap[c.studentId]?.name : null)
    const withName = studentName && studentName !== c.studentName ? { ...c, studentName } : c
    return withName.color ? withName : { ...withName, color: orgColor(c.organizationId, c.id) }
  })
)

/* 视图天数与标签 */
const visibleDays = computed(() => {
  if (view.value === 'day') {
    const d = dayjs(anchor.value)
    const wd = '周' + '日一二三四五六'[d.day()]
    return [{ label: wd, date: d.format('YYYY-MM-DD'), day: d.date() }]
  }
  if (view.value === 'month') {
    const base = dayjs(anchor.value).startOf('month')
    const firstWeekday = (base.day() + 6) % 7 // 周一起始
    const start = base.subtract(firstWeekday, 'day')
    return Array.from({ length: 42 }, (_, i) => {
      const d = start.add(i, 'day')
      return { label: '', date: d.format('YYYY-MM-DD'), day: d.date() }
    })
  }
  return weekDays(anchor.value)
})

const rangeLabel = computed(() => {
  if (view.value === 'day') return dayjs(anchor.value).format('YYYY年MM月DD日')
  if (view.value === 'month') return dayjs(anchor.value).format('YYYY年MM月')
  const days = weekDays(anchor.value)
  return `${days[0].date} ~ ${days[6].date}`
})

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
  try {
    courses.value = await loadCourses(start.format('YYYY-MM-DDTHH:mm:ss'), end.format('YYYY-MM-DDTHH:mm:ss'))
  } catch (e) {
    /* 忽略 */
  }
}

async function reloadTemplates() {
  try {
    templates.value = await loadCourseTemplates()
    metaStore.setCourseTemplates(templates.value)
  } catch (e) {
    /* 忽略 */
  }
}

/* 模板表单/课程表单需要学生与机构数据 */
async function ensureMeta() {
  try {
    if (!metaStore.students.length) metaStore.setStudents(await loadStudents())
    if (!metaStore.organizations.length) metaStore.setOrganizations(await loadOrganizations())
  } catch (e) {
    /* 忽略 */
  }
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

async function openDetail(c) {
  dialogVisible.value = true
  await dialogRef.value?.openForEdit(c)
}

async function copyNextWeek() {
  await ElMessageBox.confirm('将本周全部课程复制到下周，确定吗？', '复制课程')
  const count = await courseApi.copyWeek(1)
  ElMessage.success(`已复制 ${count} 节课到下周`)
  reload()
}

/* ---------- 右下角统计（周视图）：本周总节数 / 已上节数 / 收入 ---------- */
const weekStats = computed(() => {
  let total = 0
  let done = 0
  let income = 0
  const now = Date.now()
  for (const c of courses.value) {
    total += 1
    // 课程是否完成统一按「当前时间 > 课程结束时间」判定
    const finished = dayjs(c.endTime).valueOf() < now
    if (finished) {
      done += 1
      const fee = Number(c.fee)
      if (!Number.isNaN(fee)) income += fee
    }
  }
  return { total, done, income }
})

function formatMoney(n) {
  const v = Number(n) || 0
  return Number.isInteger(v) ? String(v) : v.toFixed(2)
}

/* ---------- 拖出日历区域 = 删除课程（二次确认） ---------- */
async function confirmRemoveCourse(cid) {
  const c = courses.value.find((x) => x.id === cid)
  if (!c) return
  // 重复系列的父课（删除父课后端会级联删掉整个系列）提示文案不同；单节也先确认再删
  const isSeries = !!c.repeatType && c.repeatType !== 'none'
  const ok = await ElMessageBox.confirm(
    isSeries
      ? `「${c.title}」是重复排课的系列课程，删除后将同时移除该系列的全部课程，确定吗？`
      : `确定删除「${c.title}」这节课吗？`,
    '删除课程',
    { type: 'warning', confirmButtonText: isSeries ? '删除全部' : '删除', cancelButtonText: '取消' }
  ).then(() => true).catch(() => false)
  if (!ok) return
  await courseApi.remove(cid)
  ElMessage.success('删除成功')
  reload()
}

/* ---------- 模板侧栏操作 ---------- */
async function editTemplate(t) {
  tplDialogVisible.value = true
  await tplDialogRef.value?.openForEdit(t)
}
async function removeTemplate(t) {
  await ElMessageBox.confirm(`确定删除模板「${t.title}」吗？`, '提示', { type: 'warning' })
  await templateApi.remove(t.id)
  ElMessage.success('删除成功')
  reloadTemplates()
}

/* 拖拽克隆：把模板数据挂到克隆元素上，落点处读取 */
const draggingTemplate = ref(null)
function cloneTemplate(tpl) {
  draggingTemplate.value = tpl
  return tpl
}

function templateFromEvent(evt) {
  const id = Number(evt.item?.dataset?.id)
  return draggingTemplate.value?.id === id
    ? draggingTemplate.value
    : templates.value.find((t) => t.id === id) || draggingTemplate.value
}

function cleanupDropDom(evt) {
  // 课程块由 Vue 绝对定位渲染，清掉 Sortable 插入的克隆 DOM
  evt.item?.remove()
}

/* 模板落到周/日视图某列：吸附到整格（单元格起点），不做分钟级换算 */
async function onTemplateDrop(evt, date) {
  const tpl = templateFromEvent(evt)
  cleanupDropDom(evt)
  if (!tpl) return

  // 落点日期以光标实际命中的列为准（ghost 隐藏后 Sortable 选中的 evt.to 可能不是光标所在列）
  const pos = resolveDrop(evt.originalEvent)
  const targetDate = pos?.date || date
  if (!pos) return
  const start = slotStartFor(pos.minute)
  if (start == null) {
    ElMessage.warning('午休时段（12:00-13:00）不可排课')
    return
  }

  await scheduleTemplate(tpl, targetDate, start)
}

/* 模板落到月视图某天（默认 09:00 开始） */
async function onTemplateDropMonth(evt, date) {
  const tpl = templateFromEvent(evt)
  cleanupDropDom(evt)
  if (!tpl) return
  await scheduleTemplate(tpl, date, 9 * 60)
}

/* 分钟数所属单元格的起点（禁用格返回 null，表盘外返回最近的边界起点） */
function slotStartFor(minute) {
  for (let i = 0; i < SLOT_BOUNDS.length - 1; i++) {
    if (minute < SLOT_BOUNDS[i + 1]) {
      const start = SLOT_BOUNDS[i]
      const span = SLOT_BOUNDS[i + 1] - start
      return span <= 60 ? null : start // 午休格跨度 60 分钟，禁用
    }
  }
  return SLOT_BOUNDS[SLOT_BOUNDS.length - 2]
}

async function scheduleTemplate(tpl, date, minute) {
  const start = dayjs(`${date}T00:00:00`).add(minute, 'minute')
  const end = start.add(tpl.durationMinutes || 60, 'minute')
  const payload = {
    title: tpl.studentName || tpl.title,
    studentId: tpl.studentId,
    studentName: tpl.studentName,
    organizationId: tpl.organizationId,
    subject: tpl.subject,
    stage: tpl.stage,
    courseType: tpl.courseType,
    startTime: start.format('YYYY-MM-DDTHH:mm:ss'),
    endTime: end.format('YYYY-MM-DDTHH:mm:ss'),
    fee: tpl.fee,
    feeManual: !!tpl.feeManual,
    location: tpl.location,
    note: tpl.note,
    status: 'scheduled',
    color: orgColor(tpl.organizationId, tpl.id)
  }
  // 模板带重复规则：落到课程上自动排满到本月底（含落点当天）
  if (tpl.repeatType) {
    payload.repeatType = tpl.repeatType
    payload.repeatEndDate = dayjs(date).endOf('month').format('YYYY-MM-DD')
  }
  try {
    await courseApi.create(payload)
    ElMessage.success(`已排课：${start.format('MM-DD HH:mm')} ${tpl.title}`)
    reload()
  } catch (e) {
    /* 冲突等错误由拦截器统一提示 */
  } finally {
    // 排课完成后立即清除落点高亮与提示文本
    calendarRef.value?.endDragUI?.()
  }
}

/* ---------- 已有课程拖拽：改时间/改天（原生 mousemove + 幽灵块，吸附到整格） ---------- */
let dragState = null
let ghostEl = null

function startDrag(e, c) {
  if (e.button !== 0) return
  const blockEl = e.currentTarget
  const src = courses.value.find((x) => x.id === c.id)
  const color = c.color || COURSE_COLORS[0]
  const dur = src ? dayjs(src.endTime).diff(dayjs(src.startTime), 'minute') : 0
  const gap = calendarRef.value?.BLOCK_GAP ?? 5
  // 卡片矩形 + 光标抓取点偏移：拖动中卡片跟随光标（保持相对位置）
  const rect = blockEl.getBoundingClientRect()
  dragState = {
    cid: c.id,
    startX: e.clientX,
    startY: e.clientY,
    moved: false,
    blockEl,
    dur,
    grabDX: e.clientX - rect.left,
    grabDY: e.clientY - rect.top,
    w: rect.width,
    h: rect.height
  }
  let hoverKey = null

  const moveGhost = (ev) => {
    ghostEl.style.left = `${ev.clientX - dragState.grabDX}px`
    ghostEl.style.top = `${ev.clientY - dragState.grabDY}px`
  }

  const onMove = (ev) => {
    const st = dragState
    if (!st) return
    if (!st.moved) {
      if (Math.hypot(ev.clientX - st.startX, ev.clientY - st.startY) < 6) return
      // 越过阈值才认为开始拖拽：建跟随幽灵块、原卡片半透明、点亮落点高亮
      st.moved = true
      st.blockEl.style.opacity = '0.35'
      calendarRef.value?.setDragActive?.(true)
      ensureGhost(color, c)
      ghostEl.style.width = `${st.w}px`
      ghostEl.style.height = `${st.h}px`
    }
    moveGhost(ev)
    // 落点高亮：按光标位置命中的单元格；拖出日历区域 → 幽灵块变为删除态
    const pos = resolveDrop(ev)
    setGhostDelete(!pos)
    if (!pos) {
      if (hoverKey) {
        hoverKey = null
        calendarRef.value?.setHoverSlot?.(null, null)
      }
      return
    }
    const snapped = snapMinutes(pos.minute, st.dur)
    const key = snapped == null ? null : `${pos.index}:${snapped}`
    if (key !== hoverKey) {
      hoverKey = key
      if (snapped == null) calendarRef.value?.setHoverSlot?.(null, null)
      else calendarRef.value?.setHoverSlot?.(pos.index, Math.floor(snapped / 60))
    }
  }

  const finish = () => {
    if (dragState?.blockEl) dragState.blockEl.style.opacity = ''
    dragState = null
    removeGhost()
    calendarRef.value?.setDragActive?.(false)
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  const onUp = async (ev) => {
    const st = dragState
    if (!st || !st.moved) {
      // 单击交互暂时禁用，仅清理拖拽状态
      finish()
      return
    }
    const pos = resolveDrop(ev)
    const cid = st.cid
    const durMin = st.dur
    finish()
    if (!pos) {
      // 松手位置在日历区域外：删除课程（重复系列会提示删除全部）
      confirmRemoveCourse(cid)
      return
    }
    const snapped = snapMinutes(pos.minute, durMin)
    if (snapped != null) {
      const newStart = dayjs(pos.date).add(snapped, 'minute').format('YYYY-MM-DDTHH:mm:ss')
      const newEnd = dayjs(newStart).add(durMin, 'minute').format('YYYY-MM-DDTHH:mm:ss')
      try {
        await courseApi.move(cid, { startTime: newStart, endTime: newEnd })
        reload()
      } catch (err) {
        /* 冲突等错误由拦截器统一提示 */
      }
    }
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

/* 把分钟吸附到整格：光标落在哪格就返回哪格（装不下时长或午休格返回 null） */
function snapMinutes(minute, dur) {
  const bounds = SLOT_BOUNDS
  for (let i = 0; i < bounds.length - 1; i++) {
    const s = bounds[i]
    if (minute < bounds[i + 1]) {
      const span = bounds[i + 1] - s
      if (span <= 60 || s + dur > bounds[i + 1]) return null
      return s
    }
  }
  return null
}

/* 拖动跟随幽灵块：与课程卡片同款浅色渐变底 + 细边框 */
function hexToRgba(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`
}

function ensureGhost(color, c) {
  if (ghostEl) return
  ghostEl = document.createElement('div')
  ghostEl.className = 'course-drag-ghost'
  ghostEl.style.background = `linear-gradient(180deg, ${hexToRgba(color, 0.35)}, ${hexToRgba(color, 0.2)})`
  ghostEl.style.borderColor = hexToRgba(color, 0.6)
  ghostEl.style.color = color
  const name = c.studentName || c.title || ''
  const stage = c.stage ? ` · ${c.stage}` : ''
  ghostEl.innerHTML = `<span class="gh-time">${minutesText(toMinutes(c.startTime))} - ${minutesText(toMinutes(c.endTime))}</span><span class="gh-title">${name}${stage}</span>`
  document.body.appendChild(ghostEl)
}
function removeGhost() {
  ghostEl?.remove()
  ghostEl = null
}
/* 拖出日历区域时幽灵块切换为删除态 */
function setGhostDelete(on) {
  if (ghostEl) ghostEl.classList.toggle('is-delete', !!on)
}
function minutesText(m) {
  const hh = String(Math.floor(m / 60)).padStart(2, '0')
  const mm = String(m % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function resolveDrop(e) {
  const grid = calendarRef.value?.gridRef
  if (!grid) return null
  const columns = grid.querySelectorAll('.day-col')
  let target = null
  columns.forEach((col, i) => {
    const r = col.getBoundingClientRect()
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      const minute = (e.clientY - r.top) / PX_PER_MIN + HOUR_MIN * 60
      target = { date: visibleDays.value[i]?.date, minute, index: i }
    }
  })
  return target
}

/* 拖拽结束/中断兜底：清掉幽灵块与落点高亮 */
function cancelDrag() {
  if (dragState?.blockEl) dragState.blockEl.style.opacity = ''
  dragState = null
  removeGhost()
  calendarRef.value?.setDragActive?.(false)
}

onMounted(() => {
  reload()
  reloadTemplates()
  ensureMeta()
  document.addEventListener('mouseleave', cancelDrag)
  window.addEventListener('blur', cancelDrag)
})
onBeforeUnmount(() => {
  cancelDrag()
  document.removeEventListener('mouseleave', cancelDrag)
  window.removeEventListener('blur', cancelDrag)
})
</script>

<style lang="scss" scoped>
.schedule-board {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

/* 左侧列：页面标题 + 模板面板 */
.side-col {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;

  .page-title {
    margin: 0 0 16px;
    font-size: 20px;
    font-weight: 700;
    color: var(--color-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* 右侧列：操作栏 + 日历 */
.main-col {
  flex: 1;
  min-width: 0;
}

/* 日历底下靠右统计（周视图） */
.week-stats {
  display: inline-flex;
  align-items: center;
  gap: 18px;
  float: right;
  margin-top: 12px;
  padding: 10px 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;

  .ws-item {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .ws-label {
    font-size: 12px;
    color: var(--color-muted);
  }

  .ws-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-primary);
    font-variant-numeric: tabular-nums;

    em {
      margin-left: 2px;
      font-size: 12px;
      font-style: normal;
      font-weight: 500;
      color: var(--color-muted);
    }
  }

  /* 收入用暖色高亮区分 */
  .ws-income .ws-value {
    color: var(--color-warning);
  }

  .ws-divider {
    width: 1px;
    height: 20px;
    background: var(--color-border);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
