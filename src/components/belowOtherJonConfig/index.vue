<!--
 * @Author: Strayer
 * @Date: 2022-12-13
 * @LastEditors: Strayer
 * @LastEditTime: 2023-09-14
 * @Description: 自定义底图配置组件 - 支持 CAD 图纸、区域地图叠加
 * @FilePath: \heat-web\src\components\belowOtherJonConfig\index.vue
-->
<template>
  <el-dialog
    v-model="visible"
    title="二网高级配置"
    :width="800"
    append-to-body
    custom-class="belowOtherJonConfig"
    destroy-on-close
  >
    <div style="min-height: 450px;">
      <el-form
        :model="configData"
        label-width="152px"
      >
        <el-form-item label="启用自定义底图：">
          <el-switch v-model="configData.isCustomImage" />
        </el-form-item>
        <template v-if="configData.isCustomImage">
          <el-form-item label="底图图片：">
            <el-upload
              action=""
              list-type="picture-card"
              :on-remove="() => handleRemove()"
              :before-upload="() => {}"
              :file-list="fileList"
              :on-preview="handlePictureCardPreview"
              :http-request="httpRequest"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
          </el-form-item>

          <template v-if="configData.imgUrl">
            <el-form-item label="地图透明度">
              <el-input v-model="configData.opacity" />
            </el-form-item>
            <el-form-item label="隐藏地图">
              <el-switch v-model="configData.hideMap" />
            </el-form-item>
            <div style="margin-bottom: 18px;">
              <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                注：按住shift键可等比例放大
              </p>
              <PictureMap
                v-model:pictureEdge="configData.imgCoord"
                v-model:defaultMapGrade="configData.defaultMapGrade"
                :img-url="configData.imgUrl"
                :hideMap="configData.hideMap"
                :opacity="configData.opacity"
                :updateNum="pictureMapUpdateNum"
              />
            </div>
            <el-form-item
              v-if="!props.config?.hidCustomMapInit"
              label="默认初始等级："
            >
              <el-input
                v-model="configData.defaultMapGrade"
                disabled
                @change="zoomInputChange"
              />
            </el-form-item>
            <el-form-item label="底图坐标经纬度：">
              <el-input
                v-model="imgCoordLngLat"
                disabled
                @change="imgCoordLngLatChange"
              />
            </el-form-item>
            <el-form-item label="底图坐标墨卡托：">
              <el-input
                v-model="imgCoordWeb"
                disabled
                type="textarea"
                @change="imgCoordWebChange"
              />
            </el-form-item>
          </template>
        </template>

        <template v-else>
          <template v-if="!props.config?.hidCustomMapInit">
            <el-form-item label="自定义中心和等级：">
              <el-switch v-model="configData.isCustomMapInit" />
            </el-form-item>
            <template v-if="configData.isCustomMapInit">
              <el-form-item label="默认初始等级：">
                <el-input
                  v-model="configData.defaultMapGrade"
                  disabled
                  @change="zoomInputChange"
                />
              </el-form-item>
              <el-form-item label="默认初始中心：">
                <el-input
                  v-model="localCenter"
                  disabled
                />
              </el-form-item>
              <div>
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                  注：左键双击地图确认中心点
                </p>
                <CustomMapInit
                  v-model:defaultMapGrade="configData.defaultMapGrade"
                  v-model:defaultMapCenter="configData.defaultMapCenter"
                  :update-num="customMapInitUpdateNum"
                />
              </div>
            </template>
          </template>
        </template>
      </el-form>

      <!-- 图片放大 -->
      <el-dialog
        v-model="dialogVisible"
        :append-to-body="true"
        width="80%"
      >
        <el-image
          w-full
          :src="dialogImageUrl"
          fit="contain"
          style="width: 100%; text-align: center;"
        />
      </el-dialog>
    </div>
    <template #footer>
      <div class="form-footer">
        <el-button @click="visible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="submit()"
        >
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Plus } from '@element-plus/icons-vue'
import PictureMap from './components/pictureMap/index.vue'
import CustomMapInit from './components/customMapInit/index.vue'

import { userPictureMap } from './js/pictureMap';
import { useCustomMapInit } from './js/customMapInit';
import { usePicture } from './js/picture';

const props = defineProps<{
  otherParam: string | null | undefined,
  show: boolean,
  config?: {
    hidCustomMapInit?: boolean, // 是否隐藏自定义地图中心模块
  }
}>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void,
  (e: 'submit', value: string): void
}>()

const visible = computed({
  get() {
    return props.show
  },
  set(value: boolean) {
    emit('update:show', value)
  }
})

watch(() => visible.value, value => {
  if(value) {
    initData();
  }
}, { immediate: true })

interface ImgCoord {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

interface OtherJsonObjType {
  isCustomImage: boolean;
  imgUrl: string;
  imgCoord: ImgCoord;
  hideMap: boolean;
  isCustomMapInit: boolean;
  defaultMapGrade: number;
  defaultMapCenter: [number, number];
  opacity: number;
}

function geiInitData(): OtherJsonObjType {
  return {
    isCustomImage: false,
    imgUrl: '',
    imgCoord: { xmin: 112, ymin: 38.25, xmax: 116, ymax: 40.77 },
    hideMap: false,
    isCustomMapInit: false,
    defaultMapGrade: 12,
    defaultMapCenter: [0, 0],
    opacity: 0.7,
  }
}
const configData = ref<OtherJsonObjType>(geiInitData())

function initData() {
  if(props.otherParam) {
    fileList.value = [];
    configData.value = geiInitData()

    try {
      const obj: OtherJsonObjType | undefined = JSON.parse(props.otherParam);
      if(obj?.isCustomImage) configData.value.isCustomImage = obj.isCustomImage;
      if(obj?.imgUrl) {
        configData.value.imgUrl = obj.imgUrl;
        fileList.value.push({
          url: configData.value.imgUrl,
        })
      }

      if(obj?.imgCoord) {
        configData.value.imgCoord.xmin = obj.imgCoord.xmin ?? 112;
        configData.value.imgCoord.ymin = obj.imgCoord.ymin ?? 38.5;
        configData.value.imgCoord.xmax = obj.imgCoord.xmax ?? 116;
        configData.value.imgCoord.ymax = obj.imgCoord.ymax ?? 40.77;
      }
      if(obj?.hideMap) configData.value.hideMap = obj.hideMap;
      if(obj?.isCustomMapInit) configData.value.isCustomMapInit = obj.isCustomMapInit;
      if(obj?.defaultMapGrade) configData.value.defaultMapGrade = obj.defaultMapGrade;
      if(obj?.defaultMapCenter) {
        configData.value.defaultMapCenter[0] = obj.defaultMapCenter[0] ?? 0;
        configData.value.defaultMapCenter[1] = obj.defaultMapCenter[1] ?? 0;
      }
      if(obj?.opacity) configData.value.opacity = obj.opacity;
    } catch (error) {}
  }
}

const {
  imgCoordLngLat,
  imgCoordLngLatChange,
  imgCoordWeb,
  imgCoordWebChange,
  pictureMapUpdateNum
} = userPictureMap(configData)


const {
  handleRemove,
  fileList,
  dialogImageUrl,
  dialogVisible,
  handlePictureCardPreview,
  httpRequest
} = usePicture(configData)

const {
  localCenter,
  customMapInitUpdateNum,
  zoomInputChange
} = useCustomMapInit(configData)

/**
 * @description: 点击确定按钮
 */
function submit() {
  if(configData.value.isCustomImage && !configData.value.imgUrl) {
    console.error('自定义底图必须上传底图图片')
  }

  visible.value = false;
  emit('submit', JSON.stringify(configData.value))
}

</script>

<style lang="scss" scoped>

</style>
