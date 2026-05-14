<!--
 * @Author: Strayer
 * @Date: 2022-12-15
 * @LastEditors: Strayer
 * @LastEditTime: 2024-07-31
 * @Description: 自定义地图初始化配置组件 - 设置默认中心点和缩放等级
 * @FilePath: \heat-web\src\components\belowOtherJonConfig\components\customMapInit\index.vue

 * 注意：此组件依赖项目中的 Map 组件，实际使用时需要替换为你自己的地图组件
 * 或者直接使用 L7MapRender 组件
-->
<template>
  <div class="customMapInit">
    <L7MapRender
      ref="l7MapRenderRef"
      :render-name="[]"
      :containerId="'customMapInit'"
      :disabled-auto-update-center-and-zoom="true"
      @scene-ready="onSceneReady"
    />
    <L7MapControlBtn
      :l7-map-render-ref="l7MapRenderRef"
      :hideModel="['panel', 'recover']"
    />
  </div>
</template>

<script setup lang="ts">
import { L7MapRender, L7MapControlBtn } from '@/components/l7mapRender';
import type { L7MapInstance } from '@/components/l7mapRender/types';
import { ref, watch, onBeforeUnmount } from 'vue';

const props = defineProps<{
  defaultMapGrade: number,
  defaultMapCenter: [number, number],
  updateNum: number,
}>()

const emit = defineEmits<{
  (e: 'update:defaultMapGrade', value: number): void;
  (e: 'update:defaultMapCenter', value: [number, number]): void;
}>()

const l7MapRenderRef = ref<any>(null);
const scene = ref<any>(null);

function onSceneReady(instance: L7MapInstance) {
  scene.value = instance.scene;

  // 设置初始中心和等级
  scene.value.setZoomAndCenter(props.defaultMapGrade, props.defaultMapCenter);

  // 注册事件
  scene.value.on('zoomend', onZoomEnd);
  const container = scene.value.getContainer();
  if (container) {
    container.addEventListener('dblclick', onDblClick as any);
  }
}

function onZoomEnd() {
  if (scene.value) {
    emit('update:defaultMapGrade', scene.value.getZoom());
  }
}

function onDblClick(e: MouseEvent) {
  if (!scene.value) return;
  const lngLat = scene.value.containerToLngLat({
    x: (e as any).clientX,
    y: (e as any).clientY
  });
  if (!lngLat) return;

  emit('update:defaultMapCenter', [lngLat.lng, lngLat.lat]);
}

watch(() => props.updateNum, () => {
  if (scene.value) {
    scene.value.setZoomAndCenter(props.defaultMapGrade, props.defaultMapCenter);
  }
});

onBeforeUnmount(() => {
  if (scene.value) {
    scene.value.off('zoomend', onZoomEnd);
    const container = scene.value.getContainer();
    if (container) {
      container.removeEventListener('dblclick', onDblClick as any);
    }
  }
});
</script>

<style lang="scss" scoped>
.customMapInit {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
}
</style>
