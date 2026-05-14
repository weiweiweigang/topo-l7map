/*
 * @Description: BlockWriteL7 坐标转换和盒子工具
 * @FilePath: \heat-web\src\components\blockWriteL7\js\index.ts
 */
import type { Scene } from '@antv/l7';
import { webMercatorToScreen, screenToWebMercator } from '@/components/l7mapRender/draw/coordHelper';
import { Ref } from 'vue';
import type TranslateBox from '@/components/translateBox/index.vue'
import { OutsideChangeParam, PictureWeb, TranslateValue } from './data';
import type { EmitMoveObj } from '@/components/translateBox/js/data';
import { BlockEditObj } from '@/utils/topologyBlockEdit';

/** @description: 墨卡托的值转为盒子的像素值 */  
export function getTranslateValue(pictureWeb: PictureWeb, scene: Scene) {
  const leftTopPoint = webMercatorToScreen(scene, pictureWeb.leftTop);

  const rightBottomPoint = webMercatorToScreen(scene, pictureWeb.rightBottom);

  const res = {
    left: leftTopPoint.x,
    top: leftTopPoint.y, 
    width: rightBottomPoint.x - leftTopPoint.x,
    height: rightBottomPoint.y - leftTopPoint.y,
  }

  return res
}

/** @description: 强制更新translateBox */  
export function forceUpdate(param: {
  translateBoxObj: Ref<InstanceType<typeof TranslateBox> | undefined>,
  scene: Scene,
  pictureWeb: PictureWeb,
  translateValue: TranslateValue
}) {
  const res = getTranslateValue(param.pictureWeb, param.scene);
  param.translateValue.value.left = res.left;
  param.translateValue.value.top = res.top;
  param.translateValue.value.width = res.width;
  param.translateValue.value.height = res.height;

  param.translateBoxObj.value?.forceUpdate({
    left: param.translateValue.value.left,
    top: param.translateValue.value.top,
    width: param.translateValue.value.width,
    height: param.translateValue.value.height,
    rotate: param.translateValue.value.rotate,
  })
}

/** @description: 盒子移动结束 */  
export function translateEndOfMove(
  scene: Scene,
  res: EmitMoveObj, 
  pictureWeb: PictureWeb 
) {
  const newLeftTop = screenToWebMercator(scene, res.left, res.top)

  const moveX = newLeftTop[0] - pictureWeb.leftTop[0];
  const moveY = newLeftTop[1] - pictureWeb.leftTop[1];
  
  BlockEditObj.moveEquipmentHandle(moveX, moveY)  
  pictureWeb.leftTop[0] += moveX;
  pictureWeb.leftTop[1] += moveY;
  pictureWeb.rightBottom[0] += moveX;
  pictureWeb.rightBottom[1] += moveY;
}

/** @description: 盒子旋转结束 */  
export function translateEndOfRotate(
  res: EmitMoveObj, 
  pictureWeb: PictureWeb, 
  translateValue: TranslateValue
) {
  const rotateValue = res.rotate - translateValue.value.rotate;
  const center: [number, number] = [(pictureWeb.rightBottom[0] + pictureWeb.leftTop[0])/2, (pictureWeb.rightBottom[1] + pictureWeb.leftTop[1])/2]
  
  BlockEditObj.rotateEquipmentHandel(rotateValue, center);
  translateValue.value.rotate += rotateValue;
}

