<template>
  <el-dialog
    :model-value="visible"
    :title="form.id ? '编辑课程' : '新增课程'"
    width="680px"
    @update:model-value="$emit('update:visible', $event)"
    @closed="initForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="学生姓名" prop="studentName">
            <el-input v-model="form.studentName" placeholder="输入学生姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="科目" prop="subject">
            <el-select v-model="form.subject" disabled placeholder="科目" style="width: 100%">
              <el-option v-for="s in subjectOptions" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="学段" prop="stage">
            <el-select v-model="form.stage" clearable placeholder="选择学段" style="width: 100%">
              <el-option label="初一" value="初一" />
              <el-option label="初二" value="初二" />
              <el-option label="初三" value="初三" />
              <el-option label="高一" value="高一" />
              <el-option label="高二" value="高二" />
              <el-option label="高三" value="高三" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="课程类型" prop="courseType">
            <el-select v-model="form.courseType" placeholder="类型" style="width: 100%">
              <el-option label="一对一" value="一对一" />
              <el-option label="家教" value="家教" />
              <el-option label="班课" value="班课" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="开始时间" prop="startTime">
            <el-date-picker
              v-model="form.startTime"
              type="datetime"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm:ss"
              placeholder="选择开始时间"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结束时间" prop="endTime">
            <el-date-picker
              v-model="form.endTime"
              type="datetime"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm:ss"
              placeholder="选择结束时间"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="课时费" prop="fee">
            <el-input v-model.number="form.fee" type="number" min="0">
              <template #append>元</template>
            </el-input>
          </el-form-item>
        </el-col>
        <el-col :span="12"></el-col>
      </el-row>

      <el-form-item label="上课机构">
        <el-select v-model="form.organizationId" clearable filterable placeholder="选择机构" style="width: 100%">
          <el-option v-for="o in metaStore.organizations" :key="o.id" :label="o.name" :value="o.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="上课地点">
        <el-input v-model="form.location" placeholder="如：XX教育 302 室" />
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.note" type="textarea" :rows="2" placeholder="备注" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { courseApi } from '@/api/course'
import { authApi } from '@/api/auth'
import { settingApi } from '@/api/setting'
import { useAuthStore } from '@/store/auth'
import { useMetaStore } from '@/store/meta'

const props = defineProps({
  visible: Boolean,
  defaultStart: String,
  defaultEnd: String
})
const emit = defineEmits(['update:visible', 'saved'])

const metaStore = useMetaStore()
const authStore = useAuthStore()
const formRef = ref()
const saving = ref(false)
const defaultFee = ref(300)

/* 加载系统设置的默认课时费 */
async function loadSettings() {
  try {
    const map = await settingApi.list()
    defaultFee.value = Number(map.defaultFee || 300)
  } catch (e) {
    /* 使用默认值 */
  }
}

/* 编辑回显标识：openForEdit 回显后，visible 监听里的 initForm 不应再覆盖回显数据 */
let editing = false

/* 科目选项 = 老师任教学科（默认「语文」），当前课程表单中科目固定禁用不可改 */
const subjectOptions = computed(() => {
  const s = authStore.user?.subjects
  const list = s ? s.split(',').filter(Boolean) : []
  return list.includes('语文') ? list : ['语文', ...list]
})

const form = reactive({
  id: null,
  studentName: '',
  organizationId: null,
  subject: '语文',
  stage: '',
  courseType: '',
  startTime: '',
  endTime: '',
  fee: defaultFee.value,
  location: '',
  note: '',
  status: 'scheduled',
  color: null
})

const rules = {
  studentName: [{ required: true, message: '请输入学生姓名', trigger: 'blur' }],
  subject: [{ required: true, message: '请选择科目', trigger: 'change' }],
  stage: [{ required: true, message: '请选择学段', trigger: 'change' }],
  courseType: [{ required: true, message: '请选择课程类型', trigger: 'change' }],
  fee: [{ required: true, message: '请输入课时费', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
}

/* 选中机构时把机构地址带入上课地点（可自由修改） */
function orgAddress(orgId) {
  const org = orgId != null ? metaStore.orgMap[orgId] : null
  return org?.address || ''
}

watch(
  () => props.visible,
  async (v) => {
    if (!v) return
    /* 每次打开都重新拉取默认课时费，保证设置修改后生效 */
    await loadSettings()
    if (authStore.user?.subjects == null) {
      try {
        const user = await authApi.profile()
        authStore.setUser({ ...authStore.user, ...user })
      } catch (e) {
        /* 忽略 */
      }
    }
    /* 编辑回显：跳过初始化，保留 openForEdit 已回显的数据 */
    if (editing) {
      editing = false
      return
    }
    initForm()
  }
)

/* 机构变化时：把机构地址带入上课地点（用户已手动改过的不覆盖） */
watch(
  () => form.organizationId,
  (orgId, prevId) => {
    if (!form.location || form.location === orgAddress(prevId)) {
      form.location = orgAddress(orgId)
    }
  }
)

function initForm() {
  Object.assign(form, {
    id: null,
    studentName: '',
    organizationId: null,
    subject: '语文',
    stage: '',
    courseType: '',
    startTime: props.defaultStart || '',
    endTime: props.defaultEnd || '',
    fee: defaultFee.value,
    location: '',
    note: '',
    status: 'scheduled',
    color: null
  })
}

async function submit() {
  await formRef.value.validate()
  saving.value = true
  /* 课程标题已下沉为自动生成：科目 + 类型，如「数学一对一」，兜底学生姓名 */
  const title = [form.subject, form.courseType].filter(Boolean).join('') || form.studentName || '课程'
  const feeValue = form.fee === '' || form.fee == null ? null : form.fee
  const payload = {
    title,
    studentName: form.studentName,
    organizationId: form.organizationId,
    subject: form.subject,
    stage: form.stage,
    courseType: form.courseType,
    startTime: form.startTime,
    endTime: form.endTime,
    fee: feeValue,
    feeManual: feeValue != null,
    location: form.location,
    note: form.note,
    status: form.status || 'scheduled',
    color: form.color
  }
  try {
    if (form.id) {
      await courseApi.update(form.id, payload)
    } else {
      await courseApi.create(payload)
    }
    ElMessage.success('保存成功')
    emit('update:visible', false)
    emit('saved')
  } finally {
    saving.value = false
  }
}

function openForEdit(course) {
  editing = true
  Object.assign(form, {
    id: course.id,
    studentName: course.studentName || '',
    organizationId: course.organizationId,
    subject: course.subject,
    stage: course.stage || '',
    courseType: course.courseType,
    startTime: course.startTime,
    endTime: course.endTime,
    fee: course.fee != null ? Number(course.fee) : defaultFee.value,
    location: course.location,
    note: course.note,
    status: course.status || 'scheduled',
    color: course.color || null
  })
}

defineExpose({ openForEdit })
</script>