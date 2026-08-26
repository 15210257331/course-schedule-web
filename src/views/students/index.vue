<template>
  <div class="page-container">
    <el-card>
      <div class="flex-between mb-16">
        <span class="text-muted">共 {{ list.length }} 名学生</span>
        <el-button type="primary" :icon="Plus" @click="openDialog()">新增学生</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="gender" label="性别" width="70" />
        <el-table-column prop="grade" label="年级" width="90" />
        <el-table-column prop="subject" label="科目" width="90" />
        <el-table-column label="机构" width="140">
          <template #default="{ row }">{{ row.organizationName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="parentPhone" label="家长电话" width="130" />
        <el-table-column label="课时费" width="100" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.fee) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑学生' : '新增学生'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="性别">
              <el-select v-model="form.gender" clearable style="width: 100%">
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="年级">
              <el-select v-model="form.grade" clearable filterable allow-create style="width: 100%">
                <el-option v-for="g in grades" :key="g" :label="g" :value="g" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="科目">
          <el-input v-model="form.subject" placeholder="如：数学" />
        </el-form-item>
        <el-form-item label="所属机构">
          <el-select v-model="form.organizationId" clearable filterable style="width: 100%">
            <el-option v-for="o in metaStore.organizations" :key="o.id" :label="o.name" :value="o.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="电话">
              <el-input v-model="form.phone" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="家长电话">
              <el-input v-model="form.parentPhone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="课时费">
          <el-input-number v-model="form.fee" :precision="2" :min="0" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { studentApi } from '@/api/student'
import { useMetaStore } from '@/store/meta'
import { loadSnapshot } from '@/utils/idb'
import { formatMoney } from '@/utils/date'

const metaStore = useMetaStore()
const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref()

const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']

const form = reactive({
  id: null,
  name: '',
  gender: '',
  grade: '',
  subject: '',
  organizationId: null,
  phone: '',
  parentPhone: '',
  fee: null,
  remark: ''
})
const rules = { name: [{ required: true, message: '请输入姓名', trigger: 'blur' }] }

async function load() {
  loading.value = true
  try {
    list.value = await studentApi.list()
    try {
      const snap = await loadSnapshot()
      metaStore.setSnapshot(snap)
    } catch (e) {
      /* 忽略 */
    }
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  Object.assign(form, {
    id: row?.id || null,
    name: row?.name || '',
    gender: row?.gender || '',
    grade: row?.grade || '',
    subject: row?.subject || '',
    organizationId: row?.organizationId || null,
    phone: row?.phone || '',
    parentPhone: row?.parentPhone || '',
    fee: row?.fee != null ? Number(row.fee) : null,
    remark: row?.remark || ''
  })
  dialogVisible.value = true
}

async function submit() {
  await formRef.value.validate()
  saving.value = true
  try {
    const { id, ...payload } = form
    if (id) await studentApi.update(id, payload)
    else await studentApi.create(payload)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除学生「${row.name}」吗？`, '提示', { type: 'warning' })
  await studentApi.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>