/*
 * @Author: Strayer
 * @Date: 2022-12-14
 * @LastEditors: Strayer
 * @LastEditTime: 2024-07-31
 * @Description: 图片位置计算工具
 * @FilePath: \heat-web\src\components\belowOtherJonConfig\components\pictureMap\js\index.ts
 */

import type { Scene } from '@antv/l7';

/**
 * 坐标转换：Web Mercator -> 屏幕坐标
 */
export function webMercatorToScreen(
  scene: Scene,
  web: [number, number]
): { x: number; y: number } {
  // Web Mercator -> 经纬度
  const lng = web[0] * 180 / 20037508.34;
  const lat = Math.atan(Math.exp(web[1] * Math.PI / 20037508.34)) * 360 / Math.PI - 90;

  // 经纬度 -> 屏幕坐标
  const pixel = scene.lngLatToContainer({ lng, lat });
  return { x: pixel.x, y: pixel.y };
}

/**
 * 根据图片的墨卡托坐标范围，计算在屏幕上的位置
 */
export function getTranslateValue(
  pictureWeb: {
    leftTop: [number, number],
    rightBottom: [number, number]
  },
  scene: Scene
) {
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
