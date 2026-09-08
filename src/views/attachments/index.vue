<template>
  <div class="page-container attachments-page">
    <div class="page-head flex-between">
      <div class="head-left">
        <h2 class="page-title">附件管理</h2>
        <span class="page-sub text-muted">按分组归类资源 · 单文件不超过 20MB</span>
      </div>
      <div class="head-actions">
        <el-button type="primary" :icon="FolderAdd" @click="createGroup">新增分组</el-button>
      </div>
    </div>

    <div v-loading="loading" class="groups">
      <!-- 分组：每组独立上传，分组右上「···」展开编辑/删除 -->
      <section v-for="g in groups" :key="g.id" class="group">
        <div class="group-head">
          <div class="group-title">
            <span class="group-icon"><el-icon><Folder /></el-icon></span>
            <span class="group-name">{{ g.name }}</span>
            <span class="group-count">{{ countOf(g.id) }}</span>
          </div>
          <div class="group-actions">
            <el-upload
              :show-file-list="false"
              :http-request="(opt) => doUpload(opt, g.id)"
              :before-upload="beforeUpload"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            >
              <el-button size="small" type="primary" plain :icon="Upload" :loading="uploadingId === g.id">上传</el-button>
            </el-upload>
            <el-button size="small" plain :icon="Edit" @click="renameGroup(g)">编辑</el-button>
            <el-button size="small" plain type="danger" :icon="Delete" @click="removeGroup(g)">删除</el-button>
          </div>
        </div>

        <div v-if="itemsOf(g.id).length" class="att-grid">
          <div v-for="a in itemsOf(g.id)" :key="a.id" class="att-card">
            <div
              class="att-thumb"
              :class="`is-${fileType(a)}`"
              @click="isPreviewable(a) && previewAttachment(a)"
            >
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
                <el-dropdown trigger="click" @command="(cmd) => onMove(cmd, a)">
                  <el-tooltip content="移动到分组" placement="top">
                    <el-icon class="att-op"><MoreFilled /></el-icon>
                  </el-tooltip>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="tg in groups.filter(x => x.id !== a.groupId)"
                        :key="tg.id"
                        :command="{ id: a.id, groupId: tg.id }"
                      >{{ tg.name }}</el-dropdown-item>
                      <el-dropdown-item v-if="a.groupId != null" divided :command="{ id: a.id, groupId: null }">移出分组</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-tooltip content="删除" placement="top">
                  <el-icon class="att-op danger" @click="removeAttachment(a)"><Delete /></el-icon>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="group-empty">该分组还没有附件，点击右上角「上传」添加</div>
      </section>

      <!-- 未分组附件（历史模板附件等） -->
      <section v-if="ungrouped.length" class="group is-ungrouped">
        <div class="group-head">
          <div class="group-title">
            <span class="group-icon muted"><el-icon><Files /></el-icon></span>
            <span class="group-name">未分组</span>
            <span class="group-count">{{ ungrouped.length }}</span>
          </div>
          <div class="group-actions">
            <el-upload
              :show-file-list="false"
              :http-request="(opt) => doUpload(opt, null)"
              :before-upload="beforeUpload"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            >
              <el-button size="small" type="primary" plain :icon="Upload" :loading="uploadingId === 'ungrouped'">上传</el-button>
            </el-upload>
          </div>
        </div>
        <div class="att-grid">
          <div v-for="a in ungrouped" :key="a.id" class="att-card">
            <div
              class="att-thumb"
              :class="`is-${fileType(a)}`"
              @click="isPreviewable(a) && previewAttachment(a)"
            >
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
                <el-dropdown trigger="click" @command="(cmd) => onMove(cmd, a)">
                  <el-tooltip content="移动到分组" placement="top">
                    <el-icon class="att-op"><MoreFilled /></el-icon>
                  </el-tooltip>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="tg in groups"
                        :key="tg.id"
                        :command="{ id: a.id, groupId: tg.id }"
                      >{{ tg.name }}</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-tooltip content="删除" placement="top">
                  <el-icon class="att-op danger" @click="removeAttachment(a)"><Delete /></el-icon>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="!loading && !groups.length && !ungrouped.length" class="empty-state">
        <el-icon class="empty-icon"><FolderOpened /></el-icon>
        <p>还没有附件，点击右上角「新增分组」创建分组，再在分组内上传课件 / 作业 / 讲义等资源</p>
      </div>
    </div>

    <el-image-viewer v-if="viewerVisible" teleported :url-list="viewerUrl ? [viewerUrl] : []" @close="viewerVisible = false" />
  </div>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    Upload, View, Download, Delete, ZoomIn, FolderOpened, Folder, FolderAdd, Files, Edit, MoreFilled
  } from '@element-plus/icons-vue'
  import {
    attachmentListAll, attachmentUpload, attachmentDownload, attachmentRemove, attachmentMoveGroup,
    attachmentGroupList, attachmentGroupCreate, attachmentGroupUpdate, attachmentGroupRemove
  } from '@/api/attachment'

  const attachments = ref([])
  const groups = ref([])
  const loading = ref(false)
  const uploadingId = ref(null)
  const viewerVisible = ref(false)
  const viewerUrl = ref('')

  const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

  const ungrouped = computed(() => attachments.value.filter(a => a.groupId == null))

  function itemsOf(groupId) {
    return attachments.value.filter(a => a.groupId === groupId)
  }
  function countOf(groupId) {
    return itemsOf(groupId).length
  }

  function extOf(a) {
    return (a.fileName || '').split('.').pop().toLowerCase()
  }
  function isImage(a) {
    return IMAGE_EXTS.includes(extOf(a))
  }
  function isPdf(a) {
    return extOf(a) === 'pdf'
  }
  function isPreviewable(a) {
    return isImage(a) || isPdf(a)
  }
  function fileType(a) {
    const ext = extOf(a)
    if (IMAGE_EXTS.includes(ext)) return 'image'
    if (ext === 'pdf') return 'pdf'
    if (ext === 'doc' || ext === 'docx') return 'word'
    if (ext === 'xls' || ext === 'xlsx') return 'excel'
    if (ext === 'ppt' || ext === 'pptx') return 'ppt'
    if (ext === 'txt') return 'txt'
    if (ext === 'zip') return 'zip'
    return 'file'
  }
  function extLabel(a) {
    const ext = extOf(a)
    if (!ext) return 'FILE'
    return ext.length <= 4 ? ext.toUpperCase() : ext.slice(0, 4).toUpperCase()
  }
  function fileTypeLabel(a) {
    const ext = extOf(a)
    if (IMAGE_EXTS.includes(ext)) return '图片'
    if (ext === 'pdf') return 'PDF'
    if (ext === 'doc' || ext === 'docx') return 'Word'
    if (ext === 'xls' || ext === 'xlsx') return 'Excel'
    if (ext === 'ppt' || ext === 'pptx') return 'PPT'
    if (ext === 'txt') return '文本'
    if (ext === 'zip') return '压缩包'
    return '文件'
  }

  async function load() {
    loading.value = true
    try {
      const [g, a] = await Promise.all([attachmentGroupList(), attachmentListAll()])
      groups.value = g || []
      attachments.value = a || []
    } catch (e) {
      /* 错误由拦截器提示 */
    } finally {
      loading.value = false
    }
  }

  async function createGroup() {
    let name
    try {
      const { value } = await ElMessageBox.prompt('请输入分组名称', '新增分组', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '分组名称不能为空'
      })
      name = value.trim()
    } catch (e) {
      return
    }
    try {
      await attachmentGroupCreate(name)
      ElMessage.success('分组已创建')
      load()
    } catch (e) {
      /* 错误由拦截器提示 */
    }
  }

  async function renameGroup(g) {
    let name
    try {
      const { value } = await ElMessageBox.prompt('修改分组名称', '重命名分组', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: g.name,
        inputPattern: /\S+/,
        inputErrorMessage: '分组名称不能为空'
      })
      name = value.trim()
    } catch (e) {
      return
    }
    try {
      await attachmentGroupUpdate(g.id, name)
      ElMessage.success('已保存')
      load()
    } catch (e) {
      /* 错误由拦截器提示 */
    }
  }

  async function removeGroup(g) {
    try {
      await ElMessageBox.confirm(
        `确定删除分组「${g.name}」吗？该分组下的 ${countOf(g.id)} 个附件将一并删除。`,
        '删除分组',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
      )
    } catch (e) {
      return
    }
    try {
      await attachmentGroupRemove(g.id)
      ElMessage.success('分组已删除')
      load()
    } catch (e) {
      /* 错误由拦截器提示 */
    }
  }

  function beforeUpload(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip']
    if (!allowed.includes(ext)) {
      ElMessage.error(`「${file.name}」类型不支持`)
      return false
    }
    if (file.size > 20 * 1024 * 1024) {
      ElMessage.error('文件大小不能超过 20MB')
      return false
    }
    return true
  }

  async function doUpload({ file }, groupId) {
    const key = groupId == null ? 'ungrouped' : groupId
    uploadingId.value = key
    try {
      await attachmentUpload(file, { groupId })
      ElMessage.success(`「${file.name}」上传成功`)
      load()
    } catch (e) {
      /* 错误由拦截器提示 */
    } finally {
      uploadingId.value = null
    }
  }

  async function onMove(cmd, a) {
    const { id, groupId } = cmd
    try {
      await attachmentMoveGroup(id, groupId)
      ElMessage.success('已移动')
      load()
    } catch (e) {
      /* 错误由拦截器提示 */
    }
  }

  async function downloadAttachment(a) {
    try {
      const blob = await attachmentDownload(a.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = a.fileName || 'attachment'
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      /* 错误由拦截器提示 */
    }
  }

  async function removeAttachment(a) {
    try {
      await ElMessageBox.confirm(`确定删除附件「${a.fileName}」吗？`, '删除附件', { type: 'warning' })
    } catch (e) {
      return
    }
    try {
      await attachmentRemove(a.id)
      ElMessage.success('已删除')
      load()
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
      const win = window.open('', '_blank')
      attachmentDownload(a.id)
        .then(blob => {
          const url = URL.createObjectURL(blob)
          if (win) win.location.href = url
          setTimeout(() => URL.revokeObjectURL(url), 60000)
        })
        .catch(() => { if (win) win.close() })
    }
  }

  function formatSize(bytes) {
    if (bytes == null) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  onMounted(load)
</script>

<style lang="scss" scoped>
  .page-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-ink);
  }
  .page-head {
    margin-bottom: 20px;
  }
  .head-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .page-sub {
    font-size: 12px;
  }

  .groups {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .group {
    .group-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .group-title {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .group-icon {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      color: var(--color-primary);
      background: var(--el-color-primary-light-9);
      &.muted {
        color: var(--color-muted);
        background: var(--color-surface);
      }
    }
    .group-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-ink);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .group-count {
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      padding: 2px 7px;
      border-radius: 999px;
      color: var(--color-muted);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      font-variant-numeric: tabular-nums;
    }
    .group-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .group-empty {
      padding: 24px 0;
      text-align: center;
      font-size: 12px;
      color: var(--color-muted);
      border: 1px dashed var(--color-border);
      border-radius: 10px;
    }
  }

  .att-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .att-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--color-canvas);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    &:hover {
      border-color: var(--color-primary);
      box-shadow: 0 6px 16px rgba(99, 91, 255, 0.12);
      transform: translateY(-1px);
    }
  }

  .att-thumb {
    position: relative;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 9px;
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
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .att-zoom {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
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
    gap: 3px;
  }
  .att-name {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
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
    padding: 0 5px;
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
    gap: 4px;
    margin-top: 2px;
    .att-op {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      font-size: 15px;
      line-height: 1;
      color: var(--color-muted);
      cursor: pointer;
      border-radius: 7px;
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

  .empty-state {
    padding: 60px 0;
    text-align: center;
    color: var(--color-muted);
    .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
      color: var(--color-border);
    }
    p {
      margin: 0;
      font-size: 13px;
    }
  }
</style>