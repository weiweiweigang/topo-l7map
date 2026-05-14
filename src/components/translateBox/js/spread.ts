/*
 * @Author: Strayer
 * @Date: 2022-12-04
 * @LastEditors: Strayer
 * @LastEditTime: 2023-06-27
 * @Description: 
 * @FilePath: \heat-web\src\components\translateBox\js\spread.ts
 */
import Util from '@/utils/util';
import { Ref, ref } from 'vue'
import { 
  getElement
} from './data';

export type SpreadType = 'top' | 'right' | 'bottom' | 'left' | 'leftTop' | 'rightTop' | 'rightBottom' | 'leftBottom';
export type MoveType = 'begin' | 'moving' | 'end'

interface SpreadBaseParam {
  e: MouseEvent,
  translateBoxRotate: Ref<number>,
  translateBoxWidth: Ref<number>,
  translateBoxHeight: Ref<number>,
  translateBoxTop: Ref<number>,
  translateBoxLeft: Ref<number>,
  isReverseX: Ref<boolean>,
  isReverseY: Ref<boolean>,
  isShift: Ref<boolean>,
  isSpreading: Ref<boolean>,
  curSpreadType: Ref<SpreadType>,
  boxId: Ref<string>,
}

interface MoveToParam extends SpreadBaseParam { moveValue: number}
interface SpreadBaseParamAndSpreadType extends SpreadBaseParam {spreadType: SpreadType}

/**
 * @description: 元素缩放处理函数
 * @param {SpreadType} SpreadType 缩放类型 'top' | 'right' | 'bottom' | 'left' | 'leftTop' | 'rightTop' | 'rightBottom' | 'leftBottom'
 * @param {MoveType} moveType 移动类型 'begin' | 'moving' | 'end'
 * @param {MouseEvent} e 鼠标事件参数
 * @return {*}
 */interface SpreadHand extends SpreadBaseParamAndSpreadType {moveType: MoveType}

export function spreadHand(param: SpreadHand){
  const distributeObj: Record<MoveType, (param: SpreadBaseParamAndSpreadType) => void> = {
    'begin': beginMoveHandle,
    'moving': onMovingHandle,
    'end': endMoveHandle
  }

  param.curSpreadType.value = param.spreadType;
  distributeObj[param.moveType](param)
}

// 开始移动
let [mouseBeginX, mouseBeginY] = [0, 0];
let [originLeft, originTop] = [0, 0];
let [originWidth, originHeight] = [0, 0];
let [originReverseX, originReverseY]: [boolean, boolean] = [false, false];
let [centerX, centerY] = [0, 0];
function beginMoveHandle(param: SpreadBaseParamAndSpreadType) {
  param.isSpreading.value = true;
  [mouseBeginX, mouseBeginY] = [param.e.clientX, param.e.clientY];
  [originLeft, originTop] = [param.translateBoxLeft.value, param.translateBoxTop.value];
  [originWidth, originHeight] = [param.translateBoxWidth.value, param.translateBoxHeight.value];
  [originReverseX, originReverseY] = [param.isReverseX.value, param.isReverseY.value];
  const { left, top } = getElement(param.boxId.value).getBoundingClientRect();
  [centerX, centerY] = [left + param.translateBoxWidth.value/2, top+param.translateBoxHeight.value/2];
}

// 移动中
function onMovingHandle(param: SpreadBaseParamAndSpreadType) {
  if(!param.isSpreading.value) return;
  if(param.e.clientX === 0) return;
  moveTo(param)
}

// 移动结束
function endMoveHandle(param: SpreadBaseParamAndSpreadType) {
  if(!param.isSpreading.value) return;
  param.isSpreading.value = false;
  moveTo(param)
}

function moveTo(param: SpreadBaseParamAndSpreadType) {
  if(param.spreadType === 'right') moveToRight({ ...{ moveValue: getMoveValue(param.e) }, ...param });
  if(param.spreadType === 'left') moveToLeft({ ...{ moveValue: getMoveValue(param.e) }, ...param });
  if(param.spreadType === 'bottom') moveToBottom({ ...{ moveValue: getMoveValue(param.e) }, ...param });
  if(param.spreadType === 'top') moveToTop({ ...{ moveValue: getMoveValue(param.e) }, ...param });

  if(param.spreadType === 'rightBottom') moveToRightBottom(param);
  if(param.spreadType === 'rightTop') moveToRightTop(param);
  if(param.spreadType === 'leftTop') moveToLeftTop(param);
  if(param.spreadType === 'leftBottom') moveToLeftBottom(param);
}

