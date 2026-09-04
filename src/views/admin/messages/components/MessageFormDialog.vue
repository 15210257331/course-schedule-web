<template>
  <el-dialog v-model="visible" :title="form.id ? '编辑消息' : '发布消息'" width="560px" @open="onOpen" @closed="onClosed">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="消息标题" prop="title">
        <el-input v-model="form.title" placeholder="输入消息标题" maxlength="100" show-word-limit />
      </el-form-item>
      <el-form-item label="消息类型">
        <el-radio-group v-model="form.type">
          <el-radio-button value="announcement">公告</el-radio-button>
          <el-radio-button value="activity">活动</el-radio-button>
          <el-radio-button value="notice">通知</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="目标范围">
        <el-radio-group v-model="form.targetType">
          <el-radio value="all">全部教师</el-radio>
          <el-radio value="specific">指定教师</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.targetType === 'specific'" label="选择教师" prop="targetIds">
        <el-select
          v-model="form.targetIds"
          multiple
          filterable
          remote
          :remote-method="searchTeachers"
          :loading="teacherLoading"
          placeholder="搜索并选择教师"
          style="width: 100%"
        >
          <el-option
            v-for="t in teacherOptions"
            :key="t.id"
            :label="`${t.nickname || t.username}（${t.username}）`"
            :value="t.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="消息内容" prop="content">
        <el-input v-model="form.content" type="textarea" :rows="6" placeholder="输入消息内容" maxlength="2000" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">{{ form.id ? '保存' : '发布' }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminMessageCreate, adminMessageUpdate, adminMessageTeacherOptions } from '@/api/admin'

const props = defineProps({
  visible: { type: Boolean, default: false },
  message: { type: Object, default: null }
})
const emit = defineEmits(['update:visible', 'saved'])

const visible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const formRef = ref()
const saving = ref(false)
const teacherLoading = ref(false)
const teacherOptions = ref([])

const form = reactive({
  id: null,
  title: '',
  type: 'announcement',
  targetType: 'all',
  targetIds: [],
  content: ''
})

const rules = {
  title: [{ required: true, message: '请输入消息标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入消息内容', trigger: 'blur' }],
  targetIds: [
    {
      validator: (_r, v, cb) => {
        if (form.targetType === 'specific' && (!v || !v.length)) cb(new Error('请选择目标教师'))
        else cb()
      },
      trigger: 'change'
    }
  ]
}

function onOpen() {
  const m = props.message
  form.id = m?.id || null
  form.title = m?.title || ''
  form.type = m?.type || 'announcement'
  form.targetType = m?.targetType || 'all'
  form.targetIds = m?.targetIds ? m.targetIds.split(',').map(Number) : []
  form.content = m?.content || ''
  searchTeachers('')
}

/* 弹窗完全关闭后重置表单与验证状态，避免下次打开残留上次输入和错误提示 */
function onClosed() {
  form.id = null
  form.title = ''
  form.type = 'announcement'
  form.targetType = 'all'
  form.targetIds = []
  form.content = ''
  teacherOptions.value = []
  formRef.value?.clearValidate()
}

async function searchTeachers(keyword) {
  teacherLoading.value = true
  try {
    teacherOptions.value = await adminMessageTeacherOptions(keyword || undefined)
  } finally {
    teacherLoading.value = false
  }
}

async function submit() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      title: form.title,
      content: form.content,
      type: form.type,
      targetType: form.targetType,
      targetIds: form.targetType === 'specific' ? form.targetIds : null
    }
    if (form.id) {
      await adminMessageUpdate({ ...payload, id: form.id })
      ElMessage.success('已保存')
    } else {
      await adminMessageCreate(payload)
      ElMessage.success('已发布')
    }
    visible.value = false
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>
