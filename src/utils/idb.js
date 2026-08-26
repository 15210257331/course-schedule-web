/**
 * IndexedDB 本地缓存封装：存储业务快照，实现「首次拉取，之后本地极速加载」。ceslxiang 收待发送的发
 */
const DB_NAME = 'teac_os'
const DB_VERSION = 1
const STORE = 'snapshots'
const KEY = 'latest'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export const idb = {
  async save(data) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(data, KEY)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  },
  async load() {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  },
  async clear() {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(KEY)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  }
}

/**
 * 加载快照：优先本地缓存，命中率低或不存在时走接口刷新。
 */
const CACHE_TTL = 5 * 60 * 1000

export async function loadSnapshot(force = false) {
  const cached = force ? null : await idb.load()
  if (cached && cached.generatedAt && Date.now() - new Date(cached.generatedAt).getTime() < CACHE_TTL) {
    return cached
  }
  const { snapshotApi } = await import('@/api/setting')
  const fresh = await snapshotApi.get()
  await idb.save({ ...fresh, cachedAt: new Date().toISOString() })
  return fresh
}