// -------------------------上下左右缩放begin--------------------
/**
 * @description: 上下左右缩放时计算在该方向上要移动的距离
 */
function getMoveValue(e: MouseEvent): number {
  const AC_len = Util.GetWebMercatorLen([[centerX, centerY], [e.clientX, e.clientY]])
  const AO_len = Util.GetWebMercatorLen([[centerX, centerY], [mouseBeginX, mouseBeginY]])
  const CAB_angle = Util.getAngleOfThreePoint([centerX, centerY], [mouseBeginX, mouseBeginY], [e.clientX, e.clientY], true);
  const AB_len = AC_len * Math.cos(CAB_angle);

  return AB_len - AO_len;
} 

/**
 * @description: 上下左右缩放时计算相对于该方向上中心点需要偏移的距离
 */
function getCenterOffset(translateBoxRotate: Ref<number>, moveValue: number, type: 'with'| 'height') {
  const centerMoveValue = moveValue / 2;
  const centerOffsetX = (type === 'with')? (centerMoveValue - centerMoveValue * Math.cos(translateBoxRotate.value*Math.PI/180)) : centerMoveValue*Math.sin(translateBoxRotate.value*Math.PI/180);
  const centerOffsetY = (type === 'with')? centerMoveValue * Math.sin(translateBoxRotate.value*Math.PI/180) : (centerMoveValue - centerMoveValue * Math.cos(translateBoxRotate.value*Math.PI/180));
  return [centerOffsetX, centerOffsetY];
}

/**
 * @description: 上下左右缩放时设置宽度或高度
 */
interface SetWidthOrHeight extends MoveToParam {type: 'with'| 'height'}
function setWidthOrHeight(param: SetWidthOrHeight) {
  let newWidth = param.type === 'with' ? (originWidth + param.moveValue) : 0;
  let newHeight = param.type === 'height'? (originHeight + param.moveValue) : 0;

  if(param.isShift.value) {
    if(param.type === 'with') {
      newHeight = originHeight + param.moveValue*originHeight/originWidth;
    }else {
      newWidth = originWidth + param.moveValue*originWidth/originHeight;
    }
  }

  if(newWidth > 0) {
    param.translateBoxWidth.value = newWidth;
    (param.isReverseX.value !== originReverseX)? param.isReverseX.value = originReverseX:'';
  }else if(newWidth < 0) {
    param.translateBoxWidth.value = -newWidth;
    (param.isReverseX.value === originReverseX)? param.isReverseX.value = !originReverseX:'';
  }

  if(newHeight > 0) {
    param.translateBoxHeight.value = newHeight;
    (param.isReverseY.value !== originReverseY)? param.isReverseY.value = originReverseY:'';
  }else if(newHeight < 0) {
    param.translateBoxHeight.value = -newHeight;
    (param.isReverseY.value === originReverseY)? param.isReverseY.value = !originReverseY:'';
  }
}

function moveToRight(param: MoveToParam) {
  setWidthOrHeight({ ...{ type: 'with' }, ...param })
  const [centerOffsetX, centerOffsetY] = getCenterOffset(param.translateBoxRotate, param.moveValue, 'with')
  
  if(param.isShift.value) {
    const heightAddValue = param.translateBoxHeight.value - originHeight;
    param.translateBoxTop.value = originTop + centerOffsetY - heightAddValue/2;
  }else param.translateBoxTop.value = originTop + centerOffsetY;

  if(originWidth + param.moveValue > 0) {
    param.translateBoxLeft.value = originLeft - centerOffsetX;
  }else{
    param.translateBoxLeft.value = originLeft + (param.moveValue + originWidth) - centerOffsetX;
  }
}

function moveToLeft(param: MoveToParam) {
  setWidthOrHeight({ ...{ type: 'with' }, ...param })
  const [centerOffsetX, centerOffsetY] = getCenterOffset(param.translateBoxRotate, param.moveValue, 'with')

  if(param.isShift.value) {
    const heightAddValue = param.translateBoxHeight.value - originHeight;
    param.translateBoxTop.value = originTop - centerOffsetY - heightAddValue/2;
  }else param.translateBoxTop.value = originTop - centerOffsetY;

  if(originWidth + param.moveValue > 0) {
    param.translateBoxLeft.value = originLeft - param.moveValue + centerOffsetX;
  }else{
    param.translateBoxLeft.value = originLeft + originWidth + centerOffsetX;
  }
}

