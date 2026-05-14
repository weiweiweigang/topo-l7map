/*
 * @Author: Strayer
 * @Date: 2022-12-04
 * @LastEditors: Strayer
 * @LastEditTime: 2023-11-17
 * @Description: 
 * @FilePath: \heat-web\src\components\translateBox\js\data.ts
 */

import Tool from '@/tools/tool';
import { Ref, ShallowRef, ref } from 'vue';
import { SpreadType } from './spread';

export type EmitMoveObj = {
  type: 'move' | 'spread' | 'rotate',
  left: number,
  top: number,
  width: number,
  height: number,
  rotate: number,
  isReverseX: boolean,
  isReverseY: boolean,
}

export type BtnItem ={
  name: SpreadType,
  angle: number, // 当前方向对应的角度
  cursor: string,
  top?: string,
  left?: string,
  right?: string,
  bottom?: string,
  width?: string,
  height?: string
};
export type Btn = Array<BtnItem>


export const visible = ref(true);

// 缩放按钮图标
export const spreadBtnImg = 'data:image/svg+xml;base64,PCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIxOHB4IiBoZWlnaHQ9IjE4cHgiIHZlcnNpb249IjEuMSI+PGNpcmNsZSBjeD0iOSIgY3k9IjkiIHI9IjUiIHN0cm9rZT0iI2ZmZiIgZmlsbD0iIzI5YjZmMiIvPjwvc3ZnPg==';
// 旋转按钮图标
export const rotateBtnImg = 'data:image/svg+xml;base64,PCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIxNnB4IiBoZWlnaHQ9IjE2cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgdmVyc2lvbj0iMS4xIj48cGF0aCBzdHJva2U9IiMyOWI2ZjIiIGZpbGw9IiMyOWI2ZjIiIGQ9Ik0xNS41NSA1LjU1TDExIDF2My4wN0M3LjA2IDQuNTYgNCA3LjkyIDQgMTJzMy4wNSA3LjQ0IDcgNy45M3YtMi4wMmMtMi44NC0uNDgtNS0yLjk0LTUtNS45MXMyLjE2LTUuNDMgNS01LjkxVjEwbDQuNTUtNC40NXpNMTkuOTMgMTFjLS4xNy0xLjM5LS43Mi0yLjczLTEuNjItMy44OWwtMS40MiAxLjQyYy41NC43NS44OCAxLjYgMS4wMiAyLjQ3aDIuMDJ6TTEzIDE3Ljl2Mi4wMmMxLjM5LS4xNyAyLjc0LS43MSAzLjktMS42MWwtMS40NC0xLjQ0Yy0uNzUuNTQtMS41OS44OS0yLjQ2IDEuMDN6bTMuODktMi40MmwxLjQyIDEuNDFjLjktMS4xNiAxLjQ1LTIuNSAxLjYyLTMuODloLTIuMDJjLS4xNC44Ny0uNDggMS43Mi0xLjAyIDIuNDh6Ii8+PC9zdmc+';
// 透明按钮
export const opacityZeroImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAChJREFUOE9jZKAyYKSyeQyjBlIeoqNhOBqGZITAaLIhI9DQtIzAMAQASMYAFTvklLAAAAAASUVORK5CYII=';

export function getElement(boxId: string) {
  return document.getElementById(boxId)!
}

export function updateOriginBtnData({ btnDataOrigin, btnData, isFull }:{
  isFull?: boolean,
  btnDataOrigin: ShallowRef<Btn>,
  btnData: Ref<Btn>,
}) {
  if(isFull) {
    btnDataOrigin.value = [
      {
        name: 'top',
        angle: -90,
        cursor: 'n-resize',
        top: '-11.5px',
        left: '10px',
        width: 'calc(100% - 23px)',
      }, {
        name: 'right',
        angle: 0,
        cursor: 'e-resize',
        right: '-11.5px',
        top: '10px',
        height: 'calc(100% - 23px)',
      }, {
        name: 'bottom',
        angle: 90,
        cursor: 's-resize',
        bottom: '-11.5px',
        left: '10px',
        width: 'calc(100% - 23px)',
      }, {
        name: 'left',
        angle: 180,
        cursor: 'w-resize',
        left: '-11.5px',
        top: '10px',
        height: 'calc(100% - 23px)',
      }, {
        name: 'leftTop',
        angle: -135,
        cursor: 'nw-resize',
        top: '-11.5px',
        left: '-11.5px'
      }, {
        name: 'rightTop',
        angle: -45,
        cursor: 'ne-resize',
        top: '-11.5px',
        right: '-11.5px',
      }, {
        name: 'leftBottom',
        angle: 135,
        cursor: 'sw-resize',
        left: '-11.5px',
        bottom: '-11.5px',
      }, {
        name: 'rightBottom',
        angle: 45,
        cursor: 'se-resize',
        right: '-11.5px',
        bottom: '-11.5px',
      },
    ]
  }else {
    btnDataOrigin.value = [
      {
        name: 'top',
        angle: -90,
        cursor: 'n-resize',
        top: '-11.5px',
        left: 'calc(50% - 11.5px)',
      }, {
        name: 'right',
        angle: 0,
        cursor: 'e-resize',
        right: '-11.5px',
        top: 'calc(50% - 11.5px)'
      }, {
        name: 'bottom',
        angle: 90,
        cursor: 's-resize',
        bottom: '-11.5px',
        left: 'calc(50% - 11.5px)'
      }, {
        name: 'left',
        angle: 180,
        cursor: 'w-resize',
        left: '-11.5px',
        top: 'calc(50% - 11.5px)'
      }, {
        name: 'leftTop',
        angle: -135,
        cursor: 'nw-resize',
        top: '-11.5px',
        left: '-11.5px'
      }, {
        name: 'rightTop',
        angle: -45,
        cursor: 'ne-resize',
        top: '-11.5px',
        right: '-11.5px',
      }, {
        name: 'leftBottom',
        angle: 135,
        cursor: 'sw-resize',
        left: '-11.5px',
        bottom: '-11.5px',
      }, {
        name: 'rightBottom',
        angle: 45,
        cursor: 'se-resize',
        right: '-11.5px',
        bottom: '-11.5px',
      },
    ]
  }

  btnData.value = Tool.DeepClone(btnDataOrigin.value)
}

export function updateBtnData({ btnDataOrigin, btnData, translateBoxRotate }:{
  translateBoxRotate: Ref<number>,
  btnDataOrigin: ShallowRef<Btn>,
  btnData: Ref<Btn>,
}) {
  const newBtnData = Tool.DeepClone(btnDataOrigin.value)
  
  newBtnData.forEach(item => {
    item.angle += translateBoxRotate.value;
    if(item.angle > 180) item.angle -= 180;
    else if(item.angle < -180) item.angle += 180;

    if(item.angle >= -22.5 && item.angle <= 22.5) item.cursor = 'e-resize';
    if(item.angle >= 22.5 && item.angle <= 67.5) item.cursor = 'se-resize';
    if(item.angle >= 67.5 && item.angle <= 112.5) item.cursor = 's-resize';
    if(item.angle >= 112.5 && item.angle <= 157.5) item.cursor = 'sw-resize';
    if(item.angle >= 157.5 || item.angle <= -157.5) item.cursor = 'w-resize';
    if(item.angle >= -67.5 && item.angle <= -22.5) item.cursor = 'ne-resize';
    if(item.angle >= -112.5 && item.angle <= -67.5) item.cursor = 'n-resize';
    if(item.angle >= -157.5 && item.angle <= -112.5) item.cursor = 'nw-resize';
  })

  btnData.value = newBtnData
}