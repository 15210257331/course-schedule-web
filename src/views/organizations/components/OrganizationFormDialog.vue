<template>
    <el-dialog v-model="visible" :title="form.id ? '编辑机构' : '新增机构'" width="520px" @closed="onClosed">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
            <el-form-item label="机构名称" prop="name">
                <el-input v-model="form.name" placeholder="输入机构名称" />
            </el-form-item>
            <el-row :gutter="12">
                <el-col :span="12">
                    <el-form-item label="联系人">
                        <el-input v-model="form.contactName" placeholder="输入联系人" />
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item label="联系电话">
                        <el-input v-model="form.contactPhone" placeholder="输入联系电话" />
                    </el-form-item>
                </el-col>
            </el-row>
            <el-form-item label="地址">
                <el-input v-model="form.address" placeholder="如：XX路XX号XX教育" />
            </el-form-item>
            <el-form-item label="备注">
                <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注"/>
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
        </template>
    </el-dialog>
</template>

<script setup>
    import { computed, reactive, ref } from "vue"
    import { ElMessage } from "element-plus"
    import { organizationCreate, organizationUpdate } from "@/api/organization"
    import { useMetaStore } from "@/store/meta"
    import { COURSE_COLORS } from "@/utils/date"

    const props = defineProps({ visible: { type: Boolean, default: false } })
    const emit = defineEmits(["update:visible", "saved"])

    const visible = computed({
        get: () => props.visible,
        set: v => emit("update:visible", v),
    })

    const metaStore = useMetaStore()
    const saving = ref(false)
    const formRef = ref()

    const form = reactive({
        id: null,
        name: "",
        contactName: "",
        contactPhone: "",
        address: "",
        color: null,
        remark: "",
    })
    const rules = { name: [{ required: true, message: "请输入机构名称", trigger: "blur" }] }

    /* 新增时自动生成一个与已有机构不同的颜色：按序取 COURSE_COLORS 中未被占用的第一个 */
    function nextColor() {
        const used = new Set((metaStore.organizations || []).map(o => o.color))
        return COURSE_COLORS.find(c => !used.has(c)) || COURSE_COLORS[(metaStore.organizations?.length || 0) % COURSE_COLORS.length]
    }

    function openForEdit(row) {
        Object.assign(form, {
            id: row?.id || null,
            name: row?.name || "",
            contactName: row?.contactName || "",
            contactPhone: row?.contactPhone || "",
            address: row?.address || "",
            color: row?.color || null,
            remark: row?.remark || "",
        })
    }

    /* 弹窗完全关闭后重置表单与验证状态，避免下次打开残留上次输入和错误提示 */
    function onClosed() {
        openForEdit(null)
        formRef.value?.clearValidate()
    }

    async function submit() {
        await formRef.value.validate()
        saving.value = true
        try {
            const { id, ...payload } = form
            payload.color = form.id ? form.color || null : nextColor()
            if (id) await organizationUpdate(id, payload)
            else await organizationCreate(payload)
            ElMessage.success("保存成功")
            visible.value = false
            emit("saved")
        } finally {
            saving.value = false
        }
    }

    defineExpose({ openForEdit })
</script>
