<!--
 * @Description: 批量操作组件（L7 版本）
 * @FilePath: \heat-web\src\components\blockWriteL7\index.vue
-->
<template>
  <!-- 批量操作 -->
  <FloatPopover
    v-if="pageType=='write'"
    :visible="blockEditShow"
    :is-var-theme="true"
    style="margin-left: 12px; display: inline-block;"
    placement="bottom"
    popper-class="topologyManageControlBtnPopper"
  >
    <template #reference>
      <el-button-local 
        class="opacityButtonOfPrimary"
        @click="showTopologyBlockEditBox"
      >
        批量操作
      </el-button-local>
    </template>
    <div>
      <el-button-local 
        class="opacityButtonOfPrimary"
        @click="blockChooseHandleLocal()"
      >
        {{ inBlockChoose? '结束选择':'批量选择' }}
      </el-button-local>
      <el-button-local 
        class="opacityButtonOfDanger"
        type="danger"
        :disabled="!inBlockChoose"
        @click="blockRemoveHandle({
          renderDataHandle: props.renderDataHandle,
        })"
      >
        批量删除
      </el-button-local>
      <el-button-local 
        v-permission="'autoRepairWaterTypeButton'"
        class="opacityButtonOfPrimary"
        :disabled="!inBlockChoose"
        @click="autoRepairWaterType({
          renderDataHandle: props.renderDataHandle,
        })"
      >
        供回水类型自动修复
      </el-button-local>
      <el-button-local 
        class="opacityButtonOfSuccess"
        type="success"
        :disabled="!showBlockPush || inBlockChoose"
        @click="pushBlockData"
      >
        批量提交
      </el-button-local>
    </div>
  </FloatPopover>

  <!-- 批量操作盒子 -->
  <div
    v-if="blockChooseHadGiveData"
    class="block-write"
  >
    <Teleport :to="sceneContainer">
      <TranslateBox 
        ref="translateBoxObj"
        v-model:hide="translateBoxHide"
        :class-name="'custom-map-layer'"
        :width="0"
        :height="0"
        :open-wheel-spread="true"
        @beginMove="translateBeginHandle"
        @moving="translateMovingHandle"
        @endMove="translateEndHandle"
      >
        <div class="block-write_main" />
      </TranslateBox>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { EmitMoveObj } from '@/components/translateBox/js/data';
import TranslateBox from '@/components/translateBox/index.vue'
import { ref, watch, Ref, inject, nextTick, onBeforeUnmount, computed } from 'vue';
import type { Scene } from '@antv/l7';
import { forceUpdate, boxOutsideChangeHandle, translateEndOfMove, translateEndOfRotate, translateEndOfSpread } from './js';
import { blockChooseHandleOutside, initData, OutsideChangeParam, useData } from './js/data';
import FloatPopover from '@/components/FloatPopover.vue'
import { TopologyManagePageType } from '@/dataModel/topologyManage';
import { 
  blockChooseHandle, 
  inBlockMove,
  blockMoveHandle,
  blockRemoveHandle,
  showBlockPush,
  pushBlockData,
  blockChooseHadGiveData,
  translateBoxHide,
  autoRepairWaterType
} from './js/blockHandle';
import { onBeforeRouteLeave } from 'vue-router';
import Notice from '@/tools/notice';
import { BlockEditObj } from '@/utils/topologyBlockEdit';
import { coordToWebMercator } from '@/tools/tool/tool';
import { registerCustomMapLayerSync, unregisterCustomMapLayerSync } from '@/components/l7mapRender/utils/customMapLayerSync';

const props = defineProps<{
  scene: Scene | null,
  renderDataHandle: () => void,
  onWrite: boolean,
  hideAllNum?: number,
  hadBlockChooseDataNum?: number,
  disabledWrite?: boolean,
}>()

const pageType = inject<TopologyManagePageType | undefined>('pageType', undefined);
const inBlockChoose = inject<Ref<boolean>>('inBlockChoose', ref(false))

const emit = defineEmits<{
  (e: 'update:hideAllNum', value: number): void,
  (e: 'update:disabledWrite', value: boolean): void,
}>()

const sceneContainer = computed(() => props.scene?.getContainer() ?? '#map0')

defineExpose({ blockChooseHandleOutside: blockChooseHandleOutside.value })

watch(() => showBlockPush.value, value => {
  if(value) {
    emit('update:disabledWrite', true)
  }else {
    emit('update:disabledWrite', false)
  }
})

const blockEditShow = ref(false);
watch(() => props.hideAllNum, () => {
  blockEditShow.value = false;
})
function showTopologyBlockEditBox() {
  const currentShow = blockEditShow.value
  emit('update:hideAllNum', (props.hideAllNum ?? 0) + 1)

  nextTick(() => {
    blockEditShow.value = !currentShow;
  })
}

const { pictureWeb, translateValue } = useData()

const translateBoxObj = ref<InstanceType<typeof TranslateBox>>();
function forceUpdateHandle() {
  if(!props.scene) return;
  forceUpdate({
    translateBoxObj: translateBoxObj,
    scene: props.scene,
    pictureWeb,
    translateValue
  })
}

watch(() => blockChooseHadGiveData.value, value => {
  if(value) {
    nextTick(() => {
      initData(pictureWeb, translateValue)
      forceUpdateHandle()
    })
  }
})

// 监听 L7 scene 事件
let zoomEndHandler: (() => void) | null = null;
let moveEndHandler: (() => void) | null = null;
let dblClickHandler: ((e: any) => void) | null = null;

