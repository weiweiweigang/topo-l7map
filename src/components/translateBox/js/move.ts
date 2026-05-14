import { Ref } from 'vue';

/*
 * @Author: Strayer
 * @Date: 2022-12-04
 * @LastEditors: Strayer
 * @LastEditTime: 2022-12-11
 * @Description: 
 * @FilePath: \translateBox\src\components\translateBox\js\move.ts
 */
type MoveType = 'begin' | 'moving' | 'end'
interface MoveBaseParam {
  e: MouseEvent,
  isMoving: Ref<boolean>,
  translateBoxLeft: Ref<number>,
  translateBoxTop: Ref<number>,
}

/**
 * @description: 元素移动处理函数
 * @param {MoveType} moveType 移动的类型：'begin' | 'moving' | 'end'
 * @param {MouseEvent} e 鼠标事件参数 
 */
interface MoveHandleParam extends MoveBaseParam { moveType: MoveType}
export function moveHandle(param: MoveHandleParam) {
  const { e, moveType, isMoving, translateBoxLeft, translateBoxTop } = param;
  const distributeObj: Record<MoveType, (param: MoveBaseParam) => void> = {
    'begin': beginMoveHandle,
    'moving': onMovingHandle,
    'end': endMoveHandle
  }

  distributeObj[moveType]({ e, isMoving, translateBoxLeft, translateBoxTop })
}

// 开始移动
let [mouseBeginX, mouseBeginY] = [0, 0];
let [originLeft, originTop] = [0, 0];
function beginMoveHandle({ e, isMoving, translateBoxLeft, translateBoxTop }: MoveBaseParam) {
  isMoving.value = true;
  [mouseBeginX, mouseBeginY] = [e.clientX, e.clientY];
  [originLeft, originTop] = [translateBoxLeft.value, translateBoxTop.value];
}

// 移动中
function onMovingHandle(param: MoveBaseParam) {
  if(!param.isMoving.value) return;
  moveTo(param)
}

// 移动结束
function endMoveHandle(param: MoveBaseParam) {
  if(!param.isMoving.value) return;
  param.isMoving.value = false;
  moveTo(param)
}

function moveTo({ e, translateBoxLeft, translateBoxTop }: MoveBaseParam) {
  const moveX = e.clientX - mouseBeginX;
  const moveY = e.clientY - mouseBeginY;
  [translateBoxLeft.value, translateBoxTop.value] = [originLeft + moveX, originTop + moveY];
}