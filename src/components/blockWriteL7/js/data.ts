/*
 * @Description: BlockWriteL7 数据类型和工具
 * @FilePath: \heat-web\src\components\blockWriteL7\js\data.ts
 */
import { publicTopology } from '@/Data/topologyData';
import { ref, reactive, Ref, shallowRef } from 'vue';

export type OutsideChangeParam = {
  type: 'move' | 'rotate' | 'scale',
  xMove?: number,
  yMove?: number,
  rotateValue?: number,
  directionValue?: 'all' | 'row' | 'column',
  scaleValue?: number,
}

export type PictureWeb = {
  leftTop: [number, number],
  rightBottom: [number, number],
}

export type TranslateValue = Ref<{
  left: number,
  top: number,
  width: number,
  height: number,
  rotate: number,
  isReverseX: boolean,
  isReverseY: boolean
}>

export function useData() {
  // 拓扑墨卡托坐标
  const pictureWeb: PictureWeb = reactive({
    leftTop: [0, 0],
    rightBottom: [0, 0],
  })

  // 盒子的值
  const translateValue: TranslateValue = ref({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    rotate: 0,
    isReverseX: false,
    isReverseY: false,
  })

  return {
    pictureWeb,
    translateValue
  }
}

export function initData(pictureWeb: PictureWeb, translateValue: TranslateValue) {
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
  for(const item of publicTopology.getTopologyData().devices) {
    if(item.userData.blockChoose?.status) {
      if(item.latLng[0] < minX) minX = item.latLng[0];
      if(item.latLng[0] > maxX) maxX = item.latLng[0];
      if(item.latLng[1] < minY) minY = item.latLng[1];
      if(item.latLng[1] > maxY) maxY = item.latLng[1];
    }
  }

  pictureWeb.leftTop = [minX, maxY];
  pictureWeb.rightBottom = [maxX, minY];

  translateValue.value.rotate = 0 ;
  translateValue.value.isReverseX = false;
  translateValue.value.isReverseY = false;
}

// 外部触发批量选择（L7 版独立引用）
export const blockChooseHandleOutside = shallowRef(() => {});
