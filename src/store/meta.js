import { defineStore } from 'pinia'

/**
 * 基础数据缓存：机构 / 学生 / 收费规则，供课程表与各类表单下拉使用。
 * 数据来源优先 IndexedDB 快照，其次接口。
 */
export const useMetaStore = defineStore('meta', {
  state: () => ({
    organizations: [],
    students: [],
    salaryRules: [],
    loaded: false
  }),
  getters: {
    orgMap: (state) => Object.fromEntries(state.organizations.map((o) => [o.id, o])),
    studentMap: (state) => Object.fromEntries(state.students.map((s) => [s.id, s]))
  },
  actions: {
    setSnapshot(data) {
      if (data.organizations) this.organizations = data.organizations
      if (data.students) this.students = data.students
      if (data.salaryRules) this.salaryRules = data.salaryRules
      this.loaded = true
    }
  }
})