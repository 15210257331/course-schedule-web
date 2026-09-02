/**
 * IndexedDB 本地缓存封装：按资源分别缓存业务数据，实现「首次拉取，之后本地极速加载」。
 * 资源拆分：courses（按时间范围）/ organizations / courseTemplates 独立存取。
 *
 * 当前已通过全局设置控制开关：所有 load* 优先走本地缓存，过期或缺失时回源接口。
 * 开关由 localCacheEnabled() 读取 localStorage 的 'teac_idb_cache'（默认开启），可在系统设置中切换。
 */
const DB_NAME = 'teac_os'
const DB_VERSION = 2
const STORE = 'resources'
const CACHE_TTL = 5 * 60 * 1000
const CACHE_KEY = 'teac_idb_cache'

/** 本地缓存开关：默认开启，可在系统设置中关闭 */
export function localCacheEnabled() {
  try {
    return localStorage.getItem(CACHE_KEY) !== 'false'
  } catch (e) {
    return true
  }
}

export function setLocalCacheEnabled(enabled) {
  try {
    localStorage.setItem(CACHE_KEY, enabled ? 'true' : 'false')
  } catch (e) {
    /* ignore */
  }
}

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      // 版本升级：清掉旧的整包快照 store，建立按资源存取的新 store
      if (db.objectStoreNames.contains('snapshots')) {
        db.deleteObjectStore('snapshots')
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function isFresh(record) {
  return record && record.cachedAt && Date.now() - new Date(record.cachedAt).getTime() < CACHE_TTL
}

export const idb = {
  async save(key, data) {
    if (!localCacheEnabled()) return false
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ data, cachedAt: new Date().toISOString() }, key)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  },
  async load(key) {
    if (!localCacheEnabled()) return null
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => {
        const record = req.result || null
        resolve(isFresh(record) ? record.data : null)
      }
      req.onerror = () => reject(req.error)
    })
  },
  async clear(key) {
    if (!localCacheEnabled()) return false
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      if (key) tx.objectStore(STORE).delete(key)
      else tx.objectStore(STORE).clear()
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  }
}

/* ---------- 按资源加载：优先本地缓存（已禁用，直接走接口），过期或缺失时走对应接口 ---------- */

/** 课程：按时间范围拉取（可带标题关键字过滤） */
export async function loadCourses(start, end, title, force = false) {
  // 缓存 key 带上范围与关键字，避免切换周/月读错数据（缓存当前整体禁用）
  const key = ['courses', start, end, title || ''].join('|')
  if (!force) {
    const cached = await idb.load(key)
    if (cached) return cached
  }
  const { courseApi } = await import('@/api/course')
  const fresh = await courseApi.list(start, end, title)
  await idb.save(key, fresh)
  return fresh
}

/** 机构列表 */
export async function loadOrganizations(force = false) {
  const key = 'organizations'
  if (!force) {
    const cached = await idb.load(key)
    if (cached) return cached
  }
  const { organizationApi } = await import('@/api/organization')
  const fresh = await organizationApi.list()
  await idb.save(key, fresh)
  return fresh
}

/** 课程模板列表 */
export async function loadCourseTemplates(force = false) {
  const key = 'courseTemplates'
  if (!force) {
    const cached = await idb.load(key)
    if (cached) return cached
  }
  const { templateApi } = await import('@/api/courseTemplate')
  const fresh = await templateApi.list()
  await idb.save(key, fresh)
  return fresh
}
