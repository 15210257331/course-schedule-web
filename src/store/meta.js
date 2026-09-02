import { defineStore } from 'pinia'

/**
 * 基础数据缓存：机构 / 课程模板，供课程表与各类表单下拉使用。
 * 数据来源优先 IndexedDB 按资源缓存，其次对应接口。
 */
export const useMetaStore = defineStore('meta', {
  state: () => ({
    organizations: [],
    courseTemplates: [],
    loaded: false
  }),
  getters: {
    orgMap: (state) => Object.fromEntries(state.organizations.map((o) => [o.id, o]))
  },
  actions: {
    setOrganizations(list) {
      this.organizations = list || []
    },
    setCourseTemplates(list) {
      this.courseTemplates = list || []
    }
  }
})