/** @description: 盒子拉伸结束 */  
export function translateEndOfSpread(
  scene: Scene,
  res: EmitMoveObj, 
  pictureWeb: PictureWeb, 
  translateValue: TranslateValue
) {
  // 1. 先旋转回正常位置
  const center: [number, number] = [(pictureWeb.rightBottom[0] + pictureWeb.leftTop[0])/2, (pictureWeb.rightBottom[1] + pictureWeb.leftTop[1])/2]
  BlockEditObj.rotateEquipmentHandel(-translateValue.value.rotate, center);

  // 2.宽、高缩放
  let widthScaleValue = res.width / translateValue.value.width;
  let heightScaleValue = res.height / translateValue.value.height;
  if(translateValue.value.isReverseX !== res.isReverseX) widthScaleValue = -widthScaleValue;
  if(translateValue.value.isReverseY !== res.isReverseY) heightScaleValue = -heightScaleValue;

  if(widthScaleValue !== 1) BlockEditObj.scaleEquipmentHandel(widthScaleValue, 'row', pictureWeb.leftTop);
  if(heightScaleValue !== 1) BlockEditObj.scaleEquipmentHandel(heightScaleValue, 'column', pictureWeb.leftTop);
  
  pictureWeb.rightBottom[0] = (pictureWeb.rightBottom[0] - pictureWeb.leftTop[0]) * widthScaleValue + pictureWeb.leftTop[0];
  pictureWeb.rightBottom[1] = (pictureWeb.rightBottom[1] - pictureWeb.leftTop[1]) * heightScaleValue + pictureWeb.leftTop[1];
  if(translateValue.value.isReverseX !== res.isReverseX) {
    const pointX = pictureWeb.leftTop[0];
    pictureWeb.leftTop[0] = pictureWeb.rightBottom[0];
    pictureWeb.rightBottom[0] = pointX;
  }
  if(translateValue.value.isReverseY !== res.isReverseY) {
    const pointX = pictureWeb.leftTop[1];
    pictureWeb.leftTop[1] = pictureWeb.rightBottom[1];
    pictureWeb.rightBottom[1] = pointX;
  }


  // 3.再旋转回原位
  const centerNew: [number, number] = [(pictureWeb.rightBottom[0] + pictureWeb.leftTop[0])/2, (pictureWeb.rightBottom[1] + pictureWeb.leftTop[1])/2]
  BlockEditObj.rotateEquipmentHandel(translateValue.value.rotate, centerNew);

  // 4.左上角平移到对应位置
  const newLeftTop = screenToWebMercator(scene, res.left, res.top)
  const moveX = newLeftTop[0] - pictureWeb.leftTop[0];
  const moveY = newLeftTop[1] - pictureWeb.leftTop[1];

  BlockEditObj.moveEquipmentHandle(moveX, moveY)  
  pictureWeb.leftTop[0] += moveX;
  pictureWeb.leftTop[1] += moveY;
  pictureWeb.rightBottom[0] += moveX;
  pictureWeb.rightBottom[1] += moveY;

  // 5.更新值
  translateValue.value.width = res.width;
  translateValue.value.height = res.height;
  translateValue.value.isReverseX = res.isReverseX;
  translateValue.value.isReverseY = res.isReverseY;
}

/**
 * @description: 需要响应盒子外部改变
 */  
export function boxOutsideChangeHandle(option: {
  param: OutsideChangeParam,
  pictureWeb: PictureWeb, 
  translateValue: TranslateValue,
  forceUpdateHandle: () => void,
}) {
  if(option.param.type === 'move') {
    option.pictureWeb.leftTop[0] += (option.param.xMove ?? 0);
    option.pictureWeb.leftTop[1] += (option.param.yMove ?? 0);
    option.pictureWeb.rightBottom[0] += (option.param.xMove ?? 0);
    option.pictureWeb.rightBottom[1] += (option.param.yMove ?? 0);
  }else if(option.param.type === 'rotate') {
    option.translateValue.value.rotate += (option.param.rotateValue ?? 0)
  }else {
    const center: [number, number] = [(option.pictureWeb.rightBottom[0] + option.pictureWeb.leftTop[0])/2, (option.pictureWeb.rightBottom[1] + option.pictureWeb.leftTop[1])/2]

    if((option.param.directionValue ?? 'all') === 'all') {
      option.pictureWeb.leftTop[0] = (option.param.scaleValue ?? 0)*(option.pictureWeb.leftTop[0] - center[0]) + center[0];
      option.pictureWeb.leftTop[1] = (option.param.scaleValue ?? 0)*(option.pictureWeb.leftTop[1] - center[1]) + center[1];

      option.pictureWeb.rightBottom[0] = (option.param.scaleValue ?? 0)*(option.pictureWeb.rightBottom[0] - center[0]) + center[0];
      option.pictureWeb.rightBottom[1] = (option.param.scaleValue ?? 0)*(option.pictureWeb.rightBottom[1] - center[1]) + center[1];
    }else if(option.param.directionValue === 'row') {
      option.pictureWeb.leftTop[0] = (option.param.scaleValue ?? 0)*(option.pictureWeb.leftTop[0] - center[0]) + center[0];

      option.pictureWeb.rightBottom[0] = (option.param.scaleValue ?? 0)*(option.pictureWeb.rightBottom[0] - center[0]) + center[0];
    }else {
      option.pictureWeb.leftTop[1] = (option.param.scaleValue ?? 0)*(option.pictureWeb.leftTop[1] - center[1]) + center[1];

      option.pictureWeb.rightBottom[1] = (option.param.scaleValue ?? 0)*(option.pictureWeb.rightBottom[1] - center[1]) + center[1];
    }
  }

  option.forceUpdateHandle()
}
