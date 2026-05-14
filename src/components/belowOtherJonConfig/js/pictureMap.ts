/*
 * @Author: Strayer
 * @Date: 2022-12-15
 * @LastEditors: Strayer
 * @LastEditTime: 2023-02-02
 * @Description: 图片坐标调整部分
 * @FilePath: \heat-web\src\components\belowOtherJonConfig\js\pictureMap.ts
 */

import { Ref, ref, watch } from 'vue';

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

// 坐标转换工具函数
function LngLatToWebMercator(coord: [number, number]): [number, number] {
  const [lng, lat] = coord;
  const x = lng * 20037508.34 / 180;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180;
  return [x, y];
}

function WebMercatorToLngLat(web: [number, number]): [number, number] {
  const [x, y] = web;
  const lng = x * 180 / 20037508.34;
  const lat = Math.atan(Math.exp(y * Math.PI / 20037508.34)) * 360 / Math.PI - 90;
  return [lng, lat];
}

export function userPictureMap(configData: Ref<OtherJsonObjType>) {
  // 底图坐标中转
  const imgCoordLngLat = ref(JSON.stringify(configData.value.imgCoord));
  const [xmin_c, ymin_c] = LngLatToWebMercator([configData.value.imgCoord.xmin, configData.value.imgCoord.ymin])
  const [xmax_c, ymax_c] = LngLatToWebMercator([configData.value.imgCoord.xmin, configData.value.imgCoord.ymin])
  const imgCoordWeb = ref(JSON.stringify({ xmin: xmin_c, ymin: ymin_c, xmax: xmax_c, ymax: ymax_c }));
  const pictureMapUpdateNum = ref(0)
  const isInputChange = ref(false) // 是否输入引起的变化

  function imgCoordLngLatChange() {
    try {
      const obj: ImgCoord = JSON.parse(imgCoordLngLat.value);
      const [xmin, ymin] = LngLatToWebMercator([obj.xmin, obj.ymin])
      const [xmax, ymax] = LngLatToWebMercator([obj.xmax, obj.ymax])

      imgCoordWeb.value = JSON.stringify({ xmin, ymin, xmax, ymax });
      configData.value.imgCoord = obj;
      isInputChange.value = true;
      setTimeout(() => {
        isInputChange.value = false;
      }, 200)
      pictureMapUpdateNum.value += 1;
    } catch (error) {
      console.error('数据格式转换错误')
    }
  }

  function imgCoordWebChange() {
    try {
      const obj: ImgCoord = JSON.parse(imgCoordWeb.value);
      const [xmin, ymin] = WebMercatorToLngLat([obj.xmin, obj.ymin])
      const [xmax, ymax] = WebMercatorToLngLat([obj.xmax, obj.ymax])

      imgCoordLngLat.value = JSON.stringify({ xmin, ymin, xmax, ymax });
      configData.value.imgCoord = { xmin, ymin, xmax, ymax };
      isInputChange.value = true;
      setTimeout(() => {
        isInputChange.value = false;
      }, 200)
      pictureMapUpdateNum.value += 1;
    } catch (error) {
      console.error('数据格式转换错误')
    }
  }


  watch(() => configData.value.imgCoord, value => {
    if(isInputChange.value) {
      isInputChange.value = false;
      return;
    }
    try {
      const obj: ImgCoord = value;
      const [xmin, ymin] = LngLatToWebMercator([obj.xmin, obj.ymin])
      const [xmax, ymax] = LngLatToWebMercator([obj.xmax, obj.ymax])

      imgCoordWeb.value = JSON.stringify({ xmin, ymin, xmax, ymax });
      imgCoordLngLat.value = JSON.stringify(value);
    } catch (error) {
      console.error('数据格式转换错误')
    }
  })

  return {
    imgCoordLngLat,
    imgCoordLngLatChange,
    imgCoordWeb,
    imgCoordWebChange,
    pictureMapUpdateNum
  }
}
