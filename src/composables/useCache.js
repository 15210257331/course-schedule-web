import { ref } from 'vue'

/**
 * useCache：带 IndexedDB 缓存的数据加载组合式。
 *
 * 包装 idb.js 里已内置缓存的 load* 函数，额外暴露响应式状态：
 * - data：最近一次加载结果（响应式 ref）
 * - loading：是否正在加载
 * - load(...args)：走 loader（优先本地缓存，过期/缺失回源）
 * - refresh(...args)：强制回源（loader 的最后一个参数约定为 force）
 *
 * @template T
 * @param {(...args: any[]) => Promise<T>} loader idb.js 中形如 loadXxx(...) 的加载器
 * @param {T} [initial] data 的初始值（默认 null）
 * @returns {{ data: import('vue').Ref<T|null>, loading: import('vue').Ref<boolean>,
 *   load: (...args:any[]) => Promise<T>, refresh: (...args:any[]) => Promise<T> }}
 */
export function useCache(loader, initial = null) {
  const data = ref(initial)
  const loading = ref(false)

  async function load(...args) {
    loading.value = true
    try {
      const res = await loader(...args)
      data.value = res
      return res
    } finally {
      loading.value = false
    }
  }

  async function refresh(...args) {
    loading.value = true
    try {
      const res = await loader(...args, true)
      data.value = res
      return res
    } finally {
      loading.value = false
    }
  }

  return { data, loading, load, refresh }
}