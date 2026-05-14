<!--
 * @Author: Strayer
 * @Date: 2022-12-14
 * @LastEditors: Strayer
 * @LastEditTime: 2024-07-31
 * @Description: 图片叠加预览组件 - 在地图上可视化调整图片位置
 * @FilePath: \heat-web\src\components\belowOtherJonConfig\components\pictureMap\index.vue
-->
<template>
  <div
    class="pictureMap"
    :class="isFullScreen? 'isFullScreen':''"
  >
    <el-button
      style="position: absolute; top: 12px; right: 12px; z-index: 9999999;"
      @click="isFullScreen = !isFullScreen"
    >
      全屏
    </el-button>

    <L7MapRender
      ref="l7MapRenderRef"
      :render-name="[]"
      :containerId="'pictureMap'"
      :disabled-auto-update-center-and-zoom="true"
      @scene-ready="onSceneReady"
    />
    <L7MapControlBtn
      :l7-map-render-ref="l7MapRenderRef"
      :hideModel="['panel', 'recover']"
    />

    <TranslateBox
      ref="translateBoxObj"
      :class-name="'custom-map-layer'"
      :width="0"
      :height="0"
      :close-rotate="true"
      :open-wheel-spread="true"
      @endMove="translateEndHandle"
    >
      <img
        style="width: 100%; height: 100%; opacity: 0.3; -webkit-user-drag: none;"
        :style="{opacity: props.opacity ?? 1}"
        :src="props.imgUrl"
        alt=""
      >
    </TranslateBox>
  </div>
</template>

<script setup lang="ts">
import { L7MapRender, L7MapControlBtn } from '@/components/l7mapRender';
import type { L7MapInstance } from '@/components/l7mapRender/types';
import { webMercatorToScreen, screenToWebMercator } from '@/components/l7mapRender/draw/coordHelper';
import { getTranslateValue } from './js';
import TranslateBox from '@/components/translateBox/index.vue'
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import { EmitMoveObj } from '@/components/translateBox/js/data';
import { registerCustomMapLayerSync, unregisterCustomMapLayerSync } from '@/components/l7mapRender/utils/customMapLayerSync';

