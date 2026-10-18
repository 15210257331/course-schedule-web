<template>
    <el-dialog :model-value="visible" :title="form.id ? '编辑学生' : '新增学生'" width="680px" @update:model-value="$emit('update:visible', $event)" @closed="onClosed">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
            <el-row :gutter="12">
                <el-col :span="12">
                    <el-form-item label="学生姓名" prop="studentName">
                        <el-input v-model="form.studentName" placeholder="输入学生姓名" />
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item label="科目" prop="subject">
                        <el-select v-model="form.subject" disabled placeholder="在个人中心维护任教学科" style="width: 100%">
                            <el-option v-for="s in subjectOptions" :key="s" :label="s" :value="s" />
                        </el-select>
                    </el-form-item>
                </el-col>
            </el-row>
            <el-row :gutter="12">
                <el-col :span="12">
                    <el-form-item label="学段" prop="stage">
                        <el-select v-model="form.stage" placeholder="选择学段" style="width: 200px">
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
                        <el-select v-model="form.courseType" placeholder="类型" style="width: 100%" @change="onCourseTypeChange">
                            <el-option label="一对一" value="一对一" />
                            <el-option label="家教" value="家教" />
                            <el-option label="班课" value="班课" />
                        </el-select>
                    </el-form-item>
                </el-col>
            </el-row>

            <el-row :gutter="12">
                <el-col :span="12">
                    <el-form-item label="课时费" prop="fee">
                        <div class="input-with-tip">
                            <el-input v-model.number="form.fee" type="number" min="0">
                                <template #append>元</template>
                            </el-input>
                        </div>
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item label="默认时长" prop="durationMinutes">
                        <div class="input-with-tip">
                            <el-input v-model.number="form.durationMinutes" type="number" min="15" max="480" step="15">
                                <template #append>分钟</template>
                            </el-input>
                            <el-tooltip :content="`拖入日历后按此时长排课，默认 ${defaultDuration} 分钟`" placement="top">
                                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                            </el-tooltip>
                        </div>
                    </el-form-item>
                </el-col>
            </el-row>

            <el-form-item label="重复">
                <el-radio-group v-model="form.repeatType">
                    <el-radio-button value="">不重复</el-radio-button>
                    <el-radio-button value="daily">每天</el-radio-button>
                    <el-radio-button value="weekly">每周</el-radio-button>
                    <el-radio-button value="biweekly">每两周</el-radio-button>
                </el-radio-group>
                <el-tooltip content="每天：拖入日历后从当天起，每天该时段都排课，直到本月底。每周/每两周：拖入日历后从当天起，每隔一周该时段都排课，直到本月末。" placement="top">
                    <el-icon class="tip-icon" style="margin-left: 8px"><QuestionFilled /></el-icon>
                </el-tooltip>
            </el-form-item>

            <!-- 家教：上课地点（自由填写）；其他类型：上课机构（下拉 + 快捷新增） -->
            <el-row v-if="form.courseType === '家教'" :gutter="12">
                <el-col :span="24">
                    <el-form-item label="上课地点">
                        <el-input v-model="form.location" placeholder="输入上课地点，如学生家、图书馆" />
                    </el-form-item>
                </el-col>
            </el-row>
            <template v-else>
                <el-form-item label="上课机构">
                    <div class="org-select-wrap">
                        <el-select v-model="form.organizationId" clearable filterable placeholder="选择机构" class="org-select" style="width: 280px">
                            <el-option v-for="o in metaStore.organizations" :key="o.id" :label="o.name" :value="o.id" />
                        </el-select>
                        <el-tooltip content="新增机构" placement="top">
                            <el-button size="small" class="org-add-btn" :icon="CirclePlus" circle @click="openOrgDialog" />
                        </el-tooltip>
                    </div>
                </el-form-item>
            </template>

            <el-form-item label="备注">
                <el-input v-model="form.note" type="textarea" :rows="2" placeholder="备注" />
            </el-form-item>
        </el-form>

        <template #footer>
            <el-button @click="$emit('update:visible', false)">取消</el-button>
            <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
        </template>

        <!-- 快捷新增机构（与机构管理的新增弹窗一致） -->
        <OrganizationFormDialog v-model:visible="orgDialogVisible" ref="orgDialogRef" @saved="onOrgSaved" />
    </el-dialog>
</template>

<script setup>
    import { computed, reactive, ref, watch } from "vue"
    import { ElMessage, ElMessageBox } from "element-plus"
    import { QuestionFilled, CirclePlus } from "@element-plus/icons-vue"
    import { studentCreate, studentUpdate } from "@/api/student"
    import { organizationList } from "@/api/organization"
    import { authProfile } from "@/api/auth"
    import { settingList } from "@/api/setting"
    import { useAuthStore } from "@/store/auth"
    import { useMetaStore } from "@/store/meta"
    import OrganizationFormDialog from "@/views/organizations/components/OrganizationFormDialog.vue"

    const props = defineProps({
        visible: Boolean,
    })
    const emit = defineEmits(["update:visible", "saved"])

    const metaStore = useMetaStore()
    const authStore = useAuthStore()
    const formRef = ref()
    const saving = ref(false)
    const defaultDuration = ref(120)
    const defaultFee = ref(300)

    /* 机构快捷新增弹窗 */
    const orgDialogVisible = ref(false)
    const orgDialogRef = ref()

    /* 加载系统设置的默认课程时长和默认课时费 */
    async function loadSettings() {
        try {
            const map = await settingList()
            defaultDuration.value = Number(map.defaultDuration || 120)
            defaultFee.value = Number(map.defaultFee || 300)
        } catch (e) {
            /* 使用默认值 */
        }
    }

    /* 科目选项 = 当前用户（老师）的任教学科；未维护时为空并提示去个人中心设置 */
    const subjectOptions = computed(() => {
        const s = authStore.user?.subjects
        return s ? s.split(",").filter(Boolean) : []
    })

    const defaults = () => ({
        id: null,
        title: "",
        studentName: "",
        organizationId: null,
        stage: "高一",
        subject: subjectOptions.value[0] || "",
        courseType: "一对一",
        durationMinutes: defaultDuration.value,
        fee: defaultFee.value,
        location: "",
        note: "",
        repeatType: "",
    })

    const form = reactive(defaults())

    const rules = {
        studentName: [{ required: true, message: "请输入学生姓名", trigger: "blur" }],
        subject: [{ required: true, message: "请选择科目", trigger: "change" }],
        stage: [{ required: true, message: "请选择学段", trigger: "change" }],
        courseType: [{ required: true, message: "请选择课程类型", trigger: "change" }],
        durationMinutes: [{ required: true, message: "请填写默认时长", trigger: "change" }],
        fee: [{ required: true, message: "请输入课时费", trigger: "blur" }],
    }

    /* 打开弹窗时兜底拉一次任教学科（authStore.user 是登录响应，不含 subjects） */
    watch(
        () => props.visible,
        async v => {
            if (!v) return
            /* 每次打开都重新拉取默认时长和课时费，保证设置修改后生效 */
            await loadSettings()
            if (authStore.user?.subjects == null) {
                try {
                    const user = await authProfile()
                    authStore.setUser({ ...authStore.user, ...user })
                } catch (e) {
                    /* 忽略，下拉为空时已有提示 */
                }
            }
            if (!form.id) resetForm()
        },
    )

    /* 课程类型切换：家教 ↔ 其他类型时清理互斥字段，避免提交脏数据 */
    function onCourseTypeChange(type) {
        if (type === "家教") {
            form.organizationId = null
        } else {
            form.location = ""
        }
    }

    /* 弹窗完全关闭后重置表单与验证状态，避免下次打开残留上次输入和错误提示 */
    function onClosed() {
        resetForm()
        formRef.value?.clearValidate()
    }

    function resetForm() {
        Object.assign(form, defaults())
    }

    async function submit() {
        await formRef.value.validate()
        saving.value = true
        try {
            /* 学生标题：学生姓名 + 科目 + 课程类型（如「张三数学一对一」） */
            const title = [form.studentName, form.subject, form.courseType].filter(Boolean).join("") || "学生"
            const payload = {
                title,
                studentName: form.studentName,
                organizationId: form.courseType === "家教" ? null : (form.organizationId || null),
                subject: form.subject || null,
                stage: form.stage || null,
                courseType: form.courseType || null,
                durationMinutes: form.durationMinutes,
                fee: form.fee ?? null,
                location: form.courseType === "家教" ? (form.location || null) : null,
                note: form.note || null,
                repeatType: form.repeatType || null,
            }
            if (form.id) {
                // 编辑学生：询问是否同步到该学生已排出的课程
                let syncCourses = false
                try {
                    await ElMessageBox.confirm(
                        '是否将本次修改同步到该学生已排出的课程？\n\n同步后，已排课程的学生、机构、科目、学段、课程类型、地点与备注将一并更新（不改变课程时间）。',
                        '同步课程',
                        { type: 'info', confirmButtonText: '同步到已排课程', cancelButtonText: '仅修改学生' }
                    )
                    syncCourses = true
                } catch (e) {
                    syncCourses = false
                }
                await studentUpdate(form.id, { ...payload, syncCourses })
                ElMessage.success(syncCourses ? '保存成功，已同步到已排课程' : '保存成功')
            } else {
                await studentCreate(payload)
                ElMessage.success('保存成功')
            }
            emit("update:visible", false)
            emit("saved")
        } catch (e) {
            /* 业务错误（如该学生已存在）由拦截器提示 */
        } finally {
            saving.value = false
        }
    }

    function openForEdit(tpl) {
        Object.assign(form, {
            id: tpl.id,
            title: tpl.title,
            studentName: tpl.studentName || "",
            organizationId: tpl.organizationId ?? null,
            stage: tpl.stage || "高一",
            subject: tpl.subject || "",
            courseType: tpl.courseType || "一对一",
            durationMinutes: tpl.durationMinutes ?? defaultDuration.value,
            fee: tpl.fee != null ? Number(tpl.fee) : defaultFee.value,
            location: tpl.location || "",
            note: tpl.note || "",
            repeatType: tpl.repeatType || "",
        })
    }

    /* ============ 机构快捷新增 ============ */
    function openOrgDialog() {
        orgDialogVisible.value = true
        orgDialogRef.value?.openForEdit(null)
    }

    /* 新增机构成功后：刷新机构缓存并自动选中新建的机构 */
    async function onOrgSaved() {
        try {
            const list = await organizationList()
            metaStore.setOrganizations(list)
            const latest = list?.[list.length - 1]
            if (latest?.id) form.organizationId = latest.id
        } catch (e) {
            /* 忽略：列表页保存后会自行刷新 */
        }
    }

    defineExpose({ openForEdit })
</script>

<style lang="scss" scoped>
    .tip-icon {
        color: var(--color-muted);
        font-size: 16px;
        cursor: help;
        flex-shrink: 0;
        transition: color 0.15s ease;
        vertical-align: middle;

        &:hover {
            color: var(--color-primary);
        }
    }
    .input-with-tip {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;

        .el-input {
            flex: 1;
        }
    }

    /* 机构选择区：下拉 + 新增按钮 */
    .org-select-wrap {
        display: flex;
        align-items: center;
        gap: 8px;

        .org-select {
            flex-shrink: 0;
        }
        .org-add-btn {
            flex-shrink: 0;
        }
    }
</style>