function moveToBottom(param: MoveToParam) {
  setWidthOrHeight({ ...{ type: 'height' }, ...param })
  const [centerOffsetX, centerOffsetY] = getCenterOffset(param.translateBoxRotate, param.moveValue, 'height')

  if(param.isShift.value) {
    const widthAddValue = param.translateBoxWidth.value - originWidth;
    param.translateBoxLeft.value = originLeft - centerOffsetX - widthAddValue/2;
  }else param.translateBoxLeft.value = originLeft - centerOffsetX;

  if(originHeight + param.moveValue > 0) {
    param.translateBoxTop.value = originTop - centerOffsetY;
  }else {
    param.translateBoxTop.value = originTop + param.moveValue + originHeight - centerOffsetY;
  }
}

function moveToTop(param: MoveToParam) {
  setWidthOrHeight({ ...{ type: 'height' }, ...param })
  const [centerOffsetX, centerOffsetY] = getCenterOffset(param.translateBoxRotate, param.moveValue, 'height')
  
  if(param.isShift.value) {
    const widthAddValue = param.translateBoxWidth.value - originWidth;
    param.translateBoxLeft.value = originLeft + centerOffsetX - widthAddValue/2;
  }else param.translateBoxLeft.value = originLeft + centerOffsetX;
  
  if(originHeight + param.moveValue > 0) {
    param.translateBoxTop.value = originTop - param.moveValue + centerOffsetY;
  }else {
    param.translateBoxTop.value = originTop + originHeight + centerOffsetY;
  }
}

// -------------------------上下左右缩放end--------------------

// -------------------------对角线缩放begin--------------------
type NewValue = {
  newCenter: [number, number],
  C_point: [number, number],
  newWidth: number,
  newHeight: number,
}
function getB_point(originB_point: [number, number], translateBoxRotate: Ref<number>) {
  const B_point: [number, number] = Util.createLatLngOfRotate({
    latLng: originB_point,
    center: [centerX, centerY],
    rotateNum: -translateBoxRotate.value
  })
  return B_point
}

interface GetC_Point extends SpreadBaseParam { originB_point: [number, number] }
function getC_Point(param: GetC_Point) {
  let C_point: [number, number] = [param.e.clientX, param.e.clientY];
  const B_point: [number, number] = getB_point(param.originB_point, param.translateBoxRotate);
  if(param.isShift.value) {
    let CAB_angle = Util.getAngleOfThreePoint(
      [centerX, centerY],
      B_point,
      C_point
    )
    
    if(CAB_angle > 90) CAB_angle = CAB_angle-180;
    else if(CAB_angle < -90) CAB_angle = CAB_angle+180;

    C_point = Util.createLatLngOfRotate({
      latLng: C_point,
      center: [centerX, centerY],
      rotateNum: CAB_angle
    })
  }

  return C_point;
}
function getCalcNewValue(translateBoxRotate: Ref<number>, C_point: [number, number], D_point: [number, number], originB_point: [number, number], xIsSin: boolean): NewValue {
  const D1_point = Util.createLatLngOfRotate({
    latLng: D_point,
    center: [centerX, centerY],
    rotateNum: -translateBoxRotate.value
  })

  const B_point = getB_point(originB_point, translateBoxRotate)
  const D1BC_angle = Util.getAngleOfThreePoint(B_point, D1_point, C_point, true);
  const EBC_angle = Math.PI - D1BC_angle;

  const BC_len = Util.GetWebMercatorLen([B_point, C_point]);
  const moveX = xIsSin? BC_len*Math.sin(EBC_angle):BC_len*Math.cos(EBC_angle);
  const moveY = xIsSin? BC_len*Math.cos(EBC_angle):BC_len*Math.sin(EBC_angle);
  const newWidth = originWidth + moveX;
  const newHeight = originHeight + moveY;
  const newCenter: [number, number] = [centerX+moveX/2, centerY+moveY/2];

  return { newCenter, C_point, newWidth, newHeight }
}

