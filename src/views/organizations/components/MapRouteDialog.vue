<template>
  <el-dialog v-model="visible" :title="`路线：当前位置 → ${address}`" width="720px" top="6vh" @opened="initMap" @closed="destroyMap">
    <div class="map-toolbar">
      <el-button size="small" :type="pickMode ? 'primary' : 'default'" @click="togglePick">
        <el-icon><Aim /></el-icon>
        {{ pickMode ? '点选模式已开启' : '地图选点回填地址' }}
      </el-button>
      <span v-if="pickMode" class="pick-tip">在地图上点击一个位置，地址会自动回填到表单</span>
    </div>
    <div class="map-body">
      <div ref="mapEl" class="map-container" />
      <div v-if="locating" class="map-status">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在定位并规划路线…（需允许浏览器获取位置，且页面需为 HTTPS 或 localhost）</span>
      </div>
      <div v-if="error" class="map-status error">{{ error }}</div>
    </div>
    <template #footer>
      <el-button type="primary" @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { Aim, Loading } from '@element-plus/icons-vue'
import { loadBMap } from '@/utils/baidu'

const props = defineProps({
  visible: { type: Boolean, default: false },
  address: { type: String, default: '' }
})
const emit = defineEmits(['update:visible', 'picked'])

const visible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const mapEl = ref()
const locating = ref(false)
const error = ref('')
const pickMode = ref(false)

let map = null
let geolocation = null
let geocoder = null
let pickMarker = null

let currentPoint = null
let targetPoint = null

function togglePick() {
  pickMode.value = !pickMode.value
  if (pickMode.value && map) map.setDefaultCursor('crosshair')
  else if (map) map.setDefaultCursor('pointer')
}

async function initMap() {
  if (!props.address || !mapEl.value) return
  error.value = ''
  locating.value = true
  pickMode.value = false
  try {
    const BMap = await loadBMap()
    await nextTick()
    if (!mapEl.value) return

    map = new BMap.Map(mapEl.value)
    // 初始中心给到北京，待定位/地理编码完成后由 autoViewport 自动调整视野
    map.centerAndZoom(new BMap.Point(116.404, 39.915), 12)
    map.enableScrollWheelZoom(true)
    map.addEventListener('click', onMapClick)

    geolocation = new BMap.Geolocation()
    geocoder = new BMap.Geocoder()
    geolocation.getCurrentPosition(handleLocation, { enableHighAccuracy: true })
    geocodeAddress()
  } catch (e) {
    locating.value = false
    error.value = e?.message || '百度地图初始化失败'
  }
}

/* 定位成功：拿到当前位置（BD09），与目标点齐备后画路线 */
function handleLocation(status) {
  if (status === 'BMAP_STATUS_SUCCESS') {
    currentPoint = geolocation.point
  }
  tryDraw()
}

function geocodeAddress() {
  geocoder.getPoint(
    props.address,
    (point) => {
      targetPoint = point
      tryDraw()
    },
    '全国'
  )
}

/* 地图点选：反向地理编码取地址并回填 */
function onMapClick(e) {
  if (!pickMode.value || !geocoder) return
  geocoder.getLocation(e.point, (res) => {
    if (!res || !res.address) return
    const addr = res.address
    if (pickMarker) map.removeOverlay(pickMarker)
    pickMarker = new BMap.Marker(e.point)
    map.addOverlay(pickMarker)
    map.openInfoWindow(new BMap.InfoWindow(addr), e.point)
    emit('picked', addr)
  })
}

/* 两个点都拿到后再画驾车路线；若定位失败仅定位到机构地址 */
function tryDraw() {
  if (!map || !targetPoint) return
  if (!currentPoint) {
    locating.value = false
    map.centerAndZoom(targetPoint, 15)
    const marker = new BMap.Marker(targetPoint)
    map.addOverlay(marker)
    map.openInfoWindow(new BMap.InfoWindow(props.address), targetPoint)
    error.value = '未获取到当前位置（可能浏览器未授权定位或非 HTTPS），已仅展示机构位置'
    return
  }
  try {
    const driving = new BMap.DrivingRoute(map, {
      renderOptions: { map, autoViewport: true }
    })
    driving.search(currentPoint, targetPoint)
  } catch (e) {
    error.value = '路线规划失败'
  }
  locating.value = false
}

function destroyMap() {
  geolocation = null
  geocoder = null
  pickMarker = null
  map = null
  currentPoint = null
  targetPoint = null
  pickMode.value = false
  error.value = ''
}
</script>

<style lang="scss" scoped>
.map-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  .pick-tip {
    font-size: 12px;
    color: var(--color-muted);
  }
}
.map-body {
  position: relative;
}
.map-container {
  width: 100%;
  height: 440px;
}
.map-status {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--color-ink);
  background: var(--color-card);
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  &.error {
    color: var(--color-danger, #f56c6c);
  }
}
</style>