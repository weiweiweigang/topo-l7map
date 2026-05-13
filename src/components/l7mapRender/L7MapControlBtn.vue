<!--
 * @Author: Claude
 * @Date: 2026-05-05
 * @Description: L7地图控制按钮（恢复初始地图、切换图源、面板配置）
 * @FilePath: \heat-web\src\components\l7mapRender\L7MapControlBtn.vue
-->
<template>
  <div
    ref="btnRoot"
    class="l7MapControlBtnBox"
    :class="{ 'is-docked': isDocked }"
  >
    <ElButtonImgLocal
      v-if="!hideModel || !hideModel.includes('recover')"
      class="btn"
      icon="mapRecove.webp"
      :style="{ width: '30px', height: '30px' }"
      type="primary"
      title="恢复初始地图等级和地图中心"
      @click="recoverInit"
    />
    <ElButtonImgLocal
      v-if="!hideModel || !hideModel.includes('mapSource')"
      class="btn"
      icon="mapSource.webp"
      :style="{ width: '30px', height: '30px' }"
      type="primary"
      title="切换图源"
      @click="exchangeMapSource"
    />
    <ElButtonImgLocal
      v-if="!hideModel || !hideModel.includes('panel')"
      class="btn"
      icon="panelBtn.webp"
      :style="{ width: '30px', height: '30px' }"
      type="primary"
      title="面板显示配置"
      @click="exchangePanelClick"
    />

    <!-- 切换图源 -->
    <el-dialog
      v-model="exchangeMapSourceBoxShow"
      title="地图选择"
      width="522px"
      destroy-on-close
    >
      <div>
        <p style="margin-bottom: 20px;">
          请选择地图：
        </p>
        <el-radio-group v-model="sourceMapValue">
          <el-radio
            v-for="item in sourceMapOptions"
            :key="item.value"
            :label="item.value"
          >
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="exchangeMapSourceBoxShow=false">
            取消
          </el-button>
          <el-button
            type="primary"
            @click="exchangeMapSourceSubmit"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 面板显示配置 -->
    <el-dialog
      v-model="exchangePanelShow"
      title="面板显示配置"
      width="522px"
      destroy-on-close
    >
      <div>
        <el-form :inline="true">
          <el-form-item label="是否显示元件面板：">
            <el-switch v-model="panelForm.showDevicePanel" />
          </el-form-item>
          <el-form-item label="是否显示管径分类面板：">
            <el-switch v-model="panelForm.showTopoLegendPanel" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="exchangePanelShow=false">
            取消
          </el-button>
          <el-button
            type="primary"
            @click="exchangePanelSubmit"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Util from '@/utils/util';
import { webMercatorToCoord } from '@/tools/tool/tool';
import { ConfigStore } from '@/store/config';

const props = defineProps<{
  l7MapRenderRef: { getScene: () => any } | null;
  hideModel?: Array<'recover' | 'mapSource' | 'panel'>
}>()

const btnRoot = ref<HTMLElement | null>(null);
const isDocked = ref(false);
const defaultParent = ref<HTMLElement | null>(null);

// 恢复初始地图等级和地图中心
function recoverInit() {
  const scene = props.l7MapRenderRef?.getScene?.();
  if (!scene) return;
  const center = webMercatorToCoord(Util.GetProjectOrBelowMapCenter());
  const zoom = Util.GetProjectOrBelowMapLevel();
  scene.setCenter(center as [number, number]);
  scene.setZoom(zoom);
}

// 切换图源
const exchangeMapSourceBoxShow = ref(false);
const sourceMapValue = ref('light');
const sourceMapOptions = [
  { label: '标准', value: 'normal' },
  { label: '深色', value: 'dark' },
  { label: '浅色', value: 'light' },
  { label: '灰白', value: 'whitesmoke' },
  { label: '清新', value: 'fresh' },
  { label: '灰色', value: 'grey' },
  { label: '涂鸦', value: 'graffiti' },
  { label: '马卡龙', value: 'macaron' },
  { label: '蓝色', value: 'blue' },
  { label: '深蓝', value: 'darkblue' },
  { label: '酒红', value: 'wine' },
]

function exchangeMapSource() {
  exchangeMapSourceBoxShow.value = true;
}

function exchangeMapSourceSubmit() {
  const scene = props.l7MapRenderRef?.getScene?.();
  if (!scene) return;
  // setMapStyle is on Scene directly (not via getMap)
  (scene as any).setMapStyle(`amap://styles/${sourceMapValue.value}`);
  exchangeMapSourceBoxShow.value = false;
}

// 面板显示配置
const exchangePanelShow = ref(false);
const panelForm = ref({
  showDevicePanel: true,
  showTopoLegendPanel: true,
})

function exchangePanelClick() {
  const configStoreObj = ConfigStore();
  panelForm.value = {
    showDevicePanel: configStoreObj.panelConfig.showDevicePanel,
    showTopoLegendPanel: configStoreObj.panelConfig.showTopoLegendPanel,
  }
  exchangePanelShow.value = true;
}

function exchangePanelSubmit() {
  const configStoreObj = ConfigStore();
  configStoreObj.panelConfig.showDevicePanel = panelForm.value.showDevicePanel;
  configStoreObj.panelConfig.showTopoLegendPanel = panelForm.value.showTopoLegendPanel;
  exchangePanelShow.value = false;
}

// 尝试停靠到 l7ControlBar
onMounted(() => {
  const timer = setInterval(() => {
    const l7ControlBar = document.querySelector('.l7ControlBar');
    if (l7ControlBar && btnRoot.value) {
      // 记住原始父元素
      if (!defaultParent.value) {
        defaultParent.value = btnRoot.value.parentElement;
      }
      // 插入到 l7ControlBar 之后（仍在其父容器内）
      l7ControlBar.insertAdjacentElement('afterend', btnRoot.value);
      isDocked.value = true;
      clearInterval(timer);
    }
  }, 100);
});

onBeforeUnmount(() => {
  // 归还父元素
  if (btnRoot.value && defaultParent.value && btnRoot.value.parentElement !== defaultParent.value) {
    defaultParent.value.appendChild(btnRoot.value);
  }
});
</script>

<style lang="scss" scoped>
.l7MapControlBtnBox {
  display: flex;
  align-items: center;
  gap: 8px;

  .btn {
    margin-left: 0;
  }

  :deep(.elButtonImgLocal) {
    width: 30px !important;
    height: 30px !important;
  }
}

.is-docked {
  // 停靠到 l7ControlBar 旁边时，使用绝对定位
  // l7ControlBar 在 right: calc(var + 170px)，宽度约 94px（3按钮+2gap）
  // 放在 l7ControlBar 左侧，间距 8px
  position: absolute;
  right: calc(var(--drawers_thumbnail_offset_right, 0px) + 16px);
  bottom: calc(var(--drawers_thumbnail_offset_bottom, 0px) + 3px);
  z-index: 20;
}
</style>