interface ImgCoord {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

const props = defineProps<{
  imgUrl: string,
  pictureEdge: ImgCoord,
  defaultMapGrade: number,
  hideMap: boolean,
  updateNum: number,
  opacity?: number
}>()

const emit = defineEmits<{
  (e: 'update:pictureEdge', value: ImgCoord): void;
  (e: 'update:defaultMapGrade', value: number): void;
}>()

const l7MapRenderRef = ref<any>(null);
const scene = ref<any>(null);
const sceneContainer = computed(() => scene.value?.getContainer() ?? '#map0');

const isFullScreen = ref(false); // 地图是否全屏

// 坐标转换工具函数
function coordToWebMercator(coord: [number, number]): [number, number] {
  const [lng, lat] = coord;
  const x = lng * 20037508.34 / 180;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180;
  return [x, y];
}

function webMercatorToCoord(web: [number, number]): [number, number] {
  const [x, y] = web;
  const lng = x * 180 / 20037508.34;
  const lat = Math.atan(Math.exp(y * Math.PI / 20037508.34)) * 360 / Math.PI - 90;
  return [lng, lat];
}

// 照片的墨卡托坐标
let pictureWeb = {
  leftTop: coordToWebMercator([props.pictureEdge.xmin, props.pictureEdge.ymax]),
  rightBottom: coordToWebMercator([props.pictureEdge.xmax, props.pictureEdge.ymin]),
}
// 照片在盒子中的值
const translateValue = ref({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  rotate: 0
})

// 子组件实例提供了强制更新的方法
const translateBoxObj = ref<InstanceType<typeof TranslateBox>>();

/** @description: 强制更新translateBox */
function forceUpdate() {
  if(!scene.value) return;
  const res = getTranslateValue(pictureWeb, scene.value);
  translateValue.value.left = res.left;
  translateValue.value.top = res.top;
  translateValue.value.width = res.width;
  translateValue.value.height = res.height;

  translateBoxObj.value?.forceUpdate({
    left: translateValue.value.left,
    top: translateValue.value.top,
    width: translateValue.value.width,
    height: translateValue.value.height,
  })
}

function onSceneReady(instance: L7MapInstance) {
  scene.value = instance.scene;

  // 重置地图中心点和地图等级
  try {
    const [xmin, ymin] = coordToWebMercator([props.pictureEdge.xmin, props.pictureEdge.ymin])
    const [xmax, ymax] = coordToWebMercator([props.pictureEdge.xmax, props.pictureEdge.ymax])
    const centerX = (xmin + xmax) / 2;
    const centerY = (ymin + ymax) / 2;
    const centerLngLat = webMercatorToCoord([centerX, centerY]);

    scene.value.setZoomAndCenter(props.defaultMapGrade, centerLngLat);
  } catch (error) {
    console.error('数据格式转换错误')
  }

  // 注册 scene 事件
  scene.value.on('zoomend', onZoomEnd);
  scene.value.on('moveend', onMoveEnd);
  scene.value.on('resize', onResize);

  // dblclick 事件需要从容器监听
  const container = scene.value.getContainer();
  if(container) {
    container.addEventListener('dblclick', onDblClick as any);
  }

  // 注册 TranslateBox 同步
  registerCustomMapLayerSync(scene.value);
}

function onZoomEnd() {
  if(scene.value) {
    emit('update:defaultMapGrade', scene.value.getZoom());
  }
  forceUpdate()
}

function onMoveEnd() {
  forceUpdate()
}

function onResize() {
  forceUpdate()
}

/**
 * @description: 双击地图，底图中心点自动移过去
 */
function onDblClick(e: MouseEvent) {
  if(!scene.value) return;
  const lngLat = scene.value.containerToLngLat({ x: (e as any).pixel?.x ?? e.clientX, y: (e as any).pixel?.y ?? e.clientY });
  if(!lngLat) return;

  const newCenter: [number, number] = coordToWebMercator([lngLat.lng, lngLat.lat]);
  const oldCenter: [number, number] = [(pictureWeb.rightBottom[0] + pictureWeb.leftTop[0]) / 2, (pictureWeb.rightBottom[1] + pictureWeb.leftTop[1]) / 2];

  const addValueX = newCenter[0] - oldCenter[0];
  const addValueY = newCenter[1] - oldCenter[1];

  pictureWeb.leftTop[0] += addValueX;
  pictureWeb.rightBottom[0] += addValueX;
  pictureWeb.leftTop[1] += addValueY;
  pictureWeb.rightBottom[1] += addValueY;
  forceUpdate()

  const pictureLngLat = {
    leftTop: webMercatorToCoord(pictureWeb.leftTop),
    rightBottom: webMercatorToCoord(pictureWeb.rightBottom),
  }
  const extent = {
    xmin: pictureLngLat.leftTop[0],
    xmax: pictureLngLat.rightBottom[0],
    ymin: pictureLngLat.rightBottom[1],
    ymax: pictureLngLat.leftTop[1],
  }
  emit('update:pictureEdge', extent)
}

function translateEndHandle(res: EmitMoveObj) {
  if(!scene.value) return;
  const leftTopPoint: [number, number] = [res.left, res.top];
  const rightBottomPoint: [number, number] = [res.left+res.width, res.top+res.height];

  pictureWeb.leftTop = screenToWebMercator(scene.value, leftTopPoint[0], leftTopPoint[1])
  pictureWeb.rightBottom = screenToWebMercator(scene.value, rightBottomPoint[0], rightBottomPoint[1])

  const pictureLngLat = {
    leftTop: webMercatorToCoord(pictureWeb.leftTop),
    rightBottom: webMercatorToCoord(pictureWeb.rightBottom),
  }

  const extent = {
    xmin: pictureLngLat.leftTop[0],
    xmax: pictureLngLat.rightBottom[0],
    ymin: pictureLngLat.rightBottom[1],
    ymax: pictureLngLat.leftTop[1],
  }
  emit('update:pictureEdge', extent)
}

watch(() => props.updateNum, () => {
  pictureWeb = {
    leftTop: coordToWebMercator([props.pictureEdge.xmin, props.pictureEdge.ymax]),
    rightBottom: coordToWebMercator([props.pictureEdge.xmax, props.pictureEdge.ymin]),
  }
  forceUpdate();
  if(!scene.value) return;
  const leftTopPoint = webMercatorToScreen(scene.value, pictureWeb.leftTop);
  const rightBottomPoint = webMercatorToScreen(scene.value, pictureWeb.rightBottom);
  translateEndHandle({
    left: leftTopPoint.x,
    top: leftTopPoint.y,
    width: rightBottomPoint.x - leftTopPoint.x,
    height: rightBottomPoint.y - leftTopPoint.y,
  } as EmitMoveObj);
} )

onBeforeUnmount(() => {
  if(scene.value) {
    scene.value.off('zoomend', onZoomEnd);
    scene.value.off('moveend', onMoveEnd);
    const container = scene.value.getContainer();
    if(container) {
      container.removeEventListener('dblclick', onDblClick as any);
    }
    unregisterCustomMapLayerSync(scene.value);
  }
})
</script>

<style lang="scss" scoped>
.pictureMap {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
}

.isFullScreen {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  width: 100vw;
  height: 100vh;
}
</style>
