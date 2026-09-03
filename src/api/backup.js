import request from '@/utils/request'

export const backupApi = {
  // 导出：后端返回 JSON 附件（blob 下载）
  exportData: () => request.post('/backup/export', null, { responseType: 'blob' }),
  // 导入：全量替换当前用户数据
  importData: (data) => request.post('/backup/import', data)
}