interface SetPotionAndShape extends SpreadBaseParam {newValueObj: NewValue, M2_point: [number, number]}
function setPotionAndShape({
  M2_point, 
  newValueObj, 
  translateBoxRotate, 
  translateBoxWidth, 
  translateBoxHeight, 
  translateBoxTop, 
  translateBoxLeft, 
  isReverseX, 
  isReverseY
}: SetPotionAndShape) {
  const M3_point: [number, number] = Util.createLatLngOfRotate({
    latLng: M2_point,
    center: newValueObj.newCenter, 
    rotateNum: -translateBoxRotate.value
  })

  const offsetValue: [number, number] = [newValueObj.C_point[0]-M3_point[0], newValueObj.C_point[1]-M3_point[1]];
  if(newValueObj.newWidth > 0) {
    translateBoxWidth.value = newValueObj.newWidth;
    (isReverseX.value !== originReverseX)? isReverseX.value = originReverseX:'';
    translateBoxLeft.value = originLeft + offsetValue[0];
  }else {
    translateBoxWidth.value = - newValueObj.newWidth;
    (isReverseX.value === originReverseX)? isReverseX.value = !originReverseX:'';
    translateBoxLeft.value = originLeft + newValueObj.newWidth  + offsetValue[0];
  }

  if(newValueObj.newHeight > 0) {
    translateBoxHeight.value = newValueObj.newHeight;
    (isReverseY.value !== originReverseY)? isReverseY.value = originReverseY:'';
    translateBoxTop.value = originTop + offsetValue[1];
  }else {
    translateBoxHeight.value = -newValueObj.newHeight;
    (isReverseY.value === originReverseY)? isReverseY.value = !originReverseY:'';
    translateBoxTop.value = originTop + newValueObj.newHeight + offsetValue[1];
  }
}

function moveToRightBottom(param: SpreadBaseParam) {
  const D_point: [number, number] = [centerX + originWidth / 2, centerY];
  const originB_point: [number, number] = [centerX+originWidth/2, centerY+originHeight/2];
  const originC_point: [number, number] = getC_Point({ ...{ originB_point: originB_point }, ...param })
  if(originB_point[0] === originC_point[0] && originB_point[1] === originC_point[1]) return;

  const newValueObj = getCalcNewValue(param.translateBoxRotate, originC_point, D_point, originB_point, true);

  const M2_point: [number, number] = [
    newValueObj.newCenter[0]+newValueObj.newWidth/2, 
    newValueObj.newCenter[1]+newValueObj.newHeight/2,
  ];

  setPotionAndShape({ ...{ newValueObj: newValueObj, M2_point: M2_point }, ...param })
}

function moveToRightTop(param: SpreadBaseParam) {
  const D_point: [number, number] = [centerX, centerY - originHeight/2];
  const originB_point: [number, number] = [centerX+originWidth/2, centerY-originHeight/2];
  const originC_point: [number, number] = getC_Point({ ...{ originB_point: originB_point }, ...param })
  if(originB_point[0] === originC_point[0] && originB_point[1] === originC_point[1]) return;

  const newValueObj = getCalcNewValue(param.translateBoxRotate, originC_point, D_point, originB_point, false);

  const M2_point: [number, number] = [
    newValueObj.newCenter[0]+newValueObj.newWidth/2, 
    newValueObj.newCenter[1]-newValueObj.newHeight/2,
  ];

  setPotionAndShape({ ...{ newValueObj: newValueObj, M2_point: M2_point }, ...param })
}

function moveToLeftTop(param: SpreadBaseParam) {
  const originB_point: [number, number] = [centerX-originWidth/2, centerY-originHeight/2];
  const D_point: [number, number] = [centerX - originWidth / 2, centerY];
  const originC_point: [number, number] = getC_Point({ ...{ originB_point: originB_point }, ...param })
  if(originB_point[0] === originC_point[0] && originB_point[1] === originC_point[1]) return;

  const newValueObj = getCalcNewValue(param.translateBoxRotate, originC_point, D_point, originB_point, true);

  const M2_point: [number, number] = [
    newValueObj.newCenter[0]-newValueObj.newWidth/2, 
    newValueObj.newCenter[1]-newValueObj.newHeight/2,
  ];

  setPotionAndShape({ ...{ newValueObj: newValueObj, M2_point: M2_point }, ...param })
}

function moveToLeftBottom(param: SpreadBaseParam) {
  const D_point: [number, number] = [centerX, centerY+originHeight/2];
  const originB_point: [number, number] = [centerX-originWidth/2, centerY+originHeight/2];
  const originC_point: [number, number] = getC_Point({ ...{ originB_point: originB_point }, ...param })
  if(originB_point[0] === originC_point[0] && originB_point[1] === originC_point[1]) return;

  const newValueObj = getCalcNewValue(param.translateBoxRotate, originC_point, D_point, originB_point, false);

  const M2_point: [number, number] = [
    newValueObj.newCenter[0]-newValueObj.newWidth/2, 
    newValueObj.newCenter[1]+newValueObj.newHeight/2,
  ];

  setPotionAndShape({ ...{ newValueObj: newValueObj, M2_point: M2_point }, ...param })
}
// -------------------------对角线缩放end--------------------