function registerSceneEvents(scene: Scene) {
  zoomEndHandler = () => {
    if(blockChooseHadGiveData.value) {
      forceUpdateHandle();
    }
  };
  moveEndHandler = () => {
    if(blockChooseHadGiveData.value) {
      forceUpdateHandle();
    }
  };
  dblClickHandler = (e: any) => {
    if(!blockChooseHadGiveData.value) return;
    let lngLat = e.lngLat;
    if(!lngLat && e.pixel) {
      lngLat = scene.containerToLngLat(e.pixel);
    }
    if(!lngLat) return;
    
    const newCenter = coordToWebMercator([lngLat.lng, lngLat.lat]);
    const oldCenter: [number, number] = [
      (pictureWeb.rightBottom[0] + pictureWeb.leftTop[0]) / 2,
      (pictureWeb.rightBottom[1] + pictureWeb.leftTop[1]) / 2,
    ];

    const addValueX = newCenter[0] - oldCenter[0];
    const addValueY = newCenter[1] - oldCenter[1];

    pictureWeb.leftTop[0] += addValueX;
    pictureWeb.rightBottom[0] += addValueX;
    pictureWeb.leftTop[1] += addValueY;
    pictureWeb.rightBottom[1] += addValueY;
    forceUpdateHandle();

    BlockEditObj.moveEquipmentHandle(addValueX, addValueY);
    props.renderDataHandle();
  };

  scene.on('zoomend', zoomEndHandler);
  scene.on('moveend', moveEndHandler);
  registerCustomMapLayerSync(scene);
  
  const container = scene.getContainer();
  if(container) {
    container.addEventListener('dblclick', dblClickHandler as any);
  }
}

function unregisterSceneEvents(scene: Scene) {
  if(zoomEndHandler) scene.off('zoomend', zoomEndHandler);
  if(moveEndHandler) scene.off('moveend', moveEndHandler);
  unregisterCustomMapLayerSync(scene);
  
  const container = scene.getContainer();
  if(container && dblClickHandler) {
    container.removeEventListener('dblclick', dblClickHandler as any);
  }

  zoomEndHandler = null;
  moveEndHandler = null;
  dblClickHandler = null;
}

watch(() => props.scene, (newScene, oldScene) => {
  if(oldScene) {
    unregisterSceneEvents(oldScene);
  }
  if(newScene) {
    registerSceneEvents(newScene);
  }
}, { immediate: true });

onBeforeUnmount(() => {
  if(props.scene) {
    unregisterSceneEvents(props.scene);
  }
  inBlockMove.value = false;
  showBlockPush.value = false;
})

watch(() => props.hadBlockChooseDataNum, () => {
  blockChooseHandleOutside.value();
})

function blockChooseHandleLocal(hadChoose?: boolean) {
  blockChooseHandle({
    onWrite: props.onWrite,
    scene: props.scene,
    renderDataHandle: props.renderDataHandle,
    boxOutsideChange: boxOutsideChange,
    inBlockChoose: inBlockChoose,
    hadChoose
  })
}

blockChooseHandleOutside.value = function() {
  blockChooseHandleLocal(true)
}

let boxMoveStart = [0, 0]
function translateBeginHandle(res: EmitMoveObj) {
  if(res.type === 'move') {
    boxMoveStart = [res.left, res.top]
  }
}
function translateMovingHandle(res: EmitMoveObj) {
  if(res.type === 'move') {
    const echarts3LayerDom: HTMLElement = document.getElementsByClassName('l7-scene')[0] as HTMLElement
    if(echarts3LayerDom) {
      echarts3LayerDom.style.left = res.left - boxMoveStart[0]+'px';
      echarts3LayerDom.style.top = res.top - boxMoveStart[1]+'px';
    }
  }
}
function translateEndHandle(res: EmitMoveObj) {
  if(res.type === 'move') {
    if(props.scene) translateEndOfMove(props.scene, res, pictureWeb);
    
    const echarts3LayerDom: HTMLElement = document.getElementsByClassName('l7-scene')[0] as HTMLElement
    if(echarts3LayerDom) {
      echarts3LayerDom.style.left = 0+'px';
      echarts3LayerDom.style.top = 0+'px';
    }
  }else if(res.type === 'rotate') {
    translateEndOfRotate(res, pictureWeb, translateValue)
  }else {
    if(props.scene) translateEndOfSpread(props.scene, res, pictureWeb, translateValue)
  }

  props.renderDataHandle();
}

function boxOutsideChange(param: OutsideChangeParam) {
  boxOutsideChangeHandle({
    param: param,
    pictureWeb: pictureWeb,
    translateValue: translateValue,
    forceUpdateHandle: forceUpdateHandle,
  })
}

onBeforeRouteLeave((to, from, next)=>{
  if(showBlockPush.value) {
    Notice.messageConfirm({
      message: '检测到批量操作后未点击"批量提交"按钮提交数据,是否确定离开页面?',
      title: '拓扑警告',
      type: 'warning',
      callback: (response) => {
        if (response == 'confirm') {
          next();
        }
      },
    })
  }else {
    next();
  }
})
</script>

<style lang="scss" scoped>
.block-write {
  display: inline-block;
}
.block-write_main {
  width: 100%;
  height: 100%;
  opacity: 0.3;
  background-color: rgba(64, 158, 255, 0.4);
}
</style>
