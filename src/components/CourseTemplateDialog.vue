<template>
    <el-dialog :model-value="visible" :title="form.id ? '编辑模板' : '新建模板'" width="680px" @update:model-value="$emit('update:visible', $event)" @closed="onClosed">
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

            <el-row :gutter="12">
                <el-col :span="12">
                    <el-form-item label="上课机构">
                        <el-select v-model="form.organizationId" clearable filterable placeholder="选择机构" style="width: 100%">
                            <el-option v-for="o in metaStore.organizations" :key="o.id" :label="o.name" :value="o.id" />
                        </el-select>
                    </el-form-item>
                </el-col>
                <el-col :span="12"> </el-col>
            </el-row>

            <el-form-item label="上课地点">
                <el-input v-model="form.location" placeholder="选择机构后自动带入地址，可自由修改" />
            </el-form-item>
            <el-form-item label="备注">
                <el-input v-model="form.note" type="textarea" :rows="2" placeholder="备注" />
            </el-form-item>

            <!-- 附件：挂在模板（学生）下，新建时提示先保存模板，编辑时可上传/管理 -->
            <el-form-item label="附件">
                <div v-if="!form.id" class="att-hint">保存模板后可上传课件 / 作业 / 讲义等附件</div>
                <div v-else class="att-section">
                    <el-upload
                        class="att-upload"
                        :show-file-list="false"
                        :http-request="onUpload"
                        :before-upload="beforeUpload"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                    >
                        <div class="att-upload-card" :class="{ 'is-loading': uploading }">
                            <el-icon class="att-upload-plus"><Plus /></el-icon>
                            <span class="att-upload-text">{{ uploading ? '上传中' : '上传文件' }}</span>
                        </div>
                    </el-upload>
                    <div v-if="attachments.length" class="att-list">
                        <div v-for="a in attachments" :key="a.id" class="att-card">
                            <div class="att-thumb" :class="`is-${fileType(a)}`" @click="isPreviewable(a) && previewAttachment(a)">
                                <img v-if="isImage(a)" :src="a.filePath" alt="" loading="lazy" />
                                <span v-else class="att-ext">{{ extLabel(a) }}</span>
                                <span v-if="isPreviewable(a)" class="att-zoom"><el-icon><ZoomIn /></el-icon></span>
                            </div>
                            <div class="att-body">
                                <div class="att-name" :title="a.fileName">{{ a.fileName }}</div>
                                <div class="att-meta">
                                    <span class="att-tag" :class="`is-${fileType(a)}`">{{ fileTypeLabel(a) }}</span>
                                    <span class="att-size">{{ formatSize(a.fileSize) }}</span>
                                </div>
                                <div class="att-ops">
                                    <el-tooltip v-if="isPreviewable(a)" content="预览" placement="top">
                                        <el-icon class="att-op" @click="previewAttachment(a)"><View /></el-icon>
                                    </el-tooltip>
                                    <el-tooltip content="下载" placement="top">
                                        <el-icon class="att-op" @click="downloadAttachment(a)"><Download /></el-icon>
                                    </el-tooltip>
                                    <el-tooltip content="删除" placement="top">
                                        <el-icon class="att-op danger" @click="removeAttachment(a)"><Delete /></el-icon>
                                    </el-tooltip>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="att-empty">还没有附件</div>
                </div>
            </el-form-item>
        </el-form>

        <template #footer>
            <el-button @click="$emit('update:visible', false)">取消</el-button>
            <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
        </template>

        <el-image-viewer v-if="viewerVisible" teleported :url-list="viewerUrl ? [viewerUrl] : []" @close="viewerVisible = false" />
    </el-dialog>
</template>

<script setup>
    import { computed, reactive, ref, watch } from "vue"
    import { ElMessage, ElMessageBox } from "element-plus"
    import { QuestionFilled, Plus, View, Download, Delete, ZoomIn } from "@element-plus/icons-vue"
    import { templateCreate, templateUpdate } from "@/api/courseTemplate"
    import { attachmentList, attachmentUpload, attachmentDownload, attachmentRemove } from "@/api/attachment"
    import { authProfile } from "@/api/auth"
    import { settingList } from "@/api/setting"
    import { useAuthStore } from "@/store/auth"
    import { useMetaStore } from "@/store/meta"

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

    /* 附件相关状态 */
    const attachments = ref([])
    const uploading = ref(false)
    const viewerVisible = ref(false)
    const viewerUrl = ref("")

    const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp"]

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

    /* 选中机构时把机构地址带入上课地点（可自由修改） */
    function orgAddress(orgId) {
        const org = orgId != null ? metaStore.orgMap[orgId] : null
        return org?.address || ""
    }

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

    /* 机构变化时：把机构地址带入上课地点（用户已手动改过的不覆盖） */
    watch(
        () => form.organizationId,
        (orgId, prevId) => {
            if (!form.location || form.location === orgAddress(prevId)) {
                form.location = orgAddress(orgId)
            }
        },
    )

    /* 弹窗完全关闭后重置表单与验证状态，避免下次打开残留上次输入和错误提示 */
    function onClosed() {
        resetForm()
        formRef.value?.clearValidate()
        attachments.value = []
    }

    function resetForm() {
        Object.assign(form, defaults())
    }

    async function submit() {
        await formRef.value.validate()
        saving.value = true
        try {
            /* 新输入的学生姓名：先建档（机构与模板保持一致） */
            /* 模板标题：学生姓名 + 科目 + 课程类型（如「张三数学一对一」） */
            const title = [form.studentName, form.subject, form.courseType].filter(Boolean).join("") || "课程模板"
            const payload = {
                title,
                studentName: form.studentName,
                organizationId: form.organizationId || null,
                subject: form.subject || null,
                stage: form.stage || null,
                courseType: form.courseType || null,
                durationMinutes: form.durationMinutes,
                fee: form.fee ?? null,
                location: form.location || null,
                note: form.note || null,
                repeatType: form.repeatType || null,
            }
            if (form.id) {
                // 编辑模板：询问是否同步到该模板已排出的课程
                let syncCourses = false
                try {
                    await ElMessageBox.confirm(
                        '是否将本次修改同步到该模板已排出的课程？\n\n同步后，已排课程的学生、机构、科目、学段、课程类型、地点与备注将一并更新（不改变课程时间）。',
                        '同步课程',
                        { type: 'info', confirmButtonText: '同步到已排课程', cancelButtonText: '仅修改模板' }
                    )
                    syncCourses = true
                } catch (e) {
                    syncCourses = false
                }
                await templateUpdate(form.id, { ...payload, syncCourses })
                ElMessage.success(syncCourses ? '保存成功，已同步到已排课程' : '保存成功')
            } else {
                await templateCreate(payload)
                ElMessage.success('保存成功')
            }
            emit("update:visible", false)
            emit("saved")
        } catch (e) {
            /* 业务错误（如学生已有模板）由拦截器提示 */
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
        // 编辑模板时加载其已有附件
        loadAttachments(tpl.id)
    }

    /* ============ 附件：类型判定 + 上传 / 预览 / 下载 / 删除 ============ */
    function extOf(a) {
        return (a.fileName || "").split(".").pop().toLowerCase()
    }
    function isImage(a) {
        return IMAGE_EXTS.includes(extOf(a))
    }
    function isPdf(a) {
        return extOf(a) === "pdf"
    }
    function isPreviewable(a) {
        return isImage(a) || isPdf(a)
    }
    function fileType(a) {
        const ext = extOf(a)
        if (IMAGE_EXTS.includes(ext)) return "image"
        if (ext === "pdf") return "pdf"
        if (ext === "doc" || ext === "docx") return "word"
        if (ext === "xls" || ext === "xlsx") return "excel"
        if (ext === "ppt" || ext === "pptx") return "ppt"
        if (ext === "txt") return "txt"
        if (ext === "zip") return "zip"
        return "file"
    }
    function extLabel(a) {
        const ext = extOf(a)
        if (!ext) return "FILE"
        return ext.length <= 4 ? ext.toUpperCase() : ext.slice(0, 4).toUpperCase()
    }
    function fileTypeLabel(a) {
        const ext = extOf(a)
        if (IMAGE_EXTS.includes(ext)) return "图片"
        if (ext === "pdf") return "PDF"
        if (ext === "doc" || ext === "docx") return "Word"
        if (ext === "xls" || ext === "xlsx") return "Excel"
        if (ext === "ppt" || ext === "pptx") return "PPT"
        if (ext === "txt") return "文本"
        if (ext === "zip") return "压缩包"
        return "文件"
    }
    function formatSize(bytes) {
        if (bytes == null) return ""
        if (bytes < 1024) return bytes + " B"
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
        return (bytes / 1024 / 1024).toFixed(1) + " MB"
    }

    async function loadAttachments(templateId) {
        try {
            attachments.value = (await attachmentList(templateId)) || []
        } catch (e) {
            attachments.value = []
        }
    }

    function beforeUpload(file) {
        const ext = (file.name.split(".").pop() || "").toLowerCase()
        const allowed = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip"]
        if (!allowed.includes(ext)) {
            ElMessage.error(`「${file.name}」类型不支持`)
            return false
        }
        if (file.size > 20 * 1024 * 1024) {
            ElMessage.error("文件大小不能超过 20MB")
            return false
        }
        return true
    }

    async function onUpload({ file }) {
        uploading.value = true
        try {
            const a = await attachmentUpload(file, form.id)
            attachments.value.unshift(a)
            ElMessage.success(`「${file.name}」上传成功`)
        } catch (e) {
            /* 错误由拦截器提示 */
        } finally {
            uploading.value = false
        }
    }

    async function downloadAttachment(a) {
        try {
            const blob = await attachmentDownload(a.id)
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = a.fileName || "attachment"
            link.click()
            URL.revokeObjectURL(url)
        } catch (e) {
            /* 错误由拦截器提示 */
        }
    }

    async function removeAttachment(a) {
        try {
            await ElMessageBox.confirm(`确定删除附件「${a.fileName}」吗？`, "删除附件", { type: "warning" })
        } catch (e) {
            return
        }
        try {
            await attachmentRemove(a.id)
            attachments.value = attachments.value.filter(x => x.id !== a.id)
            ElMessage.success("已删除")
        } catch (e) {
            /* 错误由拦截器提示 */
        }
    }

    function previewAttachment(a) {
        if (isImage(a)) {
            viewerUrl.value = a.filePath
            viewerVisible.value = true
            return
        }
        if (isPdf(a)) {
            const win = window.open("", "_blank")
            attachmentDownload(a.id)
                .then(blob => {
                    const url = URL.createObjectURL(blob)
                    if (win) win.location.href = url
                    setTimeout(() => URL.revokeObjectURL(url), 60000)
                })
                .catch(() => { if (win) win.close() })
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
    .subjects-empty {
        padding: 8px 12px;
        font-size: 12px;
        color: var(--color-muted);
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

    /* 附件区 */
    .att-hint {
        font-size: 12px;
        color: var(--color-muted);
        padding: 6px 0;
    }
    .att-section {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .att-upload {
        width: 100%;
        :deep(.el-upload) {
            width: 100%;
            display: block;
        }
    }
    .att-upload-card {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px;
        border: 1.5px dashed var(--color-border);
        border-radius: 10px;
        color: var(--color-muted);
        cursor: pointer;
        background: var(--color-surface);
        transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
        .att-upload-plus {
            font-size: 22px;
            line-height: 1;
        }
        .att-upload-text {
            font-size: 12px;
            font-weight: 600;
        }
        &:hover {
            border-color: var(--color-primary);
            color: var(--color-primary);
            background: var(--el-color-primary-light-9);
        }
        &.is-loading {
            pointer-events: none;
            opacity: 0.6;
        }
    }
    .att-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 10px;
    }
    .att-empty {
        font-size: 12px;
        color: var(--color-muted);
        padding: 4px 0;
    }
    .att-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: var(--color-canvas);
        border: 1px solid var(--color-border);
        border-radius: 9px;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
        &:hover {
            border-color: var(--color-primary);
            box-shadow: 0 4px 12px rgba(99, 91, 255, 0.1);
        }
    }
    .att-thumb {
        position: relative;
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .att-ext {
            font-size: 10px;
            font-weight: 700;
        }
        .att-zoom {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: #fff;
            background: rgba(15, 23, 42, 0.4);
            opacity: 0;
            transition: opacity 0.15s ease;
        }
        &.is-image {
            cursor: zoom-in;
            border: 1px solid var(--color-border);
            &:hover .att-zoom {
                opacity: 1;
            }
        }
        &.is-pdf { background: #fdeaea; .att-ext { color: #d63031; } }
        &.is-word { background: #e8f0fe; .att-ext { color: #2b6cb0; } }
        &.is-excel { background: #e6f6e9; .att-ext { color: #1a9a4a; } }
        &.is-ppt { background: #fdf0e3; .att-ext { color: #e05a00; } }
        &.is-txt { background: #eef0f3; .att-ext { color: #5a6071; } }
        &.is-zip { background: #efedff; .att-ext { color: #635bff; } }
        &.is-file { background: #eef0f3; .att-ext { color: #5a6071; } }
    }
    .att-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .att-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-ink);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .att-meta {
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .att-tag {
        font-size: 9px;
        font-weight: 600;
        line-height: 1.5;
        padding: 0 4px;
        border-radius: 4px;
        white-space: nowrap;
        &.is-image { background: #e6f6e9; color: #1a9a4a; }
        &.is-pdf { background: #fdeaea; color: #d63031; }
        &.is-word { background: #e8f0fe; color: #2b6cb0; }
        &.is-excel { background: #e6f6e9; color: #1a9a4a; }
        &.is-ppt { background: #fdf0e3; color: #e05a00; }
        &.is-txt { background: #eef0f3; color: #5a6071; }
        &.is-zip { background: #efedff; color: #635bff; }
        &.is-file { background: #eef0f3; color: #5a6071; }
    }
    .att-size {
        font-size: 10px;
        color: var(--color-muted);
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }
    .att-ops {
        display: flex;
        align-items: center;
        gap: 3px;
        margin-top: 1px;
        .att-op {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            font-size: 14px;
            line-height: 1;
            color: var(--color-muted);
            cursor: pointer;
            border-radius: 6px;
            transition: color 0.15s ease, background 0.15s ease;
            &:hover {
                color: var(--color-primary);
                background: var(--el-color-primary-light-9);
            }
            &.danger:hover {
                color: var(--color-danger);
                background: var(--el-color-danger-light-9);
            }
        }
    }
</style>
