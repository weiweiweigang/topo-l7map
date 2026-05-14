/*
 * @Author: Strayer
 * @Date: 2023-02-03
 * @LastEditors: Strayer
 * @LastEditTime: 2023-11-17
 * @Description: 
 * @FilePath: \heat-web\src\components\translateBox\js\wheel.ts
 */

import { Ref, ref } from 'vue';

// 鼠标缩放时的事件类型
export const wheelType = ref<'none' | 'all' | 'horizontal' | 'vertical' | 'rotate'>('none');

export function wheelHand(param: {
  e:WheelEvent,
  openWheelSpread?: boolean,
  translateBoxWidth: Ref<number>,
  translateBoxHeight: Ref<number>,
  translateBoxTop: Ref<number>,
  translateBoxLeft: Ref<number>,
  translateBoxRotate: Ref<number>,
}) {
  if(!param.openWheelSpread || wheelType.value === 'none') return;
  
  let addValue = -5;
  if(param.e.deltaY < 0) addValue = 5;
  
  if(wheelType.value === 'all') {
    const heightAddValue = addValue*param.translateBoxHeight.value/param.translateBoxWidth.value;
  
    const newWidth = param.translateBoxWidth.value + addValue;
    const newHeight = param.translateBoxHeight.value + heightAddValue;
    if(newWidth<2 || newHeight<2) return;

    param.translateBoxWidth.value = newWidth;
    param.translateBoxHeight.value = newHeight;

    param.translateBoxLeft.value = param.translateBoxLeft.value - addValue / 2;
    param.translateBoxTop.value = param.translateBoxTop.value - heightAddValue / 2;
  }else if(wheelType.value === 'horizontal') {
    const newWidth = param.translateBoxWidth.value + addValue;
    if(newWidth<2) return;
    param.translateBoxWidth.value = newWidth;
    param.translateBoxLeft.value = param.translateBoxLeft.value - addValue / 2;
  }else if(wheelType.value === 'vertical') {
    const newHeight = param.translateBoxHeight.value + addValue;
    if(newHeight<2) return;
    param.translateBoxHeight.value = newHeight;
    param.translateBoxTop.value = param.translateBoxTop.value - addValue / 2;
  }else if(wheelType.value === 'rotate') {
    addValue = addValue / 10;
    const newRotate =  param.translateBoxRotate.value + addValue;
    param.translateBoxRotate.value = newRotate;
  }
}