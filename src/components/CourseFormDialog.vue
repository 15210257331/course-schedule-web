<template>
  <el-dialog
    :model-value="visible"
    :title="form.id ? '编辑课程' : '新增课程'"
    width="580px"
    @update:model-value="$emit('update:visible', $event)"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="课程标题" prop="title">
        <el-input v-model="form.title" placeholder="如：初三数学一对一" />
      </el-form-item>

      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="学生" prop="studentId">
            <el-select v-model="form.studentId" clearable filterable placeholder="选择学生" style="width: 100%">
              <el-option
                v-for="s in metaStore.students"
                :key="s.id"
                :label="s.name"
                :value="s.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="机构" prop="organizationId">
            <el-select v-model="form.organizationId" clearable filterable placeholder="选择机构" style="width: 100%">
              <el-option
                v-for="o in metaStore.organizations"
                :key="o.id"
                :label="o.name"
                :value="o.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="科目">
            <el-input v-model="form.subject" placeholder="如：数学" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="课程类型">
            <el-select v-model="form.courseType" placeholder="类型" style="width: 100%">
              <el-option label="一对一" value="一对一" />
              <el-option label="小班课" value="小班课" />
              <el-option label="大班课" value="大班课" />
              <el-option label="家教版" value="家教版" />
              <el-option label="试听" value="试听" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

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

      <el-form-item label="课时费">
        <el-input-number v-model="form.fee" :precision="2" :min="0" :controls="false" style="width: 100%" />
        <div class="text-muted" style="width: 100%">留空则按收费规则自动匹配，勾选「手动」后以填写的值为准</div>
      </el-form-item>
      <el-form-item label="手动计费">
        <el-switch v-model="form.feeManual" />
      </el-form-item>

      <el-form-item label="上课地点">
        <el-input v-model="form.location" placeholder="如：XX教育 302 室" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.note" type="textarea" :rows="2" placeholder="备注" />
      </el-form-item>

      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="颜色">
            <el-color-picker v-model="form.color" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-select v-model="form.status" style="width: 100%">
              <el-option label="待上课" value="scheduled" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="重复">
        <el-row :gutter="12" style="width: 100%">
          <el-col :span="12">
            <el-select v-model="form.repeatType" placeholder="不重复" clearable style="width: 100%">
              <el-option label="每天" value="daily" />
              <el-option label="每周" value="weekly" />
              <el-option label="每月" value="monthly" />
            </el-select>
          </el-col>
          <el-col :span="12">
            <el-date-picker
              v-model="form.repeatEndDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="重复截止"
              :disabled="!form.repeatType"
              style="width: 100%"
            />
          </el-col>
        </el-row>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { courseApi } from '@/api/course'
import { useMetaStore } from '@/store/meta'
import { COURSE_COLORS } from '@/utils/date'

const props = defineProps({
  visible: Boolean,
  defaultStart: String,
  defaultEnd: String
})
const emit = defineEmits(['update:visible', 'saved'])

const metaStore = useMetaStore()
const formRef = ref()
const saving = ref(false)

const form = reactive({
  id: null,
  title: '',
  studentId: null,
  organizationId: null,
  subject: '',
  courseType: '',
  startTime: '',
  endTime: '',
  fee: null,
  feeManual: false,
  location: '',
  note: '',
  status: 'scheduled',
  color: COURSE_COLORS[0],
  repeatType: '',
  repeatEndDate: ''
})

const rules = {
  title: [{ required: true, message: '请输入课程标题', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
}

watch(
  () => props.visible,
  (v) => {
    if (v) initForm()
  }
)

function initForm() {
  Object.assign(form, {
    id: null,
    title: '',
    studentId: null,
    organizationId: null,
    subject: '',
    courseType: '',
    startTime: props.defaultStart || '',
    endTime: props.defaultEnd || '',
    fee: null,
    feeManual: false,
    location: '',
    note: '',
    status: 'scheduled',
    color: COURSE_COLORS[0],
    repeatType: '',
    repeatEndDate: ''
  })
}

async function submit() {
  await formRef.value.validate()
  saving.value = true
  const payload = { ...form, id: undefined }
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
  Object.assign(form, {
    id: course.id,
    title: course.title,
    studentId: course.studentId,
    organizationId: course.organizationId,
    subject: course.subject,
    courseType: course.courseType,
    startTime: course.startTime,
    endTime: course.endTime,
    fee: Number(course.fee),
    feeManual: !!course.feeManual,
    location: course.location,
    note: course.note,
    status: course.status,
    color: course.color || COURSE_COLORS[0],
    repeatType: course.repeatType || '',
    repeatEndDate: course.repeatEndDate || ''
  })
}

defineExpose({ openForEdit })
</script>