<template>
  <div
    class="l7map-render-container"
    :class="{ 'hide-base-map': hideBaseMap }"
  >
    <!-- 供回水控制按钮 -->
    <TopologyWaterType
      v-if="!props.hideWaterType"
      :render-handle="triggerLayerUpdate"
    />

    <!-- 控制栏 -->
    <div class="l7ControlBar">
      <div class="l7MapGrade">
        当前地图等级{{ round(zoom, 2) }}
      </div>
      <div class="l7ZoomControl">
        <button
          class="l7ZoomBtn l7ZoomIn"
          @click="handleZoomIn"
        >
          +
        </button>
        <button
          class="l7ZoomBtn l7ZoomOut"
          @click="handleZoomOut"
        >
          −
        </button>
      </div>
    </div>

    <!-- 地图容器 -->
    <div
      :id="containerId"
      class="map-container"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * @description: L7 地图渲染组件（l7map + l7render 合并）
 * @FilePath: \heat-web\src\components\l7mapRender\index.vue
 */
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { MouseLocation, ILayer, Scene } from '@antv/l7';
import { GaodeMap, Map as BlankMap } from '@antv/l7-maps';
import { addShapeImg } from './shapeImg';
import { ConfigStore } from '@/store/config';
import TopologyWaterType from '@/components/topologyPage/TopologyWaterType.vue';

import type {
  L7RenderProps,
  L7RenderExpose,
  L7RenderEmits,
  LayerEventData
} from './types';
import Util from '@/utils/util';
import { webMercatorToCoord } from '@/tools/tool/tool';
import { TopologyStore } from '@/store/topology';
import { processDeviceData } from './composables/useDeviceRender';
import { processLineFlowData } from './composables/useLineRender';
import { processSoftMeterData } from './composables/useSoftMeterRender';
import { processCheckPointData } from './composables/useCheckPointRender';
import { processGasBalanceData } from './composables/useGasBalanceRender';
import { processEventAlarmData } from './composables/useEventAlarmRender';
import { processValveClosingStrategyData } from './composables/useValveClosingStrategyRender';
import { processTemperatureData } from './composables/useTemperatureRender';
import { addCustomImageLayer } from './composables/useCustomImageLayer';
import { round } from 'remeda';

type LayerMap = {
  layer: ILayer;
  filter?: () => void;
  nameLayer?: ILayer;
}

// Props & Emits
const props = withDefaults(defineProps<L7RenderProps>(), {
  containerId: 'l7map-render',
});

// watch 停止函数列表
const unwatchList: (() => void)[] = [];

/* eslint-disable vue/require-explicit-emits */
const emit = defineEmits<L7RenderEmits>();

// ==================== Scene & LayerMap（原 l7map 逻辑）====================
const scene = shallowRef<Scene | null>(null);
const layerMap = shallowRef<globalThis.Map<string, LayerMap>>(new globalThis.Map());
const zoom = ref(10.64);
let customImageLayer: ILayer | null = null;
const hideBaseMap = ref(false);

function initMap() {
  const configStoreObj = ConfigStore();

  // 地图配置
  const mapConfig = {
    'pitch': 0,
    'style': 'dark',
    'center': [
      87.700286,
      43.759448,
    ] as [number, number],
    'zoom': 10.64,
    'minZoom': 3,
    'maxZoom': 30,
    'token': '1210df51ce6f2cd0218440f8b2da10e1',
    'mapStyle': 'amap://styles/light',
    'terrain': true,
    'doubleClickZoom': false,
    ...props.mapConfig
  }

  // 如果不禁用自动更新中心和缩放，则使用项目或下属项目的中心和缩放
  if(!props.disabledAutoUpdateCenterAndZoom) {
    mapConfig.center = webMercatorToCoord(Util.GetProjectOrBelowMapCenter());
    mapConfig.zoom = Util.GetProjectOrBelowMapLevel();
  }

  let MapClass: any = new BlankMap(mapConfig);
  if (configStoreObj.ampApiIsAllow ) {
    MapClass = new GaodeMap(mapConfig);
  }

  zoom.value = mapConfig.zoom;

  scene.value = new Scene({
    id: props.containerId,
    logoVisible: false,
    map: MapClass,
  });

  addShapeImg(scene.value);

  scene.value.on('loaded', () => {
    console.log('----------地图加载成功-------');
    // const mouseLocation = new MouseLocation();
    // scene.value?.addControl(mouseLocation);
    handleMapLoaded(scene.value as Scene);
  });

  scene.value.on('moveend', () => {
  });

  scene.value.on('zoomend', () => {
    zoom.value = scene.value?.getZoom() ?? zoom.value;
  });
}

const renderStartTime = ref(0);
// ==================== 地图加载完成回调 ====================
function handleMapLoaded(loadedScene: Scene) {
  setupWatchers();

  emit('sceneReady', {
    scene: loadedScene,
  });

  // 看项目配置里面是否有自定义底图或隐藏地图
  if (!props.ignoreProjectConfig) {
    const result = addCustomImageLayer(loadedScene);
    console.log('%c [ result ]-163', 'font-size:13px; background:pink; color:#bf2c9f;', result)
    customImageLayer = result.imageLayer;
    hideBaseMap.value = result.hideMap;
  }

  referRender();
}

// ==================== 重新渲染或开始渲染 ====================
function referRender() {
  if (!scene.value) return;

  renderStartTime.value = performance.now();
  const topologyKey = props.topologyKey;

  // 清除旧图层
  for (const [type, layer] of layerMap.value.entries()) {
    scene.value.removeLayer(layer.layer);
    if (layer.nameLayer) scene.value.removeLayer(layer.nameLayer);
    layerMap.value.delete(type);
  }

  for (const name of props.renderName) {
    let processRes: LayerMap | null = null;
    switch (name) {
    case 'topologyDevices':
      processRes = processDeviceData(scene.value, topologyKey);
      break;
    case 'topologyLines':
      {
        const res = processLineFlowData(scene.value, false, topologyKey);
        if(res.layer) {
          layerMap.value.set(name, {
            layer: res.layer,
            filter: res.filter,
          });
          bindLayerEvents(res.layer, name);
        }
      }
      break;
    case 'topologyLinesFlow':
      {
        const res = processLineFlowData(scene.value, true, topologyKey);
        if(res.layer) {
          layerMap.value.set('topologyLines', {
            layer: res.layer,
            filter: res.filter,
          });
          bindLayerEvents(res.layer, 'topologyLines');
        }
        if(res.layerFlow) {
          layerMap.value.set('topologyLinesFlow', {
            layer: res.layerFlow,
            filter: res.filterFlow,
          });
          bindLayerEvents(res.layerFlow, 'topologyLinesFlow');
        }
      }
      break;
    case 'softMeter':
      processRes = processSoftMeterData(scene.value, topologyKey);
      break;
    case 'checkPoint':
      processRes = processCheckPointData(scene.value, topologyKey);
      break;
    case 'gasBalance':
      processRes = processGasBalanceData(scene.value);
      break;
    case 'eventAlarm':
      processRes = processEventAlarmData(scene.value);
      break;
    case 'valveClosingStrategy':
      processRes = processValveClosingStrategyData(scene.value);
      break;
    case 'temperature':
      processRes = processTemperatureData(scene.value);
      break;
    }

    if (processRes) {
      layerMap.value.set(name, {
        layer: processRes.layer,
        filter: processRes.filter,
        nameLayer: processRes.nameLayer,
      });
      bindLayerEvents(processRes.layer, name);
    }
  }

  const duration = performance.now() - renderStartTime.value;

  emit('renderComplete', {
    duration,
  });
}

/** 触发图层更新 */
function triggerLayerUpdate() {
  if (!scene.value) return;

  for (const Item of layerMap.value.values()) {
    Item.filter?.();
  }
}

// ==================== 缩放控制 ====================
function handleZoomIn() {
  if (!scene.value) return;
  const currentZoom = scene.value.getZoom();
  scene.value.setZoom(currentZoom + 1);
}

function handleZoomOut() {
  if (!scene.value) return;
  const currentZoom = scene.value.getZoom();
  scene.value.setZoom(currentZoom - 1);
}

// ==================== 图层事件绑定 ====================

/**
 * 处理图层事件
 */
function handleLayerEvent(
  e: any,
  eventType: 'click' | 'dblclick' | 'contextmenu',
  layerName: string
): void {
  if (!e.feature) return;

  const data: LayerEventData = {
    tpId: e.feature.tpId,
    layerName,
    ...e,
  };

  if (eventType === 'click') {
    emit('layerClick', data);
  } else if (eventType === 'dblclick') {
    emit('layerDoubleClick', data);
  } else if (eventType === 'contextmenu') {
    emit('layerContextMenu', data);
  }
}

/**
 * 统一绑定图层事件
 */
function bindLayerEvents(layer: ILayer, layerName: string): void {
  layer.on('click', (e: any) => handleLayerEvent(e, 'click', layerName));
  layer.on('dblclick', (e: any) => handleLayerEvent(e, 'dblclick', layerName));
  layer.on('contextmenu', (e: any) => {
    handleLayerEvent(e, 'contextmenu', layerName);
  });
}

// ==================== 监听器设置 ====================
function setupWatchers() {
  const topologyStoreObj = TopologyStore();

  unwatchList.push(Util.WatchChooseEquipmentL7(scene.value!));

  unwatchList.push(watch(() => topologyStoreObj.showPressTypeNum, () => {
    triggerLayerUpdate();
  }));

  unwatchList.push(watch(() => topologyStoreObj.topologyDataChangeNum, () => {
    console.log('拓扑数据更新检测点')
    referRender();
  }));
}

// ==================== 图层显隐控制 ====================

/** 隐藏指定名称的图层 */
function hideLayers(layerNames: string[]): void {
  for (const name of layerNames) {
    const layerInfo = layerMap.value.get(name);
    if (layerInfo) {
      layerInfo.layer.hide();
      layerInfo.nameLayer?.hide();
    }
  }
}

/** 显示指定名称的图层 */
function showLayers(layerNames: string[]): void {
  for (const name of layerNames) {
    const layerInfo = layerMap.value.get(name);
    if (layerInfo) {
      layerInfo.layer.show();
      layerInfo.nameLayer?.show();
    }
  }
}

// ==================== Expose ====================
function getScene(): Scene | null {
  return scene.value;
}

function getLayerMap(): globalThis.Map<string, LayerMap> | null {
  return layerMap.value;
}

defineExpose<L7RenderExpose>({
  referRender,
  triggerLayerUpdate,
  getScene,
  getLayerMap,
  hideLayers,
  showLayers,
});

onMounted(() => initMap());
onBeforeUnmount(() => {
  unwatchList.forEach(unwatch => unwatch());
  unwatchList.length = 0;

  if (scene.value) {
    // 1. 先移除自定义图片底图
    if (customImageLayer) {
      scene.value.removeLayer(customImageLayer);
      customImageLayer = null;
    }

    // 2. 移除所有图层
    scene.value.removeAllLayer();
    layerMap.value.clear();

    // 3. 手动清理 WebGL 资源，避免 GPU 内存泄漏
    try {
      const container = document.getElementById(props.containerId);
      const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvas) {
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');
        if (gl && gl instanceof WebGLRenderingContext) {
          // 强制丢失上下文，释放 GPU 资源
          const ext = gl.getExtension('WEBGL_lose_context');
          if (ext) ext.loseContext();
        }
        // 清除 canvas 绘制内容
        const ctx2d = canvas.getContext('2d');
        if (ctx2d) ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
        // 移除 canvas 元素，帮助 GC
        canvas.remove();
      }
    } catch (e) {
      // WebGL 清理失败不影响主流程
      console.warn('WebGL cleanup warning:', e);
    }

    // 4. 销毁场景
    scene.value.destroy();
  }
});
</script>

<style lang="scss" scoped>
.l7map-render-container {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
}

// 隐藏高德底图瓦片（仅保留自定义图片底图）
.hide-base-map {
  :deep(.amap-layers) {
    display: none;
  }
}

.map-container {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
}

.l7map-render-container :deep(.topologyWaterTypeBox) {
  z-index: 99;
}

// 控制栏
.l7ControlBar {
  position: absolute;
  right: calc(var(--drawers_thumbnail_offset_right, 0px) + 130px);
  bottom: calc(var(--drawers_thumbnail_offset_bottom, 0px) + 8px);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 20;
  transition: right 0.3s, bottom 0.3s;
}

.l7MapGrade {
  height: 30px;
  line-height: 30px;
  padding: 0 8px;
  border-radius: 2px;
  font-size: 12px;
  color: #fff;
  text-shadow: 0 0 5px #000;
  white-space: nowrap;
}

.l7ZoomControl {
  display: flex;
  overflow: hidden;
  border-radius: 2px;
}

.l7ZoomBtn {
  width: 30px;
  height: 30px;
  line-height: 30px;
  font-size: 0;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 30px 30px;
  background-color: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 5px;
  cursor: pointer;
}

.l7ZoomIn {
  border-right: none;
  background-image: url('@/assets/img/map/zoom-in.webp');
}

.l7ZoomOut {
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
  background-image: url('@/assets/img/map/zoom-out.webp');
}

// 深色主题
.black {
  .l7MapGrade {
    background: rgba(26, 33, 61, 0.88);
    color: #fff;
  }

  .l7ZoomControl {
    background: rgba(26, 33, 61, 0.88);
    border: 1px solid #4acdec;
  }

  .l7ZoomBtn {
    background-color: transparent;

    &:hover {
      background-color: rgba(26, 33, 61, 0.88);
    }
  }

  .l7ZoomIn {
    border-right: 1px solid #4acdec;
  }
}

// 浅色主题
.white {
  .l7MapGrade {
    background: #fff;
    color: #333;
    text-shadow: none;
  }

  .l7ZoomControl {
    background: #fff;
    border: 1px solid #e4e4e4;
  }

  .l7ZoomBtn {
    background-color: transparent;

    &:hover {
      background-color: #fff;
    }
  }

  .l7ZoomIn {
    border-right: 1px solid #e4e4e4;
  }
}
</style>
