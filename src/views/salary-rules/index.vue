<template>
  <div class="page-container">
    <el-card>
      <div class="flex-between mb-16">
        <span class="text-muted">按「机构 + 年级 + 科目」自动匹配课时费，越具体优先级越高</span>
        <el-button type="primary" :icon="Plus" @click="openDialog()">新增规则</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="机构" width="160">
          <template #default="{ row }">{{ row.organizationName || '全部机构' }}</template>
        </el-table-column>
        <el-table-column label="年级" width="100">
          <template #default="{ row }">{{ row.grade || '全部年级' }}</template>
        </el-table-column>
        <el-table-column label="科目" width="100">
          <template #default="{ row }">{{ row.subject || '全部科目' }}</template>
        </el-table-column>
        <el-table-column label="课时费（元/小时）" width="160" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.hourlyFee) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑收费规则' : '新增收费规则'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="机构">
          <el-select v-model="form.organizationId" clearable filterable style="width: 100%">
            <el-option v-for="o in metaStore.organizations" :key="o.id" :label="o.name" :value="o.id" />
          </el-select>
          <div class="text-muted" style="width: 100%">留空表示适用于所有机构</div>
        </el-form-item>
        <el-form-item label="年级">
          <el-select v-model="form.grade" clearable filterable allow-create style="width: 100%">
            <el-option v-for="g in grades" :key="g" :label="g" :value="g" />
          </el-select>
        </el-form-item>
        <el-form-item label="科目">
          <el-input v-model="form.subject" placeholder="留空表示适用于所有科目" />
        </el-form-item>
        <el-form-item label="课时费" prop="hourlyFee">
          <el-input-number v-model="form.hourlyFee" :precision="2" :min="0" :controls="false" style="width: 100%" />
          <div class="text-muted" style="width: 100%">单位：元/小时</div>
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
import { salaryRuleApi } from '@/api/salaryRule'
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
  organizationId: null,
  grade: '',
  subject: '',
  hourlyFee: null,
  remark: ''
})
const rules = { hourlyFee: [{ required: true, message: '请输入课时费', trigger: 'blur' }] }

async function load() {
  loading.value = true
  try {
    list.value = await salaryRuleApi.list()
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
    organizationId: row?.organizationId || null,
    grade: row?.grade || '',
    subject: row?.subject || '',
    hourlyFee: row?.hourlyFee != null ? Number(row.hourlyFee) : null,
    remark: row?.remark || ''
  })
  dialogVisible.value = true
}

async function submit() {
  await formRef.value.validate()
  saving.value = true
  try {
    const { id, ...payload } = form
    if (id) await salaryRuleApi.update(id, payload)
    else await salaryRuleApi.create(payload)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await ElMessageBox.confirm('确定删除该收费规则吗？', '提示', { type: 'warning' })
  await salaryRuleApi.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>