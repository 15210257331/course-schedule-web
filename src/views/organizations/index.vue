<template>
  <div class="page-container">
    <el-card>
      <div class="flex-between mb-16">
        <span class="text-muted">共 {{ list.length }} 个机构</span>
        <el-button type="primary" :icon="Plus" @click="openDialog()">新增机构</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="name" label="机构名称" min-width="160" />
        <el-table-column prop="contactName" label="联系人" width="120" />
        <el-table-column prop="contactPhone" label="联系电话" width="140" />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column label="默认课时费" width="110" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.defaultFee) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑机构' : '新增机构'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="机构名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="form.contactName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="form.contactPhone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="如：XX路XX号XX教育" />
        </el-form-item>
        <el-form-item label="默认课时费">
          <el-input-number v-model="form.defaultFee" :precision="2" :min="0" :controls="false" style="width: 100%" />
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
import { organizationApi } from '@/api/organization'
import { useMetaStore } from '@/store/meta'
import { loadSnapshot } from '@/utils/idb'
import { formatMoney } from '@/utils/date'

const metaStore = useMetaStore()
const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref()

const form = reactive({
  id: null,
  name: '',
  contactName: '',
  contactPhone: '',
  address: '',
  defaultFee: null,
  remark: ''
})
const rules = { name: [{ required: true, message: '请输入机构名称', trigger: 'blur' }] }

async function load() {
  loading.value = true
  try {
    list.value = await organizationApi.list()
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
    contactName: row?.contactName || '',
    contactPhone: row?.contactPhone || '',
    address: row?.address || '',
    defaultFee: row?.defaultFee != null ? Number(row.defaultFee) : null,
    remark: row?.remark || ''
  })
  dialogVisible.value = true
}

async function submit() {
  await formRef.value.validate()
  saving.value = true
  try {
    const { id, ...payload } = form
    if (id) await organizationApi.update(id, payload)
    else await organizationApi.create(payload)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除机构「${row.name}」吗？`, '提示', { type: 'warning' })
  await organizationApi.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>