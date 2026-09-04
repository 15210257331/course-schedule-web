import request from '@/utils/request'

/** 导出数据（后端返回 JSON 附件 blob 下载） */
export const backupExportData = () => request.post('/backup/export', null, { responseType: 'blob' })

/** 导入数据（全量替换当前用户数据） */
export const backupImportData = (data) => request.post('/backup/import', data)
