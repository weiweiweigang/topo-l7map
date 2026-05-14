/*
 * @Author: Strayer
 * @Date: 2022-12-15
 * @LastEditors: Strayer
 * @LastEditTime: 2023-02-02
 * @Description: 自定义地图初始化配置
 * @FilePath: \heat-web\src\components\belowOtherJonConfig\js\customMapInit.ts
 */

import { ref, Ref, watch } from 'vue';

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

export function useCustomMapInit(configData: Ref<OtherJsonObjType>) {
  const localCenter = ref(JSON.stringify(configData.value.defaultMapCenter));
  const customMapInitUpdateNum = ref(0);
  // 地图坐标手动调整开关
  const isInputChange = ref(false) // 是否输入引起的变化

  function centerOrZoomChange(center: [number, number], zoom: number) {
    localCenter.value = JSON.stringify(center);

    configData.value.defaultMapCenter = center;
    configData.value.defaultMapGrade = zoom;
  }

  function zoomInputChange() {
    try {
      const center = JSON.parse(localCenter.value);
      if((center[0] ?? null) === null) {
        console.error('数据格式转换错误')
      }else if((center[1] ?? null) === null) {
        console.error('数据格式转换错误')
      }else {
        isInputChange.value = true;
        setTimeout(() => {
          isInputChange.value = false;
        }, 200)

        configData.value.defaultMapCenter = center;
        customMapInitUpdateNum.value += 1;
      }
    } catch (error) {
      console.error('数据格式转换错误')
    }
  }

  watch(() => [
    configData.value.defaultMapCenter,
    configData.value.defaultMapGrade,
  ], (param) => {
    if(isInputChange.value) {
      isInputChange.value = false;
      return;
    }
    centerOrZoomChange(<[number, number]>param[0], <number>param[1])
  })

  return {
    localCenter,
    customMapInitUpdateNum,
    centerOrZoomChange,
    zoomInputChange,
  }
}
