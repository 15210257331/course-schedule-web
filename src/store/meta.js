import { defineStore } from 'pinia'

/**
 * 基础数据缓存：机构 / 学生，供课程表与各类表单下拉使用。
 * 数据来源为对应接口（organizations / students）。
 */
export const useMetaStore = defineStore('meta', {
  state: () => ({
    organizations: [],
    students: [],
    loaded: false
  }),
  getters: {
    orgMap: (state) => Object.fromEntries(state.organizations.map((o) => [o.id, o]))
  },
  actions: {
    setOrganizations(list) {
      this.organizations = list || []
    },
    setStudents(list) {
      this.students = list || []
    }
  }
})
