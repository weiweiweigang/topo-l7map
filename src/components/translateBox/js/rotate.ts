/*
 * @Author: Strayer
 * @Date: 2022-12-05
 * @LastEditors: Strayer
 * @LastEditTime: 2022-12-11
 * @Description: 
 * @FilePath: \heat-web\src\components\translateBox\js\rotate.ts
 */
import Util from '@/utils/util';
import { Ref, ShallowRef } from 'vue';
import { Btn, getElement, updateBtnData } from './data';
import { MoveType } from './spread';

interface RotateBaseParam {
  e: MouseEvent,
  isRotating: Ref<boolean>,
  boxId: Ref<string>,
  translateBoxWidth: Ref<number>,
  translateBoxHeight: Ref<number>,
  translateBoxRotate: Ref<number>,
  btnDataOrigin: ShallowRef<Btn>,
  btnData: Ref<Btn>,
}

/**
 * @description: 元素移动处理函数
 * @param {MoveType} rotateType 移动的类型：'begin' | 'moving' | 'end'
 * @param {MouseEvent} e 鼠标事件参数 
 * @return {*}
 */
interface RotateHandleParam extends RotateBaseParam {rotateType: MoveType}
export function rotateHandle(param: RotateHandleParam) {
  const distributeObj: Record<MoveType, (param: RotateHandleParam) => void> = {
    'begin': beginRotateHandle,
    'moving': rotatingHandle,
    'end': endRotateHandle
  }

  distributeObj[param.rotateType](param)
}

let [mouseBeginX, mouseBeginY] = [0, 0];
let [centerX, centerY] = [0, 0];
let originRotate = 0;
function beginRotateHandle({ e, isRotating, boxId, translateBoxHeight, translateBoxWidth, translateBoxRotate }: RotateBaseParam) {
  isRotating.value = true;
  [mouseBeginX, mouseBeginY] = [e.clientX, e.clientY];
  const { left, top } = getElement(boxId.value).getBoundingClientRect();
  [centerX, centerY] = [left + translateBoxWidth.value/2, top+translateBoxHeight.value/2];
  originRotate = translateBoxRotate.value;
}

function rotatingHandle({ e, isRotating, translateBoxRotate }: {
  e: MouseEvent,
  isRotating: Ref<boolean>,
  translateBoxRotate: Ref<number>
}) {
  if(!isRotating.value) return;
  rotateTo({ e, translateBoxRotate })
}

// 移动结束
function endRotateHandle({ e, isRotating, btnDataOrigin, btnData, translateBoxRotate }: RotateBaseParam) {
  if(!isRotating.value) return;
  isRotating.value = false;
  rotateTo({ e, translateBoxRotate });

  updateBtnData({ btnDataOrigin, btnData, translateBoxRotate })
}

function rotateTo({ e, translateBoxRotate }:{
  e: MouseEvent,
  translateBoxRotate: Ref<number>
}) {
  const angle = Util.getAngleOfThreePoint([centerX, centerY], [mouseBeginX, mouseBeginY], [e.clientX, e.clientY])
  translateBoxRotate.value = originRotate + angle;
}
