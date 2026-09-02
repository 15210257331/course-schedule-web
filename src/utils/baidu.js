/* 百度地图 JS API 已完成同步加载（见 index.html 的 <script src="...ak=%VITE_BAIDU_AK%">）。
 * 这里只负责等待 window.BMap 就绪，供地图相关组件在需要时 await。
 * 注意：不能在此处用运行时动态注入 <script> 的方式加载 —— 百度的 api 脚本内部依赖
 * document.write 引入真正的 BMap 脚本，动态注入会因 document.write 被忽略而导致
 * window.BMap 永远未定义。
 */

let readyPromise = null

function isReady() {
  return !!(window.BMap && window.BMap.Map)
}

/* 轮询等待全局 BMap 就绪（同步 script 一般很快，此处仅作兜底） */
export function loadBMap() {
  if (isReady()) return Promise.resolve(window.BMap)
  if (!readyPromise) {
    readyPromise = new Promise((resolve, reject) => {
      let waited = 0
      const timer = setInterval(() => {
        if (isReady()) {
          clearInterval(timer)
          resolve(window.BMap)
        } else if (++waited > 60) {
          clearInterval(timer)
          readyPromise = null
          reject(new Error('百度地图未就绪：请确认 AK 有效、Referer 白名单已配置，且网络可达 api.map.baidu.com'))
        }
      }, 100)
    })
  }
  return readyPromise